import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'

function redirectToLoginForExpiredSession() {
    if (typeof window === 'undefined') {
        return
    }
    if (window.location.pathname === '/login') {
        return
    }
    router.visit('/login?session_expired=1', { replace: true })
}

export function useDashboardSession() {
    const [sessionInfo, setSessionInfo] = useState(null)
    const [sessionValid, setSessionValid] = useState(true)
    const redirectingRef = useRef(false)

    useEffect(() => {
        const checkSession = async () => {
            if (redirectingRef.current) {
                return
            }
            try {
                const response = await fetch('/session/check', {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content'),
                    },
                })

                const contentType = response.headers.get('content-type') || ''
                const isJson = contentType.includes('application/json')

                let data = null
                if (isJson) {
                    try {
                        data = await response.json()
                    } catch {
                        data = null
                    }
                }

                if (response.ok && data?.valid === true) {
                    setSessionInfo(data.session_data)
                    setSessionValid(true)
                    return
                }

                const lostSession =
                    response.status === 401 ||
                    response.status === 419 ||
                    (response.ok && !isJson) ||
                    (response.ok && data?.valid === false)

                if (lostSession) {
                    redirectingRef.current = true
                    setSessionValid(false)
                    redirectToLoginForExpiredSession()
                    return
                }

                setSessionValid(false)
            } catch (error) {
                console.error('Session check failed:', error)
                setSessionValid(false)
            }
        }

        checkSession()
        const interval = setInterval(checkSession, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    return { sessionInfo, sessionValid }
}
