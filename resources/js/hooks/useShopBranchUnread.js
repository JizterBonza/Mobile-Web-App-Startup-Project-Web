import { useEffect } from 'react'
import { router } from '@inertiajs/react'

/**
 * Refresh owner/manager branch unread badges when customer messages arrive.
 */
export function useShopBranchUnread(branches = []) {
    const shopIdsKey = branches.map((branch) => branch.id).filter(Boolean).join(',')

    useEffect(() => {
        if (!window.Echo || !shopIdsKey) return undefined

        const shopIds = shopIdsKey.split(',')
        const channelNames = shopIds.map((shopId) => `shop.${shopId}`)
        let reloadTimer = null

        const scheduleReload = () => {
            if (reloadTimer) return
            reloadTimer = window.setTimeout(() => {
                reloadTimer = null
                router.reload({ only: ['branches'], preserveScroll: true })
            }, 400)
        }

        channelNames.forEach((channelName) => {
            window.Echo.private(channelName).listen('.shop.message.sent', (payload) => {
                if (payload?.message?.sender_role === 'customer') {
                    scheduleReload()
                }
            })
        })

        return () => {
            if (reloadTimer) {
                window.clearTimeout(reloadTimer)
            }
            channelNames.forEach((channelName) => {
                window.Echo.leave(channelName)
            })
        }
    }, [shopIdsKey])
}
