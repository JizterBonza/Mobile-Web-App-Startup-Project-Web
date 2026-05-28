import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import { Check, Clock, Package, Star, X } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../../Layouts/SuperAdminOrAdminLayout'

function formatRole(role) {
    if (!role) return '—'
    return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function ProductRequests({ auth, requests = [], requestsBase, flash }) {
    const [expandedId, setExpandedId] = useState(null)
    const [showSuccessAlert, setShowSuccessAlert] = useState(true)

    const toggleExpand = (id) => setExpandedId(prev => (prev === id ? null : id))

    const handleApprove = (id) => {
        if (!confirm('Approve this product registration request?')) return
        router.post(`${requestsBase}/${id}/approve`, {}, { preserveScroll: true })
    }

    const handleReject = (id) => {
        if (!confirm('Reject this product registration request?')) return
        router.post(`${requestsBase}/${id}/reject`, {}, { preserveScroll: true })
    }

    const productsBase = auth?.user?.user_type === 'admin'
        ? '/dashboard/admin/products'
        : '/dashboard/super-admin/products'

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Product Requests">
            <div>
                {flash?.success && showSuccessAlert && (
                    <div className="mb-4 flex items-center justify-between rounded-lg border border-[#00C950]/30 bg-[#00C950]/10 px-4 py-3">
                        <p className="text-sm font-medium text-[#00C950]">{flash.success}</p>
                        <button type="button" onClick={() => setShowSuccessAlert(false)} className="text-[#00C950] hover:opacity-70">×</button>
                    </div>
                )}

                <div className="mb-6">
                    <Link
                        href={productsBase}
                        className="mb-4 inline-flex text-sm font-medium text-[#6B7280] hover:text-[#102059]"
                    >
                        ← Back to Product Catalog
                    </Link>
                    <h1 className="mb-1 text-2xl font-semibold text-[#102059]">Product Registration Requests</h1>
                    <p className="text-sm text-[#6B7280]">
                        Review and approve product submissions from vendors and store owners before they appear in the catalog.
                    </p>
                </div>

                {requests.length === 0 ? (
                    <div className="rounded-lg border border-[#E5E7EB] bg-white py-16 text-center">
                        <Clock className="mx-auto mb-3 h-10 w-10 text-[#E5E7EB]" />
                        <p className="text-sm text-[#9CA3AF]">No pending product registration requests.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map(req => {
                            const isExpanded = expandedId === req.id
                            const primarySrc = req.images?.[req.primary_image_index] ?? req.images?.[0]

                            return (
                                <div key={req.id} className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(req.id)}
                                        className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-[#F8F9FB]"
                                    >
                                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F0F2F5]">
                                            {primarySrc ? (
                                                <img src={primarySrc} alt={req.product_name} className="h-full w-full object-cover" />
                                            ) : (
                                                <Package className="h-6 w-6 text-[#9CA3AF]" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-[#102059]">{req.product_name}</p>
                                            <p className="truncate text-xs text-[#6B7280]">
                                                {[req.brand, req.category_name, req.weight && req.unit ? `${req.weight} ${req.unit}` : null]
                                                    .filter(Boolean)
                                                    .join(' • ')}
                                            </p>
                                            <p className="mt-1 text-xs text-[#9CA3AF]">
                                                Requested by {req.created_by_name || '—'} ({formatRole(req.created_by_role)})
                                                {req.created_at && ` · ${new Date(req.created_at).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#D3A218]/10 px-2.5 py-0.5 text-xs font-semibold text-[#D3A218]">
                                            <Clock className="h-3 w-3" /> Pending
                                        </span>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-[#E5E7EB] px-6 py-6">
                                            <div className="mb-6 grid gap-6 md:grid-cols-2">
                                                <div className="space-y-3 rounded-lg bg-[#F9FAFB] p-4 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-[#6B7280]">Brand</span>
                                                        <span className="font-semibold text-[#102059]">{req.brand || '—'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-[#6B7280]">Category</span>
                                                        <span className="font-semibold text-[#102059]">{req.category_name || '—'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-[#6B7280]">Sub Category</span>
                                                        <span className="font-semibold text-[#102059]">{req.sub_category_name || '—'}</span>
                                                    </div>
                                                    <div className="border-t border-[#E5E7EB] pt-2">
                                                        <span className="mb-1 block text-[#6B7280]">Description</span>
                                                        <p className="text-[#102059]">{req.description || '—'}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Images</p>
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {(req.images || []).map((src, index) => (
                                                            <div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-[#E5E7EB]">
                                                                <img src={src} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                                                                {req.primary_image_index === index && (
                                                                    <div className="absolute -top-1 -right-1 rounded-full bg-[#D3A218] p-0.5">
                                                                        <Star className="h-3 w-3 text-white" fill="white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleReject(req.id)}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-[#E20E28] px-5 py-2.5 text-sm font-semibold text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                                                >
                                                    <X className="h-4 w-4" /> Reject
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleApprove(req.id)}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-[#102059] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
                                                >
                                                    <Check className="h-4 w-4" /> Approve
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </SuperAdminOrAdminLayout>
    )
}
