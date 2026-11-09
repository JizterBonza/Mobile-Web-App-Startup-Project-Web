import { useEffect, useMemo, useState } from 'react'
import { Link, router, useForm } from '@inertiajs/react'
import { Pencil, Search, Trash2, X } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function partnersBase(userType) {
    return userType === 'admin'
        ? '/dashboard/admin/shipping-partners'
        : '/dashboard/super-admin/shipping-partners'
}

function getInitials(name) {
    if (!name || typeof name !== 'string') return '?'
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
}

const filterSelectClass =
    'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]'

const emptyPartner = {
    name: '',
    registered_business_name: '',
    owner_name: '',
    address: '',
    city: '',
    province: '',
    contact_number: '',
    email: '',
    service_area: '',
    permits: '',
    status: 'active',
}

const modalInputClass =
    'w-full rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-2.5 text-sm text-[#102059] outline-none transition-all focus:border-[#244693] focus:ring-2 focus:ring-[#244693]/20'

const modalLabelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]'

export default function ShippingPartners({ auth, partners = [], flash }) {
    const base = partnersBase(auth?.user?.user_type)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState('name')
    const [statusFilter, setStatusFilter] = useState('All')
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
    const [selectedPartner, setSelectedPartner] = useState(null)
    const [showRemoveModal, setShowRemoveModal] = useState(false)
    const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
    const [partnerToRemove, setPartnerToRemove] = useState(null)
    const [showSuccessAlert, setShowSuccessAlert] = useState(false)
    const editForm = useForm(emptyPartner)
    const statusToggleForm = useForm({})

    const sortedPartners = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        let list = partners.filter((partner) => {
            if (statusFilter === 'Active' && partner.status !== 'active') return false
            if (statusFilter === 'Inactive' && partner.status !== 'inactive') return false
            if (!q) return true
            const haystack = [
                partner.name,
                partner.registered_business_name,
                partner.linked_user_name,
                partner.linked_user_email,
                partner.email,
                partner.city,
                partner.province,
                partner.service_area,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
            return haystack.includes(q)
        })

        list = [...list].sort((a, b) => {
            if (sortBy === 'name') {
                return (a.name || '').localeCompare(b.name || '')
            }
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0
            return tb - ta
        })
        return list
    }, [partners, searchQuery, sortBy, statusFilter])

    const totalPages = Math.max(1, Math.ceil(sortedPartners.length / itemsPerPage))
    const startIndex = (currentPage - 1) * itemsPerPage
    const displayedPartners = sortedPartners.slice(startIndex, startIndex + itemsPerPage)

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, sortBy, statusFilter, itemsPerPage])

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(Math.max(1, totalPages))
        }
    }, [currentPage, totalPages])

    useEffect(() => {
        if (showEditModal) {
            const timer = setTimeout(() => setShowEditModalAnimation(true), 10)
            return () => clearTimeout(timer)
        }
        setShowEditModalAnimation(false)
    }, [showEditModal])

    useEffect(() => {
        if (showRemoveModal) {
            const timer = setTimeout(() => setShowRemoveModalAnimation(true), 10)
            return () => clearTimeout(timer)
        }
        setShowRemoveModalAnimation(false)
    }, [showRemoveModal])

    useEffect(() => {
        if (flash?.success) setShowSuccessAlert(true)
    }, [flash?.success])

    const closeEditModal = () => {
        setShowEditModalAnimation(false)
        setTimeout(() => {
            setShowEditModal(false)
            setSelectedPartner(null)
            editForm.reset()
        }, 300)
    }

    const closeRemoveModal = () => {
        setShowRemoveModalAnimation(false)
        setTimeout(() => {
            setShowRemoveModal(false)
            setPartnerToRemove(null)
        }, 300)
    }

    const handleStatusToggle = (partner) => {
        if (statusToggleForm.processing) return
        statusToggleForm.transform(() => ({
            status: partner.status === 'active' ? 'inactive' : 'active',
        }))
        statusToggleForm.put(`${base}/${partner.id}`, {
            preserveScroll: true,
            onFinish: () => statusToggleForm.transform((data) => data),
        })
    }

    const handleEditPartner = (partner) => {
        setSelectedPartner(partner)
        editForm.setData({
            name: partner.name || '',
            registered_business_name: partner.registered_business_name || '',
            owner_name: partner.owner_name || '',
            address: partner.address || '',
            city: partner.city || '',
            province: partner.province || '',
            contact_number: partner.contact_number || '',
            email: partner.email || '',
            service_area: partner.service_area || '',
            permits: partner.permits || '',
            status: partner.status || 'active',
        })
        setShowEditModal(true)
    }

    const handleUpdatePartner = (event) => {
        event.preventDefault()
        if (!selectedPartner) return
        editForm.put(`${base}/${selectedPartner.id}`, {
            preserveScroll: true,
            onSuccess: () => closeEditModal(),
        })
    }

    const confirmRemovePartner = () => {
        if (!partnerToRemove) return
        router.delete(`${base}/${partnerToRemove.id}`, {
            preserveScroll: true,
            onSuccess: () => closeRemoveModal(),
        })
    }

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Shipping Partners">
            <div>
                {flash?.success && showSuccessAlert && (
                    <div className="alert alert-success alert-dismissible fade show" role="alert">
                        <strong>Success!</strong> {flash.success}
                        <button type="button" className="close" aria-label="Close" onClick={() => setShowSuccessAlert(false)}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                )}
                <div className="mb-6">
                    <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Shipping Partners</h1>
                    <p className="text-sm text-[#6B7280]">
                        Companies registered for farm shipping, and the login connected to each one.
                    </p>
                </div>

                <div className="mb-6">
                    <div className="flex flex-col gap-4 bg-transparent md:flex-row md:items-center md:justify-between">
                        <div className="relative max-w-md flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            <input
                                type="text"
                                placeholder="Search company, linked user, or city..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-[#E5E7EB] bg-[#ffffff] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
                            />
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
                                <option value="name">Sort by Name</option>
                                <option value="date">Sort by Date Added</option>
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={filterSelectClass}
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
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

                <div className="rounded-lg border border-[#E5E7EB] bg-white">
                    <div className="divide-y divide-[#E5E7EB]">
                        {displayedPartners.length > 0 ? (
                            displayedPartners.map((partner) => {
                                const statusLabel = partner.status === 'active' ? 'Active' : 'Inactive'
                                const dateAdded = partner.created_at
                                    ? new Date(partner.created_at).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                      })
                                    : 'N/A'
                                const location = [partner.city, partner.province].filter(Boolean).join(', ')
                                return (
                                    <div key={partner.id} className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Link
                                                href={`${base}/${partner.id}`}
                                                className="shrink-0 no-underline"
                                                title="View details"
                                            >
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                                                    <span className="text-sm font-bold text-white">{getInitials(partner.name)}</span>
                                                </div>
                                            </Link>
                                            <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-3 lg:grid-cols-[1fr_200px_140px_auto] lg:items-center">
                                                <Link href={`${base}/${partner.id}`} className="min-w-0 no-underline" title="View details">
                                                    <div className="text-sm font-bold text-[#102059]">{partner.name || 'N/A'}</div>
                                                    <div className="text-sm text-[#6B7280]">
                                                        Linked user: {partner.linked_user_name || 'No login connected'}
                                                        {partner.linked_user_email ? (
                                                            <span className="block truncate text-xs text-[#9CA3AF] sm:ml-2 sm:inline">
                                                                {partner.linked_user_email}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-1 text-xs text-[#9CA3AF] lg:hidden">
                                                        {location || 'No location'} · Added {dateAdded}
                                                    </div>
                                                </Link>
                                                <div className="hidden lg:block">
                                                    <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                                                        Date Added
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-[#9CA3AF]">{dateAdded}</div>
                                                    {location ? <div className="mt-0.5 text-xs text-[#9CA3AF]">{location}</div> : null}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusToggle(partner)}
                                                        disabled={statusToggleForm.processing}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 ${
                                                            partner.status === 'active' ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                                                        }`}
                                                        aria-pressed={partner.status === 'active'}
                                                        aria-label={`Toggle status for ${partner.name}`}
                                                        style={{ borderRadius: '0.7rem' }}
                                                    >
                                                        <span
                                                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ${
                                                                partner.status === 'active' ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                                            }`}
                                                        />
                                                    </button>
                                                    <span className="text-xs font-semibold text-[#6B7280]">{statusLabel}</span>
                                                </div>
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditPartner(partner)}
                                                        className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                                                        title="Edit shipping partner"
                                                    >
                                                        <Pencil className="h-5 w-5" />
                                                    </button>
                                                    {partner.status === 'active' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setPartnerToRemove(partner)
                                                                setShowRemoveModal(true)
                                                            }}
                                                            className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                                                            title="Deactivate shipping partner"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-sm text-[#9CA3AF]">No shipping partners found matching your search criteria</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[#6B7280]">
                            Showing{' '}
                            <span className="font-semibold text-[#102059]">
                                {sortedPartners.length === 0
                                    ? '0'
                                    : `${startIndex + 1}-${Math.min(startIndex + itemsPerPage, sortedPartners.length)}`}
                            </span>{' '}
                            of <span className="font-semibold text-[#102059]">{sortedPartners.length}</span> shipping partners
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                    disabled={currentPage === 1}
                                    className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-xs transition-colors hover:bg-[#F8F9FB] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-[#6B7280]">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                    disabled={currentPage === totalPages}
                                    className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-xs transition-colors hover:bg-[#F8F9FB] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showEditModal && selectedPartner && (
                <>
                    <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
                    <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
                        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                            <div className="modal-content overflow-hidden border-0 shadow-lg">
                                <div className="border-b border-[#E5E7EB] bg-[#F8F9FB] px-6" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h4 className="mb-1 text-xl font-semibold text-[#102059]">Edit Shipping Partner</h4>
                                            <p className="mb-0 text-sm text-[#6B7280]">
                                                Update company details for <span className="font-medium text-[#102059]">{selectedPartner.name}</span>
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeEditModal}
                                            className="rounded-lg border border-[#E5E7EB] bg-white p-2 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#102059]"
                                            aria-label="Close"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                                <form onSubmit={handleUpdatePartner}>
                                    <div className="modal-body bg-[#F8F9FB] px-6 py-6">
                                        <div className="grid gap-5 md:grid-cols-2">
                                            <div>
                                                <label className={modalLabelClass} htmlFor="edit_partner_name">
                                                    Company name <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="edit_partner_name"
                                                    type="text"
                                                    required
                                                    className={modalInputClass}
                                                    value={editForm.data.name}
                                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                                />
                                                {editForm.errors.name && <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.name}</p>}
                                            </div>
                                            <div>
                                                <label className={modalLabelClass} htmlFor="edit_registered_business_name">
                                                    Registered business name
                                                </label>
                                                <input
                                                    id="edit_registered_business_name"
                                                    type="text"
                                                    className={modalInputClass}
                                                    value={editForm.data.registered_business_name}
                                                    onChange={(e) => editForm.setData('registered_business_name', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className={modalLabelClass} htmlFor="edit_owner_name">Owner</label>
                                                <input
                                                    id="edit_owner_name"
                                                    type="text"
                                                    className={modalInputClass}
                                                    value={editForm.data.owner_name}
                                                    onChange={(e) => editForm.setData('owner_name', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className={modalLabelClass} htmlFor="edit_status">Status</label>
                                                <select
                                                    id="edit_status"
                                                    className={modalInputClass}
                                                    value={editForm.data.status}
                                                    onChange={(e) => editForm.setData('status', e.target.value)}
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={modalLabelClass} htmlFor="edit_address">Address</label>
                                                <input
                                                    id="edit_address"
                                                    type="text"
                                                    className={modalInputClass}
                                                    value={editForm.data.address}
                                                    onChange={(e) => editForm.setData('address', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className={modalLabelClass} htmlFor="edit_city">City</label>
                                                <input
                                                    id="edit_city"
                                                    type="text"
                                                    className={modalInputClass}
                                                    value={editForm.data.city}
                                                    onChange={(e) => editForm.setData('city', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className={modalLabelClass} htmlFor="edit_province">Province</label>
                                                <input
                                                    id="edit_province"
                                                    type="text"
                                                    className={modalInputClass}
                                                    value={editForm.data.province}
                                                    onChange={(e) => editForm.setData('province', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className={modalLabelClass} htmlFor="edit_contact_number">Contact number</label>
                                                <input
                                                    id="edit_contact_number"
                                                    type="text"
                                                    className={modalInputClass}
                                                    value={editForm.data.contact_number}
                                                    onChange={(e) => editForm.setData('contact_number', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className={modalLabelClass} htmlFor="edit_email">Email</label>
                                                <input
                                                    id="edit_email"
                                                    type="email"
                                                    className={modalInputClass}
                                                    value={editForm.data.email}
                                                    onChange={(e) => editForm.setData('email', e.target.value)}
                                                />
                                                {editForm.errors.email && <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.email}</p>}
                                            </div>
                                            <div>
                                                <label className={modalLabelClass} htmlFor="edit_service_area">Service area</label>
                                                <input
                                                    id="edit_service_area"
                                                    type="text"
                                                    className={modalInputClass}
                                                    value={editForm.data.service_area}
                                                    onChange={(e) => editForm.setData('service_area', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className={modalLabelClass} htmlFor="edit_permits">Business permits</label>
                                                <input
                                                    id="edit_permits"
                                                    type="text"
                                                    className={modalInputClass}
                                                    value={editForm.data.permits}
                                                    onChange={(e) => editForm.setData('permits', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className="flex flex-col-reverse gap-3 border-t border-[#E5E7EB] bg-white px-6 sm:flex-row sm:justify-end"
                                        style={{ paddingTop: '10px', paddingBottom: '10px' }}
                                    >
                                        <button
                                            type="button"
                                            onClick={closeEditModal}
                                            className="rounded-lg border border-[#E5E7EB] px-5 py-2.5 text-sm font-semibold text-[#6B7280] transition-colors hover:border-[#102059] hover:text-[#102059]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={editForm.processing}
                                            className="rounded-lg bg-[#102059] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244693] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {editForm.processing ? 'Saving changes...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {showRemoveModal && partnerToRemove && (
                <>
                    <div className={`modal-backdrop fade ${showRemoveModalAnimation ? 'show' : ''}`} onClick={closeRemoveModal}></div>
                    <div className={`modal fade ${showRemoveModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h4 className="modal-title">Confirm Deactivation</h4>
                                    <button type="button" className="close" onClick={closeRemoveModal}>
                                        <span>&times;</span>
                                    </button>
                                </div>
                                <div className="modal-body">
                                    <p>
                                        Are you sure you want to deactivate <strong>{partnerToRemove.name}</strong>?
                                    </p>
                                    <p className="mb-0 text-muted">The company will be marked inactive. Its login stays in Accounts.</p>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>
                                        Cancel
                                    </button>
                                    <button type="button" className="btn btn-danger" onClick={confirmRemovePartner}>
                                        Deactivate
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </SuperAdminOrAdminLayout>
    )
}
