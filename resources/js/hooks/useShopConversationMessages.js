import { useEffect, useState } from 'react'
import { appendLiveMessage } from '../messaging/shopMessaging'

/**
 * Keep a conversation thread in sync with Reverb broadcasts.
 */
export function useShopConversationMessages(conversationId, initialMessages = [], user) {
    const [messages, setMessages] = useState(initialMessages)

    useEffect(() => {
        setMessages(initialMessages)
    }, [initialMessages])

    useEffect(() => {
        if (!window.Echo || !conversationId) return undefined

        const channelName = `shop-conversation.${conversationId}`
        const channel = window.Echo.private(channelName)

        channel.listen('.shop.message.sent', (payload) => {
            setMessages((current) => appendLiveMessage(current, payload, user))
        })

        return () => {
            window.Echo.leave(channelName)
        }
    }, [conversationId, user?.id, user?.user_type])

    return messages
}
