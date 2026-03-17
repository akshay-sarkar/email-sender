import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const CACHE_DIR = path.join(__dirname, "../.tmp/attachments")
const SYNC_META = path.join(CACHE_DIR, ".sync.json")
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const extractFolderId = (link) =>
  link?.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1] ?? null

const isCacheStale = () => {
  try {
    const { lastSync } = JSON.parse(fs.readFileSync(SYNC_META, "utf-8"))
    return Date.now() - new Date(lastSync).getTime() > TTL_MS
  } catch {
    return true
  }
}

export const syncAttachments = async (force = false) => {
  const folderLink = process.env.GDRIVE_FOLDER_LINK
  const apiKey = process.env.GDRIVE_API_KEY

  if (!folderLink || !apiKey) {
    console.log("[gdrive] Skipped — GDRIVE_FOLDER_LINK or GDRIVE_API_KEY not set.")
    return
  }
  if (!force && !isCacheStale()) {
    console.log("[gdrive] Cache is fresh, skipping sync.")
    return
  }

  const folderId = extractFolderId(folderLink)
  if (!folderId) throw new Error("Invalid GDRIVE_FOLDER_LINK — cannot extract folder ID.")

  fs.mkdirSync(CACHE_DIR, { recursive: true })
  console.log(`[gdrive] Syncing from folder ${folderId}…`)

  const listUrl =
    `https://www.googleapis.com/drive/v3/files` +
    `?q=${encodeURIComponent(`'${folderId}' in parents and trashed = false`)}` +
    `&fields=${encodeURIComponent("files(id,name,mimeType)")}` +
    `&key=${apiKey}`

  const listRes = await fetch(listUrl)
  const { files, error } = await listRes.json()
  if (error) throw new Error(`Drive API error: ${error.message}`)

  // Skip Google-native formats (Docs, Sheets, Slides) — require export, not direct download
  const downloadable = (files ?? []).filter(
    (f) => !f.mimeType.startsWith("application/vnd.google-apps.")
  )

  if (!downloadable.length) {
    console.log("[gdrive] No downloadable files found in folder.")
    fs.writeFileSync(SYNC_META, JSON.stringify({ lastSync: new Date().toISOString(), files: [] }))
    return
  }

  // Clear old cached files before writing new ones
  fs.readdirSync(CACHE_DIR)
    .filter((f) => !f.startsWith("."))
    .forEach((f) => fs.unlinkSync(path.join(CACHE_DIR, f)))

  const synced = []
  for (const file of downloadable) {
    const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`
    const dest = path.join(CACHE_DIR, file.name)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
      synced.push(file.name)
      console.log(`[gdrive]   ✓ ${file.name}`)
    } catch (err) {
      console.error(`[gdrive]   ✗ ${file.name}: ${err.message}`)
    }
  }

  fs.writeFileSync(
    SYNC_META,
    JSON.stringify({ lastSync: new Date().toISOString(), files: synced })
  )
  console.log(`[gdrive] Sync complete — ${synced.length}/${downloadable.length} file(s) cached.`)
}

export const getCachedFiles = () => {
  if (!fs.existsSync(CACHE_DIR)) return []
  return fs.readdirSync(CACHE_DIR).filter((f) => !f.startsWith("."))
}
