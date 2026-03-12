import { useState, useEffect } from "react"

type SendStatus = "idle" | "sending" | "success" | "error"

const TOKEN_KEY = "emailAppToken"

export const EmailSender = () => {
  // ─── Auth state ───────────────────────────────────────────────────────────
  const [authenticated, setAuthenticated] = useState(false)
  const [sessionToken, setSessionToken] = useState("")
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [autoChecking, setAutoChecking] = useState(true)

  // ─── Attachment list ──────────────────────────────────────────────────────
  const [attachmentFiles, setAttachmentFiles] = useState<string[]>([])
  const [selectedAttachment, setSelectedAttachment] = useState("")

  // ─── Email state ──────────────────────────────────────────────────────────
  const [email, setEmail] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [subject, setSubject] = useState("")
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle")
  const [sendMessage, setSendMessage] = useState("")

  // Derived: true when the email field contains 2+ comma-separated addresses
  const emailList = email.split(",").map((e) => e.trim()).filter(Boolean)
  const isMultiple = emailList.length > 1

  // ─── Helper: fetch attachment list ───────────────────────────────────────
  const loadAttachments = (token: string) => {
    fetch("/api/attachments", { headers: { "x-session-token": token } })
      .then((r) => r.json())
      .then((data) => {
        const files = data.files ?? []
        setAttachmentFiles(files)
        setSelectedAttachment(files[0] ?? "")
      })
      .catch(() => setAttachmentFiles([]))
  }

  // ─── Auto-authenticate from localStorage on mount ────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (!storedToken) {
      setAutoChecking(false)
      return
    }
    fetch("/api/verify-token", { headers: { "x-session-token": storedToken } })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setSessionToken(storedToken)
          setAuthenticated(true)
          loadAttachments(storedToken)
        } else {
          localStorage.removeItem(TOKEN_KEY)
        }
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setAutoChecking(false))
  }, [])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setPasswordError("")

    try {
      const res = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      })

      const data = await res.json()

      if (res.ok && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token)
        setSessionToken(data.token)
        setAuthenticated(true)
        setPasswordInput("")
        loadAttachments(data.token)
      } else {
        setPasswordError(data.error || "Incorrect password.")
      }
    } catch {
      setPasswordError("Network error — is the server running?")
    } finally {
      setVerifying(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendStatus("sending")
    setSendMessage("")

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-token": sessionToken,
        },
        body: JSON.stringify({
          to: email,
          // name is ignored for bulk sends
          ...(!isMultiple && recipientName.trim() && { name: recipientName.trim() }),
          ...(subject.trim() && { subject: subject.trim() }),
          ...(selectedAttachment && { attachment: selectedAttachment }),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSendStatus("success")
        setSendMessage(data.message)
        setEmail("")
        setRecipientName("")
        setSubject("")
        setSelectedAttachment(attachmentFiles[0] ?? "")
      } else {
        setSendStatus("error")
        setSendMessage(data.error || "Something went wrong.")
      }
    } catch {
      setSendStatus("error")
      setSendMessage("Network error — is the server running?")
    }
  }

  // ─── Auto-checking (brief flash while validating stored token) ────────────
  if (autoChecking) {
    return (
      <section className="emailSender">
        <p className="emailSender__description">Checking session…</p>
      </section>
    )
  }

  // ─── Password gate ────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <section className="emailSender">
        <h2>Access Required</h2>
        <p className="emailSender__description">Enter the app password to continue.</p>

        <form onSubmit={handlePasswordSubmit} className="emailSender__form">
          <label htmlFor="appPassword">Password</label>
          <input
            id="appPassword"
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter password"
            required
            autoFocus
            disabled={verifying}
            className="emailSender__input"
          />
          <button
            type="submit"
            disabled={verifying || !passwordInput}
            className="emailSender__button"
          >
            {verifying ? "Checking…" : "Unlock"}
          </button>
        </form>

        {passwordError && (
          <div className="emailSender__alert emailSender__alert--error">✗ {passwordError}</div>
        )}
      </section>
    )
  }

  // ─── Email form ───────────────────────────────────────────────────────────
  return (
    <section className="emailSender">
      <h2>Send Email</h2>
      <p className="emailSender__description">
        Enter a recipient address below. A predefined message will be sent with any files placed in
        the <code>attachments/</code> folder.
      </p>

      <form onSubmit={handleEmailSubmit} className="emailSender__form">
        <label htmlFor="recipientName">
          Full Name{" "}
          {isMultiple ? (
            <span className="emailSender__optional">(not used for bulk send)</span>
          ) : (
            <span className="emailSender__optional">(optional)</span>
          )}
        </label>
        <input
          id="recipientName"
          type="text"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Jane Smith"
          disabled={sendStatus === "sending" || isMultiple}
          className={`emailSender__input${isMultiple ? " emailSender__input--disabled" : ""}`}
        />

        <label htmlFor="recipient">
          {isMultiple ? (
            <>
              Recipient Emails{" "}
              <span className="emailSender__badge">BCC · {emailList.length} recipients</span>
            </>
          ) : (
            "Recipient Email"
          )}
        </label>
        <input
          id="recipient"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="one@example.com, two@example.com, …"
          required
          disabled={sendStatus === "sending"}
          className="emailSender__input"
        />

        <label htmlFor="subject">
          Subject <span className="emailSender__optional">(optional — uses default if blank)</span>
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Hello from us!"
          disabled={sendStatus === "sending"}
          className="emailSender__input"
        />

        <label htmlFor="attachment">Attachment</label>
        {attachmentFiles.length > 0 ? (
          <select
            id="attachment"
            value={selectedAttachment}
            onChange={(e) => setSelectedAttachment(e.target.value)}
            disabled={sendStatus === "sending"}
            className="emailSender__input emailSender__select"
          >
            {attachmentFiles.map((file) => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
        ) : (
          <p className="emailSender__hint">
            No files found in <code>attachments/</code>. Drop files there to populate this list.
          </p>
        )}

        <button
          type="submit"
          disabled={sendStatus === "sending" || !email.trim()}
          className="emailSender__button"
        >
          {sendStatus === "sending" ? "Sending…" : "Send Email"}
        </button>
      </form>

      {sendStatus === "success" && (
        <div className="emailSender__alert emailSender__alert--success">✓ {sendMessage}</div>
      )}

      {sendStatus === "error" && (
        <div className="emailSender__alert emailSender__alert--error">✗ {sendMessage}</div>
      )}

      <button
        onClick={() => {
          localStorage.removeItem(TOKEN_KEY)
          setAuthenticated(false)
          setSessionToken("")
          setSendStatus("idle")
          setAttachmentFiles([])
          setSelectedAttachment("")
        }}
        className="emailSender__lockButton"
      >
        Lock
      </button>
    </section>
  )
}
