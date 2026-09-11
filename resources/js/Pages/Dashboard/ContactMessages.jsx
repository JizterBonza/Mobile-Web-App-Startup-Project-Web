import { useState, useEffect, useMemo } from 'react'
import { useForm, router } from '@inertiajs/react'
import { Search, Trash2, Eye } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function formatDateTime(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function previewText(text, length = 90) {
  const value = (text || '').replace(/\s+/g, ' ').trim()
  if (value.length <= length) return value || '—'
  return `${value.slice(0, length)}…`
}

const emptyForm = { name: '', email: '', message: '', status: 'new' }

export default function ContactMessages({ auth, contactMessages = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showViewModalAnimation, setShowViewModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [messageToRemove, setMessageToRemove] = useState(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [statusFilter, setStatusFilter] = useState('All')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const addForm = useForm({ ...emptyForm })
  const [togglingMessageId, setTogglingMessageId] = useState(null)

  useEffect(() => {
    if (showAddModal) setTimeout(() => setShowAddModalAnimation(true), 10)
    else setShowAddModalAnimation(false)
  }, [showAddModal])

  useEffect(() => {
    if (showViewModal) setTimeout(() => setShowViewModalAnimation(true), 10)
    else setShowViewModalAnimation(false)
  }, [showViewModal])

  useEffect(() => {
    if (showRemoveModal) setTimeout(() => setShowRemoveModalAnimation(true), 10)
    else setShowRemoveModalAnimation(false)
  }, [showRemoveModal])

  const closeAddModal = () => {
    setShowAddModalAnimation(false)
    setTimeout(() => {
      setShowAddModal(false)
      addForm.reset()
      addForm.setData({ ...emptyForm })
    }, 300)
  }

  const closeViewModal = () => {
    setShowViewModalAnimation(false)
    setTimeout(() => {
      setShowViewModal(false)
      setSelectedMessage(null)
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setMessageToRemove(null)
    }, 300)
  }

  useEffect(() => {
    if (flash?.success) {
      closeAddModal()
      closeRemoveModal()
      addForm.reset()
      setShowSuccessAlert(true)
    }
    if (flash?.error) setShowErrorAlert(true)
  }, [flash])

  useEffect(() => {
    if (!selectedMessage) return
    const updated = contactMessages.find((message) => message.id === selectedMessage.id)
    if (updated) {
      setSelectedMessage(updated)
    }
  }, [contactMessages])

  const getBaseRoute = () => {
    if (auth.user.user_type === 'super_admin') return '/dashboard/super-admin/contact-messages'
    if (auth.user.user_type === 'admin') return '/dashboard/admin/contact-messages'
    return '/dashboard/contact-messages'
  }

  const baseRoute = getBaseRoute()

  const handleStatusToggle = (e, item) => {
    e.stopPropagation()
    if (togglingMessageId !== null) return
    const newStatus = item.status === 'read' ? 'new' : 'read'
    setTogglingMessageId(item.id)
    router.put(
      `${baseRoute}/${item.id}`,
      {
        name: item.name,
        email: item.email,
        message: item.message,
        status: newStatus,
      },
      {
        preserveScroll: true,
        onFinish: () => setTogglingMessageId(null),
      },
    )
  }

  const handleAddMessage = (e) => {
    e.preventDefault()
    addForm.post(baseRoute, { preserveScroll: true, onSuccess: () => addForm.reset() })
  }

  const handleViewMessage = (item) => {
    const opened = item.status === 'new'
      ? { ...item, status: 'read', read_at: item.read_at || new Date().toISOString() }
      : item
    setSelectedMessage(opened)
    setShowViewModal(true)
    setShowViewModalAnimation(false)

    if (item.status === 'new') {
      router.put(`${baseRoute}/${item.id}/read`, {}, {
        preserveScroll: true,
        preserveState: true,
      })
    }
  }

  const handleDeleteMessage = (id) => {
    const item = contactMessages.find((message) => message.id === id)
    setMessageToRemove(item)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmDeleteMessage = () => {
    if (messageToRemove) {
      router.delete(`${baseRoute}/${messageToRemove.id}`, {
        preserveScroll: true,
        onSuccess: () => closeRemoveModal(),
      })
    }
  }

  const sortedMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = contactMessages.filter((item) => {
      if (statusFilter === 'New' && item.status !== 'new') return false
      if (statusFilter === 'Read' && item.status !== 'read') return false
      if (!q) return true
      return [item.name, item.email, item.message].some((value) =>
        (value || '').toLowerCase().includes(q),
      )
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })
    return list
  }, [contactMessages, searchQuery, sortBy, statusFilter])

  const totalPages = Math.max(1, Math.ceil(sortedMessages.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayedMessages = sortedMessages.slice(startIndex, endIndex)

  useEffect(() => { setCurrentPage(1) }, [searchQuery, sortBy, statusFilter, itemsPerPage])
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages))
  }, [currentPage, totalPages])

  const filterSelectClass =
    'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]'

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Contact Messages">
      {flash?.success && showSuccessAlert && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button
            type="button"
            className="close"
            data-dismiss="alert"
            aria-label="Close"
            onClick={(e) => { e.preventDefault(); setShowSuccessAlert(false) }}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {flash?.error && showErrorAlert && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {flash.error}
          <button
            type="button"
            className="close"
            data-dismiss="alert"
            aria-label="Close"
            onClick={(e) => { e.preventDefault(); setShowErrorAlert(false) }}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Contact Messages</h1>
            <p className="text-sm text-[#6B7280]">
              Review and manage messages submitted from the landing page
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddModal(true); setShowAddModalAnimation(false) }}
            className="shrink-0 rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#102059]"
          >
            + Add Contact Message
          </button>
        </div>

        <div className="mb-6">
          <div className="flex flex-col gap-4 bg-transparent md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search name, email, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#ffffff] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
                <option value="date">Sort by Date Received</option>
                <option value="name">Sort by Name</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
                <option value="All">All Status</option>
                <option value="New">New</option>
                <option value="Read">Read</option>
              </select>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="rounded-lg border border-[#E5E7EB] bg-[#ffffff] px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
              >
                <option value={5}>Show 5</option>
                <option value={10}>Show 10</option>
                <option value={25}>Show 25</option>
                <option value={50}>Show 50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <div className="divide-y divide-[#E5E7EB]">
            {displayedMessages.length > 0 ? (
              displayedMessages.map((item) => {
                const isRead = item.status === 'read'
                return (
                  <div key={item.id} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                        <span className="text-sm font-bold text-white">{getInitials(item.name)}</span>
                      </div>

                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-3 lg:grid-cols-[1.2fr_1fr_200px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#102059]">{item.name || 'N/A'}</div>
                          <div className="mt-0.5 text-xs text-[#6B7280]">{item.email || 'N/A'}</div>
                          <div className="mt-1 text-xs text-[#9CA3AF] lg:hidden">{previewText(item.message)}</div>
                          <div className="mt-1 text-xs text-[#9CA3AF] lg:hidden">
                            Received {formatDateTime(item.created_at)}
                            {isRead ? ` · Read ${formatDateTime(item.read_at)}` : ''}
                          </div>
                        </div>

                        <div className="hidden min-w-0 lg:block">
                          <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Message</div>
                          <div className="mt-0.5 text-xs text-[#6B7280]">{previewText(item.message)}</div>
                          <div className="mt-1 text-xs text-[#9CA3AF]">Received {formatDateTime(item.created_at)}</div>
                          {isRead && (
                            <div className="mt-0.5 text-xs text-[#9CA3AF]">Read {formatDateTime(item.read_at)}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => handleStatusToggle(e, item)}
                            disabled={togglingMessageId === item.id}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 ${
                              isRead ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                            }`}
                            aria-pressed={isRead}
                            aria-label={`Toggle read status for ${item.name}`}
                            style={{ borderRadius: '0.7rem' }}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ${
                                isRead ? 'translate-x-[22px]' : 'translate-x-[2px]'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-semibold text-[#6B7280]">
                            {isRead ? 'Read' : 'New'}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewMessage(item)}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="View contact message"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(item.id)}
                            className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                            title="Delete contact message"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-[#9CA3AF]">
                  No contact messages found matching your search criteria
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B7280]">
              Showing{' '}
              <span className="font-semibold text-[#102059]">
                {sortedMessages.length === 0 ? '0' : `${startIndex + 1}-${Math.min(endIndex, sortedMessages.length)}`}
              </span>{' '}
              of <span className="font-semibold text-[#102059]">{sortedMessages.length}</span> contact messages
              {searchQuery && ` matching "${searchQuery}"`}
              {statusFilter !== 'All' && ` with status "${statusFilter}"`}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#244693] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span className="text-xs text-[#6B7280]">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add Contact Message</h4>
                  <button type="button" className="close" onClick={closeAddModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddMessage}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.name ? 'is-invalid' : ''}`}
                        value={addForm.data.name}
                        onChange={(e) => addForm.setData('name', e.target.value)}
                        required
                        maxLength={255}
                      />
                      {addForm.errors.name && <div className="invalid-feedback">{addForm.errors.name}</div>}
                    </div>
                    <div className="form-group">
                      <label>Email <span className="text-danger">*</span></label>
                      <input
                        type="email"
                        className={`form-control ${addForm.errors.email ? 'is-invalid' : ''}`}
                        value={addForm.data.email}
                        onChange={(e) => addForm.setData('email', e.target.value)}
                        required
                        maxLength={255}
                      />
                      {addForm.errors.email && <div className="invalid-feedback">{addForm.errors.email}</div>}
                    </div>
                    <div className="form-group">
                      <label>Message <span className="text-danger">*</span></label>
                      <textarea
                        className={`form-control ${addForm.errors.message ? 'is-invalid' : ''}`}
                        value={addForm.data.message}
                        onChange={(e) => addForm.setData('message', e.target.value)}
                        required
                        rows={5}
                        maxLength={5000}
                      />
                      {addForm.errors.message && <div className="invalid-feedback">{addForm.errors.message}</div>}
                    </div>
                    <div className="form-group">
                      <label>Status <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${addForm.errors.status ? 'is-invalid' : ''}`}
                        value={addForm.data.status}
                        onChange={(e) => addForm.setData('status', e.target.value)}
                        required
                      >
                        <option value="new">New</option>
                        <option value="read">Read</option>
                      </select>
                      {addForm.errors.status && <div className="invalid-feedback">{addForm.errors.status}</div>}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAddModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                      {addForm.processing ? 'Creating...' : 'Create Contact Message'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {showViewModal && selectedMessage && (
        <>
          <div className={`modal-backdrop fade ${showViewModalAnimation ? 'show' : ''}`} onClick={closeViewModal}></div>
          <div className={`modal fade ${showViewModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Contact Message</h4>
                  <button type="button" className="close" onClick={closeViewModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p className="mb-2"><strong>Name:</strong> {selectedMessage.name}</p>
                  <p className="mb-2"><strong>Email:</strong> {selectedMessage.email}</p>
                  <p className="mb-2"><strong>Status:</strong> {selectedMessage.status === 'read' ? 'Read' : 'New'}</p>
                  <p className="mb-2"><strong>Received:</strong> {formatDateTime(selectedMessage.created_at)}</p>
                  {selectedMessage.status === 'read' && (
                    <p className="mb-2"><strong>Read:</strong> {formatDateTime(selectedMessage.read_at)}</p>
                  )}
                  <p className="mb-1"><strong>Message:</strong></p>
                  <p className="mb-0 whitespace-pre-wrap text-[#374151]">{selectedMessage.message}</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeViewModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showRemoveModal && messageToRemove && (
        <>
          <div className={`modal-backdrop fade ${showRemoveModalAnimation ? 'show' : ''}`} onClick={closeRemoveModal}></div>
          <div className={`modal fade ${showRemoveModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Confirm Delete</h4>
                  <button type="button" className="close" onClick={closeRemoveModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete the message from <strong>{messageToRemove.name}</strong>?</p>
                  <p className="mb-0 text-muted">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteMessage}>
                    Delete Contact Message
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
