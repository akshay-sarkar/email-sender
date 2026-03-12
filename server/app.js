import express from "express"
import nodemailer from "nodemailer"
import dotenv from "dotenv"
import cors from "cors"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Predefined email content ────────────────────────────────────────────────
const EMAIL_SUBJECT = "Reaching Out From LinkedIn Post"

const buildEmailBody = (name) => {
  const greeting = name?.trim() ? `Dear ${name.trim()},` : "Dear Hiring Manager,"
  return `${greeting}

Hope your are doing well !

Let me introduce myself. I am a seasoned software engineer with 12+ years of experience architecting enterprise applications for Fortune 500 companies and proven leadership in mentoring teams.

7+ years of hands-on expertise in ReactJS, Redux, TypeScript, Material UI, and advanced UI engineering practices, with modern frontend tooling.
Demonstrated experience in delivering SPAs while leveraging React Router, Redux/RTK Architecture, and TanStack Query.

Strong backend and integration expertise with NodeJS, ExpressJS, PHP, Java Spring Boot, MySQL, PostgreSQL, Redis, and MongoDB, including secure REST/GraphQL API design and implementation using JWT, OAuth Integration, and Role-Based Access.

You can learn more about me, https://www.linkedin.com/in/akshaysarkaruta/

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience align with your needs.

Best Regards,
Akshay Sarkar`
}
// ─────────────────────────────────────────────────────────────────────────────

const app = express()
app.use(cors())
app.use(express.json())

// ─── Session token (HMAC — stateless, Vercel-compatible) ─────────────────────
const getSessionToken = () =>
  crypto
    .createHmac("sha256", process.env.APP_PASSWORD)
    .update("email-app-session")
    .digest("hex")

const requireAuth = (req, res) => {
  if (!process.env.APP_PASSWORD) {
    res.status(500).json({ error: "APP_PASSWORD is not set in .env" })
    return false
  }
  if (req.headers["x-session-token"] !== getSessionToken()) {
    res.status(401).json({ error: "Unauthorized." })
    return false
  }
  return true
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Shared helper: list files in attachments/ ───────────────────────────────
const getAttachmentFiles = () => {
  const attachmentsDir = path.join(__dirname, "../attachments")
  if (!fs.existsSync(attachmentsDir)) return []
  return fs
    .readdirSync(attachmentsDir)
    .filter((f) => !f.startsWith(".") && f !== "README.md")
}
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/attachments", (req, res) => {
  if (!requireAuth(req, res)) return
  res.json({ files: getAttachmentFiles() })
})

app.post("/api/verify-password", (req, res) => {
  const { password } = req.body
  if (!process.env.APP_PASSWORD) {
    return res.status(500).json({ ok: false, error: "APP_PASSWORD is not set in .env" })
  }
  if (password === process.env.APP_PASSWORD) {
    res.json({ ok: true, token: getSessionToken() })
  } else {
    res.status(401).json({ ok: false, error: "Incorrect password." })
  }
})

app.get("/api/verify-token", (req, res) => {
  if (!requireAuth(req, res)) return
  res.json({ ok: true })
})

app.post("/api/send-email", async (req, res) => {
  if (!requireAuth(req, res)) return

  const { to, subject, name, attachment } = req.body

  // Parse and validate recipient(s)
  const emails = String(to ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)

  if (emails.length === 0) {
    return res.status(400).json({ error: "At least one email address is required." })
  }

  const invalid = emails.filter((e) => !e.includes("@"))
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Invalid email address(es): ${invalid.join(", ")}` })
  }

  const isBulk = emails.length > 1
  const resolvedSubject = subject?.trim() || EMAIL_SUBJECT
  const resolvedBody = buildEmailBody(isBulk ? null : name)

  // Resolve the selected attachment (if any)
  let attachments = []
  if (attachment && typeof attachment === "string" && attachment.trim()) {
    const safeName = path.basename(attachment.trim())
    const filePath = path.join(__dirname, "../attachments", safeName)
    if (fs.existsSync(filePath)) {
      attachments = [{ filename: safeName, path: filePath }]
    } else {
      return res.status(400).json({ error: `Attachment "${safeName}" not found.` })
    }
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  const attachmentNames = attachments.map((a) => a.filename).join(", ")
  const attachmentSuffix = attachmentNames ? ` with attachment: ${attachmentNames}` : ""

  try {
    if (isBulk) {
      await transporter.sendMail({
        from: `"${process.env.SENDER_NAME || "App"}" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        bcc: emails.join(", "),
        subject: resolvedSubject,
        text: resolvedBody,
        attachments,
      })
      res.json({
        success: true,
        message: `Email sent to ${emails.length} recipients via BCC${attachmentSuffix}`,
      })
    } else {
      const toField = name?.trim() ? `"${name.trim()}" <${emails[0]}>` : emails[0]
      await transporter.sendMail({
        from: `"${process.env.SENDER_NAME || "App"}" <${process.env.GMAIL_USER}>`,
        to: toField,
        subject: resolvedSubject,
        text: resolvedBody,
        attachments,
      })
      res.json({
        success: true,
        message: `Email sent to ${name?.trim() ? `${name.trim()} (${emails[0]})` : emails[0]}${attachmentSuffix}`,
      })
    }
  } catch (err) {
    console.error("Nodemailer error:", err.message)
    res.status(500).json({ error: "Failed to send email.", details: err.message })
  }
})

export default app
