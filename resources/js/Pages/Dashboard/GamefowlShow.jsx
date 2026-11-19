import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import {
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Package,
    Pencil,
    Star,
    Trash2,
    User,
} from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function gamefowlBase(userType) {
    return userType === 'admin' ? '/dashboard/admin/gamefowls' : '/dashboard/super-admin/gamefowls'
}

function formatDate(value, empty = '—') {
    if (!value) return empty
    const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return empty
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    })
}

export default function GamefowlShow({ auth, gamefowl, flash }) {
    const base = gamefowlBase(auth?.user?.user_type)
    const photos = gamefowl.images ?? []
    const primaryIndex = gamefowl.primary_image_index ?? 0
    const [current, setCurrent] = useState(primaryIndex < photos.length ? primaryIndex : 0)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const canManageCatalog = gamefowl.status === 'active' || gamefowl.status === 'inactive'
    const isActive = gamefowl.status === 'active'
    const nextStatus = isActive ? 'inactive' : 'active'

    const prev = () => setCurrent(i => (i - 1 + photos.length) % photos.length)
    const next = () => setCurrent(i => (i + 1) % photos.length)

    const confirmStatusChange = () => {
        if (updatingStatus) return
        setUpdatingStatus(true)
        router.patch(
            `${base}/${gamefowl.id}/status`,
            { status: nextStatus },
            {
                preserveScroll: true,
                onFinish: () => {
                    setUpdatingStatus(false)
                    setShowStatusModal(false)
                },
            },
        )
    }

    const confirmDelete = () => {
        if (deleting) return
        setDeleting(true)
        router.delete(`${base}/${gamefowl.id}`, {
            onFinish: () => setDeleting(false),
        })
    }

    const statusLabel = gamefowl.status === 'active'
        ? 'Active'
        : gamefowl.status === 'inactive'
            ? 'Inactive'
            : (gamefowl.status || '—')

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Gamefowl Detail">
            {flash?.success && (
                <div className="mb-4 rounded-lg border border-[#00C950]/30 bg-[#00C950]/10 px-4 py-3">
                    <p className="text-sm font-medium text-[#00C950]">{flash.success}</p>
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 rounded-lg border border-[#E20E28]/30 bg-[#E20E28]/10 px-4 py-3">
                    <p className="text-sm font-medium text-[#E20E28]">{flash.error}</p>
                </div>
            )}

            <div className="mb-5">
                <Link
                    href={gamefowl.status === 'inactive' ? `${base}/inactive` : base}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#102059]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {gamefowl.status === 'inactive' ? 'Back to Inactive Gamefowls' : 'Back to Gamefowl Catalog'}
                </Link>
            </div>

            <div className="mx-auto max-w-7xl overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="flex flex-col bg-[#F0F2F5]">
                        <div className="relative aspect-square w-full overflow-hidden">
                            {photos.length > 0 ? (
                                <img
                                    key={current}
                                    src={photos[current]}
                                    alt={`${gamefowl.name} – photo ${current + 1}`}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Package className="h-20 w-20 text-[#D1D5DB]" />
                                </div>
                            )}

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

                            {photos.length > 1 && (
                                <div className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-semibold text-white">
                                    {current + 1} / {photos.length}
                                </div>
                            )}
                        </div>

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

                    <div className="flex flex-col p-6 lg:p-7">
                        <div className="mb-5 border-b border-[#E5E7EB] pb-4">
                            <h1 className="text-2xl font-bold text-[#102059]">{gamefowl.name}</h1>
                            <p className="mt-1 font-mono text-xs text-[#9CA3AF]">ID #{gamefowl.id}</p>
                        </div>

                        <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[#E5E7EB] pb-5">
                            <InfoField label="Bloodline Category" value={gamefowl.bloodline_name || '—'} />
                            <InfoField label="Age Type" value={gamefowl.age_type_name || '—'} />
                            <InfoField label="Sex" value={gamefowl.sex || '—'} />
                            <InfoField label="Hatch Date" value={formatDate(gamefowl.hatch_date, 'N/A')} />
                            <InfoField label="Class" value={gamefowl.class_name || '—'} />
                            <div className="col-span-2">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Status</p>
                                <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                        isActive
                                            ? 'bg-[#00C950]/10 text-[#00C950]'
                                            : 'bg-[#F3F4F6] text-[#6B7280]'
                                    }`}>
                                        {statusLabel}
                                    </span>
                                    {canManageCatalog && (
                                        <button
                                            type="button"
                                            onClick={() => setShowStatusModal(true)}
                                            disabled={updatingStatus}
                                            aria-pressed={isActive}
                                            aria-label={isActive ? 'Disable gamefowl' : 'Enable gamefowl'}
                                            className={`relative inline-flex h-7 w-12 shrink-0 items-center transition-colors duration-300 disabled:opacity-50 ${
                                                isActive ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                                            }`}
                                            style={{ borderRadius: '0.7rem' }}
                                        >
                                            <span
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                                                    isActive ? 'translate-x-[26px]' : 'translate-x-[4px]'
                                                }`}
                                            />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {gamefowl.description && (
                            <div className="mb-5 border-b border-[#E5E7EB] pb-5">
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Description</p>
                                <p className="text-sm leading-relaxed text-[#374151]">{gamefowl.description}</p>
                            </div>
                        )}

                        <div className="mt-auto flex flex-col gap-2.5">
                            <MetaRow icon={<Calendar className="h-3.5 w-3.5 text-[#6B7280]" />} label="Date Registered" value={formatDate(gamefowl.created_at)} />
                            <MetaRow icon={<User className="h-3.5 w-3.5 text-[#6B7280]" />} label="Added by" value={gamefowl.created_by_name || '—'} />
                            <MetaRow icon={<Package className="h-3.5 w-3.5 text-[#6B7280]" />} label="Images" value={`${photos.length} photo${photos.length !== 1 ? 's' : ''}`} />
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href={`${base}/${gamefowl.id}/edit`}
                                className="inline-flex items-center justify-center gap-2 rounded-lg !bg-[#244693] px-5 py-2 text-sm font-medium !text-white transition-colors hover:!bg-[#102059] hover:!text-white"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Gamefowl
                            </Link>
                            {canManageCatalog && (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(true)}
                                    disabled={deleting}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E20E28] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#C10D23] disabled:opacity-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Gamefowl
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6">
                        <h3 className="mb-2 text-lg font-bold text-[#102059]">
                            {isActive ? 'Disable Gamefowl' : 'Enable Gamefowl'}
                        </h3>
                        <p className="mb-6 text-sm text-[#6B7280]">
                            {isActive ? (
                                <>
                                    Disable <span className="font-semibold text-[#102059]">{gamefowl.name}</span>?
                                    It will be marked inactive and stay in the catalog.
                                </>
                            ) : (
                                <>
                                    Enable <span className="font-semibold text-[#102059]">{gamefowl.name}</span>?
                                    It will be marked active in the catalog.
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
                                    isActive ? 'bg-[#E20E28] hover:bg-[#C10D23]' : 'bg-[#00C950] hover:bg-[#00B548]'
                                }`}
                            >
                                {updatingStatus ? 'Saving...' : isActive ? 'Disable Gamefowl' : 'Enable Gamefowl'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6">
                        <h3 className="mb-2 text-lg font-bold text-[#102059]">Delete Gamefowl</h3>
                        <p className="mb-6 text-sm text-[#6B7280]">
                            Delete <span className="font-semibold text-[#102059]">{gamefowl.name}</span>?
                            This removes it from the catalog and from farm gamefowl lists.
                            Farms can no longer add or sell it. Orders that already include it stay in order history.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="rounded-lg bg-[#E20E28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#C10D23] disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete Gamefowl'}
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
