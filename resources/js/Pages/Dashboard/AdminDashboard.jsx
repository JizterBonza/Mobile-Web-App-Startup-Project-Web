import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import { KlasmeytStatCard } from '../../Components/Dashboard/KlasmeytStatCard'
import { useDashboardSession } from '../../hooks/useDashboardSession'

export default function AdminDashboard({ auth }) {
    const { sessionValid } = useDashboardSession()

    return (
        <KlasmeytDashboardLayout auth={auth} title="Admin Dashboard">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KlasmeytStatCard label="Pending orders" value="0" iconClass="fas fa-shopping-cart" />
                <KlasmeytStatCard label="Active vendors" value="0" iconClass="fas fa-store" />
                <KlasmeytStatCard label="Active veterinarians" value="0" iconClass="fas fa-user-md" />
                <KlasmeytStatCard label="Support tickets" value="0" iconClass="fas fa-ticket-alt" />
            </div>

            <section className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-[#102059]">Welcome, {auth.user.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
                    You are signed in as <span className="font-semibold text-[#102059]">Admin</span>. Manage
                    vendors, veterinarians, orders, and day-to-day operations from the menu.
                </p>
                {sessionValid && (
                    <p className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                        <i className="fas fa-check-circle" />
                        Session active
                    </p>
                )}
            </section>
        </KlasmeytDashboardLayout>
    )
}
