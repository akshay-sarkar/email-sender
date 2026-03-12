# Email Sender

A personal email-sending tool built with **React + Vite + TypeScript** on the frontend and **Express + Nodemailer** on the backend. Supports single and bulk BCC email sending, password-protected access, session persistence, and file attachment selection.

<img width="585" height="321" alt="image" src="https://github.com/user-attachments/assets/a475a575-42f8-41d7-b9e7-3b028dfaca78" />

<img width="608" height="525" alt="image" src="https://github.com/user-attachments/assets/6422e201-8538-4a04-8943-e5d3ddded46e" />


---

## Features

- **Password gate** — app is locked behind a password; authenticated via a stateless HMAC session token
- **Session persistence** — token is stored in `localStorage` so you stay logged in across page refreshes
- **Single send** — address one recipient by email + optional full name (used in greeting and `To` header)
- **Bulk BCC send** — enter comma-separated addresses to send one email via BCC to all recipients
- **Attachment dropdown** — drop any file into the `attachments/` folder and it appears in the dropdown
- **Customisable subject** — override the default subject per send, or leave blank to use the default
- **Vercel-ready** — the Express app is exported as a serverless function via `api/index.js`

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, React Router, Redux Toolkit |
| Backend | Node.js, Express 5, Nodemailer |
| Auth | HMAC-SHA256 session token (stateless, Vercel-compatible) |
| Email | Gmail SMTP via App Password |
| Deployment | Vercel (serverless) |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/akshay-sarkar/email-sender.git
cd email-sender
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
APP_PASSWORD=your_app_password          # Password to unlock the app
GMAIL_USER=you@gmail.com                # Your Gmail address
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # Gmail App Password (not your login password)
SENDER_NAME=Your Name                   # Display name in the From field
PORT=3001                               # Optional, defaults to 3001
```

> **Gmail App Password**: Google Account → Security → 2-Step Verification → App passwords

### 3. Add attachment files (optional)

Drop any files (PDF, DOCX, etc.) into the `attachments/` folder. They will appear in the attachment dropdown. These files are gitignored and never committed.

### 4. Run locally

```bash
npm run dev:all      # starts Vite dev server + Express backend concurrently
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

---

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/email-sender.git
git push -u origin main
```

### 2. Import project in Vercel

Go to [vercel.com/new](https://vercel.com/new), import the repo, and Vercel will auto-detect the config from `vercel.json`.

### 3. Add environment variables

In the Vercel dashboard: **Settings → Environment Variables**, add the same four variables from your `.env`:

- `APP_PASSWORD`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `SENDER_NAME`

> **Note:** Attachment files are gitignored and will not be available in a Vercel deployment. The attachment dropdown will be empty unless files are bundled separately.

---

## Project Structure

```
email-sender/
├── api/
│   └── index.js          # Vercel serverless entry point
├── attachments/          # Drop attachment files here (gitignored)
├── server/
│   ├── app.js            # Shared Express app (routes, auth, email logic)
│   └── index.js          # Local dev launcher (app.listen)
├── src/
│   ├── features/
│   │   └── email/
│   │       └── EmailSender.tsx   # Main email form component
│   └── ...
├── .env.example          # Environment variable template
├── vercel.json           # Vercel build + routing config
└── vite.config.ts        # Vite config with /api proxy for local dev
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start frontend + backend together |
| `npm run dev` | Frontend only (Vite) |
| `npm run server` | Backend only (nodemon) |
| `npm run build` | Production build |
| `npm run deploy` | Deploy to Vercel |

---

## Security

- Credentials are stored exclusively in `.env` (gitignored — never committed)
- The app password is never stored in the browser; only the derived HMAC token is saved in `localStorage`
- Attachment filenames are sanitised with `path.basename()` to prevent path traversal
- All API routes are protected and require a valid session token
