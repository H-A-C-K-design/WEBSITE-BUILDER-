"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setDisplayName(u.displayName ?? "");
    });
    return () => unsub();
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName });
      await updateDoc(doc(db, "users", user.uid), { displayName, updatedAt: new Date() });
      setMessage("Name updated.");
    } catch {
      setMessage("Failed to update name.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !user.email) return;
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setMessage("Failed to change password. Check your current password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <div className="settings-section card">
        <h2>Profile</h2>
        <form onSubmit={handleSaveName}>
          <div className="form-group">
            <label className="label" htmlFor="settings-name">Display name</label>
            <input
              id="settings-name"
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving} id="save-name-btn">
            Save name
          </button>
        </form>
      </div>

      <div className="settings-section card">
        <h2>Change password</h2>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="label" htmlFor="current-password">Current password</label>
            <input id="current-password" type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="new-password">New password</label>
            <input id="new-password" type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" disabled={saving} id="change-password-btn">
            Change password
          </button>
        </form>
      </div>

      {message && <p className="settings-message" role="status">{message}</p>}

      <style>{`
        .settings-page { max-width: 500px; display: flex; flex-direction: column; gap: 1.25rem; }
        .settings-page h1 { font-size: 1.4rem; }
        .settings-section h2 { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }
        .form-group { margin-bottom: 0.75rem; }
        .settings-message { font-size: 0.875rem; color: var(--green); padding: 0.6rem 0.8rem; background: var(--green-dim); border-radius: var(--radius-sm); }
      `}</style>
    </div>
  );
}
