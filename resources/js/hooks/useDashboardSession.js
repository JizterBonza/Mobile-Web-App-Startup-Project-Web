import { useEffect, useState } from 'react'

export function useDashboardSession() {
    const [sessionInfo, setSessionInfo] = useState(null)
    const [sessionValid, setSessionValid] = useState(true)

    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch('/session/check', {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content'),
                    },
                })

                if (response.ok) {
                    const data = await response.json()
                    setSessionInfo(data.session_data)
                    setSessionValid(data.valid)
                } else {
                    setSessionValid(false)
                }
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
