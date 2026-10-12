import { useEffect, useMemo, useState } from 'react'
import { Link, router } from '@inertiajs/react'
import { Ban, CheckCircle, Clock, Package, Pencil, Plus, Search } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function gamefowlBase(userType) {
    return userType === 'admin' ? '/dashboard/admin/gamefowls' : '/dashboard/super-admin/gamefowls'
}

export default function Gamefowls({ auth, gamefowls = [], flash, pendingCount = 0 }) {
    const base = gamefowlBase(auth?.user?.user_type)

    const [searchQuery, setSearchQuery] = useState('')
    const [bloodlineFilter, setBloodlineFilter] = useState('All')
    const [statusFilter, setStatusFilter] = useState('All')
    const [sortBy, setSortBy] = useState('date')
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [showSuccessAlert, setShowSuccessAlert] = useState(true)
    const [showErrorAlert, setShowErrorAlert] = useState(true)
    const [statusModal, setStatusModal] = useState(null)
    const [updatingStatusId, setUpdatingStatusId] = useState(null)

    const normalized = useMemo(() => {
        return gamefowls.map((item) => ({
            id: item.id,
            name: item.name ?? '',
            bloodline: item.bloodline_name ?? '',
            ageType: item.age_type_name ?? '',
            gamefowlClass: item.class_name ?? '',
            status: (item.status ?? 'active').toLowerCase(),
            dateAdded: item.created_at ?? null,
            createdBy: item.created_by_name ?? '',
            photos: Array.isArray(item.images) ? item.images : [],
            primaryIndex: item.primary_image_index ?? 0,
        }))
    }, [gamefowls])

    const bloodlines = useMemo(() => {
        const names = new Set(normalized.map((item) => item.bloodline).filter(Boolean))
        return ['All', ...Array.from(names)]
    }, [normalized])

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        return normalized.filter((item) => {
            const matchSearch =
                !query ||
                item.name.toLowerCase().includes(query) ||
                item.bloodline.toLowerCase().includes(query) ||
                item.ageType.toLowerCase().includes(query) ||
                item.gamefowlClass.toLowerCase().includes(query) ||
                String(item.id).includes(query)
            const matchBloodline = bloodlineFilter === 'All' || item.bloodline === bloodlineFilter
            const matchStatus = statusFilter === 'All' || item.status === statusFilter.toLowerCase()
            return matchSearch && matchBloodline && matchStatus
        })
    }, [normalized, searchQuery, bloodlineFilter, statusFilter])

    const sorted = useMemo(() => {
        const rows = [...filtered]
        rows.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name)
            return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
        })
        return rows
    }, [filtered, sortBy])

    const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))
    const startIndex = (currentPage - 1) * itemsPerPage
    const displayed = sorted.slice(startIndex, startIndex + itemsPerPage)

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, bloodlineFilter, statusFilter, sortBy, itemsPerPage])

    const filterClass = 'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-4 py-2 bg-white'
    const outlineButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[#102059] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#F0F7FF]'

    const confirmStatusChange = () => {
        if (!statusModal || updatingStatusId) return
        setUpdatingStatusId(statusModal.id)
        router.patch(
            `${base}/${statusModal.id}/status`,
            { status: statusModal.status },
            {
                preserveScroll: true,
                onFinish: () => {
                    setUpdatingStatusId(null)
                    setStatusModal(null)
                    setShowSuccessAlert(true)
                    setShowErrorAlert(true)
                },
            },
        )
    }

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Gamefowl Catalog">
            <div>
                {flash?.success && showSuccessAlert && (
                    <div className="mb-4 flex items-center justify-between rounded-lg border border-[#00C950]/30 bg-[#00C950]/10 px-4 py-3">
                        <p className="text-sm font-medium text-[#00C950]">{flash.success}</p>
                        <button type="button" onClick={() => setShowSuccessAlert(false)} className="ml-4 text-[#00C950] hover:opacity-70">
                            ×
                        </button>
                    </div>
                )}
                {flash?.error && showErrorAlert && (
                    <div className="mb-4 flex items-center justify-between rounded-lg border border-[#E20E28]/30 bg-[#E20E28]/10 px-4 py-3">
                        <p className="text-sm font-medium text-[#E20E28]">{flash.error}</p>
                        <button type="button" onClick={() => setShowErrorAlert(false)} className="ml-4 text-[#E20E28] hover:opacity-70">
                            ×
                        </button>
                    </div>
                )}

                <div className="mb-6">
                    <h1 className="mb-1 text-2xl font-semibold text-[#102059]">Gamefowl Catalog</h1>
                    <p className="text-sm text-[#6B7280]">
                        Manage the platform gamefowl catalog. Farms list gamefowls from the entries registered here.
                        Disabled gamefowls stay in the catalog but are marked inactive.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                            href={`${base}/create`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#102059] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#244693]"
                            style={{ backgroundColor: '#102059', border: '1px solid #102059' }}
                        >
                            <Plus className="h-4 w-4" />
                            Register Gamefowl
                        </Link>
                        <Link href={`${base}/bloodlines`} className={outlineButton} style={{ backgroundColor: '#102059', border: '1px solid #102059' }}>
                            Go to Bloodline Categories
                        </Link>
                        <Link href={`${base}/age-types`} className={outlineButton} style={{ backgroundColor: '#102059', border: '1px solid #102059' }}>
                            Go to Age Type
                        </Link>
                        <Link href={`${base}/classes`} className={outlineButton} style={{ backgroundColor: '#102059', border: '1px solid #102059' }}>
                            Go to Class
                        </Link>
                        <Link
                            href={`${base}/requests`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#D3A218] px-5 py-2 text-sm font-semibold text-[#D3A218] transition-colors hover:bg-[#FFFBF0]"
                        >
                            <Clock className="h-4 w-4" />
                            Gamefowl Requests
                            {pendingCount > 0 && (
                                <span className="rounded-full bg-[#D3A218] px-2 py-0.5 text-xs font-bold text-white">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative max-w-md flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            <input
                                type="text"
                                placeholder="Search by name, bloodline, age type, class..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
                            />
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className={filterClass}>
                                <option value="date">Date Added</option>
                                <option value="name">Name A–Z</option>
                            </select>
                            <select value={bloodlineFilter} onChange={(event) => setBloodlineFilter(event.target.value)} className={filterClass}>
                                {bloodlines.map((name) => (
                                    <option key={name} value={name}>{name === 'All' ? 'All Bloodlines' : name}</option>
                                ))}
                            </select>
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={filterClass}>
                                <option value="All">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <select value={itemsPerPage} onChange={(event) => setItemsPerPage(Number(event.target.value))} className={filterClass}>
                                <option value={5}>Show 5</option>
                                <option value={10}>Show 10</option>
                                <option value={25}>Show 25</option>
                                <option value={50}>Show 50</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-[#E5E7EB] bg-white">
                    <div className="divide-y divide-[#E5E7EB]">
                        {displayed.length > 0 ? displayed.map((gamefowl) => {
                            const primarySrc = gamefowl.photos[gamefowl.primaryIndex] ?? gamefowl.photos[0]
                            return (
                                <div key={gamefowl.id} className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-[#F8F9FB]">
                                    <Link href={`${base}/${gamefowl.id}`} className="min-w-0 flex-1 cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F0F2F5]">
                                                {primarySrc ? (
                                                    <img src={primarySrc} alt={gamefowl.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <Package className="h-6 w-6 text-[#9CA3AF]" />
                                                )}
                                            </div>
                                            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[1fr_140px_120px_120px_120px]">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-[#102059]">{gamefowl.name}</p>
                                                    <p className="truncate text-xs text-[#6B7280]">
                                                        {[gamefowl.bloodline, gamefowl.ageType, gamefowl.gamefowlClass].filter(Boolean).join(' • ') || '—'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center">
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">ID</p>
                                                        <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">#{gamefowl.id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Images</p>
                                                        <p className="mt-0.5 text-xs font-semibold text-[#102059]">{gamefowl.photos.length}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Added by</p>
                                                        <p className="mt-0.5 truncate text-xs text-[#102059]">{gamefowl.createdBy || '—'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                        gamefowl.status === 'active' ? 'bg-[#00C950]/10 text-[#00C950]' : 'bg-[#F3F4F6] text-[#6B7280]'
                                                    }`}>
                                                        {gamefowl.status === 'active' ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                    <div className="flex flex-shrink-0 items-center gap-2">
                                        {gamefowl.status === 'active' ? (
                                            <button
                                                type="button"
                                                onClick={() => setStatusModal({ id: gamefowl.id, name: gamefowl.name, status: 'inactive' })}
                                                disabled={updatingStatusId === gamefowl.id}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E20E28]/30 bg-white px-3 py-2 text-xs font-semibold text-[#E20E28] transition-colors hover:bg-[#FEF2F2] disabled:opacity-50"
                                            >
                                                <Ban className="h-3.5 w-3.5" />
                                                Disable
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setStatusModal({ id: gamefowl.id, name: gamefowl.name, status: 'active' })}
                                                disabled={updatingStatusId === gamefowl.id}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#00C950]/30 bg-white px-3 py-2 text-xs font-semibold text-[#00C950] transition-colors hover:bg-[#F0FDF4] disabled:opacity-50"
                                            >
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                Enable
                                            </button>
                                        )}
                                        <Link
                                            href={`${base}/${gamefowl.id}/edit`}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#102059] transition-colors hover:bg-[#F0F7FF]"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Edit
                                        </Link>
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="py-16 text-center">
                                <Package className="mx-auto mb-3 h-10 w-10 text-[#E5E7EB]" />
                                <p className="text-sm text-[#9CA3AF]">No gamefowls found in the catalog.</p>
                                <Link href={`${base}/create`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#102059] hover:underline">
                                    <Plus className="h-4 w-4" /> Register the first gamefowl
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[#6B7280]">
                            Showing{' '}
                            <span className="font-semibold text-[#102059]">
                                {sorted.length === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + itemsPerPage, sorted.length)}`}
                            </span>{' '}
                            of <span className="font-semibold text-[#102059]">{sorted.length}</span> gamefowls
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((page) => page - 1)}
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-[#6B7280]">Page {currentPage} of {totalPages}</span>
                                <button
                                    type="button"
                                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((page) => page + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {statusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6">
                        <h3 className="mb-2 text-lg font-bold text-[#102059]">
                            {statusModal.status === 'inactive' ? 'Disable Gamefowl' : 'Enable Gamefowl'}
                        </h3>
                        <p className="mb-6 text-sm text-[#6B7280]">
                            {statusModal.status === 'inactive' ? (
                                <>
                                    Disable <span className="font-semibold text-[#102059]">{statusModal.name}</span>?
                                    It will be marked inactive and stay in the catalog.
                                </>
                            ) : (
                                <>
                                    Enable <span className="font-semibold text-[#102059]">{statusModal.name}</span>?
                                    It will be marked active in the catalog.
                                </>
                            )}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => !updatingStatusId && setStatusModal(null)}
                                disabled={Boolean(updatingStatusId)}
                                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmStatusChange}
                                disabled={Boolean(updatingStatusId)}
                                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                                    statusModal.status === 'inactive' ? 'bg-[#E20E28] hover:bg-[#B8000F]' : 'bg-[#102059] hover:bg-[#244693]'
                                }`}
                            >
                                {updatingStatusId ? 'Saving...' : statusModal.status === 'inactive' ? 'Disable Gamefowl' : 'Enable Gamefowl'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminOrAdminLayout>
    )
}
