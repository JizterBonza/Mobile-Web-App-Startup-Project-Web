import { useEffect, useMemo, useState } from 'react'
import { Link } from '@inertiajs/react'
import { Heart, Package, Plus, Search } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../../Layouts/SuperAdminOrAdminLayout'

export default function SuperAdminProducts({ auth, products = [] }) {
    const [productSearchQuery, setProductSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('All')
    const [productStatusFilter, setProductStatusFilter] = useState('All')
    const [productSortBy, setProductSortBy] = useState('name')
    const [productItemsPerPage, setProductItemsPerPage] = useState(10)
    const [currentProductPage, setCurrentProductPage] = useState(1)

    const normalizedProducts = useMemo(() => {
        return (products ?? []).map((p) => ({
            id: p.id,
            productName: p.item_name ?? '',
            category: p.category_name ?? p.category ?? '',
            status: p.item_status ?? 'active',
            dateAdded: p.created_at ?? null,
            popularity: Number(p.sold_count ?? 0),
            unitLabel: p.weight && p.metric ? `${p.weight} ${p.metric}` : '',
            shopName: p.shop_name ?? '',
            photos: Array.isArray(p.item_images) ? p.item_images : [],
        }))
    }, [products])

    const categories = useMemo(() => {
        const cats = new Set(
            normalizedProducts
                .map((p) => p.category)
                .filter((c) => c && typeof c === 'string'),
        )
        return ['All', ...Array.from(cats)]
    }, [normalizedProducts])

    const filteredProducts = useMemo(() => {
        const q = productSearchQuery.trim().toLowerCase()
        return normalizedProducts.filter((p) => {
            const matchesSearch =
                !q ||
                (p.productName || '').toLowerCase().includes(q) ||
                String(p.id).includes(q) ||
                (p.category || '').toLowerCase().includes(q) ||
                (p.shopName || '').toLowerCase().includes(q)

            const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter

            const normalizedStatus = (p.status || 'active').toLowerCase()
            const matchesStatus =
                productStatusFilter === 'All' ||
                normalizedStatus === productStatusFilter.toLowerCase()

            return matchesSearch && matchesCategory && matchesStatus
        })
    }, [normalizedProducts, productSearchQuery, categoryFilter, productStatusFilter])

    const sortedProducts = useMemo(() => {
        const arr = [...filteredProducts]
        arr.sort((a, b) => {
            if (productSortBy === 'name') {
                return (a.productName || '').localeCompare(b.productName || '')
            }
            if (productSortBy === 'date') {
                return new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime()
            }
            if (productSortBy === 'popularity') {
                return (b.popularity || 0) - (a.popularity || 0)
            }
            return 0
        })
        return arr
    }, [filteredProducts, productSortBy])

    const totalProductPages = useMemo(() => {
        return Math.ceil(sortedProducts.length / productItemsPerPage) || 1
    }, [sortedProducts.length, productItemsPerPage])

    const startIndex = useMemo(() => {
        return (currentProductPage - 1) * productItemsPerPage
    }, [currentProductPage, productItemsPerPage])

    const endIndex = useMemo(() => {
        return startIndex + productItemsPerPage
    }, [startIndex, productItemsPerPage])

    const displayedProducts = useMemo(() => {
        return sortedProducts.slice(startIndex, endIndex)
    }, [sortedProducts, startIndex, endIndex])

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentProductPage(1)
    }, [productSearchQuery, categoryFilter, productStatusFilter, productSortBy, productItemsPerPage])

    const filterSelectClass =
        'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]'

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Products">
            <div>
                {/* Page header — matches AgrivetManagement layout */}
                <div className="mb-6">
                    <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Products</h1>
                    <p className="text-sm text-[#6B7280]">View all registered products in the system</p>

                    <div className="mt-4">
                        <Link
                            href="/dashboard/vendor/products"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#102059] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#244693] whitespace-nowrap"
                            style={{backgroundColor: '#102059'}}
                        >
                            <Plus className="h-4 w-4" />
                            Register Product
                        </Link>
                    </div>
                </div>

                {/* Filters bar */}
                <div className="mb-6 p-[0px]">
                    <div className="flex flex-col gap-4 bg-transparent md:flex-row md:items-center md:justify-between">
                        <div className="relative max-w-md flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            <input
                                type="text"
                                placeholder="Search product name, id, category, store..."
                                value={productSearchQuery}
                                onChange={(e) => setProductSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-[#E5E7EB] bg-[#ffffff] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <select
                                value={productSortBy}
                                onChange={(e) => setProductSortBy(e.target.value)}
                                className={filterSelectClass}
                            >
                                <option value="name">Sort by Name</option>
                                <option value="date">Date Added</option>
                                <option value="popularity">Popularity</option>
                            </select>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className={filterSelectClass}
                            >
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat === 'All' ? 'All Categories' : cat}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={productStatusFilter}
                                onChange={(e) => setProductStatusFilter(e.target.value)}
                                className={filterSelectClass}
                            >
                                <option value="All">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <select
                                value={productItemsPerPage}
                                onChange={(e) => setProductItemsPerPage(Number(e.target.value))}
                                className="rounded-lg border border-[#E5E7EB] bg-[#ffffff] px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
                            >
                                <option value={5}>Show 5</option>
                                <option value={10}>Show 10</option>
                                <option value={25}>Show 25</option>
                                <option value={50}>Show 50</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Products list */}
                <div className="rounded-lg border border-[#E5E7EB] bg-white">
                    <div className="divide-y divide-[#E5E7EB]">
                        {displayedProducts.length > 0 ? (
                            displayedProducts.map((product) => {
                                const imageSrc = product.photos?.[0]
                                return (
                                    <div key={product.id} className="px-6 py-4 transition-colors hover:bg-[#F8F9FB]">
                                        <div className="flex items-center gap-3">
                                            {/* Thumbnail */}
                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F0F2F5]">
                                                {imageSrc ? (
                                                    <img
                                                        src={imageSrc}
                                                        alt={product.productName}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <Package className="h-5 w-5 text-[#9CA3AF]" />
                                                )}
                                            </div>

                                            {/* Content Grid */}
                                            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[1fr_180px_150px_160px]">
                                                {/* Product Info */}
                                                <div>
                                                    <div className="text-sm font-bold text-[#102059]">
                                                        {product.productName}
                                                    </div>
                                                    <div className="text-sm text-[#6B7280]">
                                                        {product.category}
                                                        {product.unitLabel ? ` • ${product.unitLabel}` : ''}
                                                        {product.shopName ? ` • ${product.shopName}` : ''}
                                                    </div>
                                                </div>

                                                {/* Product ID */}
                                                <div className="flex items-center">
                                                    <div>
                                                        <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                                                            Product ID
                                                        </div>
                                                        <div className="mt-0.5 font-mono text-xs text-[#9CA3AF]">
                                                            #{product.id}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Popularity */}
                                                <div className="flex items-center">
                                                    <div>
                                                        <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                                                            Popularity
                                                        </div>
                                                        <div className="mt-0.5 flex items-center gap-1.5">
                                                            <Heart className="h-3.5 w-3.5 text-[#102059]" />
                                                            <span className="text-xs font-semibold text-[#102059]">
                                                                {Number(product.popularity || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Status */}
                                                <div className="flex items-center">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                            (product.status || 'active').toLowerCase() === 'active'
                                                                ? 'bg-[#00C950]/10 text-[#00C950]'
                                                                : 'bg-[#F3F4F6] text-[#6B7280]'
                                                        }`}
                                                    >
                                                        {(product.status || 'active').toLowerCase() === 'active'
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-sm text-[#9CA3AF]">
                                    No products found matching your search criteria
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results count + pagination */}
                <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[#6B7280]">
                            Showing{' '}
                            <span className="font-semibold text-[#102059]">
                                {sortedProducts.length === 0
                                    ? '0'
                                    : `${startIndex + 1}-${Math.min(endIndex, sortedProducts.length)}`}
                            </span>{' '}
                            of <span className="font-semibold text-[#102059]">{sortedProducts.length}</span> products
                            {productSearchQuery && ` matching "${productSearchQuery}"`}
                            {categoryFilter !== 'All' && ` in "${categoryFilter}"`}
                            {productStatusFilter !== 'All' && ` with status "${productStatusFilter}"`}
                        </p>

                        {totalProductPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#244693] disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={currentProductPage === 1}
                                    onClick={() => setCurrentProductPage(currentProductPage - 1)}
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-[#6B7280]">
                                    Page {currentProductPage} of {totalProductPages}
                                </span>
                                <button
                                    type="button"
                                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={currentProductPage === totalProductPages}
                                    onClick={() => setCurrentProductPage(currentProductPage + 1)}
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

