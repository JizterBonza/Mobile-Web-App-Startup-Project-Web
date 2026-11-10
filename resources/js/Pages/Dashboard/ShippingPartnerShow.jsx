import { useEffect, useMemo, useState } from 'react'
import { Link, useForm } from '@inertiajs/react'
import { ArrowLeft, Plus, Search, UserPlus, X } from 'lucide-react'
import PasswordInput from '../../Components/PasswordInput'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    vendor: 'Vendor',
    owner_manager: 'Owner Manager',
    veterinarian: 'Veterinarian',
    breeder: 'Breeder',
    customer: 'Customer',
    rider: 'Rider',
    shipping_partner: 'Shipping Partner',
}

const inputClass =
    'w-full rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-2.5 text-sm text-[#102059] outline-none transition-all focus:border-[#244693] focus:ring-2 focus:ring-[#244693]/20'

const labelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]'

function partnersBase(userType) {
    return userType === 'admin'
        ? '/dashboard/admin/shipping-partners'
        : '/dashboard/super-admin/shipping-partners'
}

function formatDate(value) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

function initials(name) {
    if (!name || typeof name !== 'string') return '?'
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
}

function Detail({ label, value }) {
    return (
        <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">{label}</div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-[#102059]">{value || '—'}</div>
        </div>
    )
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            {children}
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
    )
}

function Modal({ title, open, animated, onClose, children }) {
    if (!open) return null

    return (
        <>
            <button
                type="button"
                className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${animated ? 'opacity-100' : 'opacity-0'}`}
                aria-label="Close"
                onClick={onClose}
            />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className={`pointer-events-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-xl transition-all ${
                        animated ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                    }`}
                >
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4">
                        <h4 className="text-lg font-bold text-[#102059]">{title}</h4>
                        <button
                            type="button"
                            className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6]"
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    {children}
                </div>
            </div>
        </>
    )
}

export default function ShippingPartnerShow({ auth, partner, availableUsers = [], flash }) {
    const base = partnersBase(auth?.user?.user_type)
    const users = partner?.users ?? []
    const isActive = partner?.status === 'active'
    const location = [partner?.address, partner?.city, partner?.province].filter(Boolean).join(', ')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
    const [showExistingModal, setShowExistingModal] = useState(false)
    const [showExistingModalAnimation, setShowExistingModalAnimation] = useState(false)
    const [existingQuery, setExistingQuery] = useState('')
    const [showSuccessAlert, setShowSuccessAlert] = useState(false)

    const addForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        username: '',
        password: '',
        password_confirmation: '',
        status: 'active',
    })

    const existingForm = useForm({
        user_id: '',
    })

    useEffect(() => {
        if (!showAddModal) {
            setShowAddModalAnimation(false)
            return undefined
        }
        const timer = setTimeout(() => setShowAddModalAnimation(true), 10)
        return () => clearTimeout(timer)
    }, [showAddModal])

    useEffect(() => {
        if (!showExistingModal) {
            setShowExistingModalAnimation(false)
            return undefined
        }
        const timer = setTimeout(() => setShowExistingModalAnimation(true), 10)
        return () => clearTimeout(timer)
    }, [showExistingModal])

    useEffect(() => {
        if (flash?.success) setShowSuccessAlert(true)
    }, [flash?.success])

    const filteredExisting = useMemo(() => {
        const query = existingQuery.trim().toLowerCase()
        if (!query) return availableUsers
        return availableUsers.filter((user) => {
            const haystack = [user.name, user.email, user.username, user.company_name, user.mobile_number]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
            return haystack.includes(query)
        })
    }, [availableUsers, existingQuery])

    const selectedExisting = availableUsers.find((user) => String(user.id) === String(existingForm.data.user_id))

    const closeAddModal = () => {
        setShowAddModalAnimation(false)
        setTimeout(() => {
            setShowAddModal(false)
            addForm.reset()
            addForm.clearErrors()
        }, 300)
    }

    const closeExistingModal = () => {
        setShowExistingModalAnimation(false)
        setTimeout(() => {
            setShowExistingModal(false)
            setExistingQuery('')
            existingForm.reset()
            existingForm.clearErrors()
        }, 300)
    }

    const handleAddUser = (event) => {
        event.preventDefault()
        addForm.post(`${base}/${partner.id}/users`, {
            preserveScroll: true,
            onSuccess: () => {
                addForm.reset()
                setShowAddModal(false)
            },
        })
    }

    const handleAddExisting = (event) => {
        event.preventDefault()
        existingForm.post(`${base}/${partner.id}/users/add-existing`, {
            preserveScroll: true,
            onSuccess: () => {
                existingForm.reset()
                setExistingQuery('')
                setShowExistingModal(false)
            },
        })
    }

    return (
        <SuperAdminOrAdminLayout auth={auth} title={partner?.name || 'Shipping Partner'}>
            {flash?.success && showSuccessAlert && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                    <strong>Success!</strong> {flash.success}
                    <button type="button" className="close" aria-label="Close" onClick={() => setShowSuccessAlert(false)}>
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            )}

            <div className="mb-5">
                <Link
                    href={base}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#102059]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Shipping Partners
                </Link>
            </div>

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#102059]">
                        <span className="text-sm font-bold text-white">{initials(partner?.name)}</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-[#102059]">{partner?.name || 'Shipping Partner'}</h1>
                        <p className="text-sm text-[#6B7280]">
                            Added {formatDate(partner?.created_at)}
                            {partner?.registered_business_name ? ` · ${partner.registered_business_name}` : ''}
                        </p>
                    </div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B7280]">
                    <span className={`inline-flex h-2 w-2 rounded-full ${isActive ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'}`} />
                    {isActive ? 'Active' : 'Inactive'}
                </span>
            </div>

            <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
                <h2 className="mb-4 text-sm font-semibold text-[#102059]">Company details</h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Company name" value={partner?.name} />
                    <Detail label="Registered business name" value={partner?.registered_business_name} />
                    <Detail label="Owner" value={partner?.owner_name} />
                    <Detail label="Address" value={location} />
                    <Detail label="Contact number" value={partner?.contact_number} />
                    <Detail label="Email" value={partner?.email} />
                    <Detail label="Service area" value={partner?.service_area} />
                    <Detail label="Business permits" value={partner?.permits} />
                </div>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-6 py-4">
                    <div>
                        <h2 className="text-sm font-semibold text-[#102059]">Users</h2>
                        <p className="mt-1 text-xs text-[#6B7280]">
                            {users.length === 1 ? '1 login connected to this company' : `${users.length} logins connected to this company`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowExistingModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#244693] hover:bg-[#F8F9FB]"
                        >
                            <UserPlus className="h-4 w-4" />
                            Add existing
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#244693] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1b3770]"
                        >
                            <Plus className="h-4 w-4" />
                            Add new user
                        </button>
                    </div>
                </div>
                <div className="divide-y divide-[#E5E7EB]">
                    {users.length > 0 ? (
                        users.map((user) => {
                            const active = user.status === 'active'
                            return (
                                <div key={user.id} className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#102059]">
                                            <span className="text-sm font-bold text-white">{initials(user.name)}</span>
                                        </div>
                                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_240px_100px] lg:items-center">
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-[#102059]">{user.name || 'Unnamed user'}</div>
                                                <div className="truncate text-sm text-[#6B7280]">
                                                    {user.email || 'No email'}
                                                    {user.username ? ` · @${user.username}` : ''}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Role</div>
                                                <div className="mt-0.5 text-xs text-[#6B7280]">
                                                    {ROLE_LABELS[user.user_type] || user.user_type || '—'}
                                                </div>
                                                <div className="mt-0.5 text-xs text-[#9CA3AF]">{user.mobile_number || 'No mobile'}</div>
                                                <div className="mt-0.5 text-xs text-[#9CA3AF]">Added {formatDate(user.created_at)}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex h-2 w-2 rounded-full ${active ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'}`} />
                                                <span className="text-xs font-semibold text-[#6B7280]">{active ? 'Active' : 'Inactive'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-sm text-[#9CA3AF]">No users are connected to this shipping partner</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal title="Add new user" open={showAddModal} animated={showAddModalAnimation} onClose={closeAddModal}>
                <form onSubmit={handleAddUser}>
                    <div className="space-y-4 px-6 py-4">
                        <p className="text-sm text-[#6B7280]">
                            Creates a shipping partner login for {partner?.name || 'this company'}. The company record stays the same.
                        </p>
                        {addForm.errors.error ? (
                            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{addForm.errors.error}</p>
                        ) : null}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="First name *" error={addForm.errors.first_name}>
                                <input
                                    type="text"
                                    required
                                    className={`${inputClass} ${addForm.errors.first_name ? 'border-red-400' : ''}`}
                                    value={addForm.data.first_name}
                                    onChange={(event) => addForm.setData('first_name', event.target.value)}
                                />
                            </Field>
                            <Field label="Middle name" error={addForm.errors.middle_name}>
                                <input
                                    type="text"
                                    className={`${inputClass} ${addForm.errors.middle_name ? 'border-red-400' : ''}`}
                                    value={addForm.data.middle_name}
                                    onChange={(event) => addForm.setData('middle_name', event.target.value)}
                                />
                            </Field>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Last name *" error={addForm.errors.last_name}>
                                <input
                                    type="text"
                                    required
                                    className={`${inputClass} ${addForm.errors.last_name ? 'border-red-400' : ''}`}
                                    value={addForm.data.last_name}
                                    onChange={(event) => addForm.setData('last_name', event.target.value)}
                                />
                            </Field>
                            <Field label="Email *" error={addForm.errors.email}>
                                <input
                                    type="email"
                                    required
                                    className={`${inputClass} ${addForm.errors.email ? 'border-red-400' : ''}`}
                                    value={addForm.data.email}
                                    onChange={(event) => addForm.setData('email', event.target.value)}
                                />
                            </Field>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Mobile number *" error={addForm.errors.mobile_number}>
                                <input
                                    type="text"
                                    required
                                    className={`${inputClass} ${addForm.errors.mobile_number ? 'border-red-400' : ''}`}
                                    value={addForm.data.mobile_number}
                                    onChange={(event) => addForm.setData('mobile_number', event.target.value)}
                                />
                            </Field>
                            <Field label="Username" error={addForm.errors.username}>
                                <input
                                    type="text"
                                    className={`${inputClass} ${addForm.errors.username ? 'border-red-400' : ''}`}
                                    value={addForm.data.username}
                                    onChange={(event) => addForm.setData('username', event.target.value)}
                                    placeholder="Auto-generated if empty"
                                />
                            </Field>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Password *" error={addForm.errors.password}>
                                <PasswordInput
                                    required
                                    className={`${inputClass} ${addForm.errors.password ? 'border-red-400' : ''}`}
                                    value={addForm.data.password}
                                    onChange={(event) => addForm.setData('password', event.target.value)}
                                />
                            </Field>
                            <Field label="Confirm password *" error={addForm.errors.password_confirmation}>
                                <PasswordInput
                                    required
                                    className={`${inputClass} ${addForm.errors.password_confirmation ? 'border-red-400' : ''}`}
                                    value={addForm.data.password_confirmation}
                                    onChange={(event) => addForm.setData('password_confirmation', event.target.value)}
                                />
                            </Field>
                        </div>
                        <Field label="Status *" error={addForm.errors.status}>
                            <select
                                required
                                className={`${inputClass} ${addForm.errors.status ? 'border-red-400' : ''}`}
                                value={addForm.data.status}
                                onChange={(event) => addForm.setData('status', event.target.value)}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </Field>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                        <button
                            type="button"
                            className="rounded-full border border-[#E5E7EB] bg-white px-5 py-2 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6]"
                            onClick={closeAddModal}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={addForm.processing}
                            className="rounded-full bg-[#244693] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1b3770] disabled:opacity-60"
                        >
                            {addForm.processing ? 'Creating…' : 'Create login'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal title="Add existing user" open={showExistingModal} animated={showExistingModalAnimation} onClose={closeExistingModal}>
                <form onSubmit={handleAddExisting}>
                    <div className="space-y-4 px-6 py-4">
                        <p className="text-sm text-[#6B7280]">
                            Choose a shipping partner login. If that login already belongs to another company, it moves here.
                        </p>
                        {existingForm.errors.user_id ? (
                            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{existingForm.errors.user_id}</p>
                        ) : null}
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            <input
                                type="search"
                                value={existingQuery}
                                onChange={(event) => setExistingQuery(event.target.value)}
                                placeholder="Search name, email, or company"
                                className={`${inputClass} pl-9`}
                            />
                        </div>
                        <div className="max-h-72 divide-y divide-[#E5E7EB] overflow-y-auto rounded-lg border border-[#E5E7EB]">
                            {filteredExisting.length > 0 ? (
                                filteredExisting.map((user) => {
                                    const selected = String(existingForm.data.user_id) === String(user.id)
                                    return (
                                        <label
                                            key={user.id}
                                            className={`flex cursor-pointer items-start gap-3 px-4 py-3 ${selected ? 'bg-[#F3F6FB]' : 'hover:bg-[#F8F9FB]'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="existing_user_id"
                                                className="mt-1"
                                                checked={selected}
                                                onChange={() => existingForm.setData('user_id', user.id)}
                                            />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-[#102059]">
                                                    {user.name || 'Unnamed user'}
                                                </span>
                                                <span className="block truncate text-xs text-[#6B7280]">
                                                    {user.email || 'No email'}
                                                    {user.username ? ` · @${user.username}` : ''}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-[#9CA3AF]">
                                                    {user.company_name
                                                        ? `Currently with ${user.company_name}`
                                                        : 'Not connected to a company'}
                                                </span>
                                            </span>
                                        </label>
                                    )
                                })
                            ) : (
                                <p className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                                    {availableUsers.length === 0
                                        ? 'Every shipping partner login is already connected to this company.'
                                        : 'No logins match that search.'}
                                </p>
                            )}
                        </div>
                        {selectedExisting?.company_name ? (
                            <p className="text-xs text-[#6B7280]">
                                Adding {selectedExisting.name || 'this login'} moves it from {selectedExisting.company_name} to {partner?.name || 'this company'}.
                            </p>
                        ) : null}
                    </div>
                    <div className="flex justify-end gap-3 border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                        <button
                            type="button"
                            className="rounded-full border border-[#E5E7EB] bg-white px-5 py-2 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6]"
                            onClick={closeExistingModal}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={existingForm.processing || !existingForm.data.user_id}
                            className="rounded-full bg-[#244693] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1b3770] disabled:opacity-60"
                        >
                            {existingForm.processing ? 'Adding…' : 'Add to company'}
                        </button>
                    </div>
                </form>
            </Modal>
        </SuperAdminOrAdminLayout>
    )
}
