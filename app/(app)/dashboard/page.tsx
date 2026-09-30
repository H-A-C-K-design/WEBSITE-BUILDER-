"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Project } from "@/types";
import { PLANS } from "@/lib/plans";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [plan, setPlan] = useState<string>("free");
  const [creditsUsed, setCreditsUsed] = useState<number>(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectCount, setProjectCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) return;

      const docRef = doc(db, "users", u.uid);
      const unsubDoc = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCredits(data.credits ?? 0);
          setPlan(data.plan ?? "free");
          setCreditsUsed(data.creditsUsedThisMonth ?? 0);
        }
        setLoading(false);
      });

      // Recent projects
      const q = query(
        collection(db, "projects"),
        where("ownerId", "==", u.uid),
        orderBy("updatedAt", "desc"),
        limit(6)
      );
      getDocs(q).then((snap) => {
        setProjectCount(snap.size);
        setProjects(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Project, "id">),
          }))
        );
      });

      return () => unsubDoc();
    });
    return () => unsub();
  }, []);

  const planDef = PLANS[plan] ?? PLANS.free;
  const totalCredits = plan === "free" ? 100 : planDef.creditsPerMonth;
  const creditPct = Math.min(100, (credits / Math.max(totalCredits, 1)) * 100);

  const templates = [
    { label: "Portfolio", prompt: "A personal portfolio for a graphic design student. Dark theme, minimal, shows 6 projects." },
    { label: "Landing page", prompt: "A product landing page for a mobile app that tracks water intake. Clean, modern, with features and pricing." },
    { label: "Blog", prompt: "A personal blog homepage for a travel writer. Warm colors, featured article hero, recent posts grid." },
    { label: "Student project", prompt: "A beginner HTML/CSS project: a simple weather info page with search, showing temperature and conditions." },
    { label: "E-commerce", prompt: "An online store for handmade candles. Warm tones, product grid, about section, contact." },
    { label: "Dashboard UI", prompt: "An analytics dashboard UI mockup with charts, stats cards, sidebar navigation." },
  ];

  if (loading) {
    return (
      <div className="dash-loading" role="status" aria-label="Loading dashboard">
        <div className="dash-skeleton" style={{ height: 120, marginBottom: "1rem" }} />
        <div className="dash-skeleton" style={{ height: 200 }} />
        <style>{`.dash-loading { padding: 1.5rem; } .dash-skeleton { border-radius: var(--radius-lg); } `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="dash-welcome">
          Good {getTimeOfDay()}, {user?.displayName?.split(" ")[0] ?? "there"}
        </h1>
        <p className="dash-sub">Here's what's happening with your projects.</p>
      </motion.div>

      {/* Stats row */}
      <div className="stat-grid">
        <StatCard label="Credits remaining" value={credits.toLocaleString("en-IN")} accent />
        <StatCard label="Credits used this month" value={creditsUsed.toLocaleString("en-IN")} />
        <StatCard label="Projects" value={projectCount.toString()} />
        <StatCard
          label="Current plan"
          value={planDef.name}
          action={plan === "free" ? { label: "Upgrade", href: "/billing" } : undefined}
        />
      </div>

      {/* Credit meter */}
      <div className="credit-meter-card card">
        <div className="credit-meter-header">
          <h2 className="credit-meter-title">Credit balance</h2>
          <Link href="/billing" className="btn btn-sm btn-secondary">Add credits</Link>
        </div>
        <div className="credit-bar-wrap" role="progressbar" aria-valuenow={credits} aria-valuemin={0} aria-valuemax={totalCredits} aria-label="Credit balance">
          <div className="credit-bar" style={{ width: `${creditPct}%` }} />
        </div>
        <p className="credit-meter-label">
          <strong>{credits.toLocaleString("en-IN")}</strong> of {totalCredits.toLocaleString("en-IN")} credits remaining
          {plan === "free" ? " (one-time)" : " this month"}
        </p>
      </div>

      {/* Quick start */}
      <div className="quick-start">
        <h2 className="section-title">Quick start</h2>
        <div className="template-grid">
          {templates.map((t) => (
            <Link
              key={t.label}
              href={`/builder?prompt=${encodeURIComponent(t.prompt)}`}
              className="template-chip"
              id={`template-${t.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent projects */}
      {projects.length > 0 ? (
        <div className="recent-projects">
          <div className="recent-header">
            <h2 className="section-title">Recent projects</h2>
            <Link href="/projects" className="btn btn-ghost btn-sm">See all</Link>
          </div>
          <div className="projects-grid">
            {projects.map((p, i) => (
              <motion.div
                key={p.id}
                className="project-card card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="project-thumb">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                    <rect x="2" y="2" width="28" height="28" rx="4" fill="var(--bg-3)" stroke="var(--border)" strokeWidth="1.5"/>
                    <path d="M8 10h16M8 14h12M8 18h14M8 22h10" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="project-info">
                  <h3 className="project-name">{p.name}</h3>
                  <p className="project-mode">
                    <span className="badge badge-neutral">{p.mode}</span>
                    <span className="badge badge-neutral">{p.framework}</span>
                  </p>
                </div>
                <Link href={`/builder/${p.id}`} className="btn btn-secondary btn-sm">
                  Open
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-projects card">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="40" height="40" rx="8" fill="var(--bg-3)" stroke="var(--border)" strokeWidth="1.5"/>
            <path d="M24 16v16M16 24h16" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h3>No projects yet</h3>
          <p>Describe what you want to build and we'll generate the code.</p>
          <Link href="/builder" className="btn btn-primary">Build your first site</Link>
        </div>
      )}

      <style>{`
        .dashboard { max-width: 1000px; display: flex; flex-direction: column; gap: 1.5rem; }
        .dash-welcome { font-size: 1.6rem; margin-bottom: 0.25rem; }
        .dash-sub { color: var(--text-2); font-size: 0.9rem; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
        .stat-card { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem 1.5rem; }
        .stat-card--accent { border-color: rgba(245,158,63,0.3); }
        .stat-label { font-size: 0.75rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.5rem; }
        .stat-value { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.6rem; font-weight: 700; color: var(--text); }
        .stat-action { margin-top: 0.5rem; }
        .credit-meter-card { display: flex; flex-direction: column; gap: 0.75rem; }
        .credit-meter-header { display: flex; align-items: center; justify-content: space-between; }
        .credit-meter-title { font-size: 1rem; font-weight: 600; }
        .credit-bar-wrap { height: 8px; background: var(--bg-3); border-radius: 4px; overflow: hidden; }
        .credit-bar { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.6s var(--ease); }
        .credit-meter-label { font-size: 0.8rem; color: var(--text-2); }
        .section-title { font-size: 1.05rem; font-weight: 600; }
        .template-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
        .template-chip { background: var(--bg-3); border: 1px solid var(--border); border-radius: 100px; padding: 0.4rem 0.9rem; font-size: 0.825rem; color: var(--text-2); transition: all var(--duration); text-decoration: none; }
        .template-chip:hover { background: var(--accent-glow); border-color: var(--accent); color: var(--accent); }
        .recent-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
        .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
        .project-card { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; }
        .project-thumb { flex-shrink: 0; }
        .project-info { flex: 1; min-width: 0; }
        .project-name { font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .project-mode { display: flex; gap: 0.35rem; margin-top: 0.35rem; }
        .empty-projects { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; text-align: center; padding: 3rem 2rem; }
        .empty-projects h3 { font-size: 1.1rem; }
        .empty-projects p { color: var(--text-2); font-size: 0.875rem; max-width: 280px; }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, accent, action }: {
  label: string; value: string; accent?: boolean; action?: { label: string; href: string };
}) {
  return (
    <div className={`stat-card ${accent ? "stat-card--accent" : ""}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {action && (
        <div className="stat-action">
          <Link href={action.href} className="btn btn-sm btn-secondary">{action.label}</Link>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
