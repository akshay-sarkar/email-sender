// Local development server — imports the shared Express app and starts listening.
// On Vercel, api/index.js is used instead.
import app from "./app.js"
import { syncAttachments } from "./gdrive.js"

const PORT = process.env.PORT || 3001
const MS_24H = 24 * 60 * 60 * 1000

app.listen(PORT, () => {
  console.log(`Email server running → http://localhost:${PORT}`)
  // Initial sync on startup, then refresh every 24 hours
  syncAttachments().catch((err) => console.error("[gdrive] Startup sync failed:", err.message))
  setInterval(
    () => syncAttachments(true).catch((err) => console.error("[gdrive] Scheduled sync failed:", err.message)),
    MS_24H
  )
})
