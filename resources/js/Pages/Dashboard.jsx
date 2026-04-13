import KlasmeytDashboardLayout from '../Layouts/KlasmeytDashboardLayout'
import { KlasmeytStatCard } from '../Components/Dashboard/KlasmeytStatCard'
import { useDashboardSession } from '../hooks/useDashboardSession'

export default function Dashboard({ auth }) {
    const { sessionInfo, sessionValid } = useDashboardSession()

    return (
        <KlasmeytDashboardLayout auth={auth} title="Dashboard">
            {!sessionValid && (
                <div
                    role="alert"
                    className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    <p className="font-semibold">Session expired</p>
                    <p className="mt-1 text-red-700">Refresh the page to sign in again.</p>
                </div>
            )}

            {sessionInfo && sessionValid && (
                <div
                    role="status"
                    className="mb-6 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-sm text-[#1E3A5F]"
                >
                    <p className="font-semibold text-[#102059]">Session information</p>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                                Login time
                            </dt>
                            <dd className="mt-1 font-medium">{new Date(sessionInfo.login_time).toLocaleString()}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                                Last activity
                            </dt>
                            <dd className="mt-1 font-medium">
                                {new Date(sessionInfo.last_activity).toLocaleString()}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                                Session timeout
                            </dt>
                            <dd className="mt-1 font-medium">
                                {new Date(sessionInfo.session_timeout).toLocaleString()}
                            </dd>
                        </div>
                    </dl>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KlasmeytStatCard label="New orders" value="150" iconClass="fas fa-shopping-bag" />
                <KlasmeytStatCard label="Bounce rate" value="53%" iconClass="fas fa-chart-line" />
                <KlasmeytStatCard label="Registrations" value="44" iconClass="fas fa-user-plus" />
                <KlasmeytStatCard label="Unique visitors" value="65" iconClass="fas fa-eye" />
            </div>

            <section className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-[#102059]">Agrify Connect</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
                    Your dashboard is ready. This overview uses the same Klasmeyt visual language as the public
                    landing page and sign-in flow.
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
