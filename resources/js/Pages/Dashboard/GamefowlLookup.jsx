import { useEffect, useMemo, useState } from 'react'
import { Link, router, useForm } from '@inertiajs/react'
import { ArrowLeft, Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function gamefowlBase(userType) {
    return userType === 'admin' ? '/dashboard/admin/gamefowls' : '/dashboard/super-admin/gamefowls'
}

function lookupPath(base, type) {
    if (type === 'bloodline') return `${base}/bloodlines`
    if (type === 'age_type') return `${base}/age-types`
    return `${base}/classes`
}

const blankLookupForm = { name: '', description: '', status: 'active' }

export default function GamefowlLookup({ auth, kind, items = [], flash }) {
    const base = gamefowlBase(auth?.user?.user_type)
    const path = lookupPath(base, kind?.type)
    const [showAdd, setShowAdd] = useState(false)
    const [editing, setEditing] = useState(null)
    const [removing, setRemoving] = useState(null)
    const [showSuccessAlert, setShowSuccessAlert] = useState(true)
    const [showErrorAlert, setShowErrorAlert] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)

    const addForm = useForm(blankLookupForm)
    const editForm = useForm(blankLookupForm)

    const clearAddForm = () => {
        addForm.setDefaults(blankLookupForm)
        addForm.setData(blankLookupForm)
        addForm.clearErrors()
    }

    useEffect(() => {
        if (flash?.success) {
            setShowAdd(false)
            setEditing(null)
            setRemoving(null)
            clearAddForm()
            setShowSuccessAlert(true)
        }
        if (flash?.error) setShowErrorAlert(true)
    }, [flash])

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        return items.filter((item) => {
            const matchSearch = !query || (item.name || '').toLowerCase().includes(query) || String(item.id).includes(query)
            const matchStatus = statusFilter === 'All' || (item.status || 'active') === statusFilter.toLowerCase()
            return matchSearch && matchStatus
        })
    }, [items, searchQuery, statusFilter])

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
    const startIndex = (currentPage - 1) * itemsPerPage
    const displayed = filtered.slice(startIndex, startIndex + itemsPerPage)

    useEffect(() => setCurrentPage(1), [searchQuery, statusFilter, itemsPerPage])

    const filterClass = 'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-4 py-2 bg-white'
    const inputClass = 'w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#102059]'

    const openEdit = (item) => {
        setEditing(item)
        editForm.setData({
            name: item.name || '',
            description: item.description || '',
            status: item.status || 'active',
        })
    }

    return (
        <SuperAdminOrAdminLayout auth={auth} title={kind?.title || 'Gamefowl'}>
            <Link
                href={base}
                className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#102059]"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Gamefowl Catalog
            </Link>

            {flash?.success && showSuccessAlert && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-[#00C950]/30 bg-[#00C950]/10 px-4 py-3">
                    <p className="text-sm font-medium text-[#00C950]">{flash.success}</p>
                    <button type="button" onClick={() => setShowSuccessAlert(false)} className="ml-4 text-[#00C950] hover:opacity-70">×</button>
                </div>
            )}
            {flash?.error && showErrorAlert && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-[#E20E28]/30 bg-[#FEE2E2] px-4 py-3">
                    <p className="text-sm font-medium text-[#E20E28]">{flash.error}</p>
                    <button type="button" onClick={() => setShowErrorAlert(false)} className="ml-4 text-[#E20E28] hover:opacity-70">×</button>
                </div>
            )}

            <div className="mb-6">
                <h1 className="mb-1 text-2xl font-semibold text-[#102059]">{kind?.title}</h1>
                <p className="text-sm text-[#6B7280]">Manage {kind?.noun} used across the gamefowl catalog.</p>
                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => {
                            clearAddForm()
                            setShowAdd(true)
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#102059] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#244693]"
                    >
                        <Plus className="h-4 w-4" /> Add {kind?.singular}
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative max-w-md flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
                    />
                </div>
                <div className="flex flex-wrap gap-3">
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

            <div className="rounded-lg border border-[#E5E7EB] bg-white">
                <div className="divide-y divide-[#E5E7EB]">
                    {displayed.length > 0 ? displayed.map((item) => (
                        <div key={item.id} className="px-6 py-4 transition-colors hover:bg-[#F8F9FB]">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F0F2F5]">
                                    <Tag className="h-5 w-5 text-[#9CA3AF]" />
                                </div>
                                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[1fr_100px_160px_80px]">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-[#102059]">{item.name}</p>
                                        <p className="truncate text-xs text-[#6B7280]">{item.description || '—'}</p>
                                    </div>
                                    <div className="flex items-center">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">ID</p>
                                            <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">#{item.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Added</p>
                                            <p className="mt-0.5 text-xs text-[#102059]">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            (item.status || 'active') === 'active' ? 'bg-[#00C950]/10 text-[#00C950]' : 'bg-[#F3F4F6] text-[#6B7280]'
                                        }`}>
                                            {(item.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-shrink-0 items-center gap-2">
                                    <button type="button" onClick={() => openEdit(item)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#102059] hover:text-[#102059]" title="Edit">
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button type="button" onClick={() => setRemoving(item)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#E20E28] hover:text-[#E20E28]" title="Delete">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-16 text-center">
                            <Tag className="mx-auto mb-3 h-10 w-10 text-[#E5E7EB]" />
                            <p className="text-sm text-[#9CA3AF]">No {kind?.noun} found.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
                <p className="text-xs text-[#6B7280]">
                    Showing <span className="font-semibold text-[#102059]">{filtered.length === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + itemsPerPage, filtered.length)}`}</span> of <span className="font-semibold text-[#102059]">{filtered.length}</span> {kind?.noun}
                </p>
                {totalPages > 1 && (
                    <div className="mt-3 flex items-center gap-2">
                        <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] hover:bg-[#F0F2F5] disabled:opacity-50">Previous</button>
                        <span className="text-xs text-[#6B7280]">Page {currentPage} of {totalPages}</span>
                        <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#244693] hover:bg-[#F0F2F5] disabled:opacity-50">Next</button>
                    </div>
                )}
            </div>

            {showAdd && (
                <LookupModal
                    title={`Add ${kind?.singular}`}
                    form={addForm}
                    inputClass={inputClass}
                    onClose={() => { setShowAdd(false); clearAddForm() }}
                    onSubmit={(event) => {
                        event.preventDefault()
                        addForm.post(path, {
                            preserveScroll: true,
                            onSuccess: () => clearAddForm(),
                        })
                    }}
                    submitLabel={addForm.processing ? 'Creating...' : `Create ${kind?.singular}`}
                />
            )}

            {editing && (
                <LookupModal
                    title={`Edit ${kind?.singular}`}
                    form={editForm}
                    inputClass={inputClass}
                    onClose={() => setEditing(null)}
                    onSubmit={(event) => {
                        event.preventDefault()
                        editForm.put(`${path}/${editing.id}`, { preserveScroll: true })
                    }}
                    submitLabel={editForm.processing ? 'Updating...' : `Update ${kind?.singular}`}
                />
            )}

            {removing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6">
                        <h3 className="mb-2 text-lg font-bold text-[#102059]">Confirm Delete</h3>
                        <p className="mb-6 text-sm text-[#6B7280]">
                            Delete <span className="font-semibold text-[#102059]">{removing.name}</span>? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setRemoving(null)} className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm text-[#6B7280]">Cancel</button>
                            <button
                                type="button"
                                onClick={() => router.delete(`${path}/${removing.id}`, { preserveScroll: true, onSuccess: () => setRemoving(null) })}
                                className="rounded-lg bg-[#E20E28] px-4 py-2 text-sm font-medium text-white"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminOrAdminLayout>
    )
}

function LookupModal({ title, form, inputClass, onClose, onSubmit, submitLabel }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg border border-[#E5E7EB] bg-white p-6">
                <h3 className="mb-4 text-lg font-bold text-[#102059]">{title}</h3>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-xs text-[#6B7280]">Name *</label>
                        <input className={inputClass} value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required />
                        {form.errors.name && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.name}</p>}
                    </div>
                    <div>
                        <label className="mb-2 block text-xs text-[#6B7280]">Description</label>
                        <textarea className={inputClass} rows={3} value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} />
                    </div>
                    <div>
                        <label className="mb-2 block text-xs text-[#6B7280]">Status *</label>
                        <select className={inputClass} value={form.data.status} onChange={(event) => form.setData('status', event.target.value)}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm text-[#6B7280]">Cancel</button>
                        <button type="submit" disabled={form.processing} className="rounded-lg bg-[#102059] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{submitLabel}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
