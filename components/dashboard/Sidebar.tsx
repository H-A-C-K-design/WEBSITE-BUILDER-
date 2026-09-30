"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    label: "New project",
    href: "/builder",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M9 6v6M6 9h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    accent: true,
  },
  {
    label: "My projects",
    href: "/projects",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M3 5a2 2 0 012-2h2.586a1 1 0 01.707.293L9.414 4.5a1 1 0 00.707.293H13a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    label: "Billing",
    href: "/billing",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M2 8h14" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M4.1 4.1l1.05 1.05M12.85 12.85l1.05 1.05M13.9 4.1l-1.05 1.05M5.15 12.85l-1.05 1.05" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.push("/");
  }

  return (
    <>
      <aside
        className={`sidebar ${open ? "sidebar--open" : "sidebar--collapsed"}`}
        aria-label="App navigation"
      >
        {/* Logo */}
        <div className="sidebar-header">
          {open && (
            <Link href="/" className="navbar-logo sidebar-brand">
              <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="7" fill="#f59e3f" />
                <path d="M8 20V10l6-3 6 3v10" stroke="#0d0f14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 20v-5h6v5" stroke="#0d0f14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>BuildMate</span>
            </Link>
          )}
          <button
            className="btn btn-ghost btn-sm sidebar-toggle"
            onClick={onToggle}
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              {open ? (
                <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/builder" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${active ? "sidebar-item--active" : ""} ${item.accent ? "sidebar-item--accent" : ""}`}
                title={!open ? item.label : undefined}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                {open && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="sidebar-footer">
          <button
            onClick={handleSignOut}
            className={`sidebar-item sidebar-signout ${!open ? "sidebar-item--icon-only" : ""}`}
            title={!open ? "Sign out" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M7 16H4a1 1 0 01-1-1V3a1 1 0 011-1h3M12 12l4-3-4-3M7 9h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {open && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          background: var(--bg-2);
          border-right: 1px solid var(--border);
          transition: width 200ms var(--ease);
          height: 100dvh;
          position: sticky;
          top: 0;
          flex-shrink: 0;
          overflow: hidden;
        }

        .sidebar--open { width: 220px; }
        .sidebar--collapsed { width: 60px; }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          border-bottom: 1px solid var(--border);
          min-height: 56px;
        }

        .sidebar-brand { font-size: 1rem; white-space: nowrap; }

        .sidebar-toggle { padding: 0.4rem; flex-shrink: 0; }

        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0.75rem 0.5rem;
          overflow-y: auto;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.55rem 0.65rem;
          border-radius: var(--radius);
          color: var(--text-2);
          font-size: 0.875rem;
          font-weight: 500;
          transition: background var(--duration) var(--ease),
                      color var(--duration) var(--ease);
          white-space: nowrap;
          border: none;
          background: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          text-decoration: none;
        }

        .sidebar-item:hover {
          background: var(--bg-3);
          color: var(--text);
        }

        .sidebar-item--active {
          background: var(--accent-glow);
          color: var(--accent);
        }

        .sidebar-item--accent {
          color: var(--accent);
          border: 1px solid rgba(245,158,63,0.2);
          background: rgba(245,158,63,0.06);
        }

        .sidebar-item--accent:hover {
          background: var(--accent-glow);
        }

        .sidebar-footer {
          padding: 0.75rem 0.5rem;
          border-top: 1px solid var(--border);
        }

        .sidebar-signout { color: var(--text-3); }
        .sidebar-signout:hover { color: var(--red); background: var(--red-dim); }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: 0; top: 0; bottom: 0;
            z-index: 200;
            transform: translateX(${open ? '0' : '-100%'});
            width: 220px !important;
          }
        }
      `}</style>
    </>
  );
}
