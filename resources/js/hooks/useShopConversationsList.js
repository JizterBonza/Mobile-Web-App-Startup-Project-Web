import { useEffect, useState } from 'react'
import { applyConversationListUpdate, clearConversationUnread } from '../messaging/shopMessaging'

/**
 * Keep a shop's conversation list in sync with Reverb broadcasts.
 */
export function useShopConversationsList(shopId, initialConversations = [], user, channelPrefix = 'shop') {
    const [conversations, setConversations] = useState(initialConversations)

    useEffect(() => {
        setConversations(initialConversations)
    }, [initialConversations])

    useEffect(() => {
        if (!window.Echo || !shopId) return undefined

        const channelName = `${channelPrefix}.${shopId}`
        const channel = window.Echo.private(channelName)

        channel.listen('.shop.message.sent', (payload) => {
            setConversations((current) => {
                const { conversations: next } = applyConversationListUpdate(
                    current,
                    payload,
                    user,
                )
                return next
            })
        })

        channel.listen('.shop.conversation.read', (payload) => {
            if (Number(payload?.reader_user_id) !== Number(user?.id)) return
            setConversations((current) => clearConversationUnread(current, payload.conversation_id))
        })

        return () => {
            window.Echo.leave(channelName)
        }
    }, [shopId, channelPrefix, user?.id, user?.user_type])

    return conversations
}
