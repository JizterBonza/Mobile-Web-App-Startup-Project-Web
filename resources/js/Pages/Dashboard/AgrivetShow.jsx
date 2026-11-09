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

function agrivetsBase(userType) {
    return userType === 'admin' ? '/dashboard/admin/agrivets' : '/dashboard/super-admin/agrivets'
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

export default function AgrivetShow({ auth, agrivet }) {
    const base = agrivetsBase(auth?.user?.user_type)
    const users = agrivet?.users ?? []
    const shops = agrivet?.shops ?? []
    const isActive = agrivet?.status === 'active'

    return (
        <SuperAdminOrAdminLayout auth={auth} title={agrivet?.name || 'Agrivet'}>
            <div className="mb-5">
                <Link
                    href={base}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#102059]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Agrivets
                </Link>
            </div>

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#102059]">
                        <span className="text-sm font-bold text-white">{initials(agrivet?.name)}</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-[#102059]">{agrivet?.name || 'Agrivet'}</h1>
                        <p className="text-sm text-[#6B7280]">
                            Added {formatDate(agrivet?.created_at)}
                            {agrivet?.registered_business_name ? ` · ${agrivet.registered_business_name}` : ''}
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
                    <Detail label="Company name" value={agrivet?.name} />
                    <Detail label="Registered business name" value={agrivet?.registered_business_name} />
                    <Detail label="Owner" value={agrivet?.owner_name} />
                    <Detail label="Address" value={agrivet?.address} />
                    <Detail label="Contact number" value={agrivet?.contact_number} />
                    <Detail label="Email" value={agrivet?.email} />
                    <Detail label="Service area" value={agrivet?.service_area} />
                    <Detail label="Business permits" value={agrivet?.permits} />
                </div>
            </div>

            <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-6 py-4">
                    <div>
                        <h2 className="text-sm font-semibold text-[#102059]">Stores</h2>
                        <p className="mt-1 text-xs text-[#6B7280]">
                            {shops.length === 1 ? '1 store under this agrivet' : `${shops.length} stores under this agrivet`}
                        </p>
                    </div>
                    <Link
                        href={`${base}/${agrivet?.id}/shops`}
                        className="text-sm font-semibold text-[#244693] no-underline hover:text-[#102059]"
                    >
                        Manage stores
                    </Link>
                </div>
                <div className="divide-y divide-[#E5E7EB]">
                    {shops.length > 0 ? (
                        shops.map((shop) => {
                            const active = shop.status === 'active'
                            return (
                                <Link
                                    key={shop.id}
                                    href={`${base}/${agrivet.id}/shops/${shop.id}/store-information`}
                                    className="block px-6 py-4 no-underline transition-colors hover:bg-[#F8F9FB]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#102059]">
                                            <span className="text-sm font-bold text-white">{initials(shop.name)}</span>
                                        </div>
                                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_100px] lg:items-center">
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-[#102059]">{shop.name || 'Unnamed store'}</div>
                                                <div className="truncate text-sm text-[#6B7280]">{shop.address || 'No address'}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex h-2 w-2 rounded-full ${active ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'}`} />
                                                <span className="text-xs font-semibold text-[#6B7280]">{active ? 'Active' : 'Inactive'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-sm text-[#9CA3AF]">No stores are registered under this agrivet</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-white">
                <div className="border-b border-[#E5E7EB] px-6 py-4">
                    <h2 className="text-sm font-semibold text-[#102059]">Users</h2>
                    <p className="mt-1 text-xs text-[#6B7280]">
                        {users.length === 1 ? '1 login connected to this agrivet' : `${users.length} logins connected to this agrivet`}
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
                            <p className="text-sm text-[#9CA3AF]">No users are connected to this agrivet</p>
                        </div>
                    )}
                </div>
            </div>
        </SuperAdminOrAdminLayout>
    )
}
