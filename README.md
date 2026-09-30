# BuildMate AI

**Describe a website. Get working code.**

BuildMate AI is an AI-powered website builder for students and beginners. Users describe what they want in plain language; Gemini generates a complete, responsive webpage; they preview, refine, and download a proper ZIP of files.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Animation | Framer Motion |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| AI | Google Gemini API (`@google/genai`) |
| Payments | Razorpay (INR) |
| ZIP export | JSZip |
| Hosting | Vercel |

---

## Setup Guide

### 1. Clone and install

```bash
git clone <your-repo>
cd buildmate-ai
npm install
```

### 2. Firebase setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → Create a new project
2. Enable **Authentication** → Sign-in methods → Email/Password + Google
3. Create a **Firestore database** (start in production mode)
4. Deploy the security rules: copy `firestore.rules` to your project and run `firebase deploy --only firestore:rules`
5. Go to **Project Settings** → Your apps → Add a Web app → Copy the config values
6. Go to **Project Settings** → Service accounts → Generate a new private key → Download the JSON

### 3. Google Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Make sure the key has access to `gemini-2.5-flash` and `gemini-2.5-pro`

### 4. Razorpay setup

1. Create a [Razorpay account](https://razorpay.com/) (test mode for development)
2. Go to Settings → API Keys → Generate Test Key
3. For webhooks: Settings → Webhooks → Add webhook URL: `https://your-domain.com/api/payments/webhook`
4. Select events: `payment.captured`

### 5. Environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Fill in:
- Firebase client config (from Step 2, Firebase web app config)
- Firebase Admin credentials (from Step 2, service account JSON)
- Gemini API key (from Step 3)
- Razorpay keys (from Step 4)

**Important:** `FIREBASE_ADMIN_PRIVATE_KEY` should be the entire private key with literal `\n` characters — wrap it in double quotes in `.env.local`.

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com/) → Import project
3. Add all environment variables from `.env.local` in the Vercel dashboard
4. Deploy

For `FIREBASE_ADMIN_PRIVATE_KEY` on Vercel, paste the raw private key (it handles newlines automatically).

---

## Build Phases Completed

| Phase | Status | Description |
|---|---|---|
| 1 — Foundation | Done | Next.js 16, TypeScript, Tailwind, Framer Motion, folder structure |
| 2 — Firebase & Auth | Done | Client/Admin setup, login/signup/Google, user doc with 100 credits server-side, Firestore rules |
| 3 — Marketing site | Done | Navbar, video-hero, features, pricing (INR), FAQ, footer |
| 4 — Dashboard | Done | Sidebar, stat cards, credit meter, recent projects, quick-start templates |
| 5 — Builder core | Done | Prompt panel, /api/generate + Gemini, live preview iframe, file tree, code editor |
| 6 — Credits system | Done | Cost table, transactional deduction, refunds, ledger, upgrade prompt |
| 7 — Refine + Export | Done | /api/refine, version saves, ZIP export with README |
| 8 — Payments | Done | Razorpay orders, HMAC verification, webhook, plan activation, billing page |

---

## Credit Costs

| Action | Cost |
|---|---|
| Generate webpage (fast model) | 10 credits |
| Generate prototype | 20 credits |
| Generate with Pro model | 25 credits |
| Refine / edit via prompt | 3 credits |
| Download ZIP | Free |

---

## Plans (INR, incl. GST)

| Plan | Price | Credits |
|---|---|---|
| Free | ₹0 | 100 (one-time) |
| Student | ₹199/month | 500/month |
| Pro | ₹499/month | 1,500/month |
| Team | ₹999/month | 4,000/month |

---

## Security Notes

- All secrets live in `.env.local` — never in client code
- Firebase ID tokens verified on every API route via Admin SDK
- Credits and plan modified only server-side (Firestore rules deny client writes)
- Razorpay payments verified via HMAC SHA-256 signature
- Preview runs in a sandboxed `<iframe sandbox="allow-scripts">` — no same-origin access
- CSP headers configured in `next.config.ts`

---

## Project Structure

```
buildmate-ai/
├── app/
│   ├── (marketing)/   — Home, pricing (public)
│   ├── (auth)/        — Login, signup, forgot password
│   ├── (app)/         — Dashboard, builder, projects, billing, settings
│   └── api/           — generate, refine, export, payments, auth
├── components/
│   ├── auth/          — AuthForm, AuthGuard
│   └── dashboard/     — Sidebar, TopBar
├── lib/
│   ├── firebase/      — client.ts, admin.ts
│   ├── gemini/        — client.ts, prompts.ts, parse.ts
│   ├── credits.ts     — Credit costs
│   ├── plans.ts       — Plan definitions + INR formatting
│   ├── razorpay.ts    — Signature helpers
│   └── zip.ts         — ZIP builder
├── types/index.ts     — All TypeScript types
├── firestore.rules    — Security rules
└── .env.example       — Environment variable template
```
