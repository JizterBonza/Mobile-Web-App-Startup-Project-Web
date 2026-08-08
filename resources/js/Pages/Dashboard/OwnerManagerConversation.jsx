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
    X,
} from 'lucide-react'
import OwnerManagerKlasmeytLayout from '../../Layouts/OwnerManagerKlasmeytLayout'
import CameraCaptureModal from '../../Components/CameraCaptureModal'
import ProductListPicker, { ProductMessageCard } from '../../Components/ProductListPicker'
import { useShopConversationMessages } from '../../hooks/useShopConversationMessages'

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

function ImageGrid({ images = [] }) {
    const urls = (images || []).filter(Boolean)

    if (urls.length === 0) {
        return (
            <div className="grid h-40 grid-cols-2 gap-1.5 overflow-hidden rounded-lg">
                <div className="row-span-2 bg-[#D1D5DB]" />
                <div className="bg-[#D1D5DB]" />
                <div className="bg-[#D1D5DB]" />
            </div>
        )
    }

    if (urls.length === 1) {
        return (
            <div className="overflow-hidden rounded-lg">
                <img src={urls[0]} alt="" className="max-h-56 w-full object-cover" />
            </div>
        )
    }

    return (
        <div className="grid h-40 grid-cols-2 gap-1.5 overflow-hidden rounded-lg">
            <div className="row-span-2">
                <img src={urls[0]} alt="" className="h-full w-full object-cover" />
            </div>
            <div>
                <img src={urls[1]} alt="" className="h-full w-full object-cover" />
            </div>
            {urls[2] ? (
                <div>
                    <img src={urls[2]} alt="" className="h-full w-full object-cover" />
                </div>
            ) : (
                <div className="bg-[#D1D5DB]" />
            )}
        </div>
    )
}

function FileAttachment({ message }) {
    const content = (
        <>
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
        </>
    )

    if (message.file_url) {
        return (
            <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full max-w-[260px] overflow-hidden rounded-xl"
            >
                {content}
            </a>
        )
    }

    return (
        <div className="w-full max-w-[260px] overflow-hidden rounded-xl">{content}</div>
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
                ) : message.type === 'product' ? (
                    <div className={isOutgoing ? 'ml-auto inline-block' : 'inline-block'}>
                        <ProductMessageCard
                            product={message.product}
                            tone={isOutgoing ? 'outgoing' : 'incoming'}
                        />
                        {message.body ? (
                            <p
                                className={`mt-1.5 rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed ${bubbleTone} ${
                                    isOutgoing ? 'rounded-br-md' : 'rounded-bl-md'
                                }`}
                            >
                                {message.body}
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <div
                        className={`rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed ${bubbleTone} ${
                            isOutgoing ? 'rounded-br-md' : 'rounded-bl-md'
                        }`}
                    >
                        {message.type === 'images' && (
                            <div className="mb-2">
                                <ImageGrid images={message.images} />
                            </div>
                        )}
                        <p>{message.type === 'images' ? message.caption : message.body}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function OwnerManagerConversation({
    auth,
    shop,
    conversation,
    messages = [],
    sendUrl,
    productsUrl,
}) {
    const [draft, setDraft] = useState('')
    const [pendingAttachments, setPendingAttachments] = useState([])
    const [sending, setSending] = useState(false)
    const [attachMenuOpen, setAttachMenuOpen] = useState(false)
    const [cameraOpen, setCameraOpen] = useState(false)
    const [productPickerOpen, setProductPickerOpen] = useState(false)
    const attachMenuRef = useRef(null)
    const fileInputRef = useRef(null)
    const threadRef = useRef(null)
    const pendingAttachmentsRef = useRef([])
    const liveMessages = useShopConversationMessages(
        conversation?.id,
        messages,
        auth?.user,
    )

    useEffect(() => {
        pendingAttachmentsRef.current = pendingAttachments
    }, [pendingAttachments])

    useEffect(() => {
        if (!threadRef.current) return
        threadRef.current.scrollTop = threadRef.current.scrollHeight
    }, [liveMessages])

    useEffect(() => {
        return () => {
            pendingAttachmentsRef.current.forEach((item) => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
            })
        }
    }, [])

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

    const clearPendingAttachments = () => {
        setPendingAttachments((prev) => {
            prev.forEach((item) => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
            })
            return []
        })
    }

    const removePendingAttachment = (id) => {
        setPendingAttachments((prev) => {
            const target = prev.find((item) => item.id === id)
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
            return prev.filter((item) => item.id !== id)
        })
    }

    const postMessage = (payload) => {
        if (!sendUrl || sending) return

        setSending(true)
        router.post(sendUrl, payload, {
            forceFormData: Boolean(payload.attachments?.length),
            preserveScroll: true,
            onFinish: () => {
                setSending(false)
                setDraft('')
                clearPendingAttachments()
                setAttachMenuOpen(false)
            },
        })
    }

    const handleSend = (e) => {
        e.preventDefault()
        const body = draft.trim()
        const files = pendingAttachments.map((item) => item.file)
        if (!body && files.length === 0) return

        postMessage({
            body,
            ...(files.length > 0 ? { attachments: files } : {}),
        })
    }

    const handleAttachmentSelect = (optionId) => {
        setAttachMenuOpen(false)
        if (optionId === 'gallery') {
            fileInputRef.current?.click()
            return
        }
        if (optionId === 'camera') {
            setCameraOpen(true)
            return
        }
        if (optionId === 'products') {
            setProductPickerOpen(true)
        }
    }

    const appendPendingFiles = (files) => {
        if (!files?.length) return

        const next = files.map((file) => ({
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
            file,
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }))

        setPendingAttachments((prev) => [...prev, ...next])
    }

    const handleFilesSelected = (event) => {
        const files = Array.from(event.target.files || [])
        event.target.value = ''
        appendPendingFiles(files)
    }

    const handleCameraCapture = (file) => {
        appendPendingFiles([file])
    }

    const handleProductSelect = (product) => {
        if (!product?.id || !sendUrl || sending) return Promise.resolve()

        return new Promise((resolve) => {
            postMessage({
                body: draft.trim(),
                item_id: product.id,
            })
            resolve()
        })
    }

    const canSend = Boolean(sendUrl) && !sending && (draft.trim() || pendingAttachments.length > 0)

    return (
        <OwnerManagerKlasmeytLayout
            auth={auth}
            title={`Chat — ${conversation.name}`}
            mainClassName="flex w-full flex-col px-0 py-0"
            showContactSupport={false}
        >
            <div className="flex min-h-[calc(100vh-5.5rem)] w-full flex-col bg-[#F3F4F6]">
                <div className="sticky top-[4.5rem] z-20 flex items-center gap-3 border-b border-[#E5E7EB] bg-[#F8F9FB] px-4 py-3 sm:px-6">
                    <button
                        type="button"
                        onClick={() =>
                            router.visit(`/dashboard/owner-manager/messages/${shop.id}`)
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D1D5DB] text-[#4B5563] transition-colors hover:bg-[#9CA3AF] hover:text-white"
                        title="Back to conversations"
                        aria-label="Back to conversations"
                        style={{ borderRadius: '20px'}}
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

                <div
                    ref={threadRef}
                    className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
                >
                    {liveMessages.length === 0 ? (
                        <div className="py-12 text-center text-sm text-[#6B7280]">
                            No messages yet. Say hello to start the conversation.
                        </div>
                    ) : (
                        liveMessages.map((message) =>
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
                        )
                    )}
                </div>

                <div className="sticky bottom-0 border-t border-[#E5E7EB] bg-white px-4 py-3 sm:px-6">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/mp4,.pdf,.docx"
                        multiple
                        className="hidden"
                        onChange={handleFilesSelected}
                    />
                    {pendingAttachments.length > 0 && (
                        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                            {pendingAttachments.map((item) => (
                                <div
                                    key={item.id}
                                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#D1D5DB] bg-[#F3F4F6]"
                                >
                                    {item.previewUrl ? (
                                        <img
                                            src={item.previewUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-center">
                                            <Film className="h-4 w-4 text-[#6B7280]" />
                                            <span className="truncate text-[9px] leading-tight text-[#6B7280]">
                                                {item.file.name}
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removePendingAttachment(item.id)}
                                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                                        aria-label={`Remove ${item.file.name}`}
                                    >
                                        <X className="h-3 w-3" strokeWidth={2.5} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
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
                            disabled={sending || !sendUrl}
                            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none disabled:opacity-60"
                        />
                        <button
                            type="submit"
                            disabled={!canSend}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#102059] transition-colors hover:bg-[#EFF6FF] disabled:opacity-40"
                            aria-label="Send message"
                        >
                            <SendHorizontal className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>

            <CameraCaptureModal
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={handleCameraCapture}
            />
            <ProductListPicker
                open={productPickerOpen}
                productsUrl={productsUrl}
                onClose={() => setProductPickerOpen(false)}
                onSelect={handleProductSelect}
            />
        </OwnerManagerKlasmeytLayout>
    )
}
