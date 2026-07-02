import { Head } from '@inertiajs/react'
import { SellerSupportPanel } from '../../Components/Dashboard/SellerSupportPanel'
import { useDashboardSession } from '../../hooks/useDashboardSession'

export default function OwnerManagerSupport({ tickets = [], submitTicketUrl = '', ticketActionsBaseUrl = '' }) {
    useDashboardSession()

    return (
        <>
            <Head title="Seller Support" />
            <div className="klasmeyt-landing">
                <SellerSupportPanel
                    backHref="/dashboard/owner-manager"
                    pageTitle="Seller Support"
                    initialTickets={tickets}
                    submitTicketUrl={submitTicketUrl}
                    ticketActionsBaseUrl={ticketActionsBaseUrl}
                />
            </div>
        </>
    )
}
