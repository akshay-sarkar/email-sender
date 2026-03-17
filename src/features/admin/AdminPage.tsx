import { useState, useEffect } from "react"
import { Link } from "react-router-dom"

const TOKEN_KEY = "emailAppToken"
type Section = "subjects" | "bodies"

export const AdminPage = () => {
  const [token, setToken] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  const [activeSection, setActiveSection] = useState<Section>("subjects")
  const [subjects, setSubjects] = useState<Record<string, string>>({})
  const [bodies, setBodies] = useState<Record<string, string>>({})

  // Inline editing
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [editStatus, setEditStatus] = useState<"idle" | "saving">("idle")

  // Add new entry
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [addError, setAddError] = useState("")
  const [addStatus, setAddStatus] = useState<"idle" | "saving">("idle")

  // Toast
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) { setChecking(false); return }
    fetch("/api/verify-token", { headers: { "x-session-token": stored } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setToken(stored)
          setAuthenticated(true)
          loadAll(stored)
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  const loadAll = (tok: string) => {
    fetch("/api/email-subjects", { headers: { "x-session-token": tok } })
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects ?? {}))
      .catch(() => {})
    fetch("/api/email-bodies", { headers: { "x-session-token": tok } })
      .then((r) => r.json())
      .then((d) => setBodies(d.bodies ?? {}))
      .catch(() => {})
  }

  const notify = (text: string, error = false) => {
    setToast({ text, error })
    setTimeout(() => setToast(null), 3000)
  }

  const isSubjects = activeSection === "subjects"
  const currentData = isSubjects ? subjects : bodies
  const setCurrentData = isSubjects ? setSubjects : setBodies
  const apiBase = isSubjects ? "/api/admin/subjects" : "/api/admin/bodies"

  const switchSection = (s: Section) => {
    setActiveSection(s)
    setEditingKey(null)
    setNewKey("")
    setNewValue("")
    setAddError("")
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const key = newKey.trim()
    if (!key) return
    if (key === "Other") { setAddError('"Other" is a reserved key.'); return }
    if (key in currentData) { setAddError(`"${key}" already exists. Edit it instead.`); return }
    setAddStatus("saving")
    setAddError("")
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-token": token },
        body: JSON.stringify({ key, value: newValue }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentData((prev) => ({ ...prev, [key]: newValue }))
        setNewKey("")
        setNewValue("")
        notify(`"${key}" added.`)
      } else {
        setAddError(data.error || "Failed to add.")
      }
    } catch {
      setAddError("Network error.")
    } finally {
      setAddStatus("idle")
    }
  }

  const handleSaveEdit = async (key: string) => {
    setEditStatus("saving")
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-token": token },
        body: JSON.stringify({ key, value: editingValue }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentData((prev) => ({ ...prev, [key]: editingValue }))
        setEditingKey(null)
        notify(`"${key}" updated.`)
      } else {
        notify(data.error || "Failed to update.", true)
      }
    } catch {
      notify("Network error.", true)
    } finally {
      setEditStatus("idle")
    }
  }

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete "${key}"?`)) return
    try {
      const res = await fetch(`${apiBase}/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { "x-session-token": token },
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentData((prev) => { const next = { ...prev }; delete next[key]; return next })
        notify(`"${key}" deleted.`)
      } else {
        notify(data.error || "Failed to delete.", true)
      }
    } catch {
      notify("Network error.", true)
    }
  }

  if (checking) return <section className="admin"><p className="admin__checking">Checking session…</p></section>

  if (!authenticated) {
    return (
      <section className="admin">
        <h2>Access Required</h2>
        <p>Please <Link to="/">authenticate on the home page</Link> first.</p>
      </section>
    )
  }

  return (
    <section className="admin">
      <h2>Email Configuration</h2>

      <div className="admin__tabs">
        <button
          className={`admin__tab${isSubjects ? " admin__tab--active" : ""}`}
          onClick={() => switchSection("subjects")}
        >
          Subjects
        </button>
        <button
          className={`admin__tab${!isSubjects ? " admin__tab--active" : ""}`}
          onClick={() => switchSection("bodies")}
        >
          Bodies
        </button>
      </div>

      {toast && (
        <div className={`admin__toast${toast.error ? " admin__toast--error" : " admin__toast--success"}`}>
          {toast.text}
        </div>
      )}

      <div className="admin__list">
        {Object.entries(currentData).map(([key, value]) => (
          <div key={key} className="admin__entry">
            {editingKey === key ? (
              <div className="admin__editRow">
                <span className="admin__entryKey">{key}</span>
                {isSubjects ? (
                  <input
                    className="admin__input"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <textarea
                    className="admin__input admin__textarea"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    rows={7}
                    autoFocus
                  />
                )}
                <div className="admin__rowActions">
                  <button
                    className="admin__btn admin__btn--save"
                    onClick={() => handleSaveEdit(key)}
                    disabled={editStatus === "saving"}
                  >
                    {editStatus === "saving" ? "Saving…" : "Save"}
                  </button>
                  <button className="admin__btn admin__btn--cancel" onClick={() => setEditingKey(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="admin__viewRow">
                <span className="admin__entryKey">{key}</span>
                <span className="admin__entryValue">
                  {key === "Other"
                    ? <em className="admin__reserved">custom input at send time</em>
                    : isSubjects
                      ? value
                      : value.slice(0, 90) + (value.length > 90 ? "…" : "")}
                </span>
                {key !== "Other" && (
                  <div className="admin__rowActions">
                    <button
                      className="admin__btn admin__btn--edit"
                      onClick={() => { setEditingKey(key); setEditingValue(value) }}
                    >
                      Edit
                    </button>
                    <button className="admin__btn admin__btn--delete" onClick={() => handleDelete(key)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="admin__addSection">
        <h3>Add New {isSubjects ? "Subject" : "Body"}</h3>
        <form onSubmit={handleAdd} className="admin__form">
          <label className="admin__label">Label (shown in dropdown)</label>
          <input
            className="admin__input"
            value={newKey}
            onChange={(e) => { setNewKey(e.target.value); setAddError("") }}
            placeholder={isSubjects ? "e.g. Follow Up" : "e.g. Networking"}
            required
          />

          <label className="admin__label">{isSubjects ? "Subject Text" : "Body Text"}</label>
          {isSubjects ? (
            <input
              className="admin__input"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="e.g. Following Up on My Application"
            />
          ) : (
            <textarea
              className="admin__input admin__textarea"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={"Body text (greeting line is added automatically)…"}
              rows={8}
            />
          )}

          {addError && <p className="admin__error">{addError}</p>}
          <button
            type="submit"
            className="admin__btn admin__btn--add"
            disabled={addStatus === "saving" || !newKey.trim()}
          >
            {addStatus === "saving" ? "Adding…" : `Add ${isSubjects ? "Subject" : "Body"}`}
          </button>
        </form>
      </div>
    </section>
  )
}
