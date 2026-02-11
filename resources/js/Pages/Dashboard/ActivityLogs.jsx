import { useState } from 'react'
import { router } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'

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

  return (
    <AdminLayout auth={auth} title="Activity Logs">
      <div className="row">
        <div className="col-12">
          <div className="card card-outline card-primary mb-3">
            <div className="card-header">
              <h3 className="card-title">Filters</h3>
              <div className="card-tools">
                {hasFilters && (
                  <button
                    type="button"
                    className="btn btn-tool"
                    onClick={() => {
                      setAction('')
                      setSubjectType('')
                      setFromDate('')
                      setToDate('')
                      setUserId('')
                      router.get(baseRoute, {}, { preserveState: false })
                    }}
                    title="Clear filters"
                  >
                    <i className="fas fa-times"></i> Clear
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={applyFilters} className="form-inline flex-wrap gap-2 align-items-end">
                <div className="form-group mr-2 mb-2">
                  <label className="mr-1">User ID</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="User ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="form-group mr-2 mb-2">
                  <label className="mr-1">Action</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. created, updated"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                  />
                </div>
                <div className="form-group mr-2 mb-2">
                  <label className="mr-1">Subject type</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Category, User"
                    value={subjectType}
                    onChange={(e) => setSubjectType(e.target.value)}
                  />
                </div>
                <div className="form-group mr-2 mb-2">
                  <label className="mr-1">From date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="form-group mr-2 mb-2">
                  <label className="mr-1">To date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <div className="form-group mr-2 mb-2">
                  <label className="mr-1">Per page</label>
                  <select
                    className="form-control form-control-sm"
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="form-group mb-2">
                  <button type="submit" className="btn btn-primary btn-sm">
                    <i className="fas fa-search"></i> Filter
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Activity Logs</h3>
            </div>
            <div className="card-body table-responsive p-0">
              {logs.length === 0 ? (
                <div className="p-4 text-center text-muted">No activity logs found.</div>
              ) : (
                <table className="table table-hover table-striped text-nowrap mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Subject</th>
                      <th>Description</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td>{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                        <td>{userName(log)}</td>
                        <td>
                          <span className="badge badge-info">{log.action || '—'}</span>
                        </td>
                        <td>{subjectDisplay(log)}</td>
                        <td className="text-break" style={{ maxWidth: 280 }}>
                          {log.description || '—'}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setDetailLog(log)}
                            title="View details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {activityLogs?.links?.length > 1 && (
              <div className="card-footer clearfix">
                <ul className="pagination pagination-sm m-0 float-right">
                  {activityLogs.links.map((link, i) => (
                    <li
                      key={i}
                      className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                        onClick={() => goToPage(link.url)}
                        disabled={!link.url}
                      />
                    </li>
                  ))}
                </ul>
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
    </AdminLayout>
  )
}
