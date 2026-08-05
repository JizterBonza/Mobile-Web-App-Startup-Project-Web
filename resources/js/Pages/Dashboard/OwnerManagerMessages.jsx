import { router } from '@inertiajs/react'
import { ArrowLeft, MessageSquareMore, Store } from 'lucide-react'
import OwnerManagerKlasmeytLayout, {
    OwnerManagerNoAgrivetAlert,
} from '../../Layouts/OwnerManagerKlasmeytLayout'

export default function OwnerManagerMessages({ auth, agrivet, branches = [] }) {
    const openBranchChat = (branchId) => {
        router.visit(`/dashboard/owner-manager/messages/${branchId}`)
    }

    return (
        <OwnerManagerKlasmeytLayout
            auth={auth}
            title="Branches"
            mainClassName="w-full px-4 py-6 sm:px-6 sm:py-8"
        >
            {!agrivet && <OwnerManagerNoAgrivetAlert />}

            <div className="w-full space-y-5">
                <div>
                    <button
                        type="button"
                        onClick={() => router.visit('/dashboard/owner-manager')}
                        className="group mb-4 rounded-lg border border-[#E5E7EB] bg-white p-3 transition-all hover:bg-[#F9FAFB]"
                        title="Back to Dashboard"
                        aria-label="Back to Dashboard"
                    >
                        <ArrowLeft className="h-5 w-5 text-[#6B7280] transition-colors group-hover:text-[#102059]" />
                    </button>
                    <h1 className="text-2xl font-semibold text-[#102059]">Branches</h1>
                </div>

                <div className="w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                    {branches.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <p className="text-sm text-[#6B7280]">No branches available</p>
                        </div>
                    ) : (
                        <ul>
                            {branches.map((branch, index) => (
                                <li key={branch.id}>
                                    <button
                                        type="button"
                                        onClick={() => openBranchChat(branch.id)}
                                        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#F9FAFB] ${
                                            index > 0 ? 'border-t border-[#F3F4F6]' : ''
                                        }`}
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E5E7EB] text-[#6B7280]">
                                            <Store className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-[#374151]">
                                                {branch.shop_name}
                                            </p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-[#9CA3AF]">
                                                {branch.shop_address || 'No address set'}
                                            </p>
                                        </div>

                                        <span
                                            className="relative shrink-0 p-1 text-[#6B7280]"
                                            aria-hidden="true"
                                        >
                                            <MessageSquareMore className="h-5 w-5" />
                                            {branch.unread_count > 0 && (
                                                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E20E28] px-1 text-[10px] font-bold leading-none text-white">
                                                    {branch.unread_count > 9
                                                        ? '9+'
                                                        : branch.unread_count}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </OwnerManagerKlasmeytLayout>
    )
}
