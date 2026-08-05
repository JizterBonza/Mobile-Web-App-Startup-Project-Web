import { Link, usePage } from '@inertiajs/react'
import { Headphones, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'contact-support-fab-dismissed'

export function ContactSupportFab({ href = '/seller-support' }) {
    const { url } = usePage()
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        try {
            setDismissed(sessionStorage.getItem(STORAGE_KEY) === '1')
        } catch {
            // sessionStorage may be unavailable
        }
    }, [])

    const onSupportPage = /\/support(?:\/|$|\?)/.test(url)

    if (onSupportPage) {
        return null
    }

    const dismiss = (event) => {
        event.preventDefault()
        event.stopPropagation()
        setDismissed(true)
        try {
            sessionStorage.setItem(STORAGE_KEY, '1')
        } catch {
            // ignore
        }
    }

    const restore = () => {
        setDismissed(false)
        try {
            sessionStorage.removeItem(STORAGE_KEY)
        } catch {
            // ignore
        }
    }

    if (dismissed) {
        return (
            <button
                type="button"
                onClick={restore}
                aria-label="Show contact support button"
                title="Show Contact Support"
                className="fixed bottom-6 right-6 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#E20E28] shadow-md transition-all hover:scale-105 hover:bg-[#FEF2F2] active:scale-95"
            >
                <Headphones className="h-4 w-4" />
            </button>
        )
    }

    return (
        <div className="group/fab fixed bottom-6 right-6 z-40 flex items-center">
            <Link
                href={href}
                aria-label="Contact Support"
                title="Contact Support"
                className="relative flex items-center overflow-hidden rounded-full bg-[#E20E28] text-white shadow-lg transition-all hover:bg-[#c00b22] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E20E28]"
                style={{ fontFamily: 'Inter Condensed, sans-serif', backgroundColor: '#E20E28' }}
            >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                    <Headphones className="h-5 w-5" />
                </span>
                <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover/fab:max-w-[10rem] group-hover/fab:pr-4 group-hover/fab:opacity-100 group-focus-within/fab:max-w-[10rem] group-focus-within/fab:pr-4 group-focus-within/fab:opacity-100">
                    Contact Support
                </span>
            </Link>
            <button
                type="button"
                onClick={dismiss}
                aria-label="Hide contact support button"
                title="Hide"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-sm transition-colors hover:bg-[#F3F4F6] hover:text-[#1F2937]"
            >
                <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
        </div>
    )
}
