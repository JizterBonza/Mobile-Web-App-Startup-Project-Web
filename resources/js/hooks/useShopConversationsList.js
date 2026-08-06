import { useEffect, useState } from 'react'
import { applyConversationListUpdate } from '../messaging/shopMessaging'

/**
 * Keep a shop's conversation list in sync with Reverb broadcasts.
 */
export function useShopConversationsList(shopId, initialConversations = [], user) {
    const [conversations, setConversations] = useState(initialConversations)

    useEffect(() => {
        setConversations(initialConversations)
    }, [initialConversations])

    useEffect(() => {
        if (!window.Echo || !shopId) return undefined

        const channelName = `shop.${shopId}`
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

        return () => {
            window.Echo.leave(channelName)
        }
    }, [shopId, user?.id, user?.user_type])

    return conversations
}
