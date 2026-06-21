import { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import { useDashboardSession } from '../../hooks/useDashboardSession'
import {
    ArrowLeft,
    Search,
    Filter,
    ChevronDown,
    CheckCircle2,
    MessageSquare,
    Paperclip,
    RefreshCw,
    ShieldCheck,
    User,
    Users,
    Store,
    Calendar,
    Tag,
    TriangleAlert,
    Eye,
    TrendingUp,
    Activity,
    BadgeCheck,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    Open: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    'Awaiting Review': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    'Info Requested': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
    'In Progress': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    Resolved: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    Closed: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
}

const ALL_STATUSES = ['Open', 'Awaiting Review', 'Info Requested', 'In Progress', 'Resolved', 'Closed']
const CATEGORIES = ['Account', 'Subscription', 'Order Issues', 'Store & Listing', 'Payment Disputes', 'System']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(val) {
    return val instanceof Date ? val : new Date(val)
}

function formatDate(val) {
    return parseDate(val).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(val) {
    return parseDate(val).toLocaleString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
    })
}

function formatDuration(ms) {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`
    return `${(ms / 3600000).toFixed(1)}h`
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Open
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {status}
        </span>
    )
}

// ─── QA Summary Stats ─────────────────────────────────────────────────────────

function QASummaryBar({ tickets }) {
    const total = tickets.length
    const open = tickets.filter((t) => t.status === 'Open').length
    const closed = tickets.filter((t) => t.status === 'Closed').length
    const resolved = tickets.filter((t) => ['Resolved', 'Closed'].includes(t.status)).length
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0
    const overdueOpen = tickets.filter(
        (t) => t.status === 'Open' && Date.now() - parseDate(t.createdAt).getTime() > 5 * 60 * 1000,
    ).length

    const stats = [
        { label: 'Total Tickets', value: total, icon: <Activity className="w-4 h-4 text-[#244693]" />, bg: 'bg-[#EFF6FF]', text: 'text-[#244693]' },
        { label: 'Open / Overdue', value: `${open} / ${overdueOpen}`, icon: <TriangleAlert className="w-4 h-4 text-red-600" />, bg: 'bg-red-50', text: 'text-red-700' },
        { label: 'Resolution Rate', value: `${resolutionRate}%`, icon: <TrendingUp className="w-4 h-4 text-green-600" />, bg: 'bg-green-50', text: 'text-green-700' },
        { label: 'Resolved', value: resolved, icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, bg: 'bg-green-50', text: 'text-green-700' },
        { label: 'Closed', value: closed, icon: <CheckCircle2 className="w-4 h-4 text-gray-500" />, bg: 'bg-gray-100', text: 'text-gray-600' },
    ]

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {stats.map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 flex flex-col gap-2`}>
                    <div className="flex items-center gap-1.5">
                        {s.icon}
                        <span className={`text-xs font-medium ${s.text} opacity-80`} style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                            {s.label}
                        </span>
                    </div>
                    <span className={`text-xl font-bold ${s.text}`} style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                        {s.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

// ─── Admin Handler Performance ────────────────────────────────────────────────

function AdminHandlerBreakdown({ tickets }) {
    const handlerMap = {}

    for (const ticket of tickets) {
        const firstAdminMsg = ticket.thread.find((m) => m.sender === 'admin')
        if (!firstAdminMsg) continue

        const name = firstAdminMsg.senderName
        const responseMs = parseDate(firstAdminMsg.timestamp) - parseDate(ticket.createdAt)

        if (!handlerMap[name]) {
            handlerMap[name] = {
                name,
                avatar: name.split(' ').filter(Boolean).map((p) => p[0].toUpperCase()).slice(0, 2).join(''),
                handled: [],
            }
        }
        handlerMap[name].handled.push({ status: ticket.status, responseMs })
    }

    const handlers = Object.values(handlerMap)
    if (handlers.length === 0) return null

    return (
        <div className="bg-white border border-[#E5E7EB] rounded-xl mb-6" style={{ padding: '20px' }}>
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-[#102059]" />
                <h3 className="text-sm font-bold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif', marginBottom: '0px' }}>
                    Admin Handler Performance
                </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {handlers.map((handler) => {
                    const resolved = handler.handled.filter((t) => ['Resolved', 'Closed'].includes(t.status)).length
                    const rate = Math.round((resolved / handler.handled.length) * 100)
                    const avgMs = handler.handled.reduce((s, t) => s + t.responseMs, 0) / handler.handled.length

                    return (
                        <div key={handler.name} className="flex items-start gap-3 p-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-[#102059] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {handler.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#1F2937] truncate" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    {handler.name}
                                </p>
                                <p className="text-xs text-[#6B7280] mb-2" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Admin</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-xs text-[#4B5563]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                        {handler.handled.length} ticket{handler.handled.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-xs text-green-600 font-semibold" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                        {rate}% resolved
                                    </span>
                                    <span className="text-xs text-purple-600" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                        ~{formatDuration(avgMs)} response
                                    </span>
                                </div>
                                <div className="mt-2 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${rate}%` }} />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Dropdown helpers ─────────────────────────────────────────────────────────

function Dropdown({ label, icon, open, onToggle, onClose, children, alignRight = false }) {
    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#4B5563] hover:border-[#244693] hover:text-[#244693] transition-colors bg-white"
                style={{ fontFamily: 'Inter Condensed, sans-serif' }}
            >
                {icon}{label}<ChevronDown className="w-3.5 h-3.5" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={onClose} />
                    <div className={`absolute mt-1 w-52 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden z-20 shadow-lg ${alignRight ? 'right-0' : 'left-0'}`}>
                        {children}
                    </div>
                </>
            )}
        </div>
    )
}

function DropdownItem({ label, active, dot, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${active ? 'bg-[#F0F4FF] text-[#244693] font-semibold' : 'text-[#4B5563] hover:bg-[#F9FAFB]'}`}
            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
        >
            {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
            {label}
        </button>
    )
}

// ─── QA Thread Bubble ─────────────────────────────────────────────────────────

function QAThreadBubble({ msg }) {
    const isAdmin = msg.sender === 'admin'
    const isResolution = msg.body.startsWith('[Resolution]')
    const isReopened = msg.body.startsWith('[Reopened]')
    const displayBody = isResolution
        ? msg.body.replace('[Resolution] ', '')
        : isReopened
        ? msg.body.replace('[Reopened] ', '')
        : msg.body

    return (
        <div className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? 'bg-[#244693]' : 'bg-[#E5E7EB]'}`}>
                {isAdmin ? <ShieldCheck className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-[#6B7280]" />}
            </div>
            <div className={`max-w-[80%] ${isAdmin ? 'items-end flex flex-col' : ''}`}>
                <div className={`flex items-center gap-2 mb-1 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-xs font-semibold ${isAdmin ? 'text-[#244693]' : 'text-[#4B5563]'}`} style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                        {msg.senderName}
                    </span>
                    <span className="text-xs text-[#9CA3AF]">{formatDateTime(msg.timestamp)}</span>
                    {isResolution && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                            <CheckCircle2 className="w-3 h-3" />Resolution
                        </span>
                    )}
                    {isReopened && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                            <RefreshCw className="w-3 h-3" />Reopened
                        </span>
                    )}
                </div>
                <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                        isAdmin
                            ? isResolution ? 'bg-green-600 text-white' : 'bg-[#244693] text-white'
                            : isReopened
                            ? 'bg-orange-50 border border-orange-200 text-orange-800'
                            : 'bg-white border border-[#E5E7EB] text-[#1F2937]'
                    }`}
                    style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                >
                    {displayBody}
                </div>
                {msg.attachmentCount && msg.attachmentCount > 0 ? (
                    <div className={`flex items-center gap-1 mt-1.5 text-xs text-[#9CA3AF] ${isAdmin ? 'justify-end' : ''}`}>
                        <Paperclip className="w-3 h-3" />
                        {msg.attachmentCount} attachment{msg.attachmentCount > 1 ? 's' : ''}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

// ─── QA Ticket Row ────────────────────────────────────────────────────────────

function QATicketRow({ ticket, onOpen }) {
    const isOpen = ticket.status === 'Open'
    const overdueOpen = isOpen && Date.now() - parseDate(ticket.createdAt).getTime() > 5 * 60 * 1000

    return (
        <button
            onClick={onOpen}
            className={`w-full text-left bg-white border rounded-xl flex items-start gap-4 hover:border-[#244693] transition-all group ${
                overdueOpen ? 'border-red-300 bg-red-50/30' : isOpen ? 'border-blue-200 bg-blue-50/10' : 'border-[#E5E7EB]'
            }`}
            style={{ marginBottom:'20px', borderRadius: '20px' , padding: '25px'}}
        >
            <div className="w-10 h-10 rounded-full bg-[#102059] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {ticket.senderAvatar}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-[#244693]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.id}</span>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-xs font-medium" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                        {ticket.category}
                    </span>
                    {ticket.reopenCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-orange-600" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                            <RefreshCw className="w-3 h-3" />×{ticket.reopenCount}
                        </span>
                    )}
                    {overdueOpen && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold animate-pulse" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                            <TriangleAlert className="w-3 h-3" />Overdue
                        </span>
                    )}
                </div>
                <p className="text-sm font-semibold text-[#1F2937] truncate mb-1" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.title}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{ticket.senderName}</span>
                    <span className="flex items-center gap-1"><Store className="w-3 h-3" />{ticket.storeName}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{ticket.thread.length} message{ticket.thread.length !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(ticket.createdAt)}</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={ticket.status} />
                <Eye className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#244693] transition-colors" />
            </div>
        </button>
    )
}

// ─── QA Ticket Detail (read-only) ─────────────────────────────────────────────

function QATicketDetail({ ticket }) {
    const overdueOpen = ticket.status === 'Open' && Date.now() - parseDate(ticket.createdAt).getTime() > 5 * 60 * 1000

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF3C7] border border-[#D3A218]/30 rounded-xl">
                <BadgeCheck className="w-4 h-4 text-[#D3A218]" />
                <p className="text-xs font-semibold text-[#92400E]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                    You are viewing this ticket in Super Admin QA mode. No actions can be taken from this view.
                </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#244693]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.id}</span>
                            <span className="inline-block px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-xs font-medium" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                {ticket.category}
                            </span>
                            {ticket.reopenCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    <RefreshCw className="w-3 h-3" />Reopened ×{ticket.reopenCount}
                                </span>
                            )}
                            {overdueOpen && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold animate-pulse" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    <TriangleAlert className="w-3 h-3" />Overdue — Not Yet Accepted
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-[#102059] mb-3" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.title}</h2>
                        <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl p-3">
                            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-2" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Submitted By</p>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#6B7280] text-xs font-bold">{ticket.senderAvatar}</div>
                                <span className="text-sm font-semibold text-[#1F2937]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.senderName}</span>
                            </div>
                            <p className="text-xs text-[#6B7280] flex items-center gap-1"><Store className="w-3 h-3" />{ticket.storeName}</p>
                            <p className="text-xs text-[#9CA3AF] mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(ticket.createdAt)}</p>
                            {ticket.evidenceCount > 0 && (
                                <p className="text-xs text-[#9CA3AF] mt-1 flex items-center gap-1"><Paperclip className="w-3 h-3" />{ticket.evidenceCount} attachment{ticket.evidenceCount > 1 ? 's' : ''}</p>
                            )}
                        </div>
                    </div>
                    <StatusBadge status={ticket.status} />
                </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#F3F4F6] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#6B7280]" />
                    <h3 className="text-sm font-bold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Conversation Thread</h3>
                    <span className="ml-auto text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                        {ticket.thread.length} message{ticket.thread.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="p-5 space-y-4">
                    {ticket.thread.length > 0
                        ? ticket.thread.map((msg) => <QAThreadBubble key={msg.id} msg={msg} />)
                        : <p className="text-xs text-[#9CA3AF] text-center py-4">No messages yet.</p>
                    }
                </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                <h3 className="text-sm font-bold text-[#102059] mb-4" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Current Status</h3>
                <div className="flex flex-wrap gap-2">
                    {ALL_STATUSES.map((s, i) => {
                        const currentIdx = ALL_STATUSES.indexOf(ticket.status)
                        const isCurrent = s === ticket.status
                        const isPast = i < currentIdx
                        const cfg = STATUS_CONFIG[s]
                        return (
                            <div key={s} className="flex items-center gap-1">
                                <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                                        isCurrent
                                            ? `${cfg.bg} ${cfg.text} border-current ring-2 ring-current ring-offset-1`
                                            : isPast
                                            ? 'bg-gray-50 text-gray-400 border-gray-200'
                                            : 'bg-white text-gray-300 border-gray-100'
                                    }`}
                                    style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? cfg.dot : isPast ? 'bg-gray-300' : 'bg-gray-200'}`} />
                                    {s}
                                </span>
                                {i < ALL_STATUSES.length - 1 && <span className="text-gray-200 text-xs">›</span>}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuperAdminSupport({ tickets = [] }) {
    useDashboardSession()

    const [view, setView] = useState('list')
    const [selectedTicket, setSelectedTicket] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [categoryFilter, setCategoryFilter] = useState('All')
    const [sortOrder, setSortOrder] = useState('newest')
    const [showStatusDD, setShowStatusDD] = useState(false)
    const [showCategoryDD, setShowCategoryDD] = useState(false)
    const [showSortDD, setShowSortDD] = useState(false)

    const filtered = tickets
        .filter((t) => {
            const matchSearch =
                !searchQuery ||
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.storeName.toLowerCase().includes(searchQuery.toLowerCase())
            const matchStatus = statusFilter === 'All' || t.status === statusFilter
            const matchCat = categoryFilter === 'All' || t.category === categoryFilter
            return matchSearch && matchStatus && matchCat
        })
        .sort((a, b) => {
            if (a.status === 'Open' && b.status !== 'Open') return -1
            if (b.status === 'Open' && a.status !== 'Open') return 1
            const diff = parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime()
            return sortOrder === 'newest' ? diff : -diff
        })

    const closeAll = () => { setShowStatusDD(false); setShowCategoryDD(false); setShowSortDD(false) }

    return (
        <>
            <Head title="Support QA" />
            <div className="min-h-screen bg-[#F8F9FB]">
                <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
                    <div className="flex items-center gap-4 px-6 py-3">
                        {view === 'detail' ? (
                            <button
                                onClick={() => { setView('list'); setSelectedTicket(null) }}
                                className="flex items-center gap-2 text-[#6B7280] hover:text-[#102059] transition-colors"
                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="text-sm font-medium">Back to Tickets</span>
                            </button>
                        ) : (
                            <Link
                                href="/dashboard/super-admin"
                                className="flex items-center gap-2 text-[#6B7280] hover:text-[#102059] transition-colors"
                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="text-sm font-medium">Back to Dashboard</span>
                            </Link>
                        )}
                        <div className="w-px h-5 bg-[#E5E7EB]" />
                        <div className="flex items-center gap-2">
                            <BadgeCheck className="w-4 h-4 text-[#D3A218]" />
                            <h1 className="text-lg font-bold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                Support QA
                                {view === 'detail' && selectedTicket && (
                                    <span className="text-[#6B7280] font-normal ml-2">/ {selectedTicket.id}</span>
                                )}
                            </h1>
                        </div>
                        <span
                            className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D3A218] text-xs font-bold border border-[#D3A218]/20"
                            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                        >
                            Super Admin View — Read Only
                        </span>
                    </div>
                </header>

                <main className="container mx-auto px-6 py-8 max-w-6xl">
                    {view === 'detail' && selectedTicket && <QATicketDetail ticket={selectedTicket} />}

                    {view === 'list' && (
                        <>
                            <div className="flex items-start justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#102059] mb-1" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                        Support Quality Assurance
                                    </h2>
                                    <p className="text-sm text-[#6B7280]">Monitor all support tickets and review resolution quality across the platform.</p>
                                </div>
                            </div>

                            <QASummaryBar tickets={tickets} />
                            <AdminHandlerBreakdown tickets={tickets} />

                            {tickets.length === 0 ? (
                                <div className="bg-white border border-[#E5E7EB] rounded-xl p-16 text-center">
                                    <div className="w-12 h-12 bg-[#F3F4F6] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MessageSquare className="w-6 h-6 text-[#9CA3AF]" />
                                    </div>
                                    <p className="text-sm font-semibold text-[#1F2937] mb-1" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>No support tickets yet</p>
                                    <p className="text-xs text-[#6B7280]">Tickets submitted by vendors will appear here.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
                                        <div className="relative flex-1 min-w-[200px]">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search ticket ID, title, store, or sender..."
                                                className="w-full pl-9 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#244693]/20 focus:border-[#244693] transition-colors"
                                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                            />
                                        </div>

                                        <Dropdown label={`Status: ${statusFilter}`} icon={<Filter className="w-3.5 h-3.5" />} open={showStatusDD}
                                            onToggle={() => { closeAll(); setShowStatusDD((v) => !v) }} onClose={() => setShowStatusDD(false)}>
                                            {['All', ...ALL_STATUSES].map((s) => (
                                                <DropdownItem key={s} label={s} active={statusFilter === s}
                                                    dot={s !== 'All' ? STATUS_CONFIG[s]?.dot : undefined}
                                                    onClick={() => { setStatusFilter(s); setShowStatusDD(false) }} />
                                            ))}
                                        </Dropdown>

                                        <Dropdown label={`Category: ${categoryFilter}`} icon={<Tag className="w-3.5 h-3.5" />} open={showCategoryDD}
                                            onToggle={() => { closeAll(); setShowCategoryDD((v) => !v) }} onClose={() => setShowCategoryDD(false)}>
                                            {['All', ...CATEGORIES].map((c) => (
                                                <DropdownItem key={c} label={c} active={categoryFilter === c}
                                                    onClick={() => { setCategoryFilter(c); setShowCategoryDD(false) }} />
                                            ))}
                                        </Dropdown>

                                        <Dropdown label={sortOrder === 'newest' ? 'Newest First' : 'Oldest First'} open={showSortDD} alignRight
                                            onToggle={() => { closeAll(); setShowSortDD((v) => !v) }} onClose={() => setShowSortDD(false)}>
                                            {['newest', 'oldest'].map((s) => (
                                                <DropdownItem key={s} label={s === 'newest' ? 'Newest First' : 'Oldest First'} active={sortOrder === s}
                                                    onClick={() => { setSortOrder(s); setShowSortDD(false) }} />
                                            ))}
                                        </Dropdown>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {ALL_STATUSES.map((s) => {
                                            const count = tickets.filter((t) => t.status === s).length
                                            if (!count) return null
                                            const cfg = STATUS_CONFIG[s]
                                            return (
                                                <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                                        statusFilter === s ? `${cfg.bg} ${cfg.text} border-current` : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#9CA3AF]'
                                                    }`}
                                                    style={{ fontFamily: 'Inter Condensed, sans-serif', borderRadius: '20px' }}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{s} ({count})
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {filtered.length === 0 ? (
                                        <div className="bg-white border border-[#E5E7EB] rounded-xl p-16 text-center">
                                            <div className="w-12 h-12 bg-[#F3F4F6] rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Search className="w-6 h-6 text-[#9CA3AF]" />
                                            </div>
                                            <p className="text-sm font-semibold text-[#1F2937] mb-1" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>No tickets match your filters</p>
                                            <p className="text-xs text-[#6B7280]">Try adjusting your search or filters.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filtered.map((t) => (
                                                <QATicketRow key={t.id} ticket={t} onOpen={() => { setSelectedTicket(t); setView('detail') }} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </main>
            </div>
        </>
    )
}
