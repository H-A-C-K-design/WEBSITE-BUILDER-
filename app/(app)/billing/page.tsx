"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import Link from "next/link";
import { motion } from "framer-motion";
import { PLANS, CREDIT_PACKS, formatINR } from "@/lib/plans";
import type { Payment } from "@/types";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

export default function BillingPage() {
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<Date | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    // Load Razorpay SDK
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      const userRef = doc(db, "users", u.uid);
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setCredits(d.credits ?? 0);
          setPlan(d.plan ?? "free");
          setPlanExpiresAt(d.planExpiresAt?.toDate() ?? null);
        }
        setLoading(false);
      });

      const q = query(
        collection(db, "payments"),
        where("uid", "==", u.uid),
        orderBy("createdAt", "desc")
      );
      getDocs(q).then((snap) => {
        setPayments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Payment, "id">) })));
      });

      return () => unsubUser();
    });
    return () => unsub();
  }, []);

  async function handlePurchase(planOrPack: string) {
    const user = auth.currentUser;
    if (!user) return;
    setPaying(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ planOrPack }),
      });
      const json = await res.json();
      if (!json.ok) { alert(json.error); return; }

      const { orderId, amountPaise } = json.data;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amountPaise,
        currency: "INR",
        name: "BuildMate AI",
        description: json.data.description,
        order_id: orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyJson.ok) {
            alert("Payment successful! Your credits have been added.");
          } else {
            alert("Payment verification failed. Contact support.");
          }
        },
        prefill: { email: user.email ?? "" },
        theme: { color: "#f59e3f" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } finally {
      setPaying(false);
    }
  }

  const planDef = PLANS[plan] ?? PLANS.free;

  return (
    <div className="billing-page">
      <h1>Billing</h1>

      {/* Current plan */}
      <div className="billing-current card">
        <div className="billing-plan-info">
          <p className="billing-plan-label">Current plan</p>
          <h2 className="billing-plan-name">{planDef.name}</h2>
          {planExpiresAt && (
            <p className="billing-expiry">
              Renews {planExpiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="billing-credits-display">
          <span className="stat-value">{credits.toLocaleString("en-IN")}</span>
          <span className="billing-credits-label">credits remaining</span>
        </div>
      </div>

      {/* Plans */}
      <section aria-labelledby="upgrade-heading">
        <h2 id="upgrade-heading" className="billing-section-title">Upgrade your plan</h2>
        <div className="billing-plans-grid">
          {Object.values(PLANS).filter((p) => p.id !== "free").map((p) => (
            <motion.div key={p.id} className={`card billing-plan-card ${plan === p.id ? "billing-plan-card--current" : ""}`}>
              {plan === p.id && <span className="badge badge-green billing-current-badge">Active</span>}
              <h3>{p.name}</h3>
              <p className="billing-plan-price">
                {formatINR(p.priceMonthly)}<span>/month</span>
              </p>
              <p className="billing-plan-credits">{p.creditsPerMonth.toLocaleString("en-IN")} credits/month</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handlePurchase(`${p.id}_monthly`)}
                disabled={paying || plan === p.id}
                id={`upgrade-${p.id}-btn`}
              >
                {plan === p.id ? "Current plan" : `Switch to ${p.name}`}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Credit packs */}
      <section aria-labelledby="packs-heading">
        <h2 id="packs-heading" className="billing-section-title">Top up with credits</h2>
        <div className="packs-grid">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.id} className="card pack-card">
              <h3>{pack.credits.toLocaleString("en-IN")} credits</h3>
              <p className="pack-price">{formatINR(pack.pricePaise)}</p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handlePurchase(pack.id)}
                disabled={paying}
                id={`buy-${pack.id}-btn`}
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Payment history */}
      {payments.length > 0 && (
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="billing-section-title">Payment history</h2>
          <div className="billing-history">
            {payments.map((p) => (
              <div key={p.id} className="payment-row">
                <div>
                  <p className="payment-plan">{p.planOrPack.replace(/_/g, " ")}</p>
                  <p className="payment-date">
                    {p.createdAt ? new Date((p.createdAt as unknown as { seconds: number }).seconds * 1000).toLocaleDateString("en-IN") : ""}
                  </p>
                </div>
                <div className="payment-right">
                  <span className={`badge ${p.status === "success" ? "badge-green" : "badge-neutral"}`}>
                    {p.status}
                  </span>
                  <span className="payment-amount">{formatINR(p.amountPaise)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .billing-page { max-width: 800px; display: flex; flex-direction: column; gap: 1.5rem; }
        .billing-page h1 { font-size: 1.4rem; }
        .billing-current { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
        .billing-plan-label { font-size: 0.75rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.25rem; }
        .billing-plan-name { font-size: 1.4rem; }
        .billing-expiry { font-size: 0.8rem; color: var(--text-2); margin-top: 0.25rem; }
        .billing-credits-display { display: flex; flex-direction: column; align-items: flex-end; }
        .billing-credits-label { font-size: 0.75rem; color: var(--text-2); }
        .billing-section-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; }
        .billing-plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
        .billing-plan-card { position: relative; }
        .billing-plan-card--current { border-color: var(--green); }
        .billing-current-badge { position: absolute; top: -0.6rem; left: 1rem; }
        .billing-plan-card h3 { margin-bottom: 0.5rem; }
        .billing-plan-price { font-size: 1.3rem; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; }
        .billing-plan-price span { font-size: 0.8rem; color: var(--text-2); font-weight: 400; }
        .billing-plan-credits { font-size: 0.8rem; color: var(--text-2); margin-block: 0.5rem; }
        .packs-grid { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .pack-card { display: flex; flex-direction: column; gap: 0.5rem; min-width: 160px; }
        .pack-card h3 { font-size: 1rem; }
        .pack-price { font-size: 1.2rem; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text); }
        .billing-history { display: flex; flex-direction: column; }
        .payment-row { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
        .payment-plan { font-size: 0.875rem; font-weight: 500; text-transform: capitalize; }
        .payment-date { font-size: 0.75rem; color: var(--text-3); }
        .payment-right { display: flex; align-items: center; gap: 0.75rem; }
        .payment-amount { font-size: 0.875rem; font-weight: 600; }
      `}</style>
    </div>
  );
}
