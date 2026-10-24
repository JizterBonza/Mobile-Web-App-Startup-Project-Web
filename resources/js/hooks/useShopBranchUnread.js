import { useEffect } from 'react'
import { scheduleMessagingReload } from '../messaging/scheduleMessagingReload'

/**
 * Refresh owner/manager branch unread badges when customer messages arrive.
 */
export function useShopBranchUnread(branches = [], user = null) {
    const shopIdsKey = branches.map((branch) => branch.id).filter(Boolean).join(',')

    useEffect(() => {
        if (!window.Echo || !shopIdsKey) return undefined

        const shopIds = shopIdsKey.split(',')
        const channelNames = shopIds.map((shopId) => `shop.${shopId}`)

        channelNames.forEach((channelName) => {
            const channel = window.Echo.private(channelName)
            channel.listen('.shop.message.sent', (payload) => {
                if (
                    payload?.message?.sender_role === 'customer' &&
                    payload?.message?.type !== 'order_update'
                ) {
                    scheduleMessagingReload(['branches'])
                }
            })
            channel.listen('.shop.conversation.read', (payload) => {
                if (user?.id && Number(payload?.reader_user_id) !== Number(user.id)) return
                scheduleMessagingReload(['branches'])
            })
        })

        return () => {
            channelNames.forEach((channelName) => {
                window.Echo.leave(channelName)
            })
        }
    }, [shopIdsKey, user?.id])
}
