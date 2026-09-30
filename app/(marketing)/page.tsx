"use client";

import { useEffect, useRef, useState } from "react"; // useState still used by Navbar (menuOpen) and FAQ (open)
import Link from "next/link";
import { motion, useInView } from "framer-motion";

// ─── Animated Canvas Background ────────────────────────────────────────────
function CanvasBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let W = 0, H = 0;

    function resize() {
      if (!canvas) return;
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // ── Particles (floating code dots) ──────────────────────────
    const PARTICLE_COUNT = 90;
    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number; alpha: number;
      color: string;
    }
    const COLORS = ["#f59e3f", "#f59e3f", "#fbbf24", "#34d1a0", "#60a5fa"];
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.6 + 0.15,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    // ── Circuit nodes ────────────────────────────────────────────
    const NODE_COUNT = 18;
    interface Node {
      x: number; y: number;
      vx: number; vy: number;
      pulse: number; pulseSpeed: number;
    }
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.012 + Math.random() * 0.018,
    }));

    let t = 0;

    function draw() {
      if (!ctx) return;
      t += 0.008;

      // Dark background
      ctx.fillStyle = "#0d0f14";
      ctx.fillRect(0, 0, W, H);

      // ── Grid lines (subtle) ────────────────────────────────
      ctx.strokeStyle = "rgba(245,158,63,0.04)";
      ctx.lineWidth = 1;
      const GRID = 80;
      for (let x = 0; x < W; x += GRID) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += GRID) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // ── Update + draw particles ────────────────────────────
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(t * 1.5 + p.x));
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── Circuit connection lines ───────────────────────────
      const CONNECT_DIST = 180;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.35;
            const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
            grad.addColorStop(0, `rgba(245,158,63,${alpha})`);
            grad.addColorStop(0.5, `rgba(251,191,36,${alpha * 1.3})`);
            grad.addColorStop(1, `rgba(245,158,63,${alpha})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // ── Update + draw nodes ────────────────────────────────
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) n.x = W; if (n.x > W) n.x = 0;
        if (n.y < 0) n.y = H; if (n.y > H) n.y = 0;
        n.pulse += n.pulseSpeed;

        const pulseR = 3 + Math.sin(n.pulse) * 2;
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pulseR * 6);
        glow.addColorStop(0, `rgba(245,158,63,${0.8 + 0.2 * Math.sin(n.pulse)})`);
        glow.addColorStop(0.4, `rgba(251,191,36,0.3)`);
        glow.addColorStop(1, "rgba(245,158,63,0)");
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR * 6, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e3f";
        ctx.fill();
      }

      // ── Ambient glow blobs ─────────────────────────────────
      const blobPositions = [
        { x: W * 0.15, y: H * 0.25, color: "245,158,63" },
        { x: W * 0.85, y: H * 0.7, color: "96,165,250" },
        { x: W * 0.5, y: H * 0.9, color: "52,209,160" },
      ];
      for (const b of blobPositions) {
        const blobR = 260 + 40 * Math.sin(t * 0.6);
        const blobG = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, blobR);
        blobG.addColorStop(0, `rgba(${b.color},0.07)`);
        blobG.addColorStop(1, `rgba(${b.color},0)`);
        ctx.beginPath();
        ctx.arc(b.x, b.y, blobR, 0, Math.PI * 2);
        ctx.fillStyle = blobG;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
      aria-hidden="true"
    />
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container navbar-inner">
        <Link href="/" className="navbar-logo" aria-label="BuildMate AI home">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="7" fill="#f59e3f" />
            <path d="M8 20V10l6-3 6 3v10" stroke="#0d0f14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 20v-5h6v5" stroke="#0d0f14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>BuildMate</span>
        </Link>

        <div className="navbar-links" aria-hidden={menuOpen ? "false" : "true"}>
          <Link href="#features">Features</Link>
          <Link href="#how-it-works">How it works</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">
            Start free
          </Link>
        </div>

        <button
          className="navbar-hamburger btn btn-ghost btn-sm"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            {menuOpen ? (
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <>
                <line x1="3" y1="6" x2="17" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="3" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="navbar-mobile-menu">
          <Link href="#features" onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link>
          <Link href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
          <Link href="/login" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>Sign in</Link>
          <Link href="/signup" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Start free</Link>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      {/* Animated canvas background */}
      <div className="hero-video-wrap" aria-hidden="true">
        <CanvasBg />
        <div className="hero-overlay" />
      </div>

      <div className="container hero-content">
        <motion.div
          className="hero-text-group"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="hero-eyebrow">Free to start. 100 credits included.</p>
          <h1 id="hero-heading" className="hero-heading">
            Describe a website.<br />Get working code.
          </h1>
          <p className="hero-subheading">
            Type what you want — a portfolio, a landing page, a student project.
            BuildMate writes the HTML, CSS, and JavaScript. You review, refine, and download.
          </p>
          <motion.div
            className="hero-cta-row"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            <a
              href="/signup"
              className="btn btn-primary btn-lg"
              id="hero-generate-btn"
            >
              Build it free
            </a>
            <a
              href="#how-it-works"
              className="btn btn-secondary btn-lg"
              id="hero-how-btn"
            >
              See how it works
            </a>
          </motion.div>
          <motion.p
            className="hero-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            No account needed to try. No card required.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    {
      number: "01",
      title: "Write a sentence",
      body: "Describe the website you have in mind. Be as specific or as vague as you like — the more detail, the better the result.",
    },
    {
      number: "02",
      title: "Review the result",
      body: "BuildMate generates a complete webpage in seconds. Preview it live, switch between mobile and desktop view, and browse the code.",
    },
    {
      number: "03",
      title: "Refine and download",
      body: "Not happy with the header colour? Type the change. When you're done, download a proper folder of files — index.html, CSS, JS — ready to deploy.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="how-it-works"
      ref={ref}
      aria-labelledby="how-heading"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="section-header"
        >
          <h2 id="how-heading">Three steps, one working website</h2>
          <p>No tutorials, no installs, no blank canvas panic.</p>
        </motion.div>

        <div className="steps-grid">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="step-card"
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              <span className="step-number" aria-hidden="true">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const features = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M3 4h16M3 8h10M3 12h13M3 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
      title: "Live preview",
      body: "See the website in a sandboxed preview as soon as it's generated. Toggle between mobile, tablet, and desktop.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <rect x="2" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M8 9l-3 3 3 3M14 9l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Edit with prompts",
      body: "\"Make the background dark\", \"add a contact form\", \"use a serif font for headings\" — describe the change, done.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M7 2v4M15 2v4M2 9h18M4 4h14a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
      title: "Version history",
      body: "Every generation is saved. Step back to an earlier version any time — no work is ever lost.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M11 2L2 7l9 5 9-5-9-5zM2 15l9 5 9-5M2 11l9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Download as files",
      body: "Get a proper ZIP with index.html, style.css, and main.js — no proprietary formats, no lock-in. Your files, forever.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M11 6v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
      title: "Fast generation",
      body: "Most websites are ready in under 15 seconds. Pro mode uses a larger model for more detail and nuance.",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Student-friendly mode",
      body: "Ask for a student project and you get clean, commented code with a README explaining exactly how it works.",
    },
  ];

  return (
    <section
      id="features"
      className="features-section"
      ref={ref}
      aria-labelledby="features-heading"
    >
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 id="features-heading">Built for people learning the web</h2>
          <p>
            Whether you need a working demo for class, a portfolio for job hunting,
            or a quick mockup for a client — BuildMate covers it.
          </p>
        </motion.div>

        <div className="features-grid">
          {features.map((f, i) => (
            <motion.article
              key={f.title}
              className="feature-card card"
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.07 }}
            >
              <span className="feature-icon" aria-hidden="true">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const fmt = (paise: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(paise / 100);

  const plans = [
    {
      name: "Free",
      price: 0,
      period: "",
      credits: "100 credits, once",
      highlight: false,
      cta: "Get started",
      ctaHref: "/signup",
      features: [
        "100 credits on signup",
        "Webpage generation",
        "Live preview",
        "3 downloads per month",
        "Footer watermark",
      ],
    },
    {
      name: "Student",
      price: 19900,
      period: "/ month",
      credits: "500 credits / month",
      highlight: true,
      cta: "Start Student",
      ctaHref: "/signup?plan=student",
      features: [
        "500 credits per month",
        "No watermark",
        "Unlimited downloads",
        "Prototype mode",
        "Version history",
        "Student mode with comments",
        "Email support",
      ],
    },
    {
      name: "Pro",
      price: 49900,
      period: "/ month",
      credits: "1,500 credits / month",
      highlight: false,
      cta: "Start Pro",
      ctaHref: "/signup?plan=pro",
      features: [
        "1,500 credits per month",
        "Everything in Student",
        "Gemini Pro model",
        "React / Vite export",
        "Custom fonts and themes",
        "Priority generation speed",
      ],
    },
  ];

  return (
    <section
      id="pricing"
      className="pricing-section"
      ref={ref}
      aria-labelledby="pricing-heading"
    >
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 id="pricing-heading">Pricing in Indian Rupees</h2>
          <p>Start free. Upgrade when you need more. Prices include GST.</p>
        </motion.div>

        <div className="pricing-grid">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`pricing-card card ${plan.highlight ? "pricing-card--featured" : ""}`}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {plan.highlight && (
                <span className="pricing-badge badge badge-accent">Most popular</span>
              )}
              <h3>{plan.name}</h3>
              <div className="pricing-price">
                {plan.price === 0 ? (
                  <strong>Free</strong>
                ) : (
                  <>
                    <strong>{fmt(plan.price)}</strong>
                    <span>{plan.period}</span>
                  </>
                )}
              </div>
              <p className="pricing-credits">{plan.credits}</p>
              <ul className="pricing-features" aria-label={`${plan.name} plan features`}>
                {plan.features.map((f) => (
                  <li key={f}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8l3.5 3.5L13 4.5" stroke="#34d17a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={`btn btn-lg ${plan.highlight ? "btn-primary" : "btn-secondary"}`}
                id={`pricing-cta-${plan.name.toLowerCase()}`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FAQ() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [open, setOpen] = useState<number | null>(null);

  const items = [
    {
      q: "Do I need to know how to code?",
      a: "Not at all. You describe what you want in plain English (or Hindi), and BuildMate writes the code. If you do know how to code, you can also open the editor and change things directly.",
    },
    {
      q: "What happens when I run out of credits?",
      a: "You can top up with a one-time credit pack (from ₹99), or upgrade to a monthly plan. We show you an upgrade option the moment your credits hit zero — never a dead end.",
    },
    {
      q: "Can I use the generated code for real projects?",
      a: "Yes. The code belongs to you. There are no usage restrictions. Free-plan sites include a small 'Built with BuildMate AI' footer link; paid plans remove it.",
    },
    {
      q: "What is 'student mode'?",
      a: "Student mode adds detailed comments throughout the code explaining what each part does, and includes a README that describes the project structure. Useful for learning or submitting to a teacher.",
    },
    {
      q: "Is the Razorpay payment secure?",
      a: "Yes. We never store your card details. Payment is processed directly by Razorpay, which is PCI-DSS compliant. We only store the payment confirmation and your updated credit balance.",
    },
  ];

  return (
    <section
      id="faq"
      className="faq-section"
      ref={ref}
      aria-labelledby="faq-heading"
    >
      <div className="container faq-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 id="faq-heading">Common questions</h2>
        </motion.div>

        <div className="faq-list" role="list">
          {items.map((item, i) => (
            <motion.div
              key={i}
              className={`faq-item ${open === i ? "faq-item--open" : ""}`}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: i * 0.06 }}
              role="listitem"
            >
              <button
                className="faq-question"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                id={`faq-q-${i}`}
                aria-controls={`faq-a-${i}`}
              >
                {item.q}
                <svg
                  className={`faq-chevron ${open === i ? "faq-chevron--open" : ""}`}
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M4.5 6.75L9 11.25l4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {open === i && (
                <div
                  className="faq-answer"
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                >
                  <p>{item.a}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link href="/" className="navbar-logo" aria-label="BuildMate AI home">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="7" fill="#f59e3f" />
              <path d="M8 20V10l6-3 6 3v10" stroke="#0d0f14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 20v-5h6v5" stroke="#0d0f14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>BuildMate AI</span>
          </Link>
          <p>Build websites by describing them.</p>
        </div>

        <nav className="footer-nav" aria-label="Footer navigation">
          <div className="footer-col">
            <strong>Product</strong>
            <Link href="#features">Features</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Sign up</Link>
          </div>
          <div className="footer-col">
            <strong>Support</strong>
            <Link href="#faq">FAQ</Link>
            <a href="mailto:hello@buildmate.ai">Contact us</a>
          </div>
          <div className="footer-col">
            <strong>Legal</strong>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms of service</Link>
          </div>
        </nav>
      </div>

      <div className="footer-bottom container">
        <p>© {new Date().getFullYear()} BuildMate AI. Prices include GST.</p>
        <p>Powered by Google Gemini.</p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="marketing-page">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
      </main>
      <Footer />

      <style>{`
        /* ── Navbar ── */
        .navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 1rem 0;
          transition: background var(--duration) var(--ease),
                      backdrop-filter var(--duration) var(--ease),
                      border-bottom var(--duration) var(--ease);
        }

        .navbar--scrolled {
          background: rgba(13, 15, 20, 0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }

        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--text);
        }

        .navbar-links {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .navbar-links a:not(.btn) {
          color: var(--text-2);
          font-size: 0.9rem;
          transition: color var(--duration);
        }

        .navbar-links a:not(.btn):hover { color: var(--text); }

        .navbar-hamburger { display: none; }

        @media (max-width: 700px) {
          .navbar-links { display: none; }
          .navbar-hamburger { display: flex; }
        }

        .navbar-mobile-menu {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border);
        }

        .navbar-mobile-menu a:not(.btn) {
          color: var(--text-2);
          font-size: 1rem;
          padding: 0.25rem 0;
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .hero-video-wrap {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            160deg,
            rgba(13,15,20,0.55) 0%,
            rgba(13,15,20,0.25) 50%,
            rgba(13,15,20,0.80) 100%
          );
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          canvas { display: none; }
          .hero-video-wrap { background: var(--bg); }
        }

        .hero-content {
          position: relative;
          z-index: 1;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-block: 2rem;
        }

        .hero-text-group {
          max-width: 780px;
          text-align: center;
        }

        .hero-eyebrow {
          display: inline-block;
          color: var(--accent);
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 1.25rem;
        }

        .hero-heading {
          color: #fff;
          margin-bottom: 1.5rem;
          text-shadow: 0 2px 32px rgba(0,0,0,0.6);
          font-size: clamp(2.8rem, 6vw, 5rem);
          line-height: 1.1;
        }

        .hero-subheading {
          color: rgba(232,234,240,0.78);
          font-size: clamp(1rem, 2vw, 1.2rem);
          line-height: 1.75;
          max-width: 600px;
          margin-inline: auto;
          margin-bottom: 2.5rem;
        }

        .hero-cta-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }

        .hero-hint {
          color: rgba(232,234,240,0.4);
          font-size: 0.8rem;
          margin-top: 0;
        }

        /* ── Sections shared ── */
        .section-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .section-header p {
          margin-top: 0.75rem;
          font-size: 1rem;
          max-width: 560px;
          margin-inline: auto;
        }

        /* ── How it works ── */
        .how-it-works {
          padding-block: 6rem;
          background: var(--bg-2);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .step-card {
          padding: 2rem;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }

        .step-number {
          display: block;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--accent);
          line-height: 1;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .step-card h3 { margin-bottom: 0.5rem; }

        /* ── Features ── */
        .features-section { padding-block: 6rem; }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }

        .feature-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-glow);
          color: var(--accent);
          border-radius: var(--radius);
          flex-shrink: 0;
        }

        /* ── Pricing ── */
        .pricing-section {
          padding-block: 6rem;
          background: var(--bg-2);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
          align-items: start;
        }

        .pricing-card { position: relative; }

        .pricing-card--featured {
          border-color: var(--accent);
          box-shadow: 0 0 30px var(--accent-glow);
        }

        .pricing-badge {
          position: absolute;
          top: -0.7rem;
          left: 1.5rem;
        }

        .pricing-price {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
          margin-block: 0.75rem;
        }

        .pricing-price strong {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: var(--text);
        }

        .pricing-price span { color: var(--text-2); font-size: 0.9rem; }

        .pricing-credits {
          font-size: 0.8rem;
          color: var(--accent);
          margin-bottom: 1.25rem;
        }

        .pricing-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-bottom: 1.5rem;
        }

        .pricing-features li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-2);
        }

        /* ── FAQ ── */
        .faq-section { padding-block: 6rem; }

        .faq-container {
          max-width: 720px;
        }

        .faq-container h2 { margin-bottom: 2rem; }

        .faq-list { display: flex; flex-direction: column; gap: 0; }

        .faq-item {
          border-bottom: 1px solid var(--border);
        }

        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.25rem 0;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text);
          font-size: 0.975rem;
          font-weight: 500;
          text-align: left;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .faq-question:hover { color: var(--accent); }

        .faq-chevron {
          flex-shrink: 0;
          color: var(--text-3);
          transition: transform var(--duration) var(--ease);
        }

        .faq-chevron--open { transform: rotate(180deg); }

        .faq-answer {
          padding-bottom: 1.25rem;
        }

        .faq-answer p { font-size: 0.9rem; line-height: 1.7; }

        /* ── Footer ── */
        .footer {
          background: var(--bg-2);
          border-top: 1px solid var(--border);
          padding-top: 3rem;
        }

        .footer-inner {
          display: flex;
          gap: 3rem;
          flex-wrap: wrap;
          padding-bottom: 2rem;
        }

        .footer-brand {
          flex: 1;
          min-width: 200px;
        }

        .footer-brand p {
          margin-top: 0.75rem;
          font-size: 0.875rem;
        }

        .footer-nav {
          display: flex;
          gap: 2.5rem;
          flex-wrap: wrap;
        }

        .footer-col {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          font-size: 0.875rem;
        }

        .footer-col strong {
          color: var(--text);
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 0.25rem;
        }

        .footer-col a { color: var(--text-2); transition: color var(--duration); }
        .footer-col a:hover { color: var(--text); }

        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding-block: 1.25rem;
          border-top: 1px solid var(--border);
        }

        .footer-bottom p {
          font-size: 0.8rem;
          color: var(--text-3);
        }

        .marketing-page {
          background: var(--bg);
          min-height: 100dvh;
        }
      `}</style>
    </div>
  );
}
