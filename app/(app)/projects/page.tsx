"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      const q = query(
        collection(db, "projects"),
        where("ownerId", "==", u.uid),
        orderBy("updatedAt", "desc")
      );
      const snap = await getDocs(q);
      setProjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await deleteDoc(doc(db, "projects", id));
    setProjects((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="projects-page">
      <div className="projects-header">
        <h1>My projects</h1>
        <Link href="/builder" className="btn btn-primary">New project</Link>
      </div>

      {loading ? (
        <div className="projects-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state card">
          <h2>Nothing here yet</h2>
          <p>Create your first project and it will show up here.</p>
          <Link href="/builder" className="btn btn-primary">Build something</Link>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              className="card project-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="project-row-info">
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="project-row-meta">
                  <span className="badge badge-neutral">{p.mode}</span>
                  <span className="badge badge-neutral">{p.framework}</span>
                </div>
              </div>
              <div className="project-row-actions">
                <Link href={`/builder/${p.id}`} className="btn btn-secondary btn-sm">Open</Link>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(p.id)}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <style>{`
        .projects-page { max-width: 900px; }
        .projects-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
        .projects-header h1 { font-size: 1.4rem; }
        .projects-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .project-row { display: flex; align-items: center; gap: 1rem; justify-content: space-between; flex-wrap: wrap; }
        .project-row-info { flex: 1; min-width: 0; }
        .project-row-info h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.2rem; }
        .project-row-info p { font-size: 0.8rem; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px; margin-bottom: 0.4rem; }
        .project-row-meta { display: flex; gap: 0.35rem; }
        .project-row-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; text-align: center; padding: 3rem 2rem; }
        .empty-state h2 { font-size: 1.1rem; }
        .empty-state p { font-size: 0.875rem; color: var(--text-2); }
      `}</style>
    </div>
  );
}
