import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import {
    Camera,
    CheckCheck,
    ChevronLeft,
    Download,
    Film,
    Image as ImageIcon,
    Plus,
    SendHorizontal,
    ShoppingBag,
    User,
} from 'lucide-react'
import VendorKlasmeytLayout from '../../Layouts/VendorKlasmeytLayout'

const ATTACHMENT_OPTIONS = [
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'products', label: 'Products', icon: ShoppingBag },
]

function MessageMeta({ message }) {
    if (message.side === 'outgoing') {
        return (
            <div className="mb-1 flex items-center justify-end gap-1 text-[11px] text-[#9CA3AF]">
                <span>
                    {message.time} • Sent by {message.sent_by || 'Staff'}
                </span>
                <CheckCheck className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={2.5} />
            </div>
        )
    }

    return (
        <div className="mb-1 text-[11px] text-[#9CA3AF]">{message.time}</div>
    )
}

function ImagePlaceholders() {
    return (
        <div className="grid h-40 grid-cols-2 gap-1.5 overflow-hidden rounded-lg">
            <div className="row-span-2 bg-[#D1D5DB]" />
            <div className="bg-[#D1D5DB]" />
            <div className="bg-[#D1D5DB]" />
        </div>
    )
}

function FileAttachment({ message }) {
    return (
        <div className="w-full max-w-[260px] overflow-hidden rounded-xl">
            <div className="flex items-center gap-3 bg-[#5B7CBA] px-3 py-3 text-white">
                <Film className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {message.file_name}
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <Download className="h-3.5 w-3.5" />
                </span>
            </div>
            <div className="flex items-center justify-between bg-[#BFDBFE] px-3 py-2 text-xs text-[#1F2937]">
                <span>{message.file_label || 'Document File'}</span>
                <span className="text-[#6B7280]">{message.file_size}</span>
            </div>
        </div>
    )
}

function ChatBubble({ message }) {
    const isOutgoing = message.side === 'outgoing'
    const bubbleTone = isOutgoing
        ? 'bg-[#BFDBFE] text-[#1F2937]'
        : 'bg-[#E5E7EB] text-[#1F2937]'

    return (
        <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[70%] ${isOutgoing ? 'text-right' : 'text-left'}`}>
                <MessageMeta message={message} />

                {message.type === 'file' ? (
                    <div className={isOutgoing ? 'ml-auto' : ''}>
                        <FileAttachment message={message} />
                    </div>
                ) : (
                    <div
                        className={`rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed ${bubbleTone} ${
                            isOutgoing ? 'rounded-br-md' : 'rounded-bl-md'
                        }`}
                    >
                        {message.type === 'images' && (
                            <div className="mb-2">
                                <ImagePlaceholders />
                            </div>
                        )}
                        <p>{message.type === 'images' ? message.caption : message.body}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function VendorConversation({ auth, conversation, messages = [] }) {
    const [draft, setDraft] = useState('')
    const [attachMenuOpen, setAttachMenuOpen] = useState(false)
    const attachMenuRef = useRef(null)

    useEffect(() => {
        if (!attachMenuOpen) return undefined

        const handlePointerDown = (event) => {
            if (!attachMenuRef.current?.contains(event.target)) {
                setAttachMenuOpen(false)
            }
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setAttachMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [attachMenuOpen])

    const handleSend = (e) => {
        e.preventDefault()
        if (!draft.trim()) return
        setDraft('')
        setAttachMenuOpen(false)
    }

    const handleAttachmentSelect = (optionId) => {
        setAttachMenuOpen(false)
        // Placeholder actions until gallery/camera/product flows are wired up
        void optionId
    }

    return (
        <VendorKlasmeytLayout
            auth={auth}
            title={`Chat — ${conversation.name}`}
            mainClassName="flex w-full flex-col px-0 py-0"
            showContactSupport={false}
        >
            <div className="flex min-h-[calc(100vh-5.5rem)] w-full flex-col bg-[#F3F4F6]">
                <div className="sticky top-[4.5rem] z-20 flex items-center gap-3 border-b border-[#E5E7EB] bg-[#F8F9FB] px-4 py-3 sm:px-6">
                    <button
                        type="button"
                        onClick={() => router.visit('/dashboard/vendor/messages')}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D1D5DB] text-[#4B5563] transition-colors hover:bg-[#9CA3AF] hover:text-white"
                        title="Back to conversations"
                        aria-label="Back to conversations"
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>

                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E5E7EB] text-[#6B7280]">
                            {conversation.avatar_url ? (
                                <img
                                    src={conversation.avatar_url}
                                    alt=""
                                    className="h-full w-full rounded-full object-cover"
                                />
                            ) : (
                                <User className="h-5 w-5" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#1F2937]">
                                {conversation.name}
                            </p>
                            <p className="truncate text-xs text-[#9CA3AF]">
                                {conversation.last_seen}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
                    {messages.map((message) =>
                        message.type === 'date' ? (
                            <div
                                key={message.id}
                                className="py-1 text-center text-sm font-bold text-[#4B5563]"
                            >
                                {message.label}
                            </div>
                        ) : (
                            <ChatBubble key={message.id} message={message} />
                        ),
                    )}
                </div>

                <div className="sticky bottom-0 border-t border-[#E5E7EB] bg-white px-4 py-3 sm:px-6">
                    <form
                        onSubmit={handleSend}
                        className="relative flex items-center gap-2 rounded-full border border-[#D1D5DB] bg-[#F3F4F6] px-3 py-2"
                    >
                        <div className="relative" ref={attachMenuRef}>
                            {attachMenuOpen && (
                                <div
                                    role="menu"
                                    aria-label="Attachment options"
                                    className="absolute bottom-full left-0 z-30 mb-3 min-w-[160px] rounded-xl bg-white py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                                >
                                    {ATTACHMENT_OPTIONS.map(({ id, label, icon: Icon }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            role="menuitem"
                                            onClick={() => handleAttachmentSelect(id)}
                                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#F9FAFB]"
                                        >
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#5B7CBA] text-[#5B7CBA]">
                                                <Icon className="h-4 w-4" strokeWidth={2} />
                                            </span>
                                            <span className="text-sm font-medium text-[#4B5563]">
                                                {label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setAttachMenuOpen((open) => !open)}
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                                    attachMenuOpen
                                        ? 'bg-[#E5E7EB] text-[#4B5563]'
                                        : 'text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#4B5563]'
                                }`}
                                aria-label="Attach file"
                                aria-expanded={attachMenuOpen}
                                aria-haspopup="menu"
                            >
                                <Plus className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                        </div>
                        <input
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onFocus={() => setAttachMenuOpen(false)}
                            placeholder="Type Here..."
                            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none"
                        />
                        <button
                            type="submit"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#102059] transition-colors hover:bg-[#EFF6FF]"
                            aria-label="Send message"
                        >
                            <SendHorizontal className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
        </VendorKlasmeytLayout>
    )
}
