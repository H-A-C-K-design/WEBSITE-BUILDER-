import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { SIGNUP_BONUS } from "@/lib/credits";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase ID token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let uid: string;
    let email: string | undefined;
    let displayName: string | undefined;
    let photoURL: string | undefined;

    try {
      const decoded = await adminAuth().verifyIdToken(token);
      uid = decoded.uid;
      email = decoded.email;
      displayName = decoded.name;
      photoURL = decoded.picture;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const nameFromBody: string | undefined = body.displayName;

    const db = adminDb();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    if (snap.exists) {
      // User already exists — just update display info if needed
      await userRef.update({
        updatedAt: FieldValue.serverTimestamp(),
        ...(displayName ? { displayName: nameFromBody || displayName } : {}),
        ...(photoURL ? { photoURL } : {}),
      });
      return NextResponse.json({ ok: true, data: { isNew: false } });
    }

    // New user — create doc with 100 credits
    const now = FieldValue.serverTimestamp();
    await userRef.set({
      uid,
      displayName: nameFromBody || displayName || email?.split("@")[0] || "Friend",
      email: email ?? "",
      photoURL: photoURL ?? null,
      plan: "free",
      planExpiresAt: null,
      credits: SIGNUP_BONUS,
      creditsUsedThisMonth: 0,
      downloadsThisMonth: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Write credit ledger entry
    await db.collection("creditLedger").add({
      uid,
      delta: SIGNUP_BONUS,
      reason: "signup_bonus",
      createdAt: now,
    });

    return NextResponse.json({ ok: true, data: { isNew: true, credits: SIGNUP_BONUS } });
  } catch (err) {
    console.error("[init-user]", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
