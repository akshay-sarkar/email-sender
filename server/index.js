// Local development server — imports the shared Express app and starts listening.
// On Vercel, api/index.js is used instead.
import app from "./app.js"

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Email server running → http://localhost:${PORT}`)
})
