import express from "express"
import nodemailer from "nodemailer"
import dotenv from "dotenv"
import cors from "cors"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"
import { syncAttachments, getCachedFiles, CACHE_DIR } from "./gdrive.js"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Config: email bodies & subjects (read fresh on each request) ─────────────
const DEFAULT_SUBJECT = "Reaching Out From LinkedIn Post"
const emailBodiesPath = path.join(__dirname, "../email-bodies.json")
const emailSubjectsPath = path.join(__dirname, "../email-subjects.json")

const readJSON = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf-8"))
const writeJSON = (filePath, data) =>
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")

const resolveBody = (name, bodyKey, customBody) => {
  if (bodyKey === "Other") return customBody ?? ""
  const bodies = readJSON(emailBodiesPath)
  const template = bodies[bodyKey] ?? bodies[Object.keys(bodies)[0]]
  const greeting = name?.trim() ? `Dear ${name.trim()},` : "Dear Hiring Manager,"
  return `${greeting}\n\n${template}`
}

const resolveSubject = (subjectKey, customSubject) => {
  if (subjectKey === "Other") return customSubject?.trim() || DEFAULT_SUBJECT
  const subjects = readJSON(emailSubjectsPath)
  return subjects[subjectKey] ?? DEFAULT_SUBJECT
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


app.get("/api/email-bodies", (req, res) => {
  if (!requireAuth(req, res)) return
  res.json({ bodies: readJSON(emailBodiesPath) })
})

app.get("/api/email-subjects", (req, res) => {
  if (!requireAuth(req, res)) return
  res.json({ subjects: readJSON(emailSubjectsPath) })
})

// ─── Admin CRUD ───────────────────────────────────────────────────────────────
const adminUpsert = (filePath) => (req, res) => {
  if (!requireAuth(req, res)) return
  const { key, value } = req.body
  if (!key?.trim()) return res.status(400).json({ error: "key is required." })
  const data = readJSON(filePath)
  data[key.trim()] = value ?? ""
  writeJSON(filePath, data)
  res.json({ ok: true })
}

const adminDelete = (filePath) => (req, res) => {
  if (!requireAuth(req, res)) return
  const key = decodeURIComponent(req.params.key)
  if (key === "Other") return res.status(400).json({ error: '"Other" is a reserved key.' })
  const data = readJSON(filePath)
  if (!(key in data)) return res.status(404).json({ error: `"${key}" not found.` })
  delete data[key]
  writeJSON(filePath, data)
  res.json({ ok: true })
}

app.post("/api/admin/subjects", adminUpsert(emailSubjectsPath))
app.delete("/api/admin/subjects/:key", adminDelete(emailSubjectsPath))
app.post("/api/admin/bodies", adminUpsert(emailBodiesPath))
app.delete("/api/admin/bodies/:key", adminDelete(emailBodiesPath))
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/attachments", async (req, res) => {
  if (!requireAuth(req, res)) return
  try {
    await syncAttachments()
  } catch (err) {
    console.error("[gdrive] Sync error on /api/attachments:", err.message)
  }
  res.json({ files: getCachedFiles() })
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

  const { to, name, attachment, bodyKey, customBody, subjectKey, customSubject } = req.body

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
  const resolvedSubject = resolveSubject(subjectKey, customSubject)
  const resolvedBody = resolveBody(isBulk ? null : name, bodyKey, customBody)

  // Resolve the selected attachment (if any)
  let attachments = []
  if (attachment && typeof attachment === "string" && attachment.trim()) {
    const safeName = path.basename(attachment.trim())
    const filePath = path.join(CACHE_DIR, safeName)
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
