import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useForm, usePage } from '@inertiajs/react'
import { Bell, ChevronDown, LogOut, Settings } from 'lucide-react'
import primaryLogo from '../../../../Logo/Primary Logo.png'

/**
 * Klasmeyt template: Create Klasmeyt Landing Page (Template) (Copy)/src/app/components/shared/DashboardHeader.tsx
 * Navigation uses Inertia Link + hrefs instead of tab state.
 */

function pathMatchesItem(normalized, item) {
    if (item.matchPaths?.length) {
        return item.matchPaths.some(
            (p) => normalized === p || normalized.startsWith(`${p}/`),
        )
    }
    return normalized === item.href || normalized.startsWith(`${item.href}/`)
}

export function getActiveNavId(pathname, items) {
    const normalized = pathname.split('?')[0]
    const matches = items.filter((i) => pathMatchesItem(normalized, i))
    if (!matches.length) {
        return items[0]?.id ?? 'dashboard'
    }
    const rank = (i) => Math.max(i.href.length, ...(i.matchPaths ?? []).map((p) => p.length))
    return matches.reduce((a, b) => (rank(a) >= rank(b) ? a : b)).id
}

function initialsFromName(name) {
    if (!name || typeof name !== 'string') {
        return '?'
    }
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function DashboardHeader({
    menuToggle = null,
    /** Shown next to the menu toggle when the sidebar is open (e.g. desktop collapse control). */
    sidebarHideToggle = null,
    navigationItems,
    notificationCount = 0,
    userName,
    userEmail,
    userInitials,
}) {
    const { url } = usePage()
    const { post } = useForm()
    const [showUserDropdown, setShowUserDropdown] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const activeNavItemRef = useRef(null)

    const activeTab = useMemo(
        () => getActiveNavId(url, navigationItems),
        [url, navigationItems],
    )

    useEffect(() => {
        // When the header nav overflows, ensure the active pill stays visible.
        if (activeNavItemRef.current?.scrollIntoView) {
            activeNavItemRef.current.scrollIntoView({
                block: 'nearest',
                inline: 'center',
                behavior: 'smooth',
            })
        }
    }, [activeTab])

    const initials = userInitials ?? initialsFromName(userName)

    const handleLogout = (e) => {
        e.preventDefault()
        setShowUserDropdown(false)
        post('/logout')
    }

    return (
        <header className="relative sticky top-0 z-30 border-b border-[#E5E7EB] bg-white">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                <div className="flex min-w-0 flex-shrink-0 items-center gap-2">
                    {menuToggle}
                    <Link href="/" className="flex min-w-0 items-center">
                        <img
                            src={primaryLogo}
                            alt="Klasmeyt"
                            className="h-12 w-auto max-w-[min(100%,15rem)] object-contain object-left sm:h-14 sm:max-w-[min(100%,18rem)]"
                        />
                    </Link>
                </div>

                <nav className="absolute left-1/2 hidden w-[min(980px,calc(100vw-20rem))] -translate-x-1/2 md:flex" style={{ paddingLeft: '0px', paddingRight: '0px' }}>
                    <div className="flex w-full items-center gap-0.5 overflow-x-auto rounded-full bg-white/90 p-0.5 backdrop-blur-sm">
                        {navigationItems.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                ref={activeTab === item.id ? activeNavItemRef : null}
                                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                    activeTab === item.id
                                        ? 'bg-[#244693] text-white'
                                        : 'bg-transparent text-[#4B5563] hover:text-[#102059]'
                                }`}
                                style={{ fontFamily: 'Inter Condensed, sans-serif', backgroundColor: activeTab === item.id ? '#244693' : 'transparent', color: activeTab === item.id ? 'white' : '#4B5563' }}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </nav>

                <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                    {/* <Link
                        href="/"
                        className="hidden shrink-0 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#102059] sm:inline"
                    >
                        Back to site
                    </Link> */}
                    <button
                        type="button"
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative rounded-lg p-2 text-[#6B7280] transition-colors hover:bg-[#F3F4F6]"
                        aria-label="Notifications"
                    >
                        <Bell className="h-5 w-5" />
                        {notificationCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E20E28] text-xs font-bold text-white">
                                {notificationCount > 9 ? '9+' : notificationCount}
                            </span>
                        )}
                    </button>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                            className="flex items-center gap-2 rounded-lg p-1.5 pr-2 transition-colors hover:bg-[#F3F4F6] sm:pr-3"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#102059] text-sm font-bold text-white">
                                {initials}
                            </div>
                            <div className="hidden flex-col items-start lg:flex">
                                <p
                                    className="text-sm font-bold text-[#1F2937]"
                                    style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                >
                                    {userName}
                                </p>
                                <p
                                    className="text-xs text-[#6B7280]"
                                    style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                >
                                    {userEmail}
                                </p>
                            </div>
                            <ChevronDown className="hidden h-4 w-4 text-[#6B7280] lg:block" />
                        </button>

                        {showUserDropdown && (
                            <>
                                <button
                                    type="button"
                                    className="fixed inset-0 z-10 cursor-default bg-transparent"
                                    aria-label="Close menu"
                                    onClick={() => setShowUserDropdown(false)}
                                />
                                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                                    <Link
                                        href="/settings"
                                        onClick={() => setShowUserDropdown(false)}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[#1F2937] transition-colors hover:bg-[#F3F4F6]"
                                        style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                    >
                                        <Settings className="h-4 w-4 text-[#6B7280]" />
                                        Security Settings
                                    </Link>
                                    <div className="border-t border-[#E5E7EB]" />
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                                        style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showNotifications && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-10 cursor-default bg-transparent"
                        aria-label="Close notifications"
                        onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-4 top-14 z-20 w-80 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-lg sm:right-6 sm:top-16">
                        <div className="border-b border-[#E5E7EB] p-4">
                            <h3
                                className="text-sm font-bold uppercase tracking-wide text-[#102059]"
                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                            >
                                Notifications
                            </h3>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notificationCount > 0 ? (
                                <div className="divide-y divide-[#E5E7EB]">
                                    {Array.from({ length: Math.min(notificationCount, 10) }).map((_, index) => (
                                        <div key={index} className="p-4 transition-colors hover:bg-[#F9FAFB]">
                                            <p className="mb-1 text-sm font-semibold text-[#102059]">
                                                New activity {index + 1}
                                            </p>
                                            <p className="text-xs text-[#6B7280]">
                                                {index === 0 ? 'Just now' : `${index * 5} mins ago`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <p className="text-sm text-[#6B7280]">No new notifications</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </header>
    )
}

/** Matches SuperAdminDashboard.tsx navigationItems, wired to Laravel routes. */
export const SUPER_ADMIN_HEADER_NAV = [
    { label: 'Dashboard', id: 'dashboard', href: '/dashboard/super-admin' },
    { label: 'Accounts', id: 'accounts', href: '/dashboard/super-admin/users' },
    { label: 'Agrivets', id: 'agrivets', href: '/dashboard/super-admin/agrivets' },
    {
        label: 'Products',
        id: 'products',
        href: '/dashboard/super-admin/categories',
        matchPaths: ['/dashboard/super-admin/categories', '/dashboard/super-admin/sub-categories'],
    },
    {
        label: 'Activity Logs',
        id: 'activity-logs',
        href: '/dashboard/super-admin/activity-logs',
    },
    {
        label: 'Payment Methods',
        id: 'payment-methods',
        href: '/dashboard/super-admin/payment-methods',
    },
    {
        label: 'Delivery Methods',
        id: 'delivery-methods',
        href: '/dashboard/super-admin/delivery-methods',
    },
    {
        label: 'Zones',
        id: 'zones',
        href: '/dashboard/super-admin/zones',
    },
]
