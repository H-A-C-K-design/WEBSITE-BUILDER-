import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { generateContent } from "@/lib/gemini/client";
import { buildRefinePrompt, buildSystemPrompt } from "@/lib/gemini/prompts";
import { parseGeminiOutput, filesToRecord } from "@/lib/gemini/parse";
import { CREDIT_COSTS } from "@/lib/credits";
import { FieldValue } from "firebase-admin/firestore";

const requestSchema = z.object({
  projectId: z.string().min(1),
  instruction: z.string().min(3).max(2000),
  currentSummary: z.string().max(500).default(""),
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

  // ── Validate ──────────────────────────────────────────────────────────────
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const cost = CREDIT_COSTS.refine;

  // ── Load user ─────────────────────────────────────────────────────────────
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists()) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }
  const currentCredits: number = userSnap.data()?.credits ?? 0;
  if (currentCredits < cost) {
    return NextResponse.json(
      { ok: false, error: "Not enough credits.", code: "INSUFFICIENT_CREDITS" },
      { status: 402 }
    );
  }

  // ── Verify project ownership ──────────────────────────────────────────────
  const projectRef = db.collection("projects").doc(body.projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists() || projectSnap.data()?.ownerId !== uid) {
    return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  }
  const project = projectSnap.data()!;

  // ── Deduct credits ────────────────────────────────────────────────────────
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

  // ── Generate refinement ───────────────────────────────────────────────────
  let generated;
  try {
    const systemPrompt = buildSystemPrompt({
      mode: project.mode,
      framework: project.framework,
      plan: userSnap.data()?.plan ?? "free",
    });
    const refinePrompt = buildRefinePrompt(body.currentSummary, body.instruction);
    const raw = await generateContent(systemPrompt, refinePrompt, false);
    generated = parseGeminiOutput(raw);
  } catch (err) {
    await userRef.update({ credits: FieldValue.increment(cost) });
    return NextResponse.json(
      { ok: false, error: "Refinement failed. Credits refunded." },
      { status: 500 }
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const filesRecord = filesToRecord(generated.files);
  const now = FieldValue.serverTimestamp();

  await projectRef.update({ files: filesRecord, updatedAt: now });
  await projectRef.collection("versions").add({
    files: filesRecord,
    prompt: body.instruction,
    createdAt: now,
    creditsSpent: cost,
  });
  await db.collection("creditLedger").add({
    uid, delta: -cost, reason: "refine", projectId: body.projectId, createdAt: now,
  });

  return NextResponse.json({
    ok: true,
    data: { files: generated.files, summary: generated.summary, creditsSpent: cost },
  });
}
