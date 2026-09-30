"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Real-time credits subscription
        const docRef = doc(db, "users", u.uid);
        const unsubDoc = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            setCredits(snap.data().credits ?? 0);
          }
        });
        return () => unsubDoc();
      } else {
        setCredits(null);
      }
    });
    return () => unsub();
  }, []);

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="topbar" role="banner">
      <button
        className="btn btn-ghost btn-sm topbar-menu"
        onClick={onMenuClick}
        aria-label="Toggle sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <line x1="2" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="topbar-right">
        {/* Credits badge */}
        {credits !== null && (
          <Link
            href="/billing"
            className="credits-badge badge badge-accent"
            title="Your remaining credits"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M6 3.5v3l2 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            {credits.toLocaleString("en-IN")} credits
          </Link>
        )}

        {/* Avatar */}
        <div
          className="topbar-avatar"
          aria-label={`Signed in as ${user?.displayName ?? user?.email}`}
          title={user?.displayName ?? user?.email ?? "Account"}
        >
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" width={32} height={32} referrerPolicy="no-referrer" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      </div>

      <style>{`
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
          height: 56px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .topbar-menu { padding: 0.4rem; }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .credits-badge {
          font-size: 0.72rem;
          text-decoration: none;
          cursor: pointer;
          transition: opacity var(--duration);
        }

        .credits-badge:hover { opacity: 0.8; }

        .topbar-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-3);
          border: 1px solid var(--border-2);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-2);
          cursor: pointer;
          flex-shrink: 0;
        }

        .topbar-avatar img { width: 100%; height: 100%; object-fit: cover; }
      `}</style>
    </header>
  );
}
