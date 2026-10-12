import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import { Check, Clock, Package, X } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function gamefowlBase(userType) {
    return userType === 'admin' ? '/dashboard/admin/gamefowls' : '/dashboard/super-admin/gamefowls'
}

function formatRole(role) {
    if (!role) return '—'
    return role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatHatchDate(value) {
    if (!value) return 'N/A'
    const [year, month, day] = String(value).split('-')
    if (!year || !month || !day) return 'N/A'
    return `${month}/${day}/${year}`
}

export default function GamefowlRequests({ auth, requests = [], flash }) {
    const base = gamefowlBase(auth?.user?.user_type)
    const [expandedId, setExpandedId] = useState(null)
    const [showSuccessAlert, setShowSuccessAlert] = useState(true)

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Gamefowl Requests">
            <div>
                {flash?.success && showSuccessAlert && (
                    <div className="mb-4 flex items-center justify-between rounded-lg border border-[#00C950]/30 bg-[#00C950]/10 px-4 py-3">
                        <p className="text-sm font-medium text-[#00C950]">{flash.success}</p>
                        <button type="button" onClick={() => setShowSuccessAlert(false)} className="text-[#00C950] hover:opacity-70">×</button>
                    </div>
                )}

                <div className="mb-6">
                    <Link href={base} className="mb-4 inline-flex text-sm font-medium text-[#6B7280] hover:text-[#102059]">
                        ← Back to Gamefowl Catalog
                    </Link>
                    <h1 className="mb-1 text-2xl font-semibold text-[#102059]">Gamefowl Registration Requests</h1>
                    <p className="text-sm text-[#6B7280]">
                        Review and approve gamefowl submissions before they appear in the catalog.
                    </p>
                </div>

                {requests.length === 0 ? (
                    <div className="rounded-lg border border-[#E5E7EB] bg-white py-16 text-center">
                        <Clock className="mx-auto mb-3 h-10 w-10 text-[#E5E7EB]" />
                        <p className="text-sm text-[#9CA3AF]">No pending gamefowl registration requests.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map((request) => {
                            const isExpanded = expandedId === request.id
                            const primarySrc = request.images?.[request.primary_image_index] ?? request.images?.[0]
                            return (
                                <div key={request.id} className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isExpanded ? null : request.id)}
                                        className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-[#F8F9FB]"
                                    >
                                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F0F2F5]">
                                            {primarySrc ? (
                                                <img src={primarySrc} alt={request.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <Package className="h-6 w-6 text-[#9CA3AF]" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-[#102059]">{request.name}</p>
                                            <p className="truncate text-xs text-[#6B7280]">
                                                {[request.bloodline_name, request.age_type_name, request.sex, request.class_name].filter(Boolean).join(' • ') || '—'}
                                            </p>
                                            <p className="mt-1 text-xs text-[#9CA3AF]">
                                                Requested by {request.created_by_name || '—'} ({formatRole(request.created_by_role)})
                                                {request.farm_name ? ` · ${request.farm_name}` : ''}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#D3A218]/10 px-2.5 py-0.5 text-xs font-semibold text-[#D3A218]">
                                            <Clock className="h-3 w-3" /> Pending
                                        </span>
                                    </button>
                                    {isExpanded && (
                                        <div className="border-t border-[#E5E7EB] px-6 py-6">
                                            <dl className="mb-6 overflow-hidden rounded-lg border border-[#EEF0F4] bg-[#F8FAFC]">
                                                {[
                                                    ['Bloodline Category', request.bloodline_name],
                                                    ['Bloodline Composition', request.name],
                                                    ['Age Type', request.age_type_name],
                                                    ['Sex', request.sex],
                                                    ['Hatch Date', formatHatchDate(request.hatch_date)],
                                                    ['Class', request.class_name],
                                                    ['Farm', request.farm_name],
                                                ].map(([label, value]) => (
                                                    <div key={label} className="flex items-center justify-between gap-4 border-b border-[#EEF0F4] px-4 py-3 last:border-b-0">
                                                        <dt className="text-sm text-[#6B7280]">{label}</dt>
                                                        <dd className="text-right text-sm font-medium text-[#111827]">{value || '—'}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                            {request.description ? (
                                                <p className="mb-6 text-sm text-[#102059]">{request.description}</p>
                                            ) : null}
                                            {Array.isArray(request.images) && request.images.length > 0 && (
                                                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                                                    {request.images.map((src, index) => (
                                                        <div key={`${request.id}-${index}`} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#E5E7EB]">
                                                            <img src={src} alt="" className="h-full w-full object-cover" />
                                                            {index === (request.primary_image_index ?? 0) && (
                                                                <span className="absolute top-2 right-2 rounded-full bg-[#D3A218] px-2 py-0.5 text-[10px] font-semibold text-white">
                                                                    Primary
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!confirm('Reject this gamefowl registration request?')) return
                                                        router.post(`${base}/requests/${request.id}/reject`, {}, { preserveScroll: true })
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-[#E20E28] px-5 py-2.5 text-sm font-semibold text-[#E20E28] hover:bg-[#FEE2E2]"
                                                >
                                                    <X className="h-4 w-4" /> Reject
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!confirm('Approve this gamefowl registration request?')) return
                                                        router.post(`${base}/requests/${request.id}/approve`, {}, { preserveScroll: true })
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-[#102059] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#244693]"
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
