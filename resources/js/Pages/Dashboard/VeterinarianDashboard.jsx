import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import { KlasmeytStatCard } from '../../Components/Dashboard/KlasmeytStatCard'
import { useDashboardSession } from '../../hooks/useDashboardSession'

export default function VeterinarianDashboard({ auth }) {
    const { sessionValid } = useDashboardSession()

    return (
        <KlasmeytDashboardLayout auth={auth} title="Veterinarian Dashboard">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KlasmeytStatCard label="Appointments" value="0" iconClass="fas fa-calendar-check" />
                <KlasmeytStatCard label="Patients" value="0" iconClass="fas fa-paw" />
                <KlasmeytStatCard label="Consultations" value="0" iconClass="fas fa-stethoscope" />
                <KlasmeytStatCard label="Prescriptions" value="0" iconClass="fas fa-prescription" />
            </div>

            <section className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-[#102059]">Welcome, {auth.user.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
                    You are signed in as <span className="font-semibold text-[#102059]">Veterinarian</span>.
                    Use this hub for appointments, cases, and consultations as features are connected.
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
