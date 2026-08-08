import { useMemo, useState } from 'react'
import { router } from '@inertiajs/react'
import { ChevronLeft, Search, User } from 'lucide-react'
import OwnerManagerKlasmeytLayout from '../../Layouts/OwnerManagerKlasmeytLayout'
import { useShopConversationsList } from '../../hooks/useShopConversationsList'

export default function OwnerManagerBranchChat({ auth, shop, conversations = [] }) {
    const [query, setQuery] = useState('')
    const liveConversations = useShopConversationsList(shop?.id, conversations, auth?.user)

    const filteredConversations = useMemo(() => {
        const term = query.trim().toLowerCase()
        if (!term) return liveConversations

        return liveConversations.filter((conversation) => {
            const name = (conversation.name || '').toLowerCase()
            const preview = (conversation.last_message || '').toLowerCase()
            return name.includes(term) || preview.includes(term)
        })
    }, [liveConversations, query])

    return (
        <OwnerManagerKlasmeytLayout
            auth={auth}
            title={`Chat — ${shop.shop_name}`}
            mainClassName="w-full px-4 py-6 sm:px-6 sm:py-8"
        >
            <div className="w-full space-y-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.visit('/dashboard/owner-manager/messages')}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#9CA3AF] text-white transition-colors hover:bg-[#6B7280]"
                        title="Back to Branches"
                        aria-label="Back to Branches"
                        style={{ borderRadius: '20px'}}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <h1 className="text-2xl font-bold text-[#1F2937]">Chat</h1>
                </div>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search Conversation"
                        className="w-full rounded-full border border-[#D1D5DB] bg-white py-2.5 pl-11 pr-4 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#9CA3AF] focus:ring-1 focus:ring-[#D1D5DB]"
                    />
                </div>

                <div className="w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                    {filteredConversations.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <p className="text-sm text-[#6B7280]">
                                {query.trim()
                                    ? 'No conversations match your search'
                                    : 'No conversations yet'}
                            </p>
                        </div>
                    ) : (
                        <ul>
                            {filteredConversations.map((conversation, index) => (
                                <li key={conversation.id}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.visit(
                                                `/dashboard/owner-manager/messages/${shop.id}/${conversation.id}`,
                                            )
                                        }
                                        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#F9FAFB] ${
                                            index > 0 ? 'border-t border-[#F3F4F6]' : ''
                                        }`}
                                    >
                                        <div className="relative shrink-0">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E5E7EB] text-[#6B7280]">
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
                                            {conversation.unread && (
                                                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#E20E28] ring-2 ring-white" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="truncate text-sm font-bold text-[#1F2937]">
                                                    {conversation.name}
                                                </p>
                                                <span className="shrink-0 text-xs text-[#9CA3AF]">
                                                    {conversation.timestamp}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#9CA3AF]">
                                                {conversation.last_message}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </OwnerManagerKlasmeytLayout>
    )
}
