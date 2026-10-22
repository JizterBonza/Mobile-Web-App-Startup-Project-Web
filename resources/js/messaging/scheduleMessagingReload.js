import { router } from '@inertiajs/react'

let pendingKeys = new Set()
let timer = null
let inFlight = false
let again = false

/**
 * Coalesce badge and branch refreshes into one Inertia reload.
 * Separate reloads cancel each other.
 */
export function scheduleMessagingReload(keys) {
    keys.forEach((key) => pendingKeys.add(key))

    if (inFlight) {
        again = true
        return
    }

    if (timer) return

    timer = window.setTimeout(() => {
        timer = null
        const only = [...pendingKeys]
        pendingKeys = new Set()
        if (only.length === 0) return

        inFlight = true
        router.reload({
            only,
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                inFlight = false
                if (again || pendingKeys.size > 0) {
                    again = false
                    scheduleMessagingReload([])
                }
            },
        })
    }, 400)
}
