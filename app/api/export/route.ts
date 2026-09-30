import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { buildProjectZip } from "@/lib/zip";
import { FREE_DOWNLOAD_LIMIT } from "@/lib/credits";
import { planAtLeast } from "@/lib/plans";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
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

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
  }

  // ── Load user ─────────────────────────────────────────────────────────────
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists()) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }
  const userData = userSnap.data()!;
  const userPlan: string = userData.plan ?? "free";
  const downloadsThisMonth: number = userData.downloadsThisMonth ?? 0;

  // ── Download limit for free users ─────────────────────────────────────────
  if (!planAtLeast(userPlan, "student") && downloadsThisMonth >= FREE_DOWNLOAD_LIMIT) {
    return NextResponse.json(
      {
        ok: false,
        error: `Free plan allows ${FREE_DOWNLOAD_LIMIT} downloads per month. Upgrade to download more.`,
        code: "DOWNLOAD_LIMIT",
      },
      { status: 403 }
    );
  }

  // ── Load project ──────────────────────────────────────────────────────────
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists() || projectSnap.data()?.ownerId !== uid) {
    return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  }

  const project = projectSnap.data()!;
  const filesRecord: Record<string, string> = project.files ?? {};

  const files = Object.entries(filesRecord).map(([path, content]) => ({
    path,
    content,
  }));

  // ── Build ZIP ──────────────────────────────────────────────────────────────
  const zipBuffer = await buildProjectZip({
    projectName: project.name ?? "my-project",
    summary: project.description ?? "",
    files,
    isReact: project.framework === "react",
  });

  // ── Increment download counter ─────────────────────────────────────────────
  await userRef.update({
    downloadsThisMonth: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // ── Stream ZIP ────────────────────────────────────────────────────────────
  const safeName = (project.name ?? "project")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
      "Content-Length": String(zipBuffer.length),
      "Cache-Control": "no-store",
    },
  });
}
