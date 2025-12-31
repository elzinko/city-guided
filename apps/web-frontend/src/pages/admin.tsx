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

export default function Admin() {
  const [pois, setPois] = useState<Poi[]>([])
  const [form, setForm] = useState<Poi>({ name: '', lat: 48.857, lng: 2.351, radiusMeters: 50, category: 'Autre', shortDescription: '', ttsText: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    refreshList()
  }, [])

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
    if (typeof f.lat !== 'number' || Number.isNaN(f.lat) || f.lat < -90 || f.lat > 90) e.lat = 'Latitude invalide'
    if (typeof f.lng !== 'number' || Number.isNaN(f.lng) || f.lng < -180 || f.lng > 180) e.lng = 'Longitude invalide'
    if (typeof f.radiusMeters !== 'number' || Number.isNaN(f.radiusMeters) || f.radiusMeters <= 0) e.radiusMeters = 'Rayon invalide'
    if (!f.shortDescription || f.shortDescription.trim().length === 0) e.shortDescription = 'Description requise'
    return e
  }

  async function submit() {
    const e = validateForm(form)
    setErrors(e)
    if (Object.keys(e).length) return setStatus('Corriger les erreurs du formulaire')
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
          setStatus(`Erreur mise à jour: ${j.error || res.statusText}`)
        } else {
          const updated = await res.json()
          setPois((p) => p.map((x) => (x.id === updated.id ? updated : x)))
          setStatus('Mis à jour')
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
          setStatus(`Erreur création: ${j.error || res.statusText}`)
        } else {
          const created = await res.json()
          setPois((p) => [created, ...p])
          setStatus('Créé')
          resetForm()
        }
      }
    } catch (err: any) {
      console.error(err)
      setStatus('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setForm({ name: '', lat: 48.857, lng: 2.351, radiusMeters: 50, category: 'Autre', shortDescription: '', ttsText: '' })
    setEditingId(null)
    setErrors({})
  }

  function startEdit(p: Poi) {
    setEditingId(p.id || null)
    setForm({ ...p })
    setErrors({})
    setStatus(null)
  }

  async function deletePoi(id?: string) {
    if (!id) return
    if (!confirm('Supprimer ce POI ?')) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/pois/${id}`, { method: 'DELETE', headers: headers() })
      if (res.status === 204) {
        setPois((p) => p.filter((x) => x.id !== id))
        setStatus('Supprimé')
      } else {
        const j = await res.json().catch(() => ({}))
        setStatus(`Erreur suppression: ${j.error || res.statusText}`)
      }
    } catch (err) {
      console.error(err)
      setStatus('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const deployedCommit = process.env.NEXT_PUBLIC_RENDER_DEPLOYED_COMMIT || null
  const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO || null

  return (
    <main style={{ padding: 20 }}>
      <h1>Admin — POIs</h1>
      <div style={{ marginBottom: 12 }}>
        <strong>Render déployé:</strong>{' '}
        {deployedCommit ? (
          <span>
            <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{deployedCommit.slice(0, 7)}</code>
            {githubRepo ? (
              <a style={{ marginLeft: 8 }} href={`https://github.com/${githubRepo}/commit/${deployedCommit}`} target="_blank" rel="noreferrer">
                Voir le commit
              </a>
            ) : null}
          </span>
        ) : (
          <span>inconnu</span>
        )}
      </div>
      <section>
        <h2>{editingId ? 'Modifier un POI' : 'Créer un POI'}</h2>
        <div style={{ display: 'grid', gap: 8, maxWidth: 540 }}>
          <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {errors.name && <small style={{ color: 'red' }}>{errors.name}</small>}

          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} placeholder="Lat" value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} />
            <input style={{ flex: 1 }} placeholder="Lng" value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} />
          </div>
          {(errors.lat || errors.lng) && <small style={{ color: 'red' }}>{errors.lat || errors.lng}</small>}

          <input placeholder="Rayon (m)" value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })} />
          {errors.radiusMeters && <small style={{ color: 'red' }}>{errors.radiusMeters}</small>}

          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['Monuments', 'Musees', 'Art', 'Insolite', 'Autre'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input placeholder="Courte description" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
          {errors.shortDescription && <small style={{ color: 'red' }}>{errors.shortDescription}</small>}

          <textarea placeholder="TTS text" value={form.ttsText} onChange={(e) => setForm({ ...form, ttsText: e.target.value })} />

          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={loading} onClick={submit}>{editingId ? 'Enregistrer' : 'Créer'}</button>
            {editingId && <button onClick={resetForm}>Annuler</button>}
            <span style={{ marginLeft: 12 }}>{status}</span>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Liste</h2>
        <ul>
          {pois.map((p: any) => (
            <li key={p.id} style={{ marginBottom: 8 }}>
              <strong>{p.name}</strong> — {p.shortDescription} <br />
              <button onClick={() => startEdit(p)}>Éditer</button>
              <button onClick={() => deletePoi(p.id)} style={{ marginLeft: 8 }}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
