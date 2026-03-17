# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev:all    # Start both frontend (Vite) and backend (Express) concurrently — use this for local dev
npm run dev        # Frontend only (Vite on port 5173)
npm run server     # Backend only (Nodemon on port 3001)
npm run build      # TypeScript check + Vite production build → dist/
npm run deploy     # Deploy to Vercel production
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
npm run format     # Prettier format
npm test           # Vitest (jsdom environment)
```

## Architecture

This is a personal email-sending SPA: a React/Redux frontend + Express backend, deployable to Vercel as a static site + serverless function.

### Frontend (`src/`)
- **Entry**: `src/main.tsx` → Redux Provider → `src/App.tsx` (React Router)
- **Main feature**: `src/features/email/EmailSender.tsx` — password gate + email form (single and bulk BCC send modes)
- **Demo content**: `src/features/posts/`, `src/features/users/`, `src/features/quotes/` — Redux Essentials example code, not part of the core feature
- **Redux store**: `src/app/store.ts` exports `makeStore(preloadedState)` factory (required for testing). Always import typed hooks from `src/app/hooks.ts` — ESLint enforces this.

### Backend (`server/`)
- **`server/app.js`**: Shared Express app with all routes and logic (imported by both local dev and Vercel serverless)
- **`server/index.js`**: Local dev launcher (starts Express on `PORT`, default 3001)
- **`api/index.js`**: Vercel serverless entry point — exports the same Express app

### API Routes (all in `server/app.js`)
| Route | Auth required | Purpose |
|---|---|---|
| `POST /api/verify-password` | No | Validates `APP_PASSWORD`, returns HMAC token |
| `GET /api/verify-token` | Yes | Token liveness check (used on page load) |
| `GET /api/attachments` | Yes | Lists files in `attachments/` folder |
| `POST /api/send-email` | Yes | Sends email via Gmail SMTP (Nodemailer) |

### Auth Pattern
Stateless HMAC-based: `APP_PASSWORD` → deterministic HMAC-SHA256 token → stored in `localStorage` as `"emailAppToken"` → sent as `x-session-token` header. No session state on server.

### Local dev vs. Vercel
Vite dev server proxies `/api/*` → `http://localhost:3001` (see `vite.config.ts`). On Vercel, `vercel.json` rewrites `/api/*` to `api/index.js` serverless handler and `/*` to `index.html`.

### Environment Variables (`.env`)
```
APP_PASSWORD        # Password gate for the app
GMAIL_USER          # Sender Gmail address
GMAIL_APP_PASSWORD  # Gmail App Password (2-step verification → App Passwords)
SENDER_NAME         # Display name in From field
PORT                # Backend port (default 3001)
```

### Attachments
Files placed in `attachments/` appear in the UI dropdown. The folder is gitignored. `path.basename()` is used server-side to prevent path traversal.

### Email Body
`buildEmailBody(name)` in `server/app.js` contains a hardcoded email template. Bulk send (2+ comma-separated addresses) uses BCC and "Dear Hiring Manager,"; single send uses the recipient name from the form.
