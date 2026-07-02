import { useState, useEffect } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import { useDashboardSession } from '../../hooks/useDashboardSession'
import {
    ArrowLeft,
    Search,
    Filter,
    ChevronDown,
    Clock,
    CheckCircle2,
    Loader2,
    XCircle,
    MessageSquare,
    Paperclip,
    RefreshCw,
    Send,
    ShieldCheck,
    User,
    ShieldAlert,
    X,
    Store,
    Calendar,
    Tag,
    MoveRight,
    CheckCheck,
    TriangleAlert,
    Eye,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPT_DEADLINE_MS = 5 * 60 * 1000

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

const CONFIRM_COPY = {
    accept: {
        title: 'Accept this ticket?',
        body: 'The ticket will move to Awaiting Review and you will begin the review process.',
        label: 'Accept Ticket',
        cls: 'bg-[#244693] hover:bg-[#1e3a7a]',
        iconBg: 'bg-[#EFF6FF]',
        Icon: CheckCheck,
        iconColor: 'text-[#244693]',
    },
    'send-info': {
        title: 'Send information request?',
        body: 'Your message will be sent to the vendor and the ticket will move to Info Requested.',
        label: 'Send & Move',
        cls: 'bg-[#244693] hover:bg-[#1e3a7a]',
        iconBg: 'bg-[#EFF6FF]',
        Icon: MessageSquare,
        iconColor: 'text-[#244693]',
    },
    'move-progress': {
        title: 'Move to In Progress?',
        body: 'This signals to the vendor that you are actively working on their issue.',
        label: 'Move to In Progress',
        cls: 'bg-purple-600 hover:bg-purple-700',
        iconBg: 'bg-purple-50',
        Icon: MoveRight,
        iconColor: 'text-purple-600',
    },
    'back-info': {
        title: 'Request additional info?',
        body: 'Your message will be sent to the vendor and the ticket will move back to Info Requested.',
        label: 'Send Request',
        cls: 'bg-purple-600 hover:bg-purple-700',
        iconBg: 'bg-purple-50',
        Icon: MessageSquare,
        iconColor: 'text-purple-600',
    },
    resolve: {
        title: 'Mark ticket as Resolved?',
        body: 'Your resolution message will be sent to the vendor, who will then confirm or reopen the ticket.',
        label: 'Send Resolution',
        cls: 'bg-green-600 hover:bg-green-700',
        iconBg: 'bg-green-50',
        Icon: CheckCircle2,
        iconColor: 'text-green-600',
    },
}

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

function useTickTimer(createdAt, active) {
    const [elapsed, setElapsed] = useState(Date.now() - parseDate(createdAt).getTime())
    useEffect(() => {
        if (!active) return
        const id = setInterval(() => setElapsed(Date.now() - parseDate(createdAt).getTime()), 1000)
        return () => clearInterval(id)
    }, [createdAt, active])
    const remaining = ACCEPT_DEADLINE_MS - elapsed
    const overdue = remaining <= 0
    const mins = overdue ? 0 : Math.floor(remaining / 60000)
    const secs = overdue ? 0 : Math.floor((remaining % 60000) / 1000)
    return { overdue, mins, secs }
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

// ─── Open Ticket Timer ────────────────────────────────────────────────────────

function OpenTicketTimer({ createdAt }) {
    const { overdue, mins, secs } = useTickTimer(createdAt, true)
    return (
        <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                overdue ? 'bg-red-100 text-red-700 animate-pulse' : mins < 2 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-50 text-yellow-700'
            }`}
            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
        >
            <Clock className="w-3.5 h-3.5" />
            {overdue ? 'Overdue — accept now' : `Accept within ${mins}:${String(secs).padStart(2, '0')}`}
        </div>
    )
}

// ─── Thread Bubble ────────────────────────────────────────────────────────────

function AdminThreadBubble({ msg }) {
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? 'bg-[#102059]' : 'bg-[#E5E7EB]'}`}>
                {isAdmin ? <ShieldCheck className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-[#6B7280]" />}
            </div>
            <div className={`max-w-[80%] ${isAdmin ? 'items-end flex flex-col' : ''}`}>
                <div className={`flex items-center gap-2 mb-1 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-xs font-semibold ${isAdmin ? 'text-[#102059]' : 'text-[#4B5563]'}`} style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
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
                <div className={`rounded-xl px-4 py-3 text-sm ${
                    isAdmin
                        ? isResolution ? 'bg-green-600 text-white' : 'bg-[#102059] text-white'
                        : isReopened
                        ? 'bg-orange-50 border border-orange-200 text-orange-800'
                        : 'bg-white border border-[#E5E7EB] text-[#1F2937]'
                }`} style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
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

// ─── Ticket Row ───────────────────────────────────────────────────────────────

function AdminTicketRow({ ticket, onOpen }) {
    const isOpen = ticket.status === 'Open'
    const { overdue } = useTickTimer(ticket.createdAt, isOpen)

    return (
        <button
            onClick={onOpen}
            className={`w-full text-left bg-white border rounded-xl flex items-start gap-4 hover:border-[#244693] transition-all group ${
                isOpen ? overdue ? 'border-red-300 bg-red-50/40' : 'border-blue-200 bg-blue-50/20' : 'border-[#E5E7EB]'
            }`}
            style={{ marginBottom:'20px', borderRadius: '20px' , padding: '25px'}}
        >
            <div className="w-10 h-10 rounded-full bg-[#102059] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {ticket.senderAvatar}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-[#244693]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.id}</span>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-xs font-medium" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.category}</span>
                    {ticket.reopenCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-orange-600" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                            <RefreshCw className="w-3 h-3" />×{ticket.reopenCount}
                        </span>
                    )}
                    {isOpen && <OpenTicketTimer createdAt={ticket.createdAt} />}
                </div>
                <p className="text-sm font-semibold text-[#1F2937] truncate mb-0.5" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.title}</p>
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

// ─── Confirmation Dialog ──────────────────────────────────────────────────────

function ConfirmDialog({ config, onConfirm, onCancel, processing }) {
    const c = CONFIRM_COPY[config.type]
    if (!c) return null
    const { Icon } = c
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl border border-[#E5E7EB] p-6 w-full max-w-sm shadow-xl">
                <div className={`w-12 h-12 ${c.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`w-6 h-6 ${c.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-[#102059] text-center mb-2" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{c.title}</h3>
                <p className="text-sm text-[#6B7280] text-center mb-6">{c.body}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} disabled={processing} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Cancel</button>
                    <button onClick={onConfirm} disabled={processing} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 ${c.cls}`} style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                        {processing ? 'Saving…' : c.label}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Ticket Detail ────────────────────────────────────────────────────────────

function AdminTicketDetail({ ticket, replyText, setReplyText, replyError, setReplyError, replyMode, setReplyMode, resolveText, setResolveText, resolveError, setResolveError, processing, onAccept, onSendInfo, onMoveProgress, onBackToInfo, onResolve }) {
    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#244693]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.id}</span>
                            <span className="inline-block px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-xs font-medium" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.category}</span>
                            {ticket.reopenCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    <RefreshCw className="w-3 h-3" />Reopened ×{ticket.reopenCount}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-[#102059] mb-3" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{ticket.title}</h2>
                        <div className="flex flex-wrap gap-4 text-xs text-[#6B7280]">
                            <span className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-[#102059] flex items-center justify-center text-white text-[10px] font-bold">{ticket.senderAvatar}</div>
                                <span className="font-medium text-[#1F2937]">{ticket.senderName}</span>
                            </span>
                            <span className="flex items-center gap-1"><Store className="w-3.5 h-3.5" />{ticket.storeName}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Submitted {formatDateTime(ticket.createdAt)}</span>
                            {ticket.evidenceCount > 0 && (
                                <span className="flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" />{ticket.evidenceCount} attachment{ticket.evidenceCount > 1 ? 's' : ''}</span>
                            )}
                        </div>
                    </div>
                    <StatusBadge status={ticket.status} />
                </div>

                {ticket.status === 'Open' && (
                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#F3F4F6]">
                        <OpenTicketTimer createdAt={ticket.createdAt} />
                        <button
                            onClick={onAccept}
                            disabled={processing}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#244693] text-white hover:bg-[#1e3a7a] transition-colors disabled:opacity-60"
                            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                        >
                            <CheckCheck className="w-4 h-4" />Accept Ticket
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {ticket.thread.length > 0
                    ? ticket.thread.map((msg) => <AdminThreadBubble key={msg.id} msg={msg} />)
                    : <p className="text-xs text-[#9CA3AF] text-center py-4">No messages yet.</p>
                }
            </div>

            {ticket.status === 'Awaiting Review' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                    <p className="text-sm font-bold text-yellow-800 mb-1" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Awaiting Review</p>
                    <p className="text-xs text-yellow-700 mb-4">Review the vendor's ticket and choose your next action.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => { setReplyMode('info'); setReplyError('') }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all ${replyMode === 'info' ? 'bg-[#244693] text-white border-[#244693]' : 'bg-white text-[#244693] border-[#244693] hover:bg-[#EFF6FF]'}`}
                            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                        >
                            <MessageSquare className="w-4 h-4" />Ask for More Info
                        </button>
                        <button
                            onClick={onMoveProgress}
                            disabled={processing}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
                            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                        >
                            <MoveRight className="w-4 h-4" />Move to In Progress
                        </button>
                    </div>
                    {replyMode === 'info' && (
                        <div className="mt-4 space-y-2">
                            <label className="block text-sm font-semibold text-[#1F2937]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Your question / request</label>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                                placeholder="Ask the vendor for specific information needed to proceed..."
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#244693]/30 focus:border-[#244693] resize-none transition-colors bg-white ${replyError ? 'border-[#E20E28]' : 'border-[#E5E7EB]'}`}
                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                            />
                            {replyError && <p className="text-xs text-[#E20E28]">{replyError}</p>}
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setReplyMode(null); setReplyText('') }} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Cancel</button>
                                <button onClick={onSendInfo} disabled={processing} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#244693] text-white hover:bg-[#1e3a7a] transition-colors disabled:opacity-60" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    <Send className="w-3.5 h-3.5" />{processing ? 'Sending…' : 'Send & Request Info'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {ticket.status === 'Info Requested' && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="w-4 h-4 text-orange-600" />
                        <p className="text-sm font-bold text-orange-700" style={{ fontFamily: 'Inter Condensed, sans-serif', marginBottom: '0px' }}>Waiting for vendor's response</p>
                    </div>
                    <p className="text-xs text-orange-600 mb-4">The vendor has been asked for additional information. You can send a follow-up while waiting.</p>
                    <button
                        onClick={() => { setReplyMode('info'); setReplyError('') }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${replyMode === 'info' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-100'}`}
                        style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                    >
                        <MessageSquare className="w-4 h-4" />Send Follow-up
                    </button>
                    {replyMode === 'info' && (
                        <div className="mt-4 space-y-2">
                            <label className="block text-sm font-semibold text-[#1F2937]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Follow-up message</label>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                                placeholder="Send an additional question or clarification..."
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 resize-none transition-colors bg-white ${replyError ? 'border-[#E20E28]' : 'border-[#E5E7EB]'}`}
                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                            />
                            {replyError && <p className="text-xs text-[#E20E28]">{replyError}</p>}
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setReplyMode(null); setReplyText('') }} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Cancel</button>
                                <button onClick={onSendInfo} disabled={processing} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-60" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    <Send className="w-3.5 h-3.5" />{processing ? 'Sending…' : 'Send Follow-up'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {ticket.status === 'In Progress' && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-4 h-4 text-purple-600" />
                        <p className="text-sm font-bold text-purple-700" style={{ fontFamily: 'Inter Condensed, sans-serif', marginBottom: '0px' }}>Ticket In Progress</p>
                    </div>
                    <p className="text-xs text-purple-600 mb-4">You are actively working on this issue. Request more info or mark as resolved once a solution is found.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => { setReplyMode('info'); setReplyError(''); setResolveError('') }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all ${replyMode === 'info' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'}`}
                            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                        >
                            <MessageSquare className="w-4 h-4" />Request More Info
                        </button>
                        <button
                            onClick={() => { setReplyMode('resolve'); setReplyError(''); setResolveError('') }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all ${replyMode === 'resolve' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
                            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                        >
                            <CheckCircle2 className="w-4 h-4" />Mark as Resolved
                        </button>
                    </div>
                    {replyMode === 'info' && (
                        <div className="mt-4 space-y-2">
                            <label className="block text-sm font-semibold text-[#1F2937]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>What additional info do you need?</label>
                            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} placeholder="Describe what information is still needed..."
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-purple-300 resize-none transition-colors bg-white ${replyError ? 'border-[#E20E28]' : 'border-[#E5E7EB]'}`}
                                style={{ fontFamily: 'Inter Condensed, sans-serif' }} />
                            {replyError && <p className="text-xs text-[#E20E28]">{replyError}</p>}
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setReplyMode(null); setReplyText('') }} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Cancel</button>
                                <button onClick={onBackToInfo} disabled={processing} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-60" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    <Send className="w-3.5 h-3.5" />{processing ? 'Sending…' : 'Send & Move to Info Requested'}
                                </button>
                            </div>
                        </div>
                    )}
                    {replyMode === 'resolve' && (
                        <div className="mt-4 space-y-2">
                            <label className="block text-sm font-semibold text-[#1F2937]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Resolution message <span className="text-[#E20E28]">*</span></label>
                            <textarea value={resolveText} onChange={(e) => setResolveText(e.target.value)} rows={4} placeholder="Describe the solution or action taken to resolve this issue..."
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-green-300 resize-none transition-colors bg-white ${resolveError ? 'border-[#E20E28]' : 'border-[#E5E7EB]'}`}
                                style={{ fontFamily: 'Inter Condensed, sans-serif' }} />
                            {resolveError && <p className="text-xs text-[#E20E28]">{resolveError}</p>}
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setReplyMode(null); setResolveText('') }} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Cancel</button>
                                <button onClick={onResolve} disabled={processing} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    <CheckCircle2 className="w-3.5 h-3.5" />{processing ? 'Sending…' : 'Send Resolution'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {ticket.status === 'Resolved' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-green-700 mb-0.5" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Resolution sent — awaiting vendor confirmation</p>
                        <p className="text-xs text-green-600">The vendor will review your resolution and either accept it or reopen the ticket if the issue persists.</p>
                    </div>
                </div>
            )}

            {ticket.status === 'Closed' && (
                <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-gray-700 mb-0.5" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Ticket Closed</p>
                        <p className="text-xs text-gray-500">This ticket has been resolved and accepted by the vendor. No further action required.</p>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Ticket ID extractor ──────────────────────────────────────────────────────

function numericId(ticketId) {
    // "TKT-0012" → 12
    return parseInt(ticketId.replace(/\D/g, ''), 10)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminSupport({ tickets = [] }) {
    useDashboardSession()

    const { props } = usePage()

    const [view, setView] = useState('list')
    const [selectedId, setSelectedId] = useState(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [categoryFilter, setCategoryFilter] = useState('All')
    const [sortOrder, setSortOrder] = useState('newest')
    const [showStatusDD, setShowStatusDD] = useState(false)
    const [showCategoryDD, setShowCategoryDD] = useState(false)
    const [showSortDD, setShowSortDD] = useState(false)

    const [replyText, setReplyText] = useState('')
    const [replyError, setReplyError] = useState('')
    const [replyMode, setReplyMode] = useState(null)
    const [resolveText, setResolveText] = useState('')
    const [resolveError, setResolveError] = useState('')
    const [confirm, setConfirm] = useState(null)
    const [processing, setProcessing] = useState(false)
    const [successMsg, setSuccessMsg] = useState(null)

    // Keep selectedTicket in sync with fresh Inertia props after server round-trips.
    const selectedTicket = selectedId !== null
        ? (tickets.find((t) => t.id === selectedId) ?? null)
        : null

    // Show flash success from server.
    useEffect(() => {
        if (props.flash?.success) {
            setSuccessMsg(props.flash.success)
        }
    }, [props.flash?.success])

    const filteredTickets = tickets
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

    function resetCompose() {
        setReplyText(''); setReplyError(''); setReplyMode(null)
        setResolveText(''); setResolveError('')
    }

    function handleConfirm() {
        if (!confirm || !selectedTicket) return
        const id = numericId(selectedTicket.id)
        setProcessing(true)

        if (confirm.type === 'accept') {
            router.patch(`/dashboard/admin/support/${id}/accept`, {}, {
                preserveScroll: true,
                onSuccess: () => { setConfirm(null); setSuccessMsg('Ticket accepted. Now under Awaiting Review.') },
                onFinish: () => setProcessing(false),
            })
            return
        }

        if (confirm.type === 'move-progress') {
            router.patch(`/dashboard/admin/support/${id}/progress`, {}, {
                preserveScroll: true,
                onSuccess: () => { setConfirm(null); setSuccessMsg('Ticket is now In Progress.') },
                onFinish: () => setProcessing(false),
            })
            return
        }

        const messageType = confirm.type === 'resolve' ? 'resolve'
            : confirm.type === 'back-info' ? 'follow-up'
            : 'info'

        router.post(`/dashboard/admin/support/${id}/messages`, {
            body: confirm.payload,
            type: messageType,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setConfirm(null)
                resetCompose()
                setSuccessMsg(
                    confirm.type === 'resolve'
                        ? 'Ticket marked as Resolved. Awaiting vendor confirmation.'
                        : confirm.type === 'back-info'
                        ? 'Additional information requested.'
                        : 'Message sent. Ticket moved to Info Requested.',
                )
            },
            onFinish: () => setProcessing(false),
        })
    }

    const openCount = tickets.filter((t) => t.status === 'Open').length
    const closeDropdowns = () => { setShowStatusDD(false); setShowCategoryDD(false); setShowSortDD(false) }

    return (
        <>
            <Head title="Support Centre" />
            <div className="min-h-screen bg-[#F8F9FB]">
                <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
                    <div className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-4">
                            {view === 'detail' ? (
                                <button
                                    onClick={() => { setView('list'); setSelectedId(null); resetCompose() }}
                                    className="flex items-center gap-2 text-[#6B7280] hover:text-[#102059] transition-colors"
                                    style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="text-sm font-medium">Back to Tickets</span>
                                </button>
                            ) : (
                                <Link
                                    href="/dashboard/admin"
                                    className="flex items-center gap-2 text-[#6B7280] hover:text-[#102059] transition-colors"
                                    style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="text-sm font-medium">Back to Dashboard</span>
                                </Link>
                            )}
                            <div className="w-px h-5 bg-[#E5E7EB]" />
                            <h1 className="text-lg font-bold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                Support Centre
                                {view === 'detail' && selectedTicket && (
                                    <span className="text-[#6B7280] font-normal ml-2">/ {selectedTicket.id}</span>
                                )}
                            </h1>
                        </div>

                        {openCount > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
                                <TriangleAlert className="w-3.5 h-3.5 text-red-600" />
                                <span className="text-xs font-bold text-red-700" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                    {openCount} open ticket{openCount > 1 ? 's' : ''} awaiting acceptance
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                <main className="container mx-auto px-6 py-8 max-w-5xl">
                    {view === 'detail' && selectedTicket && (
                        <AdminTicketDetail
                            ticket={selectedTicket}
                            replyText={replyText} setReplyText={setReplyText}
                            replyError={replyError} setReplyError={setReplyError}
                            replyMode={replyMode} setReplyMode={setReplyMode}
                            resolveText={resolveText} setResolveText={setResolveText}
                            resolveError={resolveError} setResolveError={setResolveError}
                            processing={processing}
                            onAccept={() => setConfirm({ type: 'accept' })}
                            onSendInfo={() => {
                                if (!replyText.trim()) { setReplyError('Please enter a message.'); return }
                                setReplyError('')
                                setConfirm({ type: 'send-info', payload: replyText })
                            }}
                            onMoveProgress={() => setConfirm({ type: 'move-progress' })}
                            onBackToInfo={() => {
                                if (!replyText.trim()) { setReplyError('Please enter your request.'); return }
                                setReplyError('')
                                setConfirm({ type: 'back-info', payload: replyText })
                            }}
                            onResolve={() => {
                                if (!resolveText.trim()) { setResolveError('Please provide a resolution message.'); return }
                                setResolveError('')
                                setConfirm({ type: 'resolve', payload: resolveText })
                            }}
                        />
                    )}

                    {view === 'list' && (
                        <div>
                            <div className="flex items-start justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#102059] mb-1" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>Support Tickets</h2>
                                    <p className="text-sm text-[#6B7280]">Manage and respond to vendor support requests.</p>
                                </div>
                                <div className="flex gap-3">
                                    {['Open', 'Awaiting Review', 'In Progress'].map((s) => {
                                        const cnt = tickets.filter((t) => t.status === s).length
                                        if (!cnt) return null
                                        const cfg = STATUS_CONFIG[s]
                                        return (
                                            <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${cfg.bg}`}>
                                                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                                <span className={`text-xs font-bold ${cfg.text}`} style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{cnt} {s}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

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
                                        <div className="relative flex-1 min-w-[180px]">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search by ticket ID, title, store, or sender..."
                                                className="w-full pl-9 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#244693]/20 focus:border-[#244693] transition-colors"
                                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                            />
                                        </div>

                                        <div className="relative">
                                            <button onClick={() => { closeDropdowns(); setShowStatusDD((v) => !v) }}
                                                className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#4B5563] hover:border-[#244693] hover:text-[#244693] transition-colors bg-white"
                                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                                <Filter className="w-3.5 h-3.5" />Status: {statusFilter}<ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                            {showStatusDD && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowStatusDD(false)} />
                                                    <div className="absolute left-0 mt-1 w-48 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden z-20 shadow-lg">
                                                        {['All', ...ALL_STATUSES].map((s) => (
                                                            <button key={s} onClick={() => { setStatusFilter(s); setShowStatusDD(false) }}
                                                                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${statusFilter === s ? 'bg-[#F0F4FF] text-[#244693] font-semibold' : 'text-[#4B5563] hover:bg-[#F9FAFB]'}`}
                                                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                                                {s !== 'All' && <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.dot}`} />}{s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <button onClick={() => { closeDropdowns(); setShowCategoryDD((v) => !v) }}
                                                className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#4B5563] hover:border-[#244693] hover:text-[#244693] transition-colors bg-white"
                                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                                <Tag className="w-3.5 h-3.5" />Category: {categoryFilter}<ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                            {showCategoryDD && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDD(false)} />
                                                    <div className="absolute left-0 mt-1 w-52 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden z-20 shadow-lg">
                                                        {['All', ...CATEGORIES].map((c) => (
                                                            <button key={c} onClick={() => { setCategoryFilter(c); setShowCategoryDD(false) }}
                                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${categoryFilter === c ? 'bg-[#F0F4FF] text-[#244693] font-semibold' : 'text-[#4B5563] hover:bg-[#F9FAFB]'}`}
                                                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                                                {c}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <button onClick={() => { closeDropdowns(); setShowSortDD((v) => !v) }}
                                                className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#4B5563] hover:border-[#244693] hover:text-[#244693] transition-colors bg-white"
                                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}<ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                            {showSortDD && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowSortDD(false)} />
                                                    <div className="absolute right-0 mt-1 w-40 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden z-20 shadow-lg">
                                                        {['newest', 'oldest'].map((s) => (
                                                            <button key={s} onClick={() => { setSortOrder(s); setShowSortDD(false) }}
                                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortOrder === s ? 'bg-[#F0F4FF] text-[#244693] font-semibold' : 'text-[#4B5563] hover:bg-[#F9FAFB]'}`}
                                                                style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                                                {s === 'newest' ? 'Newest First' : 'Oldest First'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {ALL_STATUSES.map((s) => {
                                            const count = tickets.filter((t) => t.status === s).length
                                            if (!count) return null
                                            const cfg = STATUS_CONFIG[s]
                                            return (
                                                <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusFilter === s ? `${cfg.bg} ${cfg.text} border-current` : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#9CA3AF]'}`}
                                                    style={{ fontFamily: 'Inter Condensed, sans-serif', borderRadius: '20px' }}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{s} ({count})
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {filteredTickets.length === 0 ? (
                                        <div className="bg-white border border-[#E5E7EB] rounded-xl p-16 text-center">
                                            <div className="w-12 h-12 bg-[#F3F4F6] rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Search className="w-6 h-6 text-[#9CA3AF]" />
                                            </div>
                                            <p className="text-sm font-semibold text-[#1F2937] mb-1" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>No tickets match your filters</p>
                                            <p className="text-xs text-[#6B7280]">Try adjusting your search or filters.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredTickets.map((t) => (
                                                <AdminTicketRow key={t.id} ticket={t} onOpen={() => { setSelectedId(t.id); resetCompose(); setView('detail') }} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </main>

                {confirm && (
                    <ConfirmDialog
                        config={confirm}
                        processing={processing}
                        onConfirm={handleConfirm}
                        onCancel={() => !processing && setConfirm(null)}
                    />
                )}

                {successMsg && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                        <div className="flex items-center gap-3 px-5 py-3 bg-[#102059] text-white rounded-xl shadow-xl">
                            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                            <span className="text-sm font-semibold" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>{successMsg}</span>
                            <button onClick={() => setSuccessMsg(null)} className="ml-2 text-white/60 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
