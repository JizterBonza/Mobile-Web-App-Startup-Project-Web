import { Head, Link, useForm } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import primaryLogo from '../../../Logo/Primary Logo.png'

function dashboardHomePath(userType) {
    switch (userType) {
        case 'super_admin':
            return '/dashboard/super-admin'
        case 'admin':
            return '/dashboard/admin'
        case 'vendor':
            return '/dashboard/vendor'
        case 'veterinarian':
            return '/dashboard/veterinarian'
        default:
            return '/dashboard'
    }
}

function NavLink({ href, iconClass, children }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
        >
            <i className={`${iconClass} w-5 text-center text-white/70`} />
            <span>{children}</span>
        </Link>
    )
}

function SubNavLink({ href, children }) {
    return (
        <Link
            href={href}
            className="ml-8 block rounded-lg py-2 pl-3 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
            {children}
        </Link>
    )
}

function SuperAdminNav({ productOpen, setProductOpen }) {
    return (
        <>
            <NavLink href="/dashboard/super-admin" iconClass="fas fa-tachometer-alt">
                Dashboard
            </NavLink>
            <NavLink href="/dashboard/super-admin/users" iconClass="fas fa-users">
                Accounts
            </NavLink>
            <NavLink href="/dashboard/super-admin/agrivets" iconClass="fas fa-clinic-medical">
                Agrivets
            </NavLink>
            <button
                type="button"
                onClick={() => setProductOpen((o) => !o)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
                <i className="fas fa-box w-5 text-center text-white/70" />
                <span className="flex-1">Products</span>
                <i className={`fas fa-chevron-${productOpen ? 'up' : 'down'} text-xs text-white/50`} />
            </button>
            {productOpen && (
                <div className="mt-1 space-y-0.5 border-l border-white/10 ml-4 pl-2">
                    <SubNavLink href="/dashboard/super-admin/categories">Categories</SubNavLink>
                    <SubNavLink href="/dashboard/super-admin/sub-categories">Sub-Categories</SubNavLink>
                </div>
            )}
            <NavLink href="/dashboard/super-admin/activity-logs" iconClass="fas fa-history">
                Activity Logs
            </NavLink>
            <NavLink href="/dashboard/super-admin/payment-methods" iconClass="fas fa-credit-card">
                Payment Methods
            </NavLink>
            <NavLink href="/dashboard/super-admin/delivery-methods" iconClass="fas fa-truck">
                Delivery Methods
            </NavLink>
            <NavLink href="/dashboard/super-admin/zones" iconClass="fas fa-map-marked-alt">
                Zones
            </NavLink>
        </>
    )
}

function AdminNav({ productOpen, setProductOpen }) {
    return (
        <>
            <NavLink href="/dashboard/admin" iconClass="fas fa-tachometer-alt">
                Dashboard
            </NavLink>
            <NavLink href="/dashboard/admin/users" iconClass="fas fa-users">
                Accounts
            </NavLink>
            <NavLink href="/dashboard/admin/agrivets" iconClass="fas fa-clinic-medical">
                Agrivet Management
            </NavLink>
            <button
                type="button"
                onClick={() => setProductOpen((o) => !o)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
                <i className="fas fa-box w-5 text-center text-white/70" />
                <span className="flex-1">Product Management</span>
                <i className={`fas fa-chevron-${productOpen ? 'up' : 'down'} text-xs text-white/50`} />
            </button>
            {productOpen && (
                <div className="mt-1 space-y-0.5 border-l border-white/10 ml-4 pl-2">
                    <SubNavLink href="/dashboard/admin/categories">Categories</SubNavLink>
                    <SubNavLink href="/dashboard/admin/sub-categories">Sub-Categories</SubNavLink>
                </div>
            )}
            <NavLink href="/dashboard/admin/activity-logs" iconClass="fas fa-history">
                Activity Logs
            </NavLink>
            <NavLink href="/dashboard/admin/payment-methods" iconClass="fas fa-credit-card">
                Payment Methods
            </NavLink>
            <NavLink href="/dashboard/admin/delivery-methods" iconClass="fas fa-truck">
                Delivery Methods
            </NavLink>
            <NavLink href="/dashboard/admin/zones" iconClass="fas fa-map-marked-alt">
                Zones
            </NavLink>
        </>
    )
}

function VendorNav() {
    return (
        <>
            <NavLink href="/dashboard/vendor" iconClass="fas fa-tachometer-alt">
                Dashboard
            </NavLink>
            <NavLink href="/dashboard/vendor/store" iconClass="fas fa-store">
                Store Management
            </NavLink>
            <NavLink href="/dashboard/vendor/products" iconClass="fas fa-box">
                Products
            </NavLink>
            <NavLink href="/dashboard/vendor/product-images" iconClass="fas fa-images">
                Product Images
            </NavLink>
            <NavLink href="/dashboard/vendor/inventory" iconClass="fas fa-warehouse">
                Inventory
            </NavLink>
            <NavLink href="/dashboard/vendor/orders" iconClass="fas fa-shopping-bag">
                Orders
            </NavLink>
            <NavLink href="/dashboard/vendor/payouts" iconClass="fas fa-money-bill-wave">
                Payouts
            </NavLink>
            <NavLink href="/dashboard/vendor/promotions" iconClass="fas fa-tags">
                Promotions
            </NavLink>
        </>
    )
}

function VeterinarianNav() {
    return (
        <NavLink href="/dashboard/veterinarian" iconClass="fas fa-tachometer-alt">
            Dashboard
        </NavLink>
    )
}

export default function KlasmeytDashboardLayout({
    children,
    auth,
    title = 'Dashboard',
    headerActions = null,
    /** When set, replaces the default title bar (e.g. Super Admin + template DashboardHeader). */
    renderHeader = null,
}) {
    const { post } = useForm()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isLarge, setIsLarge] = useState(false)
    const [productOpen, setProductOpen] = useState(true)
    const [accountOpen, setAccountOpen] = useState(false)
    const accountRef = useRef(null)

    const home = dashboardHomePath(auth?.user?.user_type)

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        const sync = () => {
            setIsLarge(mq.matches)
        }
        sync()
        const onChange = () => {
            sync()
            if (!mq.matches) {
                setSidebarOpen(false)
            }
        }
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    const toggleSidebar = () => setSidebarOpen((o) => !o)

    useEffect(() => {
        const close = (e) => {
            if (accountRef.current && !accountRef.current.contains(e.target)) {
                setAccountOpen(false)
            }
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const handleLogout = (e) => {
        e.preventDefault()
        post('/logout')
    }

    const userType = auth?.user?.user_type

    return (
        <>
            <Head title={title} />
            <div className="klasmeyt-landing min-h-screen bg-[#F8F9FB]">
                {sidebarOpen && !isLarge && (
                    <button
                        type="button"
                        className="fixed inset-0 z-30 bg-[#102059]/40"
                        aria-label="Close menu"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <aside
                    className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#1a2d6e] bg-[#102059] shadow-xl transition-transform duration-200 ease-out ${
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                    style={{ backgroundColor: 'black'}}
                >
                    <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
                        <Link className="flex min-w-0 shrink-0 items-center">
                            <img
                                src={primaryLogo}
                                alt="Klasmeyt"
                                className="h-12 w-auto max-w-[min(100%,15rem)] object-contain object-left" style={{height: '90px'}}
                            />
                        </Link>
                        <button
                            type="button"
                            className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                            onClick={() => setSidebarOpen(false)}
                            aria-label="Close sidebar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-4">
                        <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-white/40">
                            Menu
                        </p>
                        <nav className="flex flex-col gap-0.5">
                            {userType === 'super_admin' && (
                                <SuperAdminNav productOpen={productOpen} setProductOpen={setProductOpen} />
                            )}
                            {userType === 'admin' && (
                                <AdminNav productOpen={productOpen} setProductOpen={setProductOpen} />
                            )}
                            {userType === 'vendor' && <VendorNav />}
                            {userType === 'veterinarian' && <VeterinarianNav />}
                            {!['super_admin', 'admin', 'vendor', 'veterinarian'].includes(userType) && (
                                <NavLink href={home} iconClass="fas fa-tachometer-alt">
                                    Dashboard
                                </NavLink>
                            )}
                        </nav>
                    </div>

                    <div className="border-t border-white/10 p-3" ref={accountRef}>
                        <button
                            type="button"
                            onClick={() => setAccountOpen(!accountOpen)}
                            className="flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/10"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E20E28]/90 text-sm font-semibold text-white">
                                {(auth.user.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{auth.user.name}</div>
                                <div className="truncate text-xs text-white/50">{auth.user.email}</div>
                            </div>
                            <i className={`fas fa-chevron-${accountOpen ? 'up' : 'down'} text-xs text-white/40`} />
                        </button>
                        {accountOpen && (
                            <div className="mt-2 space-y-0.5 rounded-lg border border-white/10 bg-[#0d1a4a] p-2">
                                <Link
                                    href="/profile"
                                    className="block rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                                >
                                    Profile
                                </Link>
                                <Link
                                    href="/settings"
                                    className="block rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                                >
                                    Settings
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full rounded-md px-3 py-2 text-left text-sm text-[#fca5a5] hover:bg-white/10"
                                >
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </aside>

                <div
                    className={`transition-[padding] duration-200 ease-out ${
                        sidebarOpen && isLarge ? 'lg:pl-72' : 'lg:pl-0'
                    }`}
                >
                    {typeof renderHeader === 'function' ? (
                        renderHeader({
                            toggleSidebar,
                            sidebarOpen,
                            isLarge,
                            auth,
                        })
                    ) : (
                        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[#E5E7EB] bg-white/90 px-4 backdrop-blur-md sm:gap-4 sm:px-6">
                            <button
                                type="button"
                                className="rounded-lg border border-[#E5E7EB] p-2 text-[#6B7280] hover:bg-[#F9FAFB]"
                                onClick={toggleSidebar}
                                aria-expanded={sidebarOpen}
                                aria-label="Toggle sidebar"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h1 className="truncate text-lg font-semibold text-[#102059] sm:text-xl">
                                    {title}
                                </h1>
                            </div>
                            {headerActions}
                            <Link
                                href="/"
                                className="hidden shrink-0 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#102059] sm:inline"
                            >
                                Back to site
                            </Link>
                        </header>
                    )}

                    <main className="relative z-10 w-full min-w-0 px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-10 xl:px-14">
                        {children}
                    </main>
                </div>
            </div>
        </>
    )
}
