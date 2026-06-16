import { Link } from '@inertiajs/react'
import { Headphones } from 'lucide-react'

export function ContactSupportFab({ href = '/seller-support' }) {
    return (
        <Link
            href={href}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#E20E28] px-4 py-3 text-white shadow-lg transition-all hover:scale-105 hover:bg-[#c00b22] active:scale-95"
            style={{ fontFamily: 'Inter Condensed, sans-serif', backgroundColor: '#E20E28' }}
        >
            <Headphones className="h-4 w-4" />
            <span className="text-sm font-semibold">Contact Support</span>
        </Link>
    )
}
