"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import { useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AuthGuard>
      <div className={`app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="app-main">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="app-content page-enter">
            {children}
          </main>
        </div>
      </div>

      <style>{`
        .app-shell {
          display: flex;
          min-height: 100dvh;
          background: var(--bg);
        }

        .app-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .app-content {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .app-shell { flex-direction: column; }
          .app-content { padding: 1rem; }
        }
      `}</style>
    </AuthGuard>
  );
}
