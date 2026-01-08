import React, { useEffect, useState } from 'react'

type Poi = {
  id?: string
  name: string
  lat: number
  lng: number
  radiusMeters: number
  category: string
  shortDescription: string
  ttsText?: string
}

const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '') || ''
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'dev-secret'

const CATEGORIES = [
  { value: 'Monuments', icon: '🏛️', color: '#8b5cf6' },
  { value: 'Musees', icon: '🖼️', color: '#3b82f6' },
  { value: 'Art', icon: '🎨', color: '#ec4899' },
  { value: 'Insolite', icon: '✨', color: '#f59e0b' },
  { value: 'Autre', icon: '📍', color: '#6b7280' },
]

export default function Admin() {
  const [pois, setPois] = useState<Poi[]>([])
  const [form, setForm] = useState<Poi>({
    name: '',
    lat: 48.857,
    lng: 2.351,
    radiusMeters: 50,
    category: 'Autre',
    shortDescription: '',
    ttsText: '',
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    refreshList()
  }, [])

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [status])

  async function refreshList() {
    try {
      const res = await fetch(`${API}/api/pois?lat=48.857&lng=2.351&radius=5000`)
      const j = await res.json()
      setPois(j)
    } catch (e) {
      console.error(e)
    }
  }

  function headers() {
    return { 'Content-Type': 'application/json', 'X-ADMIN-TOKEN': ADMIN_TOKEN }
  }

  function validateForm(f: Poi) {
    const e: Record<string, string> = {}
    if (!f.name || f.name.trim().length === 0) e.name = 'Nom requis'
    if (typeof f.lat !== 'number' || Number.isNaN(f.lat) || f.lat < -90 || f.lat > 90)
      e.lat = 'Latitude invalide'
    if (typeof f.lng !== 'number' || Number.isNaN(f.lng) || f.lng < -180 || f.lng > 180)
      e.lng = 'Longitude invalide'
    if (typeof f.radiusMeters !== 'number' || Number.isNaN(f.radiusMeters) || f.radiusMeters <= 0)
      e.radiusMeters = 'Rayon invalide'
    if (!f.shortDescription || f.shortDescription.trim().length === 0)
      e.shortDescription = 'Description requise'
    return e
  }

  async function submit() {
    const e = validateForm(form)
    setErrors(e)
    if (Object.keys(e).length) {
      setStatus({ type: 'error', message: 'Corriger les erreurs du formulaire' })
      return
    }
    setStatus(null)
    setLoading(true)
    try {
      if (editingId) {
        const res = await fetch(`${API}/api/admin/pois/${editingId}`, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setStatus({ type: 'error', message: `Erreur: ${j.error || res.statusText}` })
        } else {
          const updated = await res.json()
          setPois((p) => p.map((x) => (x.id === updated.id ? updated : x)))
          setStatus({ type: 'success', message: '✅ POI mis à jour' })
          resetForm()
        }
      } else {
        const res = await fetch(`${API}/api/admin/pois`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setStatus({ type: 'error', message: `Erreur: ${j.error || res.statusText}` })
        } else {
          const created = await res.json()
          setPois((p) => [created, ...p])
          setStatus({ type: 'success', message: '✅ POI créé' })
          resetForm()
        }
      }
    } catch (err: any) {
      console.error(err)
      setStatus({ type: 'error', message: 'Erreur réseau' })
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setForm({
      name: '',
      lat: 48.857,
      lng: 2.351,
      radiusMeters: 50,
      category: 'Autre',
      shortDescription: '',
      ttsText: '',
    })
    setEditingId(null)
    setErrors({})
  }

  function startEdit(p: Poi) {
    setEditingId(p.id || null)
    setForm({ ...p })
    setErrors({})
    setStatus(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deletePoi(id?: string) {
    if (!id) return
    if (!confirm('Supprimer ce POI ?')) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/pois/${id}`, {
        method: 'DELETE',
        headers: headers(),
      })
      if (res.status === 204) {
        setPois((p) => p.filter((x) => x.id !== id))
        setStatus({ type: 'success', message: '🗑️ POI supprimé' })
      } else {
        const j = await res.json().catch(() => ({}))
        setStatus({ type: 'error', message: `Erreur: ${j.error || res.statusText}` })
      }
    } catch (err) {
      console.error(err)
      setStatus({ type: 'error', message: 'Erreur réseau' })
    } finally {
      setLoading(false)
    }
  }

  const getCategoryInfo = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat) || CATEGORIES[4]

  return (
    <main style={styles.main}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <a href="/" style={styles.backLink}>
            ← Retour à l'app
          </a>
          <h1 style={styles.title}>
            <span style={styles.titleIcon}>🗺️</span>
            Admin POIs
          </h1>
          <div style={styles.stats}>
            <span style={styles.statBadge}>{pois.length} POIs</span>
          </div>
        </div>
      </header>

      {/* Status toast */}
      {status && (
        <div
          style={{
            ...styles.toast,
            background: status.type === 'success' ? '#22c55e' : '#ef4444',
          }}
        >
          {status.message}
        </div>
      )}

      <div style={styles.container}>
        {/* Form Section */}
        <section style={styles.formSection}>
          <h2 style={styles.sectionTitle}>
            {editingId ? '✏️ Modifier le POI' : '➕ Nouveau POI'}
          </h2>

          <div style={styles.formGrid}>
            <FormField label="Nom du lieu" error={errors.name} required>
              <input
                style={styles.input}
                placeholder="Ex: Tour Eiffel"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>

            <div style={styles.row}>
              <FormField label="Latitude" error={errors.lat} required>
                <input
                  style={styles.input}
                  type="number"
                  step="any"
                  placeholder="48.8584"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })}
                />
              </FormField>
              <FormField label="Longitude" error={errors.lng} required>
                <input
                  style={styles.input}
                  type="number"
                  step="any"
                  placeholder="2.2945"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })}
                />
              </FormField>
            </div>

            <div style={styles.row}>
              <FormField label="Rayon (m)" error={errors.radiusMeters} required>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="50"
                  value={form.radiusMeters}
                  onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })}
                />
              </FormField>
              <FormField label="Catégorie">
                <select
                  style={styles.select}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.value}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Description courte" error={errors.shortDescription} required>
              <input
                style={styles.input}
                placeholder="Brève description du lieu"
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              />
            </FormField>

            <FormField label="Texte TTS (audio)">
              <textarea
                style={styles.textarea}
                placeholder="Texte lu par la synthèse vocale..."
                value={form.ttsText}
                onChange={(e) => setForm({ ...form, ttsText: e.target.value })}
                rows={4}
              />
            </FormField>

            <div style={styles.formActions}>
              <button
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  opacity: loading ? 0.7 : 1,
                }}
                onClick={submit}
                disabled={loading}
              >
                {loading ? '⏳' : editingId ? '💾 Enregistrer' : '➕ Créer'}
              </button>
              {editingId && (
                <button style={{ ...styles.button, ...styles.ghostButton }} onClick={resetForm}>
                  ✕ Annuler
                </button>
              )}
            </div>
          </div>
        </section>

        {/* List Section */}
        <section style={styles.listSection}>
          <h2 style={styles.sectionTitle}>📋 Liste des POIs</h2>

          {pois.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🗺️</span>
              <p>Aucun POI pour le moment</p>
              <p style={styles.emptyHint}>Créez votre premier point d'intérêt ci-dessus</p>
            </div>
          ) : (
            <div style={styles.poiGrid}>
              {pois.map((p: Poi) => {
                const cat = getCategoryInfo(p.category)
                return (
                  <div key={p.id} style={styles.poiCard}>
                    <div style={styles.poiHeader}>
                      <span
                        style={{
                          ...styles.poiCategoryBadge,
                          background: `${cat.color}20`,
                          color: cat.color,
                        }}
                      >
                        {cat.icon} {cat.value}
                      </span>
                      <span style={styles.poiRadius}>{p.radiusMeters}m</span>
                    </div>
                    <h3 style={styles.poiName}>{p.name}</h3>
                    <p style={styles.poiDescription}>{p.shortDescription}</p>
                    <div style={styles.poiCoords}>
                      📍 {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                    </div>
                    <div style={styles.poiActions}>
                      <button
                        style={{ ...styles.button, ...styles.smallButton }}
                        onClick={() => startEdit(p)}
                      >
                        ✏️ Éditer
                      </button>
                      <button
                        style={{ ...styles.button, ...styles.smallButton, ...styles.dangerButton }}
                        onClick={() => deletePoi(p.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>
      {children}
      {error && <span style={styles.error}>{error}</span>}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  header: {
    background: 'rgba(15, 23, 42, 0.95)',
    borderBottom: '1px solid #334155',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(8px)',
  },
  headerContent: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  backLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid #334155',
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  titleIcon: {
    fontSize: 28,
  },
  stats: {
    display: 'flex',
    gap: 8,
  },
  statBadge: {
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  toast: {
    position: 'fixed',
    top: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    borderRadius: 12,
    color: '#fff',
    fontWeight: 600,
    zIndex: 1000,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    animation: 'slideDown 0.3s ease',
  },
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '32px 24px',
    display: 'grid',
    gap: 32,
  },
  formSection: {
    background: '#1e293b',
    borderRadius: 16,
    padding: 24,
    border: '1px solid #334155',
  },
  listSection: {
    background: '#1e293b',
    borderRadius: 16,
    padding: 24,
    border: '1px solid #334155',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
  },
  required: {
    color: '#ef4444',
    marginLeft: 4,
  },
  input: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  select: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
  },
  textarea: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
  },
  formActions: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  button: {
    padding: '12px 20px',
    borderRadius: 10,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.1s, opacity 0.2s',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: '#fff',
  },
  ghostButton: {
    background: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
  },
  smallButton: {
    padding: '8px 12px',
    fontSize: 13,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid #334155',
    color: '#e2e8f0',
  },
  dangerButton: {
    color: '#fca5a5',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: 48,
    display: 'block',
    marginBottom: 16,
  },
  emptyHint: {
    fontSize: 13,
    color: '#475569',
  },
  poiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 16,
  },
  poiCard: {
    background: '#0f172a',
    borderRadius: 12,
    padding: 16,
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    transition: 'border-color 0.2s, transform 0.2s',
  },
  poiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poiCategoryBadge: {
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
  },
  poiRadius: {
    color: '#64748b',
    fontSize: 12,
  },
  poiName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  poiDescription: {
    color: '#94a3b8',
    fontSize: 13,
    margin: 0,
    lineHeight: 1.5,
  },
  poiCoords: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  poiActions: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
}
