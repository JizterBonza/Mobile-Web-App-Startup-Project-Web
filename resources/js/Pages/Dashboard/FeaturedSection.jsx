import { useEffect, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { ChevronDown, ChevronUp, Plus, Search, Star, Trash2 } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

const SECTION_COPY = {
  product: 'Active products from active Agrivet stores. Customers see them in this order.',
  agrivet_store: 'Active Agrivet stores. Customers see them in this order.',
  farm: 'Active farms. Customers see them in this order.',
}

function featuredPath(userType) {
  return userType === 'admin' ? '/dashboard/admin/featured' : '/dashboard/super-admin/featured'
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function Thumb({ src, name }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#E8EEF9] text-xs font-semibold text-[#102059]">
        {initials(name)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      className="h-12 w-12 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  )
}

export default function FeaturedSection({ auth, sections = {}, candidates = [], filters = {}, maxPerSection = 24, flash }) {
  const errors = usePage().props.errors ?? {}
  const baseRoute = featuredPath(auth?.user?.user_type)
  const [section, setSection] = useState(filters.section || 'product')
  const [query, setQuery] = useState(filters.q || '')
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const [pendingRemove, setPendingRemove] = useState(null)
  const [showSuccess, setShowSuccess] = useState(true)
  const [showError, setShowError] = useState(true)

  const current = sections[section] ?? { label: 'Featured', entries: [], total: 0, visible_count: 0 }
  const entries = current.entries ?? []
  const normalizedQuery = query.trim().length >= 2 ? query.trim() : ''
  const candidatesMatch = (filters.section || 'product') === section && (filters.q || '') === normalizedQuery
  const visibleCandidates = candidatesMatch ? candidates : []
  const errorText = Object.values(errors)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .join(' ')
  const atCapacity = entries.length >= maxPerSection

  useEffect(() => {
    if (flash?.success) setShowSuccess(true)
  }, [flash?.success])

  useEffect(() => {
    if (errorText) setShowError(true)
  }, [errorText])

  useEffect(() => {
    const currentQuery = filters.q || ''
    const currentSection = filters.section || 'product'
    if (normalizedQuery === currentQuery && section === currentSection) {
      return undefined
    }

    const handle = setTimeout(() => {
      router.get(
        baseRoute,
        { section, q: normalizedQuery || undefined },
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
          only: ['candidates', 'filters'],
          onStart: () => setSearching(true),
          onFinish: () => setSearching(false),
        },
      )
    }, 300)

    return () => clearTimeout(handle)
  }, [baseRoute, filters.q, filters.section, normalizedQuery, section])

  const payload = (extra = {}) => ({
    section,
    q: normalizedQuery,
    ...extra,
  })

  const addEntry = (entityId) => {
    setBusy(true)
    router.post(baseRoute, payload({ entity_id: entityId }), {
      preserveScroll: true,
      onFinish: () => setBusy(false),
    })
  }

  const toggleEntry = (entry) => {
    setBusy(true)
    router.patch(`${baseRoute}/${entry.id}/active`, payload(), {
      preserveScroll: true,
      onFinish: () => setBusy(false),
    })
  }

  const moveEntry = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= entries.length) return
    const ids = entries.map((entry) => entry.id)
    const next = [...ids]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setBusy(true)
    router.put(`${baseRoute}/reorder`, payload({ ids: next }), {
      preserveScroll: true,
      onFinish: () => setBusy(false),
    })
  }

  const confirmRemove = () => {
    if (!pendingRemove) return
    setBusy(true)
    router.delete(`${baseRoute}/${pendingRemove.id}`, {
      data: payload(),
      preserveScroll: true,
      onSuccess: () => setPendingRemove(null),
      onFinish: () => setBusy(false),
    })
  }

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Featured Section">
      <div>
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Featured Section</h1>
          <p className="max-w-3xl text-sm text-[#6B7280]">
            Choose which products, Agrivet stores, and farms appear in the Featured Section of the mobile app.
            The first row is shown first. Hidden or unavailable rows stay here, and the app skips them.
          </p>
        </div>

        {flash?.success && showSuccess && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
            <span>{flash.success}</span>
            <button type="button" className="shrink-0 font-semibold text-emerald-800" onClick={() => setShowSuccess(false)}>
              Dismiss
            </button>
          </div>
        )}
        {errorText && showError && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            <span>{errorText}</span>
            <button type="button" className="shrink-0 font-semibold text-red-800" onClick={() => setShowError(false)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {Object.values(sections).map((item) => {
            const selected = item.key === section
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === section) return
                  setSection(item.key)
                  setQuery('')
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  selected ? 'bg-[#102059] text-white' : 'border border-[#E5E7EB] bg-white text-[#102059] hover:bg-[#F9FAFB]'
                }`}
                aria-pressed={selected}
              >
                {item.label}
                <span className={selected ? 'text-white/80' : 'text-[#6B7280]'}> · {item.visible_count}</span>
              </button>
            )
          })}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="rounded-lg border border-[#E5E7EB] bg-white">
            <div className="border-b border-[#E5E7EB] px-5 py-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-[#102059]" />
                <h2 className="text-base font-semibold text-[#102059]">{current.label}</h2>
              </div>
              <p className="mt-1 text-sm text-[#6B7280]">{SECTION_COPY[section]}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                {current.visible_count} shown in the app · {current.total} saved · {maxPerSection} max
              </p>
            </div>

            {entries.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-[#6B7280]">
                Nothing is featured yet. Search on the right and add a {section === 'agrivet_store' ? 'store' : section}.
              </div>
            ) : (
              <ol className="divide-y divide-[#E5E7EB]">
                {entries.map((entry, index) => (
                  <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex w-8 shrink-0 flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-[#9CA3AF]">{index + 1}</span>
                      <button
                        type="button"
                        className="rounded p-0.5 text-[#6B7280] hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Move ${entry.name} up`}
                        disabled={busy || index === 0}
                        onClick={() => moveEntry(index, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-0.5 text-[#6B7280] hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Move ${entry.name} down`}
                        disabled={busy || index === entries.length - 1}
                        onClick={() => moveEntry(index, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <Thumb src={entry.image_url} name={entry.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#102059]">{entry.name}</p>
                      {entry.subtitle && <p className="truncate text-xs text-[#6B7280]">{entry.subtitle}</p>}
                      {entry.detail && <p className="truncate text-xs text-[#374151]">{entry.detail}</p>}
                      {!entry.available && (
                        <p className="mt-1 text-xs font-medium text-[#B45309]">
                          Not shown in the app. {entry.unavailable_reason}
                        </p>
                      )}
                      {entry.available && !entry.is_active && (
                        <p className="mt-1 text-xs font-medium text-[#6B7280]">Hidden from the app.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={entry.is_active}
                      aria-label={entry.is_active ? `Hide ${entry.name} from the mobile app` : `Show ${entry.name} in the mobile app`}
                      disabled={busy}
                      onClick={() => toggleEntry(entry)}
                      className={`relative h-6 w-11 shrink-0 transition-colors disabled:opacity-60 ${
                        entry.is_active ? 'bg-[#102059]' : 'bg-[#D1D5DB]'
                      }`}
                      style={{ borderRadius: '2.4rem' }}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          entry.is_active ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-[#E20E28] hover:bg-[#FEE2E2] disabled:opacity-60"
                      aria-label={`Remove ${entry.name} from the Featured Section`}
                      disabled={busy}
                      onClick={() => setPendingRemove(entry)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-lg border border-[#E5E7EB] bg-white">
            <div className="border-b border-[#E5E7EB] px-5 py-4">
              <h2 className="text-base font-semibold text-[#102059]">Add to {current.label}</h2>
              <p className="mt-1 text-sm text-[#6B7280]">Search by name. Only records the mobile app can show are listed.</p>
            </div>
            <div className="px-5 py-4">
              <label className="mb-1 block text-xs font-semibold text-[#6B7280]" htmlFor="featured-search">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="featured-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type at least 2 characters"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
                />
              </div>
              {atCapacity && (
                <p className="mt-3 text-sm text-[#B45309]">
                  This section is full ({maxPerSection}). Remove an entry before adding another.
                </p>
              )}
              <div className="mt-4">
                {searching && <p className="text-sm text-[#6B7280]">Searching…</p>}
                {!searching && normalizedQuery === '' && (
                  <p className="text-sm text-[#6B7280]">Results appear after two characters.</p>
                )}
                {!searching && normalizedQuery !== '' && candidatesMatch && visibleCandidates.length === 0 && (
                  <p className="text-sm text-[#6B7280]">No matches for “{normalizedQuery}”.</p>
                )}
                {!searching && visibleCandidates.length > 0 && (
                  <ul className="divide-y divide-[#E5E7EB] rounded-lg border border-[#E5E7EB]">
                    {visibleCandidates.map((candidate) => (
                      <li key={candidate.entity_id} className="flex items-center gap-3 px-3 py-3">
                        <Thumb src={candidate.image_url} name={candidate.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#102059]">{candidate.name}</p>
                          {candidate.subtitle && <p className="truncate text-xs text-[#6B7280]">{candidate.subtitle}</p>}
                          {candidate.detail && <p className="truncate text-xs text-[#374151]">{candidate.detail}</p>}
                        </div>
                        {candidate.already_featured ? (
                          <span className="shrink-0 text-xs font-semibold text-[#6B7280]">Added</span>
                        ) : (
                          <button
                            type="button"
                            disabled={busy || atCapacity}
                            onClick={() => addEntry(candidate.entity_id)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#102059] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#244693] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>

        {pendingRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6" role="dialog" aria-modal="true" aria-labelledby="remove-featured-title">
              <h3 id="remove-featured-title" className="text-lg font-semibold text-[#102059]">
                Remove from Featured Section
              </h3>
              <p className="mt-2 text-sm text-[#4B5563]">
                {pendingRemove.name} will no longer appear in the mobile Featured Section. You can add it again later.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB]"
                  onClick={() => setPendingRemove(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#E20E28] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
                  onClick={confirmRemove}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminOrAdminLayout>
  )
}
