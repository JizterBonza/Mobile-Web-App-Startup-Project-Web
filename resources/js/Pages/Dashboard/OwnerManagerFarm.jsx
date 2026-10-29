import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, router, useForm, usePage } from '@inertiajs/react'
import { Bird, Box, Calendar, Check, ChevronDown, CirclePlus, Clock, Landmark, MapPin, Pencil, Search, Star, X } from 'lucide-react'
import PinLocationMap from '../../Components/PinLocationMap'
import OwnerManagerKlasmeytLayout from '../../Layouts/OwnerManagerKlasmeytLayout'
import { storageUrl } from '../../utils/storageUrl'

const TABS = [
    { id: 'about', label: 'About' },
    { id: 'gamefowl', label: 'Gamefowl' },
    { id: 'insights', label: 'Insights' },
]

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const inputClass =
    'w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693]'

function parseDays(value) {
    if (!value) return []
    const lower = value.toLowerCase()
    return DAY_ORDER.filter((day) => lower.includes(day.toLowerCase()))
}

function toTimeValue(raw, fallback) {
    if (!raw) return fallback
    const text = String(raw).trim().toLowerCase()
    if (/^\d{2}:\d{2}/.test(text)) return text.slice(0, 5)

    const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
    if (!match) return fallback

    let hour = Number(match[1])
    const minute = match[2] || '00'
    if (match[3] === 'pm' && hour < 12) hour += 12
    if (match[3] === 'am' && hour === 12) hour = 0
    return `${String(hour).padStart(2, '0')}:${minute}`
}

function parseHours(value) {
    if (!value) return { opening: '08:00', closing: '17:00' }
    const parts = String(value).split(/\s*-\s*/)
    return {
        opening: toTimeValue(parts[0], '08:00'),
        closing: toTimeValue(parts[1], '17:00'),
    }
}

function statusLabel(status) {
    return status === 'inactive' ? 'Inactive' : 'Active'
}

function initialFarmTab(url) {
    const query = String(url || '').split('?')[1] || ''
    const tab = new URLSearchParams(query).get('tab')
    return ['about', 'gamefowl', 'insights'].includes(tab) ? tab : 'about'
}

function formatPeso(value, unit = 'per head') {
    const amount = Number(value)
    return `₱${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}/${unit || 'per head'}`
}

function formatReleaseDate(value) {
    if (!value) return '—'
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[2]}/${match[3]}/${match[1]}`
    return String(value)
}

function toIsoDate(value) {
    if (!value) return ''
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
    const us = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (us) return `${us[3]}-${us[1]}-${us[2]}`
    return ''
}

function normalizeReleaseOption(value) {
    const option = value || ''
    return option === 'Available Now' ? 'Release Immediately' : option
}

function normalizeListing(item) {
    const composition = item.composition || item.bloodline_name || '—'
    const age = item.age || item.age_type_name || '—'
    const sex = item.sex || '—'
    const category = item.category || item.class_name || item.bloodline_name || 'Uncategorized'

    return {
        id: item.id,
        title: item.title || item.name || `${composition} / ${category}`,
        composition,
        age,
        sex,
        category,
        price: item.price ?? 0,
        unit: item.selling_unit || item.unit || 'per head',
        stocks: item.stocks ?? item.stock ?? 0,
        releaseOption: normalizeReleaseOption(item.release_option || item.releaseOption || ''),
        releaseDateIso: toIsoDate(item.release_date || item.releaseDate),
        releaseDate:
            normalizeReleaseOption(item.release_option || item.releaseOption || '') === 'Release Immediately'
                ? 'Immediate'
                : formatReleaseDate(item.release_date || item.releaseDate),
        popularity: item.popularity ?? 0,
        status: String(item.status || 'active').toLowerCase(),
        image: storageUrl(item.image || item.image_url || null),
        isBundle: Boolean(item.is_bundle || item.isBundle),
    }
}

function catalogCard(item) {
    const images = Array.isArray(item.images) ? item.images : []
    const image = item.image || images[item.primary_image_index ?? 0] || images[0] || null

    return {
        id: item.id,
        title: item.title || item.bloodline_name || item.name || 'Gamefowl',
        composition: item.composition || item.name || '—',
        age: item.age || item.age_type_name || '—',
        sex: item.sex || '—',
        image: storageUrl(image),
    }
}

function isCatalogListed(item, listings) {
    return listings.some((listing) => {
        const catalogId = listing.catalog_id ?? listing.gamefowl_catalog_id
        return catalogId != null && String(catalogId) === String(item.id)
    })
}

function pairSlot(item) {
    const sex = String(item.sex || '').trim().toLowerCase()
    if (sex === 'male' || sex === 'm') return 'stag'
    if (sex === 'female' || sex === 'f') return 'pullet'
    return null
}

function GamefowlListingDetailsModal({ gamefowl, listing = null, onClose, onSaved }) {
    const isEdit = Boolean(listing?.id)
    const [editing, setEditing] = useState(true)
    const [saving, setSaving] = useState(false)
    const [price, setPrice] = useState(() => (isEdit ? Number(listing.price || 0).toFixed(2) : ''))
    const [sellingUnit, setSellingUnit] = useState(() => (isEdit ? listing.unit || '' : ''))
    const [stock, setStock] = useState(() => (isEdit ? String(listing.stocks ?? '') : ''))
    const [releaseOption, setReleaseOption] = useState(() => (isEdit ? listing.releaseOption || '' : ''))
    const [releaseDate, setReleaseDate] = useState(() => (isEdit ? listing.releaseDateIso || '' : ''))
    const [error, setError] = useState('')
    const isBundle = Boolean(listing?.isBundle || gamefowl?.isBundle)

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const fieldClass =
        'w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#244693] focus:outline-none disabled:bg-[#F9FAFB] disabled:text-[#6B7280]'
    const selectClass = (value) =>
        `${fieldClass} appearance-none pr-10 ${value ? 'text-[#111827]' : 'text-[#9CA3AF]'}`

    const handleSave = () => {
        const missing = []
        if (!price.trim()) missing.push('Price')
        if (!sellingUnit) missing.push('Selling Unit')
        if (!stock.trim()) missing.push('Stock Quantity')
        if (!releaseOption) missing.push('Stock Release Options')
        if (releaseOption === 'Set Release Date' && !releaseDate) missing.push('Stock Release Schedule')
        if (missing.length) {
            setError(`Please fill in: ${missing.join(', ')}.`)
            return
        }

        setError('')
        setSaving(true)
        const payload = {
            price,
            selling_unit: sellingUnit,
            stock,
            release_option: releaseOption,
            release_date: releaseOption === 'Set Release Date' ? releaseDate : null,
        }
        const options = {
            preserveScroll: true,
            onSuccess: () => onSaved(),
            onError: (errors) => {
                const first = Object.values(errors)[0]
                const message = Array.isArray(first) ? first[0] : first
                setError(typeof message === 'string' ? message : 'Could not save this gamefowl listing.')
            },
            onFinish: () => setSaving(false),
        }

        if (isEdit) {
            router.put(`/dashboard/owner-manager/farm/gamefowls/listings/${listing.id}`, payload, options)
            return
        }

        router.post(
            '/dashboard/owner-manager/farm/gamefowls/listings',
            { ...payload, gamefowl_catalog_id: gamefowl.id },
            options,
        )
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
            onClick={(event) => {
                event.stopPropagation()
                onClose()
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="gamefowl-listing-details-title"
                className="w-full max-w-4xl rounded-2xl bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 px-8 pb-5 pt-7">
                    <div>
                        <h2 id="gamefowl-listing-details-title" className="text-xl font-bold text-[#111827]">
                            Gamefowl Listing Details
                        </h2>
                        <p className="mt-1 text-sm text-[#6B7280]">View and manage listing information</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setEditing((current) => !current)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#F3F4F6] ${
                                editing ? 'text-[#111827]' : 'text-[#9CA3AF]'
                            }`}
                            aria-label={editing ? 'Stop editing' : 'Edit listing'}
                            aria-pressed={editing}
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="border-t border-[#E5E7EB] px-8 pb-7 pt-7">
                    {error && <p className="mb-4 text-sm text-[#E20E28]">{error}</p>}
                    <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                        <div>
                            <label htmlFor="listing-bloodline" className="mb-2 block text-sm font-semibold text-[#111827]">
                                {isBundle ? 'Bundle Description' : 'Bloodline Category'}
                            </label>
                            <input id="listing-bloodline" type="text" readOnly value={gamefowl.title} className={`${fieldClass} bg-[#F9FAFB]`} />
                        </div>
                        <div>
                            <label htmlFor="listing-composition" className="mb-2 block text-sm font-semibold text-[#111827]">
                                {isBundle ? 'Included Gamefowl' : 'Bloodline Composition'}
                            </label>
                            <input id="listing-composition" type="text" readOnly value={gamefowl.composition} className={`${fieldClass} bg-[#F9FAFB]`} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="listing-price" className="mb-2 block text-sm font-semibold text-[#111827]">
                                    Price
                                </label>
                                <input
                                    id="listing-price"
                                    type="text"
                                    inputMode="decimal"
                                    disabled={!editing}
                                    value={price}
                                    onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ''))}
                                    placeholder="400.00"
                                    className={fieldClass}
                                />
                            </div>
                            <div>
                                <label htmlFor="listing-unit" className="mb-2 block text-sm font-semibold text-[#111827]">
                                    Selling Unit
                                </label>
                                <div className="relative">
                                    <select
                                        id="listing-unit"
                                        disabled={!editing}
                                        value={sellingUnit}
                                        onChange={(event) => setSellingUnit(event.target.value)}
                                        className={selectClass(sellingUnit)}
                                    >
                                        <option value="">Select Selling Unit</option>
                                        <option value="per head">per head</option>
                                        <option value="per dozen">per dozen</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="listing-stock" className="mb-2 block text-sm font-semibold text-[#111827]">
                                Stock Quantity
                            </label>
                            <input
                                id="listing-stock"
                                type="text"
                                inputMode="numeric"
                                disabled={!editing}
                                value={stock}
                                onChange={(event) => setStock(event.target.value.replace(/\D/g, ''))}
                                placeholder="50"
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="listing-release-option" className="mb-2 block text-sm font-semibold text-[#111827]">
                                Stock Release Options
                            </label>
                            <div className="relative">
                                <select
                                    id="listing-release-option"
                                    disabled={!editing}
                                    value={releaseOption}
                                    onChange={(event) => {
                                        const next = event.target.value
                                        setReleaseOption(next)
                                        if (next !== 'Set Release Date') setReleaseDate('')
                                    }}
                                    className={selectClass(releaseOption)}
                                >
                                    <option value="">Select Stock Release Options</option>
                                    <option value="Release Immediately">Release Immediately</option>
                                    <option value="Set Release Date">Set Release Date</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            </div>
                        </div>
                        {releaseOption === 'Set Release Date' && (
                        <div>
                            <label htmlFor="listing-release-date" className="mb-2 block text-sm font-semibold text-[#111827]">
                                Stock Release Schedule
                            </label>
                            <div className="relative">
                                <input
                                    id="listing-release-date"
                                    type="date"
                                    disabled={!editing}
                                    value={releaseDate}
                                    onChange={(event) => setReleaseDate(event.target.value)}
                                    className={`${fieldClass} pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${
                                        releaseDate ? '' : 'text-transparent'
                                    }`}
                                />
                                {!releaseDate && (
                                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF]">
                                    </span>
                                )}
                                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            </div>
                        </div>
                        )}
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-[#E5E7EB] pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-[#244693] bg-white px-5 py-2.5 text-sm font-semibold text-[#244693] transition-colors hover:bg-[#F4F7FF]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!editing || saving}
                            className="rounded-lg bg-[#102059] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244693] disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function PublishGamefowlListingModal({ catalog = [], listings = [], onClose }) {
    const [query, setQuery] = useState('')
    const [detailsItem, setDetailsItem] = useState(null)

    const cards = useMemo(() => {
        const needle = query.trim().toLowerCase()
        return catalog.map(catalogCard).filter((item) => {
            if (!needle) return true
            return [item.title, item.composition, item.age, item.sex].join(' ').toLowerCase().includes(needle)
        })
    }, [catalog, query])

    useEffect(() => {
        const onKey = (event) => {
            if (event.key !== 'Escape' || detailsItem) return
            onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose, detailsItem])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="publish-gamefowl-title"
                className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
                    <div>
                        <h2 id="publish-gamefowl-title" className="text-lg font-bold text-[#111827]">
                            Publish Gamefowl Listing
                        </h2>
                        <p className="mt-1 text-sm text-[#6B7280]">Make this gamefowl offering available for buyer inquiries.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="overflow-y-auto border-t border-[#E5E7EB] px-6 py-5">
                    <h3 className="mb-3 text-sm font-semibold text-[#111827]">Select a gamefowl</h3>
                    <div className="relative mb-4">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <input
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search"
                            className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2.5 pl-10 pr-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#244693] focus:outline-none"
                        />
                    </div>

                    {cards.length === 0 ? (
                        <div className="flex min-h-[220px] items-center justify-center text-center">
                            <p className="text-sm text-[#9CA3AF]">
                                {catalog.length === 0
                                    ? 'No approved gamefowl are available to list yet.'
                                    : 'No gamefowl match your search.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {cards.map((item) => {
                                const listed = isCatalogListed(item, listings)
                                const selected = !listed && detailsItem && String(detailsItem.id) === String(item.id)
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        disabled={listed}
                                        onClick={() => setDetailsItem(item)}
                                        className={`overflow-hidden rounded-lg border bg-white text-left ${
                                            selected ? 'border-[#244693]' : 'border-[#E5E7EB]'
                                        } ${listed ? 'cursor-default disabled:opacity-100' : 'cursor-pointer'}`}
                                    >
                                        <div className="relative aspect-[5/6] bg-[#E5E7EB]">
                                            {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                                            <span
                                                className={`absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-[3px] border ${
                                                    selected ? 'border-[#244693] bg-[#244693]' : 'border-[#D1D5DB] bg-white'
                                                }`}
                                            >
                                                {selected ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
                                            </span>
                                        </div>
                                        <div className="px-3 pb-3 pt-2.5">
                                            <p className="break-words text-sm font-bold leading-snug text-[#111827]">{item.title}</p>
                                            <p className="mt-0.5 break-words text-[11px] leading-snug text-[#9CA3AF]">
                                                {item.composition} | {item.age} | {item.sex}
                                            </p>
                                            {listed ? (
                                                <p className="mt-4 text-center text-xs text-[#C5C8CE]">Already listed</p>
                                            ) : (
                                                <span className="mt-4 block h-4" />
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
            {detailsItem && (
                <GamefowlListingDetailsModal
                    gamefowl={detailsItem}
                    onClose={() => setDetailsItem(null)}
                    onSaved={() => {
                        setDetailsItem(null)
                        onClose()
                    }}
                />
            )}
        </div>
    )
}

function CreateGamefowlBundleModal({ catalog = [], onClose }) {
    const [bundleName, setBundleName] = useState('')
    const [bundleType, setBundleType] = useState('')
    const [price, setPrice] = useState('')
    const [stock, setStock] = useState('')
    const [releaseOption, setReleaseOption] = useState('')
    const [releaseDate, setReleaseDate] = useState('')
    const [error, setError] = useState('')
    const [step, setStep] = useState('details')
    const [slot, setSlot] = useState('stag')
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState({ stag: [], pullet: [] })
    const [selectError, setSelectError] = useState('')
    const [saving, setSaving] = useState(false)

    const bundleSelection = {
        Pair: { stag: 1, pullet: 1, heading: 'Select 1 Stag and 1 Pullet only', requirement: 'Select 1 stag and 1 pullet.' },
        Trio: { stag: 1, pullet: 2, heading: 'Select 1 Stag and 2 Pullets only', requirement: 'Select 1 stag and 2 pullets.' },
        Quadruplet: { stag: 1, pullet: 3, heading: 'Select 1 Stag and 3 Pullets only', requirement: 'Select 1 stag and 3 pullets.' },
    }[bundleType] || { stag: 1, pullet: 1, heading: 'Select 1 Stag and 1 Pullet only', requirement: 'Select 1 stag and 1 pullet.' }

    const pairCards = useMemo(() => {
        const needle = query.trim().toLowerCase()
        return catalog.map(catalogCard).filter((item) => {
            if (pairSlot(item) !== slot) return false
            if (!needle) return true
            return [item.title, item.composition, item.age, item.sex].join(' ').toLowerCase().includes(needle)
        })
    }, [catalog, query, slot])

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const fieldClass =
        'w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#244693] focus:outline-none'
    const selectClass = (value) =>
        `${fieldClass} appearance-none pr-10 ${value ? 'text-[#111827]' : 'text-[#9CA3AF]'}`

    const handleNext = () => {
        const missing = []
        if (!bundleName.trim()) missing.push('Bundle Description')
        if (!bundleType) missing.push('Bundle Type')
        if (!price.trim()) missing.push('Price')
        if (!stock.trim()) missing.push('Stock Quantity')
        if (!releaseOption) missing.push('Stock Release Options')
        if (releaseOption === 'Set Release Date' && !releaseDate) missing.push('Stock Release Schedule')
        if (missing.length) {
            setError(`Please fill in: ${missing.join(', ')}.`)
            return
        }
        setError('')
        if (bundleType === 'Pair' || bundleType === 'Trio' || bundleType === 'Quadruplet') {
            setSlot('stag')
            setQuery('')
            setSelected({ stag: [], pullet: [] })
            setSelectError('')
            setStep('select')
        }
    }

    const togglePairCard = (item) => {
        setSelectError('')
        setSelected((current) => {
            const items = current[slot]
            const exists = items.some((entry) => String(entry.id) === String(item.id))
            if (exists) {
                return { ...current, [slot]: items.filter((entry) => String(entry.id) !== String(item.id)) }
            }
            const limit = bundleSelection[slot]
            if (items.length >= limit) {
                return limit === 1 ? { ...current, [slot]: [item] } : current
            }
            return { ...current, [slot]: [...items, item] }
        })
    }

    if (step === 'select' && (bundleType === 'Pair' || bundleType === 'Trio' || bundleType === 'Quadruplet')) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="add-gamefowl-to-store-title"
                    className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
                        <div>
                            <h2 id="add-gamefowl-to-store-title" className="text-lg font-bold text-[#111827]">
                                Add Gamefowl to Store
                            </h2>
                            <p className="mt-1 text-sm text-[#6B7280]">Choose from registered gamefowl and set listing details</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="overflow-y-auto border-t border-[#E5E7EB] px-6 py-5">
                        <h3 className="text-sm font-semibold text-[#111827]">{bundleSelection.heading}</h3>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {[
                                ['stag', `Stag (${bundleSelection.stag})`],
                                ['pullet', `Pullet (${bundleSelection.pullet})`],
                            ].map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => {
                                        setSlot(id)
                                        setQuery('')
                                    }}
                                    className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${
                                        slot === id
                                            ? 'bg-[#244693] text-white'
                                            : 'border border-[#E5E7EB] bg-white text-[#6B7280]'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="relative mt-4">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            <input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search Gamefowl"
                                className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2.5 pl-10 pr-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#244693] focus:outline-none"
                            />
                        </div>

                        {pairCards.length === 0 ? (
                            <div className="flex min-h-[220px] items-center justify-center text-center">
                                <p className="text-sm text-[#9CA3AF]">
                                    {catalog.length === 0
                                        ? 'No approved gamefowl are available yet.'
                                        : query.trim()
                                          ? `No ${slot === 'stag' ? 'male' : 'female'} gamefowl match your search.`
                                          : `No ${slot === 'stag' ? 'male' : 'female'} gamefowl are available.`}
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                {pairCards.map((item) => {
                                    const picked = selected[slot].some((entry) => String(entry.id) === String(item.id))
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => togglePairCard(item)}
                                            className={`cursor-pointer overflow-hidden rounded-lg border bg-white text-left ${
                                                picked ? 'border-[#244693]' : 'border-[#E5E7EB]'
                                            }`}
                                        >
                                            <div className="relative aspect-[5/6] bg-[#E5E7EB]">
                                                {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                                                <span
                                                    className={`absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-[3px] border ${
                                                        picked ? 'border-[#244693] bg-[#244693]' : 'border-[#D1D5DB] bg-white'
                                                    }`}
                                                >
                                                    {picked ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
                                                </span>
                                            </div>
                                            <div className="px-3 pb-3 pt-2.5">
                                                <p className="break-words text-sm font-bold leading-snug text-[#111827]">{item.title}</p>
                                                <p className="mt-0.5 break-words text-[11px] leading-snug text-[#9CA3AF]">
                                                    {item.composition} | {item.age} | {item.sex}
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {selectError && (
                        <p className="border-t border-[#E5E7EB] px-6 pt-4 text-sm text-[#E20E28]">{selectError}</p>
                    )}
                    <div className={`flex items-center justify-between px-6 py-4 ${selectError ? '' : 'border-t border-[#E5E7EB]'}`}>
                        <button
                            type="button"
                            onClick={() => setStep('details')}
                            className="rounded-lg border border-[#244693] bg-white px-5 py-2.5 text-sm font-semibold text-[#244693] transition-colors hover:bg-[#F4F7FF]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                                if (selected.stag.length !== bundleSelection.stag || selected.pullet.length !== bundleSelection.pullet) {
                                    setSelectError(bundleSelection.requirement)
                                    return
                                }
                                setSelectError('')
                                setSaving(true)
                                router.post(
                                    '/dashboard/owner-manager/farm/gamefowls/bundles',
                                    {
                                        bundle_name: bundleName.trim(),
                                        bundle_type: bundleType,
                                        price,
                                        stock,
                                        release_option: releaseOption,
                                        release_date: releaseOption === 'Set Release Date' ? releaseDate : null,
                                        stag_ids: selected.stag.map((item) => item.id),
                                        pullet_ids: selected.pullet.map((item) => item.id),
                                    },
                                    {
                                        preserveScroll: true,
                                        preserveState: true,
                                        onSuccess: () => onClose(),
                                        onError: (errors) => {
                                            const first = Object.values(errors)[0]
                                            const message = Array.isArray(first) ? first[0] : first
                                            setSelectError(typeof message === 'string' ? message : 'Could not create this bundle.')
                                        },
                                        onFinish: () => setSaving(false),
                                    },
                                )
                            }}
                            className="rounded-lg bg-[#102059] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244693] disabled:opacity-50"
                        >
                            {saving ? 'Creating...' : 'Create Bundle'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-gamefowl-bundle-title"
                className="w-full max-w-4xl rounded-2xl bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 px-8 pb-5 pt-7">
                    <div>
                        <h2 id="create-gamefowl-bundle-title" className="text-xl font-bold text-[#111827]">
                            Create Gamefowl Bundle
                        </h2>
                        <p className="mt-1 text-sm text-[#6B7280]">Choose from registered gamefowl and set listing details</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="border-t border-[#E5E7EB] px-8 pb-7 pt-7">
                    {error && <p className="mb-4 text-sm text-[#E20E28]">{error}</p>}
                    <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                        <div>
                            <label htmlFor="bundle-name" className="mb-2 block text-sm font-semibold text-[#111827]">
                                Bundle Description
                            </label>
                            <input
                                id="bundle-name"
                                type="text"
                                value={bundleName}
                                onChange={(event) => setBundleName(event.target.value)}
                                placeholder="Broodstag Pair"
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="bundle-type" className="mb-2 block text-sm font-semibold text-[#111827]">
                                Bundle Type
                            </label>
                            <div className="relative">
                                <select
                                    id="bundle-type"
                                    value={bundleType}
                                    onChange={(event) => setBundleType(event.target.value)}
                                    className={selectClass(bundleType)}
                                >
                                    <option value="">Select Bundle Type</option>
                                    <option value="Pair">Pair</option>
                                    <option value="Trio">Trio</option>
                                    <option value="Quadruplet">Quadruplet</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="bundle-price" className="mb-2 block text-sm font-semibold text-[#111827]">
                                Price
                            </label>
                            <input
                                id="bundle-price"
                                type="text"
                                inputMode="decimal"
                                value={price}
                                onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ''))}
                                placeholder="400.00"
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="bundle-stock" className="mb-2 block text-sm font-semibold text-[#111827]">
                                Stock Quantity
                            </label>
                            <input
                                id="bundle-stock"
                                type="text"
                                inputMode="numeric"
                                value={stock}
                                onChange={(event) => setStock(event.target.value.replace(/\D/g, ''))}
                                placeholder="500"
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="bundle-release-option" className="mb-2 block text-sm font-semibold text-[#111827]">
                                Stock Release Options
                            </label>
                            <div className="relative">
                                <select
                                    id="bundle-release-option"
                                    value={releaseOption}
                                    onChange={(event) => {
                                        const next = event.target.value
                                        setReleaseOption(next)
                                        if (next !== 'Set Release Date') setReleaseDate('')
                                    }}
                                    className={selectClass(releaseOption)}
                                >
                                    <option value="">Select Stock Release Options</option>
                                    <option value="Set Release Date">Set Release Date</option>
                                    <option value="Release Immediately">Release Immediately</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            </div>
                        </div>
                        {releaseOption === 'Set Release Date' && (
                        <div>
                            <label htmlFor="bundle-release-date" className="mb-2 block text-sm font-semibold text-[#111827]">
                                Stock Release Schedule
                            </label>
                            <div className="relative">
                                <input
                                    id="bundle-release-date"
                                    type="date"
                                    value={releaseDate}
                                    onChange={(event) => setReleaseDate(event.target.value)}
                                    className={`${fieldClass} pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${
                                        releaseDate ? '' : 'text-transparent'
                                    }`}
                                />
                                {!releaseDate && (
                                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF]">
                                    </span>
                                )}
                                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            </div>
                        </div>
                        )}
                    </div>

                    <div className="mt-8 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-[#244693] bg-white px-5 py-2.5 text-sm font-semibold text-[#244693] transition-colors hover:bg-[#F4F7FF]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="rounded-lg bg-[#102059] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
                        >
                            Next: Select Gamefowl
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function GamefowlCatalogPanel({ listings = [], catalog = [] }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [sortBy, setSortBy] = useState('')
    const [showPublishModal, setShowPublishModal] = useState(false)
    const [showBundleModal, setShowBundleModal] = useState(false)
    const [selectedListing, setSelectedListing] = useState(null)
    const [updatingListingId, setUpdatingListingId] = useState(null)

    const rows = useMemo(() => listings.map(normalizeListing), [listings])

    const categories = useMemo(() => {
        return Array.from(new Set(rows.map((item) => item.category).filter((name) => name && name !== 'Uncategorized'))).sort()
    }, [rows])

    const visible = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        const filtered = rows.filter((item) => {
            const haystack = [item.title, item.composition, item.age, item.sex, item.category].join(' ').toLowerCase()
            const matchesSearch = !query || haystack.includes(query)
            const matchesCategory = !categoryFilter || item.category === categoryFilter
            const matchesStatus = !statusFilter || item.status === statusFilter
            return matchesSearch && matchesCategory && matchesStatus
        })

        const sorted = [...filtered]
        sorted.sort((a, b) => {
            if (sortBy === 'name') return a.title.localeCompare(b.title)
            if (sortBy === 'price-asc') return Number(a.price) - Number(b.price)
            if (sortBy === 'price-desc') return Number(b.price) - Number(a.price)
            if (sortBy === 'popularity') return Number(b.popularity) - Number(a.popularity)
            return 0
        })
        return sorted
    }, [rows, searchQuery, categoryFilter, statusFilter, sortBy])

    const selectClass = (value) =>
        `w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white py-2.5 pl-3 pr-9 text-sm focus:border-[#244693] focus:outline-none ${
            value ? 'text-[#102059]' : 'text-[#9CA3AF]'
        }`

    return (
        <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[#102059]">Gamefowl Listings</h2>
                    <p className="mt-1 text-sm text-[#9CA3AF]">Manage the gamefowl listed for sale on this farm.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowPublishModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#244693] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a3570]"
                    >
                        <CirclePlus className="h-4 w-4" />
                        Add Listing
                    </button>
                    <Link
                        href="/dashboard/owner-manager/farm/gamefowls/request"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#244693] bg-white px-4 py-2 text-sm font-semibold text-[#244693] transition-colors hover:bg-[#F4F7FF]"
                    >
                        <Bird className="h-4 w-4" />
                        Register Gamefowl
                    </Link>
                    <button
                        type="button"
                        onClick={() => setShowBundleModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#244693] bg-white px-4 py-2 text-sm font-semibold text-[#244693] transition-colors hover:bg-[#F4F7FF]"
                    >
                        <Box className="h-4 w-4" />
                        Create Bundle
                    </button>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search"
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2.5 pl-10 pr-3 text-sm text-[#102059] placeholder:text-[#9CA3AF] focus:border-[#244693] focus:outline-none"
                    />
                </div>
                <div className="relative">
                    <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        className={selectClass(categoryFilter)}
                        aria-label="Category"
                    >
                        <option value="">Category</option>
                        {categories.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                </div>
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className={selectClass(statusFilter)}
                        aria-label="Status"
                    >
                        <option value="">Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                </div>
                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                        className={selectClass(sortBy)}
                        aria-label="Filter"
                    >
                        <option value="">Filter</option>
                        <option value="name">Name A–Z</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="popularity">Popularity</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                </div>
            </div>

            {visible.length === 0 ? (
                <div className="flex min-h-[280px] items-center justify-center text-center">
                    <div>
                        <h3 className="text-lg font-semibold text-[#102059]">
                            {rows.length === 0 ? 'No Gamefowl Listed Yet' : 'No Matching Gamefowl'}
                        </h3>
                        <p className="mt-1 text-sm text-[#9CA3AF]">
                            {rows.length === 0
                                ? 'Gamefowl you list for sale will appear here.'
                                : 'Try a different search or filter.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {visible.map((listing) => {
                        const isActive = listing.status !== 'inactive'
                        return (
                            <article
                                key={listing.id}
                                onClick={() => setSelectedListing(listing)}
                                className="cursor-pointer overflow-hidden rounded-lg border border-[#E5E7EB] bg-white text-left transition-shadow hover:shadow-sm"
                            >
                                <div className="aspect-[5/6] bg-[#E5E7EB]">
                                    {listing.image ? (
                                        <img src={listing.image} alt="" className="h-full w-full object-cover" />
                                    ) : null}
                                </div>
                                <div className="p-3">
                                    <h3 className="break-words text-sm font-bold leading-snug text-[#102059]">{listing.title}</h3>
                                    <p className="mt-0.5 break-words text-[11px] leading-snug text-[#9CA3AF]">
                                        {listing.composition} | {listing.age} | {listing.sex}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                                        <p className="text-xs font-bold leading-4 text-[#102059]">
                                            {formatPeso(listing.price, listing.unit)}
                                        </p>
                                        <div className="grid shrink-0 grid-cols-[auto_auto] gap-x-2 gap-y-0.5 text-[10px] leading-4">
                                            <span className="text-[#9CA3AF]">Stocks:</span>
                                            <span className="font-medium text-[#102059]">{listing.stocks}</span>
                                            <span className="text-[#9CA3AF]">Release Date:</span>
                                            <span className="font-medium text-[#102059]">{listing.releaseDate}</span>
                                            <span className="text-[#9CA3AF]">Popularity:</span>
                                            <span className="font-medium text-[#102059]">{listing.popularity}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={updatingListingId === listing.id}
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            const nextStatus = isActive ? 'inactive' : 'active'
                                            if (!window.confirm(`${isActive ? 'Deactivate' : 'Reactivate'} this gamefowl listing?`)) return
                                            setUpdatingListingId(listing.id)
                                            router.patch(
                                                `/dashboard/owner-manager/farm/gamefowls/listings/${listing.id}/status`,
                                                { status: nextStatus },
                                                {
                                                    preserveScroll: true,
                                                    onFinish: () => setUpdatingListingId(null),
                                                },
                                            )
                                        }}
                                        className={`mt-3 w-full rounded-lg py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60 ${
                                            isActive
                                                ? 'bg-[#E20E28] hover:bg-[#C10D23]'
                                                : 'bg-[#00C950] hover:bg-[#00B548]'
                                        }`}
                                    >
                                        {isActive ? 'Deactivate' : 'Reactivate'}
                                    </button>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
            {showPublishModal && (
                <PublishGamefowlListingModal
                    catalog={catalog}
                    listings={listings}
                    onClose={() => setShowPublishModal(false)}
                />
            )}
            {showBundleModal && (
                <CreateGamefowlBundleModal
                    catalog={catalog}
                    onClose={() => setShowBundleModal(false)}
                />
            )}
            {selectedListing && (
                <GamefowlListingDetailsModal
                    gamefowl={selectedListing}
                    listing={selectedListing}
                    onClose={() => setSelectedListing(null)}
                    onSaved={() => setSelectedListing(null)}
                />
            )}
        </section>
    )
}

export default function OwnerManagerFarm({ auth, farm, listings = [], catalog = [] }) {
    const page = usePage()
    const { flash } = page.props
    const coverInputRef = useRef(null)
    const leftColumnRef = useRef(null)
    const [activeTab, setActiveTab] = useState(() => initialFarmTab(page.url))
    const [starFilter, setStarFilter] = useState(null)
    const [leftColumnHeight, setLeftColumnHeight] = useState(0)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showEditConfirm, setShowEditConfirm] = useState(false)
    const [showStatusConfirm, setShowStatusConfirm] = useState(false)
    const [showFlash, setShowFlash] = useState(Boolean(flash?.success))
    const [formError, setFormError] = useState('')
    const [operatingDays, setOperatingDays] = useState(() => parseDays(farm?.operating_days))

    const hours = parseHours(farm?.operating_hours)
    const isActive = farm?.status !== 'inactive'
    const ownerName = farm?.owner_name || auth.user.name
    const coverSrc = storageUrl(farm?.cover_url || farm?.banner_url)
    const permitSrc = storageUrl(farm?.permit_url)
    const lat = farm?.latitude != null ? Number(farm.latitude) : null
    const lng = farm?.longitude != null ? Number(farm.longitude) : null
    const hasPin = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)

    const addressLines = [farm?.address, [farm?.city, farm?.province].filter(Boolean).join(', '), farm?.postal_code].filter(
        Boolean,
    )

    const form = useForm({
        name: farm?.name || '',
        contact_number: farm?.contact_number || '',
        address: farm?.address || '',
        city: farm?.city || '',
        province: farm?.province || '',
        postal_code: farm?.postal_code || '',
        latitude: farm?.latitude != null ? String(farm.latitude) : '',
        longitude: farm?.longitude != null ? String(farm.longitude) : '',
        bank_name: farm?.bank_name || '',
        account_name: farm?.account_name || '',
        account_number: farm?.account_number || '',
        operating_days: farm?.operating_days || '',
        opening_time: hours.opening,
        closing_time: hours.closing,
    })

    const mapSrc = useMemo(() => {
        if (!hasPin) return null
        const pad = 0.01
        return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - pad},${lat - pad},${lng + pad},${lat + pad}&layer=mapnik&marker=${lat},${lng}`
    }, [hasPin, lat, lng])

    useEffect(() => {
        if (activeTab !== 'about' || !leftColumnRef.current) return undefined
        const measure = () => setLeftColumnHeight(leftColumnRef.current?.offsetHeight || 0)
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(leftColumnRef.current)
        return () => observer.disconnect()
    }, [activeTab, farm])

    useEffect(() => {
        if (!flash?.success) return undefined
        setShowFlash(true)
        const timer = window.setTimeout(() => setShowFlash(false), 5000)
        return () => window.clearTimeout(timer)
    }, [flash?.success])

    const openEditModal = () => {
        const nextHours = parseHours(farm?.operating_hours)
        const days = parseDays(farm?.operating_days)
        setOperatingDays(days)
        setFormError('')
        form.clearErrors()
        form.setData({
            name: farm?.name || '',
            contact_number: farm?.contact_number || '',
            address: farm?.address || '',
            city: farm?.city || '',
            province: farm?.province || '',
            postal_code: farm?.postal_code || '',
            latitude: farm?.latitude != null ? String(farm.latitude) : '',
            longitude: farm?.longitude != null ? String(farm.longitude) : '',
            bank_name: farm?.bank_name || '',
            account_name: farm?.account_name || '',
            account_number: farm?.account_number || '',
            operating_days: days.join(', '),
            opening_time: nextHours.opening,
            closing_time: nextHours.closing,
        })
        setShowEditModal(true)
    }

    const toggleDay = (day) => {
        setOperatingDays((current) =>
            current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
        )
    }

    const requestSave = () => {
        if (!form.data.name.trim()) {
            setFormError('Please enter a farm name.')
            return
        }
        if (operatingDays.length === 0) {
            setFormError('Please select at least one operating day.')
            return
        }
        if (!form.data.opening_time || !form.data.closing_time) {
            setFormError('Please set both opening and closing times.')
            return
        }
        setFormError('')
        setShowEditConfirm(true)
    }

    const confirmSave = () => {
        const daysSorted = [...operatingDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
        form.transform((data) => ({
            ...data,
            operating_days: daysSorted.join(', '),
        }))
        form.put('/dashboard/owner-manager/farm', {
            preserveScroll: true,
            onSuccess: () => {
                setShowEditConfirm(false)
                setShowEditModal(false)
            },
            onFinish: () => {
                form.transform((data) => data)
            },
        })
    }

    const confirmStatusChange = () => {
        router.patch(
            '/dashboard/owner-manager/farm/status',
            { status: isActive ? 'inactive' : 'active' },
            {
                preserveScroll: true,
                onSuccess: () => setShowStatusConfirm(false),
            },
        )
    }

    const handleCoverChange = (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        router.post(
            '/dashboard/owner-manager/farm/cover',
            { cover_image: file },
            { forceFormData: true, preserveScroll: true },
        )
    }

    return (
        <OwnerManagerKlasmeytLayout auth={auth} title={farm?.name || 'My Farm'} mainClassName="w-full p-0">
            <div className="min-h-screen bg-[#F0F2F5]">
                <div className="bg-white">
                    <div className="relative">
                        <div className="h-56 overflow-hidden bg-[#E5E7EB] sm:h-64">
                            {coverSrc ? (
                                <img src={coverSrc} alt="" className="h-full w-full object-cover" />
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 shadow-lg transition-all hover:scale-110 hover:bg-white"
                            title="Update cover photo"
                        >
                            <Pencil className="h-5 w-5 text-[#244693]" />
                        </button>
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleCoverChange}
                        />
                    </div>

                    <div className="mx-auto max-w-[1110px] px-6 pb-0 pt-6">
                        {showFlash && flash?.success && (
                            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">
                                <p>{flash.success}</p>
                                <button
                                    type="button"
                                    onClick={() => setShowFlash(false)}
                                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#166534] hover:bg-[#DCFCE7]"
                                    aria-label="Dismiss notification"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="mb-1 text-[32px] font-bold leading-tight text-[#102059]">{farm?.name}</h1>
                                <p className="text-sm text-[#65676B]">
                                    {ownerName} ({statusLabel(farm?.status)})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openEditModal}
                                className="mt-1 shrink-0 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#102059] transition-colors hover:bg-[#F9FAFB]"
                            >
                                Edit store info
                            </button>
                        </div>

                        <div className="mt-4 flex items-center gap-3 border-b border-[#E5E7EB] pb-4">
                            <button
                                type="button"
                                onClick={() => setShowStatusConfirm(true)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                                    isActive ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                                }`}
                                aria-pressed={isActive}
                                style={{ borderRadius: '0.7rem' }}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ${
                                        isActive ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                    }`}
                                />
                            </button>
                            <span className={`text-sm font-semibold ${isActive ? 'text-[#00C950]' : 'text-[#65676B]'}`}>
                                {statusLabel(farm?.status)}
                            </span>
                        </div>

                        <div className="flex gap-2 pt-1">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-3 text-sm font-semibold ${
                                        activeTab === tab.id
                                            ? 'border-b-[3px] border-[#244693] text-[#244693]'
                                            : 'text-[#65676B] hover:rounded-t-lg hover:bg-[#F0F2F5]'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-[1110px] px-6 py-4">
                    {activeTab === 'about' && (
                        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-10">
                            <div className="space-y-4 lg:col-span-4" ref={leftColumnRef}>
                                <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                                    <h2 className="mb-4 text-xl font-bold text-[#102059]">Farm Address</h2>
                                    <div className="mb-4 flex items-start gap-3">
                                        <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#244693]" />
                                        <div>
                                            {addressLines.length > 0 ? (
                                                addressLines.map((line) => (
                                                    <p key={line} className="text-sm text-[#102059]">
                                                        {line}
                                                    </p>
                                                ))
                                            ) : (
                                                <p className="text-sm text-[#102059]">—</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 h-[200px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#E5E7EB]">
                                        {mapSrc ? (
                                            <iframe
                                                title="Farm location"
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                scrolling="no"
                                                src={mapSrc}
                                                style={{ border: 0 }}
                                            />
                                        ) : null}
                                    </div>
                                </section>

                                <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                                    <h2 className="mb-4 text-xl font-bold text-[#102059]">Operating Schedule</h2>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#244693]" />
                                            <div>
                                                <p className="mb-1 text-xs text-[#65676B]">Operating Hours</p>
                                                <p className="text-sm font-semibold text-[#102059]">
                                                    {farm?.operating_hours || '—'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#244693]" />
                                            <div>
                                                <p className="mb-1 text-xs text-[#65676B]">Operating Days</p>
                                                <p className="text-sm font-semibold text-[#102059]">
                                                    {farm?.operating_days || '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                                    <h2 className="mb-4 text-xl font-bold text-[#102059]">Bank Details</h2>
                                    <div className="space-y-3">
                                        {[
                                            ['Bank Name', farm?.bank_name],
                                            ['Account Name', farm?.account_name],
                                            ['Account Number', farm?.account_number],
                                        ].map(([label, value]) => (
                                            <div key={label} className="flex items-start gap-3">
                                                <Landmark className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#244693]" />
                                                <div>
                                                    <p className="mb-1 text-xs text-[#65676B]">{label}</p>
                                                    <p className="text-sm font-semibold text-[#102059]">{value || '—'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                                    <h2 className="mb-4 text-xl font-bold text-[#102059]">Business Permit</h2>
                                    <div className="relative overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#E5E7EB]">
                                        {farm?.permit_is_pdf && permitSrc ? (
                                            <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 bg-[#F9FAFB] p-10">
                                                <p className="text-sm font-semibold text-[#102059]">PDF document uploaded</p>
                                                <a
                                                    href={permitSrc}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-semibold text-[#244693] hover:underline"
                                                >
                                                    View business permit
                                                </a>
                                            </div>
                                        ) : permitSrc ? (
                                            <img src={permitSrc} alt="Business Permit" className="h-auto w-full object-cover" />
                                        ) : (
                                            <div className="min-h-[140px]" />
                                        )}
                                    </div>
                                </section>
                            </div>

                            <div className="lg:col-span-6">
                                <section
                                    className="flex flex-col rounded-lg border border-[#E5E7EB] bg-white p-4"
                                    style={{ height: leftColumnHeight > 0 ? `${leftColumnHeight}px` : 'auto' }}
                                >
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <h2 className="text-xl font-bold text-[#102059]">Ratings & Feedback</h2>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star key={star} className="h-5 w-5 fill-[#E5E7EB] text-[#E5E7EB]" />
                                                ))}
                                            </div>
                                            <span className="text-lg font-bold text-[#102059]">0.0</span>
                                        </div>
                                    </div>

                                    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] pb-4">
                                        <span className="mr-1 text-xs text-[#65676B]">Filter by:</span>
                                        <button
                                            type="button"
                                            onClick={() => setStarFilter(null)}
                                            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                                                starFilter === null
                                                    ? 'border-[#244693] bg-[#244693] text-white'
                                                    : 'border-[#E5E7EB] bg-white text-[#65676B] hover:border-[#244693]'
                                            }`}
                                        >
                                            All
                                        </button>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setStarFilter(star)}
                                                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
                                                    starFilter === star
                                                        ? 'border-[#244693] bg-[#244693] text-white'
                                                        : 'border-[#E5E7EB] bg-white text-[#65676B] hover:border-[#244693]'
                                                }`}
                                            >
                                                <Star
                                                    className={`h-3 w-3 ${starFilter === star ? 'fill-white text-white' : 'fill-[#D3A218] text-[#D3A218]'}`}
                                                />
                                                {star}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex flex-1 items-center justify-center py-8 text-center">
                                        <div>
                                            <Star className="mx-auto mb-2 h-12 w-12 text-[#E5E7EB]" />
                                            <p className="text-sm text-[#65676B]">
                                                {starFilter ? 'No reviews found for this rating' : 'No reviews yet'}
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {activeTab === 'gamefowl' && <GamefowlCatalogPanel listings={listings} catalog={catalog} />}

                    {activeTab === 'insights' && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-[#102059]">Farm Insights</h2>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                    ['Total Orders', '0'],
                                    ['Gamefowl Sold', '0'],
                                    ['Total Revenue', '₱0'],
                                    ['Avg. Rating', '0.0'],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                                        <p className="text-2xl font-bold text-[#102059]">{value}</p>
                                        <p className="mt-1 text-sm text-[#65676B]">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white">
                        <div className="sticky top-0 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4">
                            <h3 className="text-xl font-bold text-[#102059]">Edit Farm Information</h3>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F2F5] text-[#65676B] transition-colors hover:bg-[#E5E7EB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-6 p-6">
                            {formError && <p className="text-sm text-[#E20E28]">{formError}</p>}
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#102059]" htmlFor="farm_name">
                                    Farm Name
                                </label>
                                <input
                                    id="farm_name"
                                    type="text"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className={inputClass}
                                />
                                {form.errors.name && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.name}</p>}
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#102059]" htmlFor="contact_number">
                                    Contact Number
                                </label>
                                <input
                                    id="contact_number"
                                    type="text"
                                    value={form.data.contact_number}
                                    onChange={(e) => form.setData('contact_number', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#102059]">Pin Location</label>
                                <PinLocationMap
                                    key={`farm-edit-map-${farm?.id}`}
                                    height={320}
                                    initialLat={form.data.latitude}
                                    initialLng={form.data.longitude}
                                    initialAddress={form.data.address}
                                    initialCity={form.data.city}
                                    initialProvince={form.data.province}
                                    initialPostalCode={form.data.postal_code}
                                    onLocationSelect={(loc) => {
                                        const address = [loc.address, loc.barangay].filter(Boolean).join(', ')
                                        form.setData((prev) => ({
                                            ...prev,
                                            address: address || prev.address,
                                            city: loc.city ?? prev.city,
                                            province: loc.province ?? prev.province,
                                            postal_code: loc.postal_code ?? prev.postal_code,
                                            latitude: loc.latitude != null ? String(loc.latitude) : '',
                                            longitude: loc.longitude != null ? String(loc.longitude) : '',
                                        }))
                                    }}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#102059]" htmlFor="address">
                                    Address
                                </label>
                                <input
                                    id="address"
                                    type="text"
                                    value={form.data.address}
                                    onChange={(e) => form.setData('address', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#102059]" htmlFor="city">
                                        City
                                    </label>
                                    <input
                                        id="city"
                                        type="text"
                                        value={form.data.city}
                                        onChange={(e) => form.setData('city', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#102059]" htmlFor="province">
                                        Province
                                    </label>
                                    <input
                                        id="province"
                                        type="text"
                                        value={form.data.province}
                                        onChange={(e) => form.setData('province', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#102059]" htmlFor="postal_code">
                                        Postal Code
                                    </label>
                                    <input
                                        id="postal_code"
                                        type="text"
                                        value={form.data.postal_code}
                                        onChange={(e) => form.setData('postal_code', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-[#102059]">Bank Details</label>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-xs text-[#65676B]" htmlFor="bank_name">
                                            Bank Name
                                        </label>
                                        <input
                                            id="bank_name"
                                            type="text"
                                            value={form.data.bank_name}
                                            onChange={(e) => form.setData('bank_name', e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs text-[#65676B]" htmlFor="account_name">
                                            Account Name
                                        </label>
                                        <input
                                            id="account_name"
                                            type="text"
                                            value={form.data.account_name}
                                            onChange={(e) => form.setData('account_name', e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs text-[#65676B]" htmlFor="account_number">
                                            Account Number
                                        </label>
                                        <input
                                            id="account_number"
                                            type="text"
                                            inputMode="numeric"
                                            value={form.data.account_number}
                                            onChange={(e) => form.setData('account_number', e.target.value.replace(/\D/g, ''))}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="mb-2 text-sm font-semibold text-[#102059]">
                                    Operating Days <span className="text-[#E20E28]">*</span>
                                </p>
                                <div className="grid grid-cols-7 gap-2">
                                    {DAY_LABELS.map((label, index) => {
                                        const fullDay = DAY_ORDER[index]
                                        const selected = operatingDays.includes(fullDay)
                                        return (
                                            <button
                                                key={fullDay}
                                                type="button"
                                                onClick={() => toggleDay(fullDay)}
                                                className={`rounded-lg border-2 px-2 py-3 text-xs font-semibold transition-all ${
                                                    selected
                                                        ? 'border-[#102059] bg-[#102059] text-white'
                                                        : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#102059]'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div>
                                <p className="mb-2 text-sm font-semibold text-[#102059]">
                                    Operating Hours <span className="text-[#E20E28]">*</span>
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-2 block text-xs text-[#65676B]" htmlFor="opening_time">
                                            Opening Time
                                        </label>
                                        <input
                                            id="opening_time"
                                            type="time"
                                            value={form.data.opening_time}
                                            onChange={(e) => form.setData('opening_time', e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs text-[#65676B]" htmlFor="closing_time">
                                            Closing Time
                                        </label>
                                        <input
                                            id="closing_time"
                                            type="time"
                                            value={form.data.closing_time}
                                            onChange={(e) => form.setData('closing_time', e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[#E5E7EB] bg-white px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#65676B] hover:bg-[#F9FAFB]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={requestSave}
                                className="rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a3570]"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6">
                        <h3 className="mb-4 text-xl font-bold text-[#102059]">Save Changes</h3>
                        <p className="text-sm leading-relaxed text-[#65676B]">
                            Are you sure you want to save changes to{' '}
                            <span className="font-semibold text-[#102059]">{form.data.name}</span>?
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowEditConfirm(false)}
                                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#F9FAFB]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmSave}
                                disabled={form.processing}
                                className="rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a3570] disabled:opacity-60"
                            >
                                {form.processing ? 'Saving...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showStatusConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6">
                        <h3 className="mb-4 text-xl font-bold text-[#102059]">
                            {isActive ? 'Deactivate Farm' : 'Reactivate Farm'}
                        </h3>
                        <p className="text-sm leading-relaxed text-[#65676B]">
                            {isActive
                                ? `Set ${farm?.name} to inactive?`
                                : `Set ${farm?.name} back to active?`}
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowStatusConfirm(false)}
                                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#F9FAFB]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmStatusChange}
                                className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${
                                    isActive
                                        ? 'bg-[#E20E28] hover:bg-[#C10D23]'
                                        : 'bg-[#00C950] hover:bg-[#00B548]'
                                }`}
                            >
                                {isActive ? 'Deactivate Farm' : 'Reactivate Farm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </OwnerManagerKlasmeytLayout>
    )
}
