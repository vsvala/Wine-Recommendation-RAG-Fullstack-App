import { useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:3001/recommend'

/**
 * Single wine result card.
 * Shows rank, title, metadata badges, AI explanation, and full description.
 */
function WineCard({ wine, index }) {
  return (
    <div className="wine-card">
      <div className="wine-rank">#{index + 1}</div>
      <div className="wine-body">
        <div className="wine-header">
          <h3 className="wine-title">{wine.title}</h3>
          <div className="wine-meta">
            <span className="badge">{wine.variety}</span>
            {wine.country && <span className="badge">{wine.country}</span>}
            <span className="badge badge--score">{wine.points} pts</span>
            <span className="badge badge--price">${wine.price}</span>
          </div>
        </div>
        {/* AI-generated explanation from explainer.js */}
        {wine.explanation && (
          <p className="wine-explanation">{wine.explanation}</p>
        )}
        <p className="wine-description">{wine.description}</p>
      </div>
    </div>
  )
}

/**
 * Root application component.
 *
 * Flow:
 *   user types query → POST /recommend → vector search → hybrid ranking → LLM blurbs → render cards
 *
 * State:
 *   query     - current input value
 *   wines     - array of ranked wine objects returned by the API
 *   loading   - true while request is in-flight
 *   error     - error message string, empty when no error
 *   fromCache - whether the API returned a cached result (shown as a badge)
 */
export default function App() {
  const [query, setQuery] = useState('')
  const [wines, setWines] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fromCache, setFromCache] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    setLoading(true)
    setError('')
    setWines([])
    setFromCache(false)

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Server error ${res.status}`)
      }

      const data = await res.json()
      setWines(data.wines)
      setFromCache(data.fromCache)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <span className="logo-icon" aria-hidden="true">🍷</span>
          <div>
            <h1>Wine Recommender</h1>
            <p className="tagline">Describe what you're looking for and get AI-powered recommendations</p>
          </div>
        </div>
      </header>

      <main className="main">
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            className="search-input"
            type="text"
            placeholder='e.g. "bold red wine for steak under $30"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            aria-label="Wine query"
          />
          <button
            className="search-btn"
            type="submit"
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching…' : 'Find Wines'}
          </button>
        </form>

        {error && (
          <div className="error" role="alert">{error}</div>
        )}

        {wines.length > 0 && (
          <section className="results">
            <div className="results-header">
              <h2>Top {wines.length} recommendations</h2>
              {fromCache && <span className="cache-badge">cached</span>}
            </div>
            <div className="wine-list">
              {wines.map((wine, i) => (
                <WineCard key={i} wine={wine} index={i} />
              ))}
            </div>
          </section>
        )}

        {!loading && wines.length === 0 && !error && (
          <p className="empty-state">
            Try <em>"light white wine for seafood"</em> or <em>"spicy Argentinian Malbec under $25"</em>
          </p>
        )}
      </main>
    </div>
  )
}
