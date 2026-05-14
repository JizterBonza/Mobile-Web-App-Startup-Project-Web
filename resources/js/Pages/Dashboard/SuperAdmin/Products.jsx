import { useEffect, useMemo, useState } from 'react'
import { Link } from '@inertiajs/react'
import { Package, Plus, Search, Star } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../../Layouts/SuperAdminOrAdminLayout'

export default function SuperAdminProducts({ auth, products = [], flash }) {
    const [searchQuery, setSearchQuery]           = useState('')
    const [categoryFilter, setCategoryFilter]     = useState('All')
    const [statusFilter, setStatusFilter]         = useState('All')
    const [sortBy, setSortBy]                     = useState('date')
    const [itemsPerPage, setItemsPerPage]         = useState(10)
    const [currentPage, setCurrentPage]           = useState(1)
    const [showSuccessAlert, setShowSuccessAlert] = useState(true)

    const normalizedProducts = useMemo(() => {
        return products.map(p => ({
            id:           p.id,
            productName:  p.product_name ?? '',
            brand:        p.brand ?? '',
            category:     p.category_name ?? '',
            unit:         p.weight && p.unit ? `${p.weight} ${p.unit}` : '',
            status:       (p.status ?? 'active').toLowerCase(),
            dateAdded:    p.created_at ?? null,
            createdBy:    p.created_by_name ?? '',
            photos:       Array.isArray(p.images) ? p.images : [],
            primaryIndex: p.primary_image_index ?? 0,
        }))
    }, [products])

    const categories = useMemo(() => {
        const cats = new Set(normalizedProducts.map(p => p.category).filter(Boolean))
        return ['All', ...Array.from(cats)]
    }, [normalizedProducts])

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return normalizedProducts.filter(p => {
            const matchSearch =
                !q ||
                p.productName.toLowerCase().includes(q) ||
                p.brand.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                String(p.id).includes(q)
            const matchCategory = categoryFilter === 'All' || p.category === categoryFilter
            const matchStatus   = statusFilter === 'All' || p.status === statusFilter.toLowerCase()
            return matchSearch && matchCategory && matchStatus
        })
    }, [normalizedProducts, searchQuery, categoryFilter, statusFilter])

    const sorted = useMemo(() => {
        const arr = [...filtered]
        arr.sort((a, b) => {
            if (sortBy === 'name') return a.productName.localeCompare(b.productName)
            if (sortBy === 'date') return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
            return 0
        })
        return arr
    }, [filtered, sortBy])

    const totalPages  = Math.max(1, Math.ceil(sorted.length / itemsPerPage))
    const startIndex  = (currentPage - 1) * itemsPerPage
    const displayed   = sorted.slice(startIndex, startIndex + itemsPerPage)

    useEffect(() => { setCurrentPage(1) }, [searchQuery, categoryFilter, statusFilter, sortBy, itemsPerPage])

    const filterClass = 'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-4 py-2 bg-white'

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Products">
            <div>
                {/* Flash success */}
                {flash?.success && showSuccessAlert && (
                    <div className="mb-4 flex items-center justify-between rounded-lg border border-[#00C950]/30 bg-[#00C950]/10 px-4 py-3">
                        <p className="text-sm font-medium text-[#00C950]">{flash.success}</p>
                        <button
                            type="button"
                            onClick={() => setShowSuccessAlert(false)}
                            className="ml-4 text-[#00C950] hover:opacity-70"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Page header */}
                <div className="mb-6">
                    <h1 className="mb-1 text-2xl font-semibold text-[#102059]">Product Catalog</h1>
                    <p className="text-sm text-[#6B7280]">
                        Manage the platform product catalog. Vendors can only add products listed here to their shop inventory.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                            href="/dashboard/super-admin/products/create"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#102059] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#244693]"
                            style={{ backgroundColor: '#102059', border: '1px solid #102059' }}
                        >
                            <Plus className="h-4 w-4" />
                            Register Product
                        </Link>
                        <Link
                            href="/dashboard/super-admin/categories"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#102059] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#F0F7FF]"
                            style={{ backgroundColor: '#102059', border: '1px solid #102059' }}
                        >
                            Go to Categories
                        </Link>
                        <Link
                            href="/dashboard/super-admin/sub-categories"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#102059] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#F0F7FF]"
                            style={{ backgroundColor: '#102059', border: '1px solid #102059' }}
                        >
                            Go to Sub-Categories
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        {/* Search */}
                        <div className="relative max-w-md flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            <input
                                type="text"
                                placeholder="Search by name, brand, category..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={filterClass}>
                                <option value="date">Date Added</option>
                                <option value="name">Name A–Z</option>
                            </select>
                            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={filterClass}>
                                {categories.map(c => (
                                    <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                                ))}
                            </select>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={filterClass}>
                                <option value="All">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className={filterClass}>
                                <option value={5}>Show 5</option>
                                <option value={10}>Show 10</option>
                                <option value={25}>Show 25</option>
                                <option value={50}>Show 50</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Product list */}
                <div className="rounded-lg border border-[#E5E7EB] bg-white">
                    <div className="divide-y divide-[#E5E7EB]">
                        {displayed.length > 0 ? displayed.map(product => {
                            const primarySrc = product.photos[product.primaryIndex] ?? product.photos[0]
                            return (
                                <div key={product.id} className="px-6 py-4 transition-colors hover:bg-[#F8F9FB]">
                                    <div className="flex items-center gap-4">
                                        {/* Thumbnail */}
                                        <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F0F2F5]">
                                            {primarySrc ? (
                                                <img
                                                    src={primarySrc}
                                                    alt={product.productName}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <Package className="h-6 w-6 text-[#9CA3AF]" />
                                            )}
                                            {/* Primary star badge */}
                                            {product.photos.length > 1 && (
                                                <div className="absolute bottom-0.5 right-0.5 rounded-full bg-[#D3A218] p-0.5">
                                                    <Star className="h-2.5 w-2.5 text-white" fill="white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info grid */}
                                        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[1fr_140px_120px_120px_120px]">
                                            {/* Name + brand */}
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-[#102059]">{product.productName}</p>
                                                <p className="truncate text-xs text-[#6B7280]">
                                                    {[product.brand, product.category, product.unit].filter(Boolean).join(' • ')}
                                                </p>
                                            </div>

                                            {/* Product ID */}
                                            <div className="flex items-center">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">ID</p>
                                                    <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">#{product.id}</p>
                                                </div>
                                            </div>

                                            {/* Images count */}
                                            <div className="flex items-center">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Images</p>
                                                    <p className="mt-0.5 text-xs font-semibold text-[#102059]">{product.photos.length}</p>
                                                </div>
                                            </div>

                                            {/* Author */}
                                            <div className="flex items-center">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Added by</p>
                                                    <p className="mt-0.5 truncate text-xs text-[#102059]">{product.createdBy || '—'}</p>
                                                </div>
                                            </div>

                                            {/* Status */}
                                            <div className="flex items-center">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                    product.status === 'active'
                                                        ? 'bg-[#00C950]/10 text-[#00C950]'
                                                        : 'bg-[#F3F4F6] text-[#6B7280]'
                                                }`}>
                                                    {product.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="py-16 text-center">
                                <Package className="mx-auto mb-3 h-10 w-10 text-[#E5E7EB]" />
                                <p className="text-sm text-[#9CA3AF]">No products found in the catalog.</p>
                                <Link
                                    href="/dashboard/super-admin/products/create"
                                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#102059] hover:underline"
                                >
                                    <Plus className="h-4 w-4" /> Register the first product
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[#6B7280]">
                            Showing{' '}
                            <span className="font-semibold text-[#102059]">
                                {sorted.length === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + itemsPerPage, sorted.length)}`}
                            </span>{' '}
                            of <span className="font-semibold text-[#102059]">{sorted.length}</span> products
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-[#6B7280]">Page {currentPage} of {totalPages}</span>
                                <button
                                    type="button"
                                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SuperAdminOrAdminLayout>
    )
}
