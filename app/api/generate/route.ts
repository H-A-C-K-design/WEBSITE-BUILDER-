import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { generateContent } from "@/lib/gemini/client";
import { buildSystemPrompt } from "@/lib/gemini/prompts";
import { parseGeminiOutput, filesToRecord, isBlockedOutput } from "@/lib/gemini/parse";
import { getGenerateCost } from "@/lib/credits";
import { planAtLeast } from "@/lib/plans";
import { FieldValue } from "firebase-admin/firestore";

// In-memory rate limiter: uid → [timestamps]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;

function checkRateLimit(uid: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(uid) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(uid, timestamps);
  return true;
}

const requestSchema = z.object({
  prompt: z.string().min(3).max(2000),
  mode: z.enum(["webpage", "prototype", "student"]),
  framework: z.enum(["html", "react"]).default("html"),
  projectId: z.string().optional(),
  usePro: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const db = adminDb();

  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  if (!checkRateLimit(uid)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait a moment.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  // ── Validate input ────────────────────────────────────────────────────────
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { prompt, mode, framework, usePro } = body;

  // ── Load user doc ─────────────────────────────────────────────────────────
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const userData = userSnap.data()!;
  const userPlan: string = userData.plan ?? "free";
  const currentCredits: number = userData.credits ?? 0;

  // ── Plan feature gates ────────────────────────────────────────────────────
  if (usePro && !planAtLeast(userPlan, "pro")) {
    return NextResponse.json(
      { ok: false, error: "Pro model requires a Pro plan or higher.", code: "PLAN_REQUIRED" },
      { status: 403 }
    );
  }

  if (mode === "prototype" && !planAtLeast(userPlan, "student")) {
    return NextResponse.json(
      { ok: false, error: "Prototype mode requires a Student plan or higher.", code: "PLAN_REQUIRED" },
      { status: 403 }
    );
  }

  if (framework === "react" && !planAtLeast(userPlan, "pro")) {
    return NextResponse.json(
      { ok: false, error: "React/Vite export requires a Pro plan.", code: "PLAN_REQUIRED" },
      { status: 403 }
    );
  }

  // ── Credit check ──────────────────────────────────────────────────────────
  const cost = getGenerateCost(mode, usePro);

  if (currentCredits < cost) {
    return NextResponse.json(
      { ok: false, error: "Not enough credits.", code: "INSUFFICIENT_CREDITS", data: { cost, credits: currentCredits } },
      { status: 402 }
    );
  }

  // ── Deduct credits (transaction) ──────────────────────────────────────────
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const credits = snap.data()?.credits ?? 0;
      if (credits < cost) throw new Error("INSUFFICIENT_CREDITS");
      tx.update(userRef, {
        credits: FieldValue.increment(-cost),
        creditsUsedThisMonth: FieldValue.increment(cost),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Not enough credits.", code: "INSUFFICIENT_CREDITS" },
      { status: 402 }
    );
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  let generated;
  try {
    const systemPrompt = buildSystemPrompt({ mode, framework, plan: userPlan });
    const raw = await generateContent(systemPrompt, prompt, usePro);
    generated = parseGeminiOutput(raw);

    if (isBlockedOutput(generated)) {
      // Refund if blocked
      await userRef.update({ credits: FieldValue.increment(cost) });
      return NextResponse.json(
        { ok: false, error: "This prompt cannot be fulfilled.", code: "BLOCKED" },
        { status: 400 }
      );
    }
  } catch (err) {
    // Refund on any failure
    await userRef.update({ credits: FieldValue.increment(cost) });
    console.error("[generate] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Generation failed. Credits refunded.", code: "GENERATION_FAILED" },
      { status: 500 }
    );
  }

  // ── Save project & version to Firestore ──────────────────────────────────
  const filesRecord = filesToRecord(generated.files);
  const now = FieldValue.serverTimestamp();

  let projectId = body.projectId;

  try {
    const projectRef = projectId
      ? db.collection("projects").doc(projectId)
      : db.collection("projects").doc();

    projectId = projectRef.id;

    await projectRef.set(
      {
        id: projectId,
        ownerId: uid,
        name: generated.projectName,
        description: generated.summary,
        mode,
        framework,
        files: filesRecord,
        thumbnailUrl: null,
        updatedAt: now,
        ...(body.projectId ? {} : { createdAt: now }),
      },
      { merge: true }
    );

    // Save version
    await projectRef.collection("versions").add({
      files: filesRecord,
      prompt,
      createdAt: now,
      creditsSpent: cost,
    });

    // Credit ledger entry
    await db.collection("creditLedger").add({
      uid,
      delta: -cost,
      reason: "generate",
      projectId,
      createdAt: now,
    });
  } catch (err) {
    console.error("[generate] Firestore save error:", err);
    // Still return the result even if save fails
  }

  return NextResponse.json({
    ok: true,
    data: {
      projectId,
      projectName: generated.projectName,
      summary: generated.summary,
      files: generated.files,
      creditsSpent: cost,
    },
  });
}
