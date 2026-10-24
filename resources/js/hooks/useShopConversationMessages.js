import { useEffect, useState } from 'react'
import {
    appendLiveMessage,
    applyReadReceipt,
    isCustomerOriginatedMessage,
    isStaffUser,
} from '../messaging/shopMessaging'

/**
 * Keep a conversation thread in sync with Reverb broadcasts.
 */
export function useShopConversationMessages(
    conversationId,
    initialMessages = [],
    user,
    { initialLastSeen = '', readUrl = null } = {},
) {
    const [messages, setMessages] = useState(initialMessages)
    const [lastSeen, setLastSeen] = useState(initialLastSeen)

    useEffect(() => {
        setMessages(initialMessages)
    }, [initialMessages])

    useEffect(() => {
        setLastSeen(initialLastSeen)
    }, [initialLastSeen])

    useEffect(() => {
        if (!window.Echo || !conversationId) return undefined

        const channelName = `shop-conversation.${conversationId}`
        const channel = window.Echo.private(channelName)

        channel.listen('.shop.message.sent', (payload) => {
            setMessages((current) => appendLiveMessage(current, payload, user))
            if (payload?.last_seen) {
                setLastSeen(payload.last_seen)
            }

            const incoming = payload?.message
            const isOwnMessage = Number(incoming?.sender_user_id) === Number(user?.id)
            const shouldMarkRead =
                readUrl &&
                incoming &&
                !isOwnMessage &&
                (isStaffUser(user) ? isCustomerOriginatedMessage(incoming) : true)

            if (shouldMarkRead) {
                window.axios?.post(readUrl).catch(() => {})
            }
        })

        channel.listen('.shop.conversation.read', (payload) => {
            setMessages((current) => applyReadReceipt(current, payload, user))
            if (payload?.reader_role === 'customer' && payload?.last_seen && isStaffUser(user)) {
                setLastSeen(payload.last_seen)
            }
        })

        return () => {
            window.Echo.leave(channelName)
        }
    }, [conversationId, readUrl, user?.id, user?.user_type])

    return { messages, lastSeen }
}
