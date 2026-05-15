import { useState } from 'react'
import { Link } from '@inertiajs/react'
import {
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Package,
    User,
    Star,
} from 'lucide-react'
import SuperAdminOrAdminLayout from '../../../Layouts/SuperAdminOrAdminLayout'

export default function ProductShow({ auth, product }) {
    const photos        = product.images ?? []
    const primaryIndex  = product.primary_image_index ?? 0
    const [current, setCurrent] = useState(primaryIndex < photos.length ? primaryIndex : 0)

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

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Product Detail">
            {/* Back button */}
            <div className="mb-5">
                <Link
                    href="/dashboard/super-admin/products"
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
                        <div className="mt-6 flex gap-3">
                            <Link
                                href={`/dashboard/super-admin/products/${product.id}/edit`}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#102059] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#244693]"
                            >
                                Edit Product
                            </Link>
                            {/* <Link
                                href="/dashboard/super-admin/products"
                                className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] px-5 py-2 text-sm font-medium text-[#374151] transition-colors hover:bg-[#F9FAFB]"
                            >
                                All Products
                            </Link> */}
                        </div>
                    </div>
                </div>
            </div>
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
