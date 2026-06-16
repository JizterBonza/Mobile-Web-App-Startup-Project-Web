import { Head } from '@inertiajs/react'
import { SellerSupportPanel } from '../../Components/Dashboard/SellerSupportPanel'
import { useDashboardSession } from '../../hooks/useDashboardSession'

export default function VendorSupport({ tickets = [], submitTicketUrl = '' }) {
    useDashboardSession()

    return (
        <>
            <Head title="Seller Support" />
            <div className="klasmeyt-landing">
                <SellerSupportPanel
                    backHref="/dashboard/vendor"
                    pageTitle="Seller Support"
                    initialTickets={tickets}
                    submitTicketUrl={submitTicketUrl}
                />
            </div>
        </>
    )
}
