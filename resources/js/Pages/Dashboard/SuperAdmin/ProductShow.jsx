import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import {
    ArrowLeft,
    Ban,
    Calendar,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Package,
    Pencil,
    User,
    Star,
} from 'lucide-react'
import SuperAdminOrAdminLayout from '../../../Layouts/SuperAdminOrAdminLayout'

function getProductsBaseRoute(userType) {
    if (userType === 'admin') return '/dashboard/admin/products'
    return '/dashboard/super-admin/products'
}

export default function ProductShow({ auth, product, flash }) {
    const productsBase = getProductsBaseRoute(auth?.user?.user_type)

    const photos        = product.images ?? []
    const primaryIndex  = product.primary_image_index ?? 0
    const [current, setCurrent] = useState(primaryIndex < photos.length ? primaryIndex : 0)
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [updatingStatus, setUpdatingStatus] = useState(false)

    const isActive = product.status === 'active'
    const nextStatus = isActive ? 'inactive' : 'active'

    const prev = () => setCurrent(i => (i - 1 + photos.length) % photos.length)
    const next = () => setCurrent(i => (i + 1) % photos.length)

    const unit = product.weight && product.unit
        ? `${product.weight} ${product.unit}`
        : product.unit || '—'

    const dateLabel = product.created_at
        ? new Date(product.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
          })
        : '—'

    const confirmStatusChange = () => {
        if (updatingStatus) return
        setUpdatingStatus(true)
        router.patch(
            `${productsBase}/${product.id}/status`,
            { status: nextStatus },
            {
                preserveScroll: true,
                onFinish: () => {
                    setUpdatingStatus(false)
                    setShowStatusModal(false)
                },
            }
        )
    }

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Product Detail">
            {flash?.success && (
                <div className="mb-4 rounded-lg border border-[#00C950]/30 bg-[#00C950]/10 px-4 py-3">
                    <p className="text-sm font-medium text-[#00C950]">{flash.success}</p>
                </div>
            )}

            {/* Back button */}
            <div className="mb-5">
                <Link
                    href={productsBase}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#102059]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Products
                </Link>
            </div>

            {/* Main card */}
            <div className="mx-auto max-w-7xl overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2">

                    {/* ── Left column: image gallery ── */}
                    <div className="flex flex-col bg-[#F0F2F5]">
                        {/* Main image */}
                        <div className="relative aspect-square w-full overflow-hidden">
                            {photos.length > 0 ? (
                                <img
                                    key={current}
                                    src={photos[current]}
                                    alt={`${product.product_name} – photo ${current + 1}`}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Package className="h-20 w-20 text-[#D1D5DB]" />
                                </div>
                            )}

                            {/* Prev / Next arrows */}
                            {photos.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={prev}
                                        className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-all hover:scale-110 hover:bg-white"
                                    >
                                        <ChevronLeft className="h-5 w-5 text-[#102059]" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={next}
                                        className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-all hover:scale-110 hover:bg-white"
                                    >
                                        <ChevronRight className="h-5 w-5 text-[#102059]" />
                                    </button>
                                </>
                            )}

                            {/* Slide counter */}
                            {photos.length > 1 && (
                                <div className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-semibold text-white">
                                    {current + 1} / {photos.length}
                                </div>
                            )}
                        </div>

                        {/* Thumbnail strip */}
                        {photos.length > 1 && (
                            <div className="flex justify-center gap-2 px-4 py-3">
                                {photos.map((src, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrent(idx)}
                                        className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                                            idx === current
                                                ? 'border-[#102059] ring-1 ring-[#102059]/30'
                                                : 'border-white hover:border-[#9CA3AF]'
                                        }`}
                                    >
                                        <img
                                            src={src}
                                            alt={`Thumbnail ${idx + 1}`}
                                            className="h-full w-full object-cover"
                                        />
                                        {idx === primaryIndex && (
                                            <div className="absolute -right-0.5 -top-0.5 rounded-full bg-[#D3A218] p-0.5">
                                                <Star className="h-3 w-3 text-white" fill="white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Right column: product info ── */}
                    <div className="flex flex-col p-6 lg:p-7">

                        {/* Name + ID */}
                        <div className="mb-5 border-b border-[#E5E7EB] pb-4">
                            <h1 className="text-2xl font-bold text-[#102059]">{product.product_name}</h1>
                            <p className="mt-1 font-mono text-xs text-[#9CA3AF]">ID #{product.id}</p>
                        </div>

                        {/* Key info grid */}
                        <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[#E5E7EB] pb-5">
                            <InfoField label="Brand"    value={product.brand || '—'} />
                            <InfoField label="Category" value={product.category_name || '—'} />
                            <InfoField label="Sub-Category" value={product.sub_category_name || '—'} />
                            <InfoField label="Unit / Size"  value={unit} />
                            <div className="col-span-2">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Status</p>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    product.status === 'active'
                                        ? 'bg-[#00C950]/10 text-[#00C950]'
                                        : 'bg-[#F3F4F6] text-[#6B7280]'
                                }`}>
                                    {product.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div className="mb-5 border-b border-[#E5E7EB] pb-5">
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Description</p>
                                <p className="text-sm leading-relaxed text-[#374151]">{product.description}</p>
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="mt-auto flex flex-col gap-2.5">
                            <MetaRow icon={<Calendar className="h-3.5 w-3.5 text-[#6B7280]" />} label="Date Registered" value={dateLabel} />
                            <MetaRow icon={<User className="h-3.5 w-3.5 text-[#6B7280]" />}     label="Added by"        value={product.created_by_name || '—'} />
                            <MetaRow icon={<Package className="h-3.5 w-3.5 text-[#6B7280]" />}  label="Images"          value={`${photos.length} photo${photos.length !== 1 ? 's' : ''}`} />
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href={`${productsBase}/${product.id}/edit`}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#102059]/30 bg-white px-5 py-2 text-sm font-medium text-[#102059] transition-colors hover:bg-[#F0F7FF]"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Product
                            </Link>
                            <button
                                type="button"
                                onClick={() => setShowStatusModal(true)}
                                disabled={updatingStatus}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                                    isActive
                                        ? 'border-[#E20E28]/30 bg-white text-[#E20E28] hover:bg-[#FEF2F2]'
                                        : 'border-[#00C950]/30 bg-white text-[#00C950] hover:bg-[#F0FDF4]'
                                }`}
                            >
                                {isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                {isActive ? 'Disable Product' : 'Enable Product'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6">
                        <h3 className="mb-2 text-lg font-bold text-[#102059]">
                            {isActive ? 'Disable Product' : 'Enable Product'}
                        </h3>
                        <p className="mb-6 text-sm text-[#6B7280]">
                            {isActive ? (
                                <>
                                    Disable <span className="font-semibold text-[#102059]">{product.product_name}</span>?
                                    It will be marked inactive and Agrivets will not be able to restock it when they run out of stock.
                                    Remaining shop inventory can still be sold.
                                </>
                            ) : (
                                <>
                                    Enable <span className="font-semibold text-[#102059]">{product.product_name}</span>?
                                    Agrivets will be able to add and restock this product again.
                                </>
                            )}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowStatusModal(false)}
                                disabled={updatingStatus}
                                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmStatusChange}
                                disabled={updatingStatus}
                                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                                    isActive ? 'bg-[#E20E28] hover:bg-[#B8000F]' : 'bg-[#102059] hover:bg-[#244693]'
                                }`}
                            >
                                {updatingStatus ? 'Saving...' : isActive ? 'Disable Product' : 'Enable Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminOrAdminLayout>
    )
}

function InfoField({ label, value }) {
    return (
        <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</p>
            <p className="text-sm font-bold text-[#102059]">{value}</p>
        </div>
    )
}

function MetaRow({ icon, label, value }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</span>
            </div>
            <span className="text-sm font-medium text-[#374151]">{value}</span>
        </div>
    )
}
