"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { motion } from "framer-motion";

type Mode = "login" | "signup" | "forgot";

interface AuthFormProps {
  mode: Mode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function friendlyError(code: string): string {
    const map: Record<string, string> = {
      "auth/user-not-found": "No account with that email. Try signing up.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-credential": "Email or password is incorrect.",
      "auth/email-already-in-use": "That email is already registered. Sign in instead.",
      "auth/weak-password": "Choose a password with at least 6 characters.",
      "auth/invalid-email": "That doesn't look like a valid email address.",
      "auth/popup-closed-by-user": "Sign-in window closed. Try again.",
      "auth/popup-blocked": "Popup was blocked by your browser. Allow popups for this site and try again.",
      "auth/cancelled-popup-request": "Sign-in cancelled. Try again.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/internal-error": "An internal error occurred. Try again.",
      "auth/unauthorized-domain": "This domain is not authorised for Google sign-in. Add it in the Firebase Console under Authentication → Settings → Authorised domains.",
    };
    return map[code] ?? "Something went wrong. Try again.";
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "signup" && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/dashboard");
      } else if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        // Create user doc + grant 100 credits server-side
        const token = await cred.user.getIdToken();
        await fetch("/api/auth/init-user", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ displayName: name.trim(), plan: planParam }),
        });
        // Prefill pending prompt if any
        const pendingPrompt = sessionStorage.getItem("pending_prompt");
        router.push(pendingPrompt ? `/builder?prompt=${encodeURIComponent(pendingPrompt)}` : "/dashboard");
      } else {
        await sendPasswordResetEmail(auth, email);
        setSuccess("Password reset email sent. Check your inbox.");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const token = await cred.user.getIdToken();
      // Best-effort: initialise user doc / grant credits. Don't block redirect.
      fetch("/api/auth/init-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: cred.user.displayName,
          plan: planParam,
        }),
      }).catch(() => {/* non-critical */});
      const pendingPrompt = sessionStorage.getItem("pending_prompt");
      router.push(pendingPrompt ? `/builder?prompt=${encodeURIComponent(pendingPrompt)}` : "/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(friendlyError(code));
    } finally {
      setGoogleLoading(false);
    }
  }

  const titles: Record<Mode, string> = {
    login: "Welcome back",
    signup: "Create your account",
    forgot: "Reset your password",
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Link href="/" className="navbar-logo auth-logo">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="#f59e3f" />
            <path d="M8 20V10l6-3 6 3v10" stroke="#0d0f14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 20v-5h6v5" stroke="#0d0f14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>BuildMate</span>
        </Link>
      </div>

      <motion.div
        className="auth-card card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <h1 className="auth-title">{titles[mode]}</h1>

        {mode === "signup" && (
          <p className="auth-sub">Start with 100 free credits. No card needed.</p>
        )}

        {mode !== "forgot" && (
          <>
            <button
              className="btn btn-secondary btn-lg google-btn"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              id="google-signin-btn"
              type="button"
            >
              {googleLoading ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>
          </>
        )}

        <form onSubmit={handleEmailSubmit} noValidate>
          {mode === "signup" && (
            <div className="form-group">
              <label htmlFor="auth-name" className="label">Your name</label>
              <input
                id="auth-name"
                type="text"
                className="input"
                placeholder="Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email" className="label">Email address</label>
            <input
              id="auth-email"
              type="email"
              className={`input ${error ? "error" : ""}`}
              placeholder="priya@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete={mode === "login" ? "email" : "username"}
              required
              aria-describedby={error ? "auth-error" : undefined}
            />
          </div>

          {mode !== "forgot" && (
            <div className="form-group">
              <label htmlFor="auth-password" className="label">Password</label>
              <input
                id="auth-password"
                type="password"
                className={`input ${error ? "error" : ""}`}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </div>
          )}

          {mode === "signup" && (
            <div className="form-group">
              <label htmlFor="auth-confirm" className="label">Confirm password</label>
              <input
                id="auth-confirm"
                type="password"
                className="input"
                placeholder="Same password again"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && (
            <p className="auth-error" id="auth-error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="auth-success" role="status">
              {success}
            </p>
          )}

          {mode === "login" && (
            <div className="auth-forgot-link">
              <Link href="/forgot-password">Forgot password?</Link>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={loading || googleLoading}
            id="auth-submit-btn"
          >
            {loading ? (
              <span className="spinner" aria-hidden="true" />
            ) : mode === "login" ? (
              "Sign in"
            ) : mode === "signup" ? (
              "Create account"
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? (
            <>No account? <Link href="/signup">Sign up free</Link></>
          ) : mode === "signup" ? (
            <>Already have an account? <Link href="/login">Sign in</Link></>
          ) : (
            <><Link href="/login">Back to sign in</Link></>
          )}
        </p>
      </motion.div>

      <style>{`
        .auth-page {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: var(--bg);
        }

        .auth-brand {
          margin-bottom: 2rem;
        }

        .auth-logo {
          font-size: 1.2rem;
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          padding: 2rem;
        }

        .auth-title {
          font-size: 1.6rem;
          margin-bottom: 0.25rem;
        }

        .auth-sub {
          color: var(--text-2);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        .google-btn {
          width: 100%;
          justify-content: center;
          gap: 0.6rem;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-block: 1.25rem;
          color: var(--text-3);
          font-size: 0.8rem;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .auth-forgot-link {
          text-align: right;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
        }

        .auth-forgot-link a {
          color: var(--text-2);
          text-decoration: underline;
        }

        .auth-error {
          color: var(--red);
          font-size: 0.85rem;
          margin-bottom: 0.75rem;
          padding: 0.6rem 0.8rem;
          background: var(--red-dim);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(242,86,74,0.2);
        }

        .auth-success {
          color: var(--green);
          font-size: 0.85rem;
          margin-bottom: 0.75rem;
          padding: 0.6rem 0.8rem;
          background: var(--green-dim);
          border-radius: var(--radius-sm);
        }

        .auth-submit {
          width: 100%;
          justify-content: center;
          margin-top: 0.5rem;
        }

        .auth-switch {
          text-align: center;
          margin-top: 1.25rem;
          font-size: 0.875rem;
          color: var(--text-2);
        }

        .auth-switch a {
          color: var(--accent);
          font-weight: 500;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: currentColor;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
