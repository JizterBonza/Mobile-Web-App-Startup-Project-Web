import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Eye } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function actionBadgeClass(action) {
  switch ((action || '').toLowerCase()) {
    case 'created': return 'bg-[#DCFCE7] text-[#15803D]'
    case 'updated': return 'bg-[#DBEAFE] text-[#1D4ED8]'
    case 'deleted': return 'bg-[#FEE2E2] text-[#B91C1C]'
    default: return 'bg-[#F3F4F6] text-[#6B7280]'
  }
}

export default function ActivityLogs({ auth, activityLogs, filters = {} }) {
  const [action, setAction] = useState(filters.action ?? '')
  const [subjectType, setSubjectType] = useState(filters.subject_type ?? '')
  const [fromDate, setFromDate] = useState(filters.from_date ?? '')
  const [toDate, setToDate] = useState(filters.to_date ?? '')
  const [userId, setUserId] = useState(filters.user_id ?? '')
  const [perPage, setPerPage] = useState(filters.per_page ?? 20)
  const [detailLog, setDetailLog] = useState(null)

  const baseRoute = auth?.user?.user_type === 'admin'
    ? '/dashboard/admin/activity-logs'
    : '/dashboard/super-admin/activity-logs'

  const applyFilters = (e) => {
    e?.preventDefault()
    router.get(baseRoute, {
      user_id: userId || undefined,
      action: action || undefined,
      subject_type: subjectType || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      per_page: perPage || undefined,
    }, { preserveState: true })
  }

  const clearFilters = () => {
    setAction('')
    setSubjectType('')
    setFromDate('')
    setToDate('')
    setUserId('')
    router.get(baseRoute, {}, { preserveState: false })
  }

  const goToPage = (url) => {
    if (url) router.visit(url, { preserveState: true })
  }

  const userName = (log) => {
    const u = log.user
    if (!u?.user_detail) return log.user_id ? `User #${log.user_id}` : '—'
    const d = u.user_detail
    const name = [d.first_name, d.last_name].filter(Boolean).join(' ')
    return name || d.email || `User #${log.user_id}`
  }

  const subjectDisplay = (log) => {
    if (log.subject_display_name) return log.subject_display_name
    if (!log.subject_type) return '—'
    const parts = String(log.subject_type).split('\\')
    const typeName = parts[parts.length - 1] || log.subject_type
    return log.subject_id ? `${typeName} #${log.subject_id}` : typeName
  }

  const logs = activityLogs?.data ?? []
  const hasFilters = action || subjectType || fromDate || toDate || userId

  const links = activityLogs?.links ?? []
  const prevLink = links[0]
  const nextLink = links[links.length - 1]
  const currentPage = activityLogs?.current_page ?? 1
  const lastPage = activityLogs?.last_page ?? 1
  const total = activityLogs?.total ?? logs.length
  const from = activityLogs?.from ?? (logs.length ? 1 : 0)
  const to = activityLogs?.to ?? logs.length

  const inputClass =
    'rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]'
  const labelClass = 'block text-xs font-semibold text-[#6B7280] mb-1'

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Activity Logs">
      <div>
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Activity Logs</h1>
            <p className="text-sm text-[#6B7280]">
              Track all user actions and system events
            </p>
          </div>
        </div>

        {/* Filters panel */}
        <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white px-6 py-4">
          <form onSubmit={applyFilters}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#102059]">Filters</span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-[#E20E28] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div>
                <label className={labelClass}>User ID</label>
                <input
                  type="number"
                  className={inputClass + ' w-full'}
                  placeholder="User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  min="1"
                />
              </div>
              <div>
                <label className={labelClass}>Action</label>
                <input
                  type="text"
                  className={inputClass + ' w-full'}
                  placeholder="e.g. created, updated"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Subject type</label>
                <input
                  type="text"
                  className={inputClass + ' w-full'}
                  placeholder="e.g. Category, User"
                  value={subjectType}
                  onChange={(e) => setSubjectType(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>From date</label>
                <input
                  type="date"
                  className={inputClass + ' w-full'}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>To date</label>
                <input
                  type="date"
                  className={inputClass + ' w-full'}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Per page</label>
                <select
                  className={inputClass + ' w-full'}
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-[#244693] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#102059]"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        {/* Logs list */}
        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <div className="divide-y divide-[#E5E7EB]">
            {logs.length > 0 ? (
              logs.map((log) => {
                const name = userName(log)
                const subject = subjectDisplay(log)
                const date = log.created_at
                  ? new Date(log.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : '—'
                const time = log.created_at
                  ? new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  : ''
                return (
                  <div key={log.id} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                        <span className="text-sm font-bold text-white">{getInitials(name)}</span>
                      </div>

                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-2 lg:grid-cols-[1fr_120px_200px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#102059]">{name}</div>
                          <div className="text-sm text-[#6B7280]">{subject}</div>
                          {log.description && (
                            <div className="mt-0.5 truncate text-xs text-[#9CA3AF]">
                              {log.description.length > 80 ? log.description.slice(0, 80) + '…' : log.description}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-[#9CA3AF] lg:hidden">{date} {time}</div>
                        </div>

                        <div className="flex items-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${actionBadgeClass(log.action)}`}>
                            {log.action || '—'}
                          </span>
                        </div>

                        <div className="hidden items-center lg:flex">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Date</div>
                            <div className="mt-0.5 text-xs text-[#9CA3AF]">{date}</div>
                            {time && <div className="text-xs text-[#9CA3AF]">{time}</div>}
                          </div>
                        </div>

                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setDetailLog(log)}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="View details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-[#9CA3AF]">No activity logs found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Results count + pagination */}
        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B7280]">
              Showing{' '}
              <span className="font-semibold text-[#102059]">
                {total === 0 ? '0' : `${from}-${to}`}
              </span>{' '}
              of <span className="font-semibold text-[#102059]">{total}</span> logs
            </p>

            {lastPage > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#244693] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!prevLink?.url}
                  onClick={() => goToPage(prevLink?.url)}
                >
                  Previous
                </button>
                <span className="text-xs text-[#6B7280]">Page {currentPage} of {lastPage}</span>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!nextLink?.url}
                  onClick={() => goToPage(nextLink?.url)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {detailLog && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setDetailLog(null)}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Activity Log #{detailLog.id}</h5>
                  <button type="button" className="close" onClick={() => setDetailLog(null)}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body small">
                  <dl className="row mb-0">
                    <dt className="col-sm-3">Date</dt>
                    <dd className="col-sm-9">{detailLog.created_at ? new Date(detailLog.created_at).toLocaleString() : '—'}</dd>

                    <dt className="col-sm-3">User</dt>
                    <dd className="col-sm-9">{userName(detailLog)}</dd>

                    <dt className="col-sm-3">Action</dt>
                    <dd className="col-sm-9">{detailLog.action || '—'}</dd>

                    <dt className="col-sm-3">Subject</dt>
                    <dd className="col-sm-9">{detailLog.subject_display_name ?? (detailLog.subject_type ? `${detailLog.subject_type}${detailLog.subject_id ? ' #' + detailLog.subject_id : ''}` : '—')}</dd>

                    <dt className="col-sm-3">Description</dt>
                    <dd className="col-sm-9">{detailLog.description || '—'}</dd>

                    {detailLog.url && (
                      <>
                        <dt className="col-sm-3">URL</dt>
                        <dd className="col-sm-9 text-break">{detailLog.url}</dd>
                      </>
                    )}
                    {detailLog.request_method && (
                      <>
                        <dt className="col-sm-3">Method</dt>
                        <dd className="col-sm-9">{detailLog.request_method}</dd>
                      </>
                    )}
                    {detailLog.ip_address && (
                      <>
                        <dt className="col-sm-3">IP</dt>
                        <dd className="col-sm-9">{detailLog.ip_address}</dd>
                      </>
                    )}
                    {detailLog.old_values && Object.keys(detailLog.old_values).length > 0 && (
                      <>
                        <dt className="col-sm-3">Old values</dt>
                        <dd className="col-sm-9">
                          <pre className="bg-light p-2 rounded mb-0 small">{JSON.stringify(detailLog.old_values, null, 2)}</pre>
                        </dd>
                      </>
                    )}
                    {detailLog.new_values && Object.keys(detailLog.new_values).length > 0 && (
                      <>
                        <dt className="col-sm-3">New values</dt>
                        <dd className="col-sm-9">
                          <pre className="bg-light p-2 rounded mb-0 small">{JSON.stringify(detailLog.new_values, null, 2)}</pre>
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDetailLog(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </SuperAdminOrAdminLayout>
  )
}
