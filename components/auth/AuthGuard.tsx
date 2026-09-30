"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "auth" | "unauth">("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setStatus("auth");
      } else {
        setStatus("unauth");
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    });
    return () => unsub();
  }, [pathname, router]);

  if (status === "loading") {
    return (
      <div className="auth-guard-loading" role="status" aria-label="Loading">
        <div className="auth-guard-spinner" aria-hidden="true" />
        <style>{`
          .auth-guard-loading {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg);
          }
          .auth-guard-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (status === "unauth") return null;

  return <>{children}</>;
}
