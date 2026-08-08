import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, Package, Search } from 'lucide-react'

function formatPeso(amount) {
    const value = Number(amount)
    if (!Number.isFinite(value)) return '₱0'
    return `₱${value.toLocaleString('en-PH', {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
    })}`
}

function ProductListCard({ product, onSend, sendingId }) {
    const hasDiscount =
        Number(product.effective_price) < Number(product.item_price) &&
        Number(product.active_discount_percent) > 0
    const variationLabel = product.unit_label || 'Select Variation'
    const isSending = sendingId === product.id

    return (
        <div className="flex items-center gap-3 rounded-2xl bg-[#F3F4F6] px-3 py-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#E5E7EB]">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#9CA3AF]">
                        <Package className="h-6 w-6" />
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#1F2937]">
                    {product.item_name}
                </p>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#E5E7EB] px-2.5 py-0.5 text-[11px] font-medium text-[#4B5563]">
                    <span className="max-w-[9rem] truncate">{variationLabel}</span>
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/80 text-[#6B7280]">
                        <ChevronDown className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-sm font-bold text-[#1F2937]">
                        {formatPeso(product.effective_price)}
                    </span>
                    {hasDiscount && (
                        <span className="text-xs text-[#9CA3AF] line-through">
                            {formatPeso(product.item_price)}
                        </span>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={() => onSend(product)}
                disabled={Boolean(sendingId)}
                className="shrink-0 rounded-xl border border-[#5B7CBA] bg-white px-4 py-2 text-sm font-semibold text-[#5B7CBA] transition-colors hover:bg-[#EFF6FF] disabled:opacity-50"
            >
                {isSending ? '…' : 'Send'}
            </button>
        </div>
    )
}

/**
 * Full-screen product picker for shop messaging.
 * onSelect(product) — stage/send the chosen listing.
 */
export default function ProductListPicker({ open, productsUrl, onClose, onSelect }) {
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [sendingId, setSendingId] = useState(null)

    useEffect(() => {
        if (!open) return undefined
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250)
        return () => clearTimeout(timer)
    }, [search, open])

    useEffect(() => {
        if (!open) {
            setSearch('')
            setDebouncedSearch('')
            setProducts([])
            setError(null)
            setSendingId(null)
            return undefined
        }

        if (!productsUrl) {
            setError('Products are unavailable for this shop.')
            return undefined
        }

        let cancelled = false
        const controller = new AbortController()

        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const url = new URL(productsUrl, window.location.origin)
                if (debouncedSearch) {
                    url.searchParams.set('search', debouncedSearch)
                }

                const response = await fetch(url.toString(), {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                    signal: controller.signal,
                })

                if (!response.ok) {
                    throw new Error('Failed to load products')
                }

                const data = await response.json()
                if (!cancelled) {
                    setProducts(Array.isArray(data.products) ? data.products : [])
                }
            } catch (err) {
                if (cancelled || err?.name === 'AbortError') return
                setError('Unable to load products. Please try again.')
                setProducts([])
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()

        return () => {
            cancelled = true
            controller.abort()
        }
    }, [open, productsUrl, debouncedSearch])

    useEffect(() => {
        if (!open) return undefined

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose()
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open, onClose])

    const emptyLabel = useMemo(() => {
        if (loading) return 'Loading products…'
        if (error) return error
        if (debouncedSearch) return 'No products match your search.'
        return 'No products available in this shop.'
    }, [loading, error, debouncedSearch])

    if (!open) return null

    const handleSend = async (product) => {
        if (!product?.id || sendingId) return
        setSendingId(product.id)
        try {
            await onSelect(product)
            onClose()
        } finally {
            setSendingId(null)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex justify-center bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-label="Product List"
        >
            <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-xl">
                <div className="flex items-center gap-3 border-b border-[#E5E7EB] px-4 py-3 sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D1D5DB] text-[#4B5563] transition-colors hover:bg-[#9CA3AF] hover:text-white"
                        aria-label="Back to conversation"
                        style={{ borderRadius: '20px' }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search products"
                            autoFocus
                            className="w-full rounded-full border border-[#E5E7EB] bg-[#F3F4F6] py-2.5 pl-10 pr-4 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none focus:border-[#BFDBFE] focus:bg-white"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                    <h2 className="mb-4 text-lg font-bold text-[#1F2937]">Product List</h2>

                    {products.length === 0 ? (
                        <div className="py-16 text-center text-sm text-[#6B7280]">{emptyLabel}</div>
                    ) : (
                        <div className="space-y-3">
                            {products.map((product) => (
                                <ProductListCard
                                    key={product.id}
                                    product={product}
                                    onSend={handleSend}
                                    sendingId={sendingId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export function ProductMessageCard({ product, tone = 'outgoing' }) {
    if (!product) return null

    const name = product.product_name || product.item_name || 'Product'
    const unit = product.unit_label || null
    const effective = product.effective_price ?? product.item_price
    const original = product.item_price
    const hasDiscount =
        Number(effective) < Number(original) && Number(product.active_discount_percent) > 0
    const bubbleTone = tone === 'outgoing' ? 'bg-[#BFDBFE]' : 'bg-[#E5E7EB]'

    return (
        <div
            className={`flex max-w-[280px] items-stretch gap-2.5 overflow-hidden rounded-2xl ${bubbleTone} p-2.5 text-left`}
        >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/70">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#9CA3AF]">
                        <Package className="h-6 w-6" />
                    </div>
                )}
            </div>
            <div className="min-w-0 flex-1 py-0.5">
                <p className="truncate text-sm font-bold text-[#1F2937]" style={{ marginBottom: '0px' }}>{name}</p>
                {unit && <p className="mt-0.5 text-xs text-[#4B5563]" style={{ marginBottom: '0px' }}>{unit}</p>}
                <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-[#1F2937]">
                        {formatPeso(effective)}
                    </span>
                    {hasDiscount && (
                        <span className="text-xs text-[#6B7280] line-through">
                            {formatPeso(original)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export { formatPeso }
