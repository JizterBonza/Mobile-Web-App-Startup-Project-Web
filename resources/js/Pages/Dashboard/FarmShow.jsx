import { Link } from '@inertiajs/react'
import { ArrowLeft } from 'lucide-react'
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

function farmsBase(userType) {
    return userType === 'admin' ? '/dashboard/admin/farms' : '/dashboard/super-admin/farms'
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

export default function FarmShow({ auth, farm }) {
    const base = farmsBase(auth?.user?.user_type)
    const users = farm?.users ?? []
    const isActive = farm?.status === 'active'

    return (
        <SuperAdminOrAdminLayout auth={auth} title={farm?.name || 'Farm'}>
            <div className="mb-5">
                <Link
                    href={base}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#102059]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Farms
                </Link>
            </div>

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#102059]">
                        <span className="text-sm font-bold text-white">{initials(farm?.name)}</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-[#102059]">{farm?.name || 'Farm'}</h1>
                        <p className="text-sm text-[#6B7280]">
                            Added {formatDate(farm?.created_at)}
                            {farm?.registered_business_name ? ` · ${farm.registered_business_name}` : ''}
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
                    <Detail label="Company name" value={farm?.name} />
                    <Detail label="Registered business name" value={farm?.registered_business_name} />
                    <Detail label="Owner" value={farm?.owner_name} />
                    <Detail label="Address" value={farm?.address} />
                    <Detail label="Contact number" value={farm?.contact_number} />
                    <Detail label="Email" value={farm?.email} />
                    <Detail label="Operating days" value={farm?.operating_days} />
                    <Detail label="Operating hours" value={farm?.operating_hours} />
                    <Detail label="Business permits" value={farm?.permits} />
                </div>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-white">
                <div className="border-b border-[#E5E7EB] px-6 py-4">
                    <h2 className="text-sm font-semibold text-[#102059]">Users</h2>
                    <p className="mt-1 text-xs text-[#6B7280]">
                        {users.length === 1 ? '1 login connected to this farm' : `${users.length} logins connected to this farm`}
                    </p>
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
                            <p className="text-sm text-[#9CA3AF]">No users are connected to this farm</p>
                        </div>
                    )}
                </div>
            </div>
        </SuperAdminOrAdminLayout>
    )
}
