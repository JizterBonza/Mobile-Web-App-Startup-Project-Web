import { useEffect, useMemo, useState } from 'react'
import { Head, useForm, router } from '@inertiajs/react'
import {
    Bike,
    Building2,
    Database,
    Pencil,
    Plus,
    Search,
    Shield,
    Stethoscope,
    Store,
    Trash2,
    UserCog,
    Users,
    UsersRound,
    X,
} from 'lucide-react'
import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../../hooks/useDashboardSession'

const ROLE_ORDER = ['super_admin', 'admin', 'vendor', 'veterinarian', 'customer', 'rider']

const ROLE_META = {
    super_admin: { label: 'Super Admin', Icon: Shield, iconBg: 'bg-[#244693]' },
    admin: { label: 'Admin', Icon: UserCog, iconBg: 'bg-[#102059]' },
    vendor: { label: 'Vendor', Icon: Store, iconBg: 'bg-[#D3A218]' },
    veterinarian: { label: 'Veterinarian', Icon: Stethoscope, iconBg: 'bg-[#102059]' },
    customer: { label: 'Customer', Icon: UsersRound, iconBg: 'bg-[#6B7280]' },
    rider: { label: 'Rider', Icon: Bike, iconBg: 'bg-[#244693]' },
    other: { label: 'Other', Icon: Users, iconBg: 'bg-[#9CA3AF]' },
}

/** Short blurbs for the create-account role picker (aligned with SuperAdminDashboard template) */
const CREATE_ROLE_DESCRIPTIONS = {
    super_admin: 'Full platform access and management',
    admin: 'Administrative access to manage operations',
    vendor: 'Product vendor or store owner',
    owner_manager: 'Manages an Agrivet business and its stores (dashboard login)',
    veterinarian: 'Licensed veterinary professional',
    customer: 'End customer account',
    rider: 'Delivery and logistics personnel',
}

/** Icon colors on role cards (matches SuperAdminDashboard picker styling) */
const ROLE_PICKER_ICON_CLASS = {
    super_admin: 'text-[#244693]',
    admin: 'text-[#244693]',
    vendor: 'text-[#D3A218]',
    owner_manager: 'text-[#102059]',
    veterinarian: 'text-[#102059]',
    customer: 'text-[#6B7280]',
    rider: 'text-[#244693]',
}

function StatDot({ active }) {
    return (
        <div className={`h-2 w-2 rounded-full ${active ? 'bg-[#00C950]' : 'bg-[#E5E7EB]'}`} />
    )
}

function RoleSummaryCard({ title, total, active, inactive, Icon, iconBg }) {
    return (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="mb-3 flex items-center gap-2">
                <div className={`rounded p-2 ${iconBg}`}>
                    <Icon className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                    {title}
                </h3>
            </div>
            <p className="mb-2 text-2xl font-bold text-[#102059]">{total}</p>
            <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                    <StatDot active />
                    <span className="text-[#6B7280]">{active} Active</span>
                </div>
                <div className="flex items-center gap-1">
                    <StatDot active={false} />
                    <span className="text-[#6B7280]">{inactive} Inactive</span>
                </div>
            </div>
        </div>
    )
}

function roleCounts(users, allowedTypes) {
    const byType = {}
    allowedTypes.forEach((t) => {
        byType[t] = { total: 0, active: 0, inactive: 0 }
    })

    users.forEach((u) => {
        const key = byType[u.user_type] !== undefined ? u.user_type : 'other'
        byType[key].total += 1
        if (u.status === 'active') {
            byType[key].active += 1
        } else {
            byType[key].inactive += 1
        }
    })
    return byType
}

function AccountsShell({ auth, title, children }) {
    if (auth?.user?.user_type === 'super_admin') {
        return (
            <SuperAdminKlasmeytLayout auth={auth} title={title} notificationCount={0}>
                {children}
            </SuperAdminKlasmeytLayout>
        )
    }
    return <KlasmeytDashboardLayout auth={auth} title={title}>{children}</KlasmeytDashboardLayout>
}

export default function Accounts({ auth, users = [], flash }) {
    useDashboardSession()

    const clearAllForm = useForm({})

    const [showClearAllDataModal, setShowClearAllDataModal] = useState(false)
    const [showRoleSelectionModal, setShowRoleSelectionModal] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
    const [showRemoveModal, setShowRemoveModal] = useState(false)
    const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [userToRemove, setUserToRemove] = useState(null)
    const [accountSearchQuery, setAccountSearchQuery] = useState('')
    const [accountRoleFilter, setAccountRoleFilter] = useState('All')
    const [accountStatusFilter, setAccountStatusFilter] = useState('All')
    const [accountSortBy, setAccountSortBy] = useState('name')
    const [accountItemsPerPage, setAccountItemsPerPage] = useState(10)
    const [currentAccountPage, setCurrentAccountPage] = useState(1)

    const addForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        password: '',
        password_confirmation: '',
        username: '',
        user_type: 'vendor',
        status: 'active',
    })

    const editForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        password: '',
        password_confirmation: '',
        username: '',
        user_type: 'vendor',
        status: 'active',
    })

    const statusToggleForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        password: '',
        password_confirmation: '',
        username: '',
        user_type: 'vendor',
        status: 'active',
    })

    const getAllowedUserTypes = () => {
        if (auth?.user?.user_type === 'admin') {
            return [
                { value: 'vendor', label: 'Vendor' },
                { value: 'veterinarian', label: 'Veterinarian' },
                { value: 'rider', label: 'Rider' },
            ]
        }
        return [
            { value: 'super_admin', label: 'Super Admin' },
            { value: 'admin', label: 'Admin' },
            { value: 'vendor', label: 'Vendor' },
            { value: 'veterinarian', label: 'Veterinarian' },
            { value: 'customer', label: 'Customer' },
            { value: 'rider', label: 'Rider' },
        ]
    }

    const userTypes = getAllowedUserTypes()
    const allowedTypeValues = userTypes.map((t) => t.value)

    const getBaseRoute = () =>
        auth?.user?.user_type === 'admin' ? '/dashboard/admin/users' : '/dashboard/super-admin/users'

    const getAddAgrivetUrl = () =>
        auth?.user?.user_type === 'admin' ? '/dashboard/admin/agrivets/create' : '/dashboard/super-admin/agrivets/create'

    const handleNavigateToAddAgrivet = () => {
        setShowRoleSelectionModal(false)
        router.visit(getAddAgrivetUrl())
    }

    const handleOpenCreateAccount = () => {
        addForm.reset()
        setShowRoleSelectionModal(true)
    }

    const handleSelectCreateRole = (userTypeValue) => {
        setShowRoleSelectionModal(false)
        if (userTypeValue === 'admin' && auth?.user?.user_type === 'super_admin') {
            router.visit('/dashboard/super-admin/users/add-admin')
            return
        }
        if (userTypeValue === 'vendor') {
            const prefix = auth?.user?.user_type === 'admin' ? '/dashboard/admin' : '/dashboard/super-admin'
            router.visit(`${prefix}/users/vendor-registration`)
            return
        }
        addForm.setData('user_type', userTypeValue)
        setShowAddModal(true)
        setShowAddModalAnimation(false)
    }

    const handleOpenClearAllData = () => {
        setShowClearAllDataModal(true)
    }

    const cancelClearAllData = () => {
        setShowClearAllDataModal(false)
    }

    const confirmClearAllData = () => {
        clearAllForm.post('/dashboard/super-admin/users/clear-all-data', {
            preserveScroll: true,
            onSuccess: () => setShowClearAllDataModal(false),
        })
    }

    const countTypeKeys = useMemo(
        () => [...new Set([...ROLE_ORDER, ...allowedTypeValues, 'other'])],
        [allowedTypeValues],
    )

    const counts = useMemo(() => roleCounts(users, countTypeKeys), [users, countTypeKeys])

    const displayName = (user) =>
        `${user.first_name} ${user.middle_name ? `${user.middle_name} ` : ''}${user.last_name}`.trim()

    const initialsFromUser = (user) => {
        const parts = displayName(user).split(/\s+/).filter(Boolean)
        if (parts.length === 0) {
            return '?'
        }
        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase()
        }
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }

    const getUserTypeLabel = (userType) => {
        const type = userTypes.find((t) => t.value === userType)
        if (type) {
            return type.label
        }
        return ROLE_META[userType]?.label || userType
    }

    const sortedAccounts = useMemo(() => {
        const q = accountSearchQuery.trim().toLowerCase()
        let list = users.filter((u) => {
            if (accountRoleFilter !== 'All' && u.user_type !== accountRoleFilter) {
                return false
            }
            if (accountStatusFilter !== 'All') {
                const wantActive = accountStatusFilter === 'Active'
                const isActive = u.status === 'active'
                if (wantActive !== isActive) {
                    return false
                }
            }
            if (!q) {
                return true
            }
            const name = `${u.first_name} ${u.middle_name || ''} ${u.last_name}`.toLowerCase()
            const roleLabel = getUserTypeLabel(u.user_type).toLowerCase()
            return (
                name.includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.username || '').toLowerCase().includes(q) ||
                roleLabel.includes(q) ||
                String(u.id).includes(q)
            )
        })

        list = [...list].sort((a, b) => {
            if (accountSortBy === 'name') {
                return displayName(a).localeCompare(displayName(b))
            }
            if (accountSortBy === 'date') {
                const ta = a.created_at ? new Date(a.created_at).getTime() : 0
                const tb = b.created_at ? new Date(b.created_at).getTime() : 0
                return tb - ta
            }
            if (accountSortBy === 'role') {
                return getUserTypeLabel(a.user_type).localeCompare(getUserTypeLabel(b.user_type))
            }
            return 0
        })

        return list
    }, [
        users,
        accountSearchQuery,
        accountRoleFilter,
        accountStatusFilter,
        accountSortBy,
        auth?.user?.user_type,
        allowedTypeValues,
    ])

    const totalAccountPages = Math.max(1, Math.ceil(sortedAccounts.length / accountItemsPerPage))
    const accountStartIndex = (currentAccountPage - 1) * accountItemsPerPage
    const accountEndIndex = accountStartIndex + accountItemsPerPage
    const displayedAccounts = sortedAccounts.slice(accountStartIndex, accountEndIndex)

    useEffect(() => {
        setCurrentAccountPage(1)
    }, [accountSearchQuery, accountRoleFilter, accountStatusFilter, accountSortBy, accountItemsPerPage])

    useEffect(() => {
        if (currentAccountPage > totalAccountPages) {
            setCurrentAccountPage(Math.max(1, totalAccountPages))
        }
    }, [currentAccountPage, totalAccountPages])

    useEffect(() => {
        if (showAddModal) {
            setTimeout(() => setShowAddModalAnimation(true), 10)
        } else {
            setShowAddModalAnimation(false)
        }
    }, [showAddModal])

    useEffect(() => {
        if (showEditModal) {
            setTimeout(() => setShowEditModalAnimation(true), 10)
        } else {
            setShowEditModalAnimation(false)
        }
    }, [showEditModal])

    useEffect(() => {
        if (showRemoveModal) {
            setTimeout(() => setShowRemoveModalAnimation(true), 10)
        } else {
            setShowRemoveModalAnimation(false)
        }
    }, [showRemoveModal])

    const closeAddModal = () => {
        setShowAddModalAnimation(false)
        setTimeout(() => {
            setShowAddModal(false)
            addForm.reset()
        }, 300)
    }

    const closeEditModal = () => {
        setShowEditModalAnimation(false)
        setTimeout(() => {
            setShowEditModal(false)
            setSelectedUser(null)
            editForm.reset()
        }, 300)
    }

    const closeRemoveModal = () => {
        setShowRemoveModalAnimation(false)
        setTimeout(() => {
            setShowRemoveModal(false)
            setUserToRemove(null)
        }, 300)
    }

    useEffect(() => {
        if (flash?.success) {
            closeAddModal()
            closeEditModal()
            closeRemoveModal()
            addForm.reset()
            editForm.reset()
            setUserToRemove(null)
        }
    }, [flash])

    const handleAddUser = (e) => {
        e.preventDefault()
        addForm.post(getBaseRoute(), {
            preserveScroll: true,
            onSuccess: () => addForm.reset(),
        })
    }

    const handleEditUser = (user) => {
        setSelectedUser(user)
        editForm.setData({
            first_name: user.first_name,
            middle_name: user.middle_name || '',
            last_name: user.last_name,
            email: user.email,
            mobile_number: user.mobile_number || '',
            password: '',
            password_confirmation: '',
            username: user.username,
            user_type: user.user_type,
            status: user.status,
        })
        setShowEditModal(true)
        setShowEditModalAnimation(false)
    }

    const handleUpdateUser = (e) => {
        e.preventDefault()
        editForm.put(`${getBaseRoute()}/${selectedUser.id}`, {
            preserveScroll: true,
            onSuccess: () => closeEditModal(),
        })
    }

    const handleDeactivateUser = (userId) => {
        const user = users.find((u) => u.id === userId)
        setUserToRemove(user)
        setShowRemoveModal(true)
        setShowRemoveModalAnimation(false)
    }

    const confirmRemoveUser = () => {
        if (userToRemove) {
            router.delete(`${getBaseRoute()}/${userToRemove.id}`, {
                preserveScroll: true,
                onSuccess: () => closeRemoveModal(),
            })
        }
    }

    const handleAccountStatusToggle = (e, user) => {
        e.stopPropagation()
        if (statusToggleForm.processing) {
            return
        }
        const newStatus = user.status === 'active' ? 'inactive' : 'active'
        statusToggleForm.setData({
            first_name: user.first_name,
            middle_name: user.middle_name || '',
            last_name: user.last_name,
            email: user.email,
            mobile_number: user.mobile_number || '',
            password: '',
            password_confirmation: '',
            username: user.username || '',
            user_type: user.user_type,
            status: newStatus,
        })
        statusToggleForm.put(`${getBaseRoute()}/${user.id}`, {
            preserveScroll: true,
        })
    }

    const summaryRoles = useMemo(() => {
        const list = [...new Set([...ROLE_ORDER.filter((r) => allowedTypeValues.includes(r)), ...allowedTypeValues])]
        const base = list.filter((r) => ROLE_META[r] && r !== 'other')
        if ((counts.other?.total ?? 0) > 0) {
            base.push('other')
        }
        return base
    }, [allowedTypeValues, counts])

    const inputClass =
        'mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#1F2937] outline-none ring-[#244693]/30 placeholder:text-[#9CA3AF] focus:border-[#244693] focus:ring-2'
    const filterSelectClass =
        'border border-[#E5E7EB] bg-[#ffffff] px-[20px] py-[8px] text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]'
    const itemsPerPageSelectClass =
        'border border-[#E5E7EB] bg-[#ffffff] px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]'
    const labelClass = 'text-sm font-medium text-[#374151]'
    const modalField = (label, child) => (
        <div>
            <label className={labelClass}>{label}</label>
            {child}
        </div>
    )

    return (
        <AccountsShell auth={auth} title="Accounts">
            <Head title="Accounts" />

            <div className="space-y-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="mb-2 text-2xl font-semibold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                            User Accounts
                        </h1>
                        <p className="text-sm text-[#6B7280]">Manage all user accounts in the system</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {auth?.user?.user_type === 'super_admin' && (
                            <button
                                type="button"
                                onClick={handleOpenClearAllData}
                                className="flex items-center gap-2 bg-[#E20E28] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#B00B1F]"
                                style={{ fontFamily: 'Inter Condensed, sans-serif', borderRadius: '0.6rem' }}
                            >
                                <Database className="h-4 w-4" />
                                Clear All Data
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleOpenCreateAccount}
                            className="flex items-center gap-2 bg-[#102059] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
                            style={{ fontFamily: 'Inter Condensed, sans-serif', borderRadius: '0.6rem' }}
                        >
                            <Plus className="h-4 w-4" />
                            Create Account
                        </button>
                    </div>
                </div>

                {flash?.success && (
                    <div
                        className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                        role="status"
                    >
                        <span>{flash.success}</span>
                        <button
                            type="button"
                            className="text-emerald-700 hover:text-emerald-950"
                            onClick={() =>
                                router.visit(window.location.pathname, {
                                    only: ['users', 'auth', 'flash'],
                                    preserveState: true,
                                    preserveScroll: true,
                                })
                            }
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {flash?.error && (
                    <div
                        className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                        role="alert"
                    >
                        <span>{flash.error}</span>
                        <button
                            type="button"
                            className="text-red-700 hover:text-red-950"
                            onClick={() =>
                                router.visit(window.location.pathname, {
                                    only: ['users', 'auth', 'flash'],
                                    preserveState: true,
                                    preserveScroll: true,
                                })
                            }
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-lg bg-[#EEF2FF] p-3">
                            <Users className="h-6 w-6 text-[#244693]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                Account overview
                            </h3>
                            <p className="text-sm text-[#6B7280]">Counts by role for users you can manage</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {summaryRoles.map((roleKey) => {
                            const meta = ROLE_META[roleKey] || ROLE_META.other
                            const c = counts[roleKey] || { total: 0, active: 0, inactive: 0 }
                            if (!meta) {
                                return null
                            }
                            return (
                                <RoleSummaryCard
                                    key={roleKey}
                                    title={getUserTypeLabel(roleKey)}
                                    total={c.total}
                                    active={c.active}
                                    inactive={c.inactive}
                                    Icon={meta.Icon}
                                    iconBg={meta.iconBg}
                                />
                            )
                        })}
                    </div>
                </div> */}

                {/* Filters Bar — matches SuperAdminDashboard.tsx Accounts tab */}
                <div className="mb-6 p-[0px]">
                    <div className="flex flex-col items-start justify-between gap-4 bg-transparent md:flex-row md:items-center">
                        <div className="relative max-w-md flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            <input
                                type="text"
                                placeholder="Search name, email, or role..."
                                value={accountSearchQuery}
                                onChange={(e) => setAccountSearchQuery(e.target.value)}
                                className="w-full border border-[#E5E7EB] bg-[#ffffff] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
                                style={{ borderRadius: '0.6rem' }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div>
                                <select
                                    value={accountRoleFilter}
                                    onChange={(e) => setAccountRoleFilter(e.target.value)}
                                    className={filterSelectClass}
                                    style={{ borderRadius: '0.6rem' }}
                                >
                                    <option value="All">All Roles</option>
                                    {allowedTypeValues.map((v) => (
                                        <option key={v} value={v}>
                                            {getUserTypeLabel(v)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <select
                                    value={accountStatusFilter}
                                    onChange={(e) => setAccountStatusFilter(e.target.value)}
                                    className={filterSelectClass}
                                    style={{ borderRadius: '0.6rem' }}
                                >
                                    <option value="All">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <select
                                    value={accountSortBy}
                                    onChange={(e) => setAccountSortBy(e.target.value)}
                                    className={filterSelectClass}
                                    style={{ borderRadius: '0.6rem' }}
                                >
                                    <option value="name">Sort by Name</option>
                                    <option value="date">Sort by Date Added</option>
                                    <option value="role">Sort by Role</option>
                                </select>
                            </div>
                            <div>
                                <select
                                    value={accountItemsPerPage}
                                    onChange={(e) => setAccountItemsPerPage(Number(e.target.value))}
                                    className={itemsPerPageSelectClass}
                                    style={{ borderRadius: '0.6rem' }}
                                >
                                    <option value={5}>Show 5</option>
                                    <option value={10}>Show 10</option>
                                    <option value={25}>Show 25</option>
                                    <option value={50}>Show 50</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Accounts list — template-style rows (avatar, meta, toggle, actions) */}
                <div className="rounded-lg border border-[#E5E7EB] bg-white">
                    <div className="divide-y divide-[#E5E7EB]">
                        {displayedAccounts.length > 0 ? (
                            displayedAccounts.map((user) => {
                                const statusLabel = user.status === 'active' ? 'Active' : 'Inactive'
                                const addedDate = user.created_at
                                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                      })
                                    : '—'
                                return (
                                    <div key={user.id} className="px-6 py-4 transition-colors hover:bg-[#F8F9FB]">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#102059]">
                                                <span className="text-sm font-bold text-white">{initialsFromUser(user)}</span>
                                            </div>

                                            <div className="grid min-w-0 flex-1 grid-cols-1 items-center gap-4 gap-y-3 sm:grid-cols-[1fr_180px_auto]">
                                                <div className="min-w-0">
                                                    <div className="mb-1 text-sm font-bold text-[#102059]">{displayName(user)}</div>
                                                    <div className="text-xs text-[#6B7280]">
                                                        {getUserTypeLabel(user.user_type)} • {user.email || '—'} • Added {addedDate}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleAccountStatusToggle(e, user)}
                                                        disabled={statusToggleForm.processing}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 ${
                                                            user.status === 'active' ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                                                        }`}
                                                        aria-pressed={user.status === 'active'}
                                                        aria-label={`Toggle status for ${displayName(user)}`}
                                                        style={{ borderRadius: '0.7rem' }}
                                                    >
                                                        <span
                                                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ${
                                                                user.status === 'active' ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                                            }`}
                                                        />
                                                    </button>
                                                    <span className="text-xs font-semibold text-[#6B7280]">{statusLabel}</span>
                                                </div>

                                                <div className="flex items-center justify-end gap-1 sm:justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleEditUser(user)
                                                        }}
                                                        className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                                                        title="Edit account"
                                                    >
                                                        <Pencil className="h-5 w-5" />
                                                    </button>
                                                    {user.status === 'active' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeactivateUser(user.id)
                                                            }}
                                                            className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                                                            title="Remove account"
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
                                <p className="text-sm text-[#9CA3AF]">No accounts found matching your search criteria</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results count + pagination — template */}
                <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[#6B7280]">
                            Showing{' '}
                            <span className="font-semibold text-[#102059]">
                                {sortedAccounts.length === 0
                                    ? '0'
                                    : `${accountStartIndex + 1}-${Math.min(accountEndIndex, sortedAccounts.length)}`}
                            </span>{' '}
                            of <span className="font-semibold text-[#102059]">{sortedAccounts.length}</span> accounts
                            {accountSearchQuery && ` matching "${accountSearchQuery}"`}
                            {accountRoleFilter !== 'All' && ` • Role: ${getUserTypeLabel(accountRoleFilter)}`}
                            {accountStatusFilter !== 'All' && ` • Status: ${accountStatusFilter}`}
                        </p>

                        {totalAccountPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentAccountPage((p) => Math.max(1, p - 1))}
                                    disabled={currentAccountPage === 1}
                                    className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-xs transition-colors hover:bg-[#F8F9FB] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-[#6B7280]">
                                    Page {currentAccountPage} of {totalAccountPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCurrentAccountPage((p) => Math.min(totalAccountPages, p + 1))}
                                    disabled={currentAccountPage === totalAccountPages}
                                    className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-xs transition-colors hover:bg-[#F8F9FB] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Role Selection Modal for Create Account — matches Klasmeyt SuperAdminDashboard template */}
            {showRoleSelectionModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    role="presentation"
                    onClick={() => setShowRoleSelectionModal(false)}
                >
                    <div
                        className="w-full max-w-2xl rounded-lg border border-[#E5E7EB] bg-white p-6"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="role-selection-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <h3
                                id="role-selection-title"
                                className="text-lg font-semibold text-[#102059]"
                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                            >
                                Select Account Role
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowRoleSelectionModal(false)}
                                className="rounded p-1 transition-colors hover:bg-[#F8F9FB]"
                            >
                                <X className="h-5 w-5 text-[#6B7280]" />
                            </button>
                        </div>
                        <p className="mb-6 text-sm text-[#6B7280]">Choose the type of account you want to create:</p>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            
                            {(auth?.user?.user_type === 'super_admin' || auth?.user?.user_type === 'admin') && (
                                <button
                                    type="button"
                                    onClick={handleNavigateToAddAgrivet}
                                    className="group flex items-start gap-4 rounded-lg border border-[#E5E7EB] p-4 text-left transition-all hover:border-[#102059] hover:bg-[#F8F9FB]"
                                >
                                    <div className="rounded-lg bg-[#F8F9FB] p-2 transition-colors group-hover:bg-[#102059]">
                                        <Building2 className="h-6 w-6 text-[#E20E28] transition-colors group-hover:text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4
                                            className="mb-1 font-semibold text-[#102059]"
                                            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                        >
                                            Agrivet
                                        </h4>
                                        <p className="text-xs text-[#6B7280]">Agrivet store owner and manager — full onboarding wizard</p>
                                    </div>
                                </button>
                            )}
                            {userTypes.map(({ value, label }) => {
                                const meta = ROLE_META[value] || ROLE_META.other
                                const Icon = meta.Icon
                                const blurb = CREATE_ROLE_DESCRIPTIONS[value] || 'Create this account type'
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleSelectCreateRole(value)}
                                        className="group flex items-start gap-4 rounded-lg border border-[#E5E7EB] p-4 text-left transition-all hover:border-[#102059] hover:bg-[#F8F9FB]"
                                    >
                                        <div className="rounded-lg bg-[#F8F9FB] p-2 transition-colors group-hover:bg-[#102059]">
                                            <Icon
                                                className={`h-6 w-6 transition-colors group-hover:text-white ${ROLE_PICKER_ICON_CLASS[value] || 'text-[#244693]'}`}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4
                                                className="mb-1 font-semibold text-[#102059]"
                                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                            >
                                                {label}
                                            </h4>
                                            <p className="text-xs text-[#6B7280]">{blurb}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Add modal */}
            {showAddModal && (
                <>
                    <button
                        type="button"
                        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${showAddModalAnimation ? 'opacity-100' : 'opacity-0'}`}
                        aria-label="Close"
                        onClick={closeAddModal}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <div
                            className={`pointer-events-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-xl transition-all ${
                                showAddModalAnimation ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                            }`}
                        >
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4">
                                <h4 className="text-lg font-bold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    Add account
                                </h4>
                                <button type="button" className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6]" onClick={closeAddModal}>
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddUser}>
                                <div className="space-y-4 px-6 py-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {modalField(
                                            'First name *',
                                            <input
                                                type="text"
                                                required
                                                className={`${inputClass} ${addForm.errors.first_name ? 'border-red-400' : ''}`}
                                                value={addForm.data.first_name}
                                                onChange={(e) => addForm.setData('first_name', e.target.value)}
                                            />,
                                        )}
                                        {addForm.errors.first_name && (
                                            <p className="col-span-full text-xs text-red-600">{addForm.errors.first_name}</p>
                                        )}
                                        {modalField(
                                            'Middle name',
                                            <input
                                                type="text"
                                                className={`${inputClass} ${addForm.errors.middle_name ? 'border-red-400' : ''}`}
                                                value={addForm.data.middle_name}
                                                onChange={(e) => addForm.setData('middle_name', e.target.value)}
                                            />,
                                        )}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {modalField(
                                            'Last name *',
                                            <input
                                                type="text"
                                                required
                                                className={`${inputClass} ${addForm.errors.last_name ? 'border-red-400' : ''}`}
                                                value={addForm.data.last_name}
                                                onChange={(e) => addForm.setData('last_name', e.target.value)}
                                            />,
                                        )}
                                        {modalField(
                                            'Email *',
                                            <input
                                                type="email"
                                                required
                                                className={`${inputClass} ${addForm.errors.email ? 'border-red-400' : ''}`}
                                                value={addForm.data.email}
                                                onChange={(e) => addForm.setData('email', e.target.value)}
                                            />,
                                        )}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {modalField(
                                            'Mobile number',
                                            <input
                                                type="text"
                                                className={`${inputClass} ${addForm.errors.mobile_number ? 'border-red-400' : ''}`}
                                                value={addForm.data.mobile_number}
                                                onChange={(e) => addForm.setData('mobile_number', e.target.value)}
                                            />,
                                        )}
                                        {modalField(
                                            'Username',
                                            <input
                                                type="text"
                                                className={`${inputClass} ${addForm.errors.username ? 'border-red-400' : ''}`}
                                                value={addForm.data.username}
                                                onChange={(e) => addForm.setData('username', e.target.value)}
                                                placeholder="Auto-generated if empty"
                                            />,
                                        )}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {modalField(
                                            'Password *',
                                            <input
                                                type="password"
                                                required
                                                className={`${inputClass} ${addForm.errors.password ? 'border-red-400' : ''}`}
                                                value={addForm.data.password}
                                                onChange={(e) => addForm.setData('password', e.target.value)}
                                            />,
                                        )}
                                        {modalField(
                                            'Confirm password *',
                                            <input
                                                type="password"
                                                required
                                                className={`${inputClass} ${addForm.errors.password_confirmation ? 'border-red-400' : ''}`}
                                                value={addForm.data.password_confirmation}
                                                onChange={(e) => addForm.setData('password_confirmation', e.target.value)}
                                            />,
                                        )}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {modalField(
                                            'User type *',
                                            <select
                                                required
                                                className={`${inputClass} ${addForm.errors.user_type ? 'border-red-400' : ''}`}
                                                value={addForm.data.user_type}
                                                onChange={(e) => addForm.setData('user_type', e.target.value)}
                                            >
                                                {userTypes.map((type) => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>,
                                        )}
                                        {modalField(
                                            'Status *',
                                            <select
                                                required
                                                className={`${inputClass} ${addForm.errors.status ? 'border-red-400' : ''}`}
                                                value={addForm.data.status}
                                                onChange={(e) => addForm.setData('status', e.target.value)}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>,
                                        )}
                                    </div>
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
                                        {addForm.processing ? 'Creating…' : 'Create account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}

            {/* Edit modal */}
            {showEditModal && selectedUser && (
                <>
                    <button
                        type="button"
                        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${showEditModalAnimation ? 'opacity-100' : 'opacity-0'}`}
                        aria-label="Close"
                        onClick={closeEditModal}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <div
                            className={`pointer-events-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-xl transition-all ${
                                showEditModalAnimation ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                            }`}
                        >
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4">
                                <h4 className="text-lg font-bold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    Edit account
                                </h4>
                                <button type="button" className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6]" onClick={closeEditModal}>
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateUser}>
                                <div className="space-y-4 px-6 py-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {modalField(
                                            'First name *',
                                            <input
                                                type="text"
                                                required
                                                className={`${inputClass} ${editForm.errors.first_name ? 'border-red-400' : ''}`}
                                                value={editForm.data.first_name}
                                                onChange={(e) => editForm.setData('first_name', e.target.value)}
                                            />,
                                        )}
                                        {modalField(
                                            'Middle name',
                                            <input
                                                type="text"
                                                className={`${inputClass} ${editForm.errors.middle_name ? 'border-red-400' : ''}`}
                                                value={editForm.data.middle_name}
                                                onChange={(e) => editForm.setData('middle_name', e.target.value)}
                                            />,
                                        )}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {modalField(
                                            'Last name *',
                                            <input
                                                type="text"
                                                required
                                                className={`${inputClass} ${editForm.errors.last_name ? 'border-red-400' : ''}`}
                                                value={editForm.data.last_name}
                                                onChange={(e) => editForm.setData('last_name', e.target.value)}
                                            />,
                                        )}
                                        {modalField(
                                            'Email *',
                                            <input
                                                type="email"
                                                required
                                                className={`${inputClass} ${editForm.errors.email ? 'border-red-400' : ''}`}
                                                value={editForm.data.email}
                                                onChange={(e) => editForm.setData('email', e.target.value)}
                                            />,
                                        )}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {modalField(
                                            'Mobile number',
                                            <input
                                                type="text"
                                                className={`${inputClass} ${editForm.errors.mobile_number ? 'border-red-400' : ''}`}
                                                value={editForm.data.mobile_number}
                                                onChange={(e) => editForm.setData('mobile_number', e.target.value)}
                                            />,
                                        )}
                                        {modalField(
                                            'Username',
                                            <input
                                                type="text"
                                                className={`${inputClass} ${editForm.errors.username ? 'border-red-400' : ''}`}
                                                value={editForm.data.username}
                                                onChange={(e) => editForm.setData('username', e.target.value)}
                                            />,
                                        )}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {modalField(
                                            'Password (leave blank to keep)',
                                            <input
                                                type="password"
                                                className={`${inputClass} ${editForm.errors.password ? 'border-red-400' : ''}`}
                                                value={editForm.data.password}
                                                onChange={(e) => editForm.setData('password', e.target.value)}
                                                placeholder="Leave blank to keep current"
                                            />,
                                        )}
                                        {modalField(
                                            'Confirm password',
                                            <input
                                                type="password"
                                                className={`${inputClass} ${editForm.errors.password_confirmation ? 'border-red-400' : ''}`}
                                                value={editForm.data.password_confirmation}
                                                onChange={(e) => editForm.setData('password_confirmation', e.target.value)}
                                            />,
                                        )}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {modalField(
                                            'User type *',
                                            <select
                                                required
                                                className={`${inputClass} ${editForm.errors.user_type ? 'border-red-400' : ''}`}
                                                value={editForm.data.user_type}
                                                onChange={(e) => editForm.setData('user_type', e.target.value)}
                                            >
                                                {userTypes.map((type) => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>,
                                        )}
                                        {modalField(
                                            'Status *',
                                            <select
                                                required
                                                className={`${inputClass} ${editForm.errors.status ? 'border-red-400' : ''}`}
                                                value={editForm.data.status}
                                                onChange={(e) => editForm.setData('status', e.target.value)}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>,
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                                    <button
                                        type="button"
                                        className="rounded-full border border-[#E5E7EB] bg-white px-5 py-2 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6]"
                                        onClick={closeEditModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editForm.processing}
                                        className="rounded-full bg-[#244693] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1b3770] disabled:opacity-60"
                                    >
                                        {editForm.processing ? 'Saving…' : 'Save changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}

            {/* Clear All Data — matches SuperAdminDashboard.tsx Accounts tab */}
            {showClearAllDataModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
                    onClick={cancelClearAllData}
                    role="presentation"
                >
                    <div
                        className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="clear-all-data-title"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 id="clear-all-data-title" className="text-lg font-semibold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                Clear All Data
                            </h3>
                            <button
                                type="button"
                                onClick={cancelClearAllData}
                                className="rounded p-1 transition-colors hover:bg-[#F8F9FB]"
                            >
                                <X className="h-5 w-5 text-[#6B7280]" />
                            </button>
                        </div>
                        <div className="mb-4 rounded-lg border border-[#E20E28] bg-[#FEE2E2] p-3">
                            <div className="flex items-start gap-2">
                                <svg
                                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E20E28]"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    aria-hidden
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <div>
                                    <p className="text-sm font-semibold text-[#991B1B]">Warning: Irreversible Action</p>
                                    <p className="mt-1 text-xs text-[#991B1B]">
                                        This will permanently delete all agrivets, stores, accounts, products, and vendors from the
                                        system. This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="mb-6 text-sm text-[#6B7280]">
                            Are you absolutely sure you want to clear all data from the system?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={cancelClearAllData}
                                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#6B7280] transition-colors hover:bg-[#F8F9FB]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmClearAllData}
                                disabled={clearAllForm.processing}
                                className="rounded-lg bg-[#E20E28] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C10D23] disabled:opacity-60"
                            >
                                {clearAllForm.processing ? 'Working…' : 'Clear All Data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deactivate modal */}
            {showRemoveModal && userToRemove && (
                <>
                    <button
                        type="button"
                        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${showRemoveModalAnimation ? 'opacity-100' : 'opacity-0'}`}
                        aria-label="Close"
                        onClick={closeRemoveModal}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <div
                            className={`pointer-events-auto w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl transition-all ${
                                showRemoveModalAnimation ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                            }`}
                        >
                            <h4 className="text-lg font-bold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                Deactivate account
                            </h4>
                            <p className="mt-3 text-sm text-[#6B7280]">
                                Deactivate{' '}
                                <strong className="text-[#1F2937]">
                                    {userToRemove.first_name}{' '}
                                    {userToRemove.middle_name ? `${userToRemove.middle_name} ` : ''}
                                    {userToRemove.last_name}
                                </strong>
                                ? They will no longer be able to sign in.
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    className="rounded-full border border-[#E5E7EB] bg-white px-5 py-2 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6]"
                                    onClick={closeRemoveModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmRemoveUser}
                                    className="rounded-full bg-[#E20E28] px-5 py-2 text-sm font-semibold text-white hover:bg-[#c40b22]"
                                >
                                    Deactivate
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </AccountsShell>
    )
}
