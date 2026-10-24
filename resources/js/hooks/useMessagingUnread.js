import { useEffect, useState } from 'react'
import { usePage } from '@inertiajs/react'
import { scheduleMessagingReload } from '../messaging/scheduleMessagingReload'

/**
 * Header badge for vendor and owner/manager dashboards.
 * The first number comes from the server. Reverb refreshes it on every page.
 */
export function useMessagingUnread() {
    const page = usePage()
    const user = page.props.auth?.user
    const serverCount = page.props.messaging?.unread_count ?? 0
    const [count, setCount] = useState(serverCount)

    useEffect(() => {
        setCount(serverCount)
    }, [serverCount])

    useEffect(() => {
        if (!window.Echo || !user?.id) return undefined
        if (user.user_type !== 'vendor' && user.user_type !== 'owner_manager') return undefined

        const channelName = `App.Models.User.${user.id}`
        const channel = window.Echo.private(channelName)

        channel.listen('.shop.message.sent', () => {
            scheduleMessagingReload(['messaging'])
        })
        channel.listen('.shop.conversation.read', (payload) => {
            if (Number(payload?.reader_user_id) === Number(user.id)) {
                scheduleMessagingReload(['messaging'])
            }
        })

        return () => {
            window.Echo.leave(channelName)
        }
    }, [user?.id, user?.user_type])

    return count
}
