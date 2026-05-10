import { useState, useEffect, useMemo } from 'react'
import { useForm, router } from '@inertiajs/react'
import { Search, Pencil, Trash2 } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function PaymentMethods({ auth, paymentMethods = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)
  const [paymentMethodToRemove, setPaymentMethodToRemove] = useState(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [statusFilter, setStatusFilter] = useState('All')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const addForm = useForm({ name: '', status: 'active' })
  const editForm = useForm({ name: '', status: 'active' })
  const statusToggleForm = useForm({ name: '', status: 'active' })

  useEffect(() => {
    if (showAddModal) setTimeout(() => setShowAddModalAnimation(true), 10)
    else setShowAddModalAnimation(false)
  }, [showAddModal])

  useEffect(() => {
    if (showEditModal) setTimeout(() => setShowEditModalAnimation(true), 10)
    else setShowEditModalAnimation(false)
  }, [showEditModal])

  useEffect(() => {
    if (showRemoveModal) setTimeout(() => setShowRemoveModalAnimation(true), 10)
    else setShowRemoveModalAnimation(false)
  }, [showRemoveModal])

  const closeAddModal = () => {
    setShowAddModalAnimation(false)
    setTimeout(() => {
      setShowAddModal(false)
      addForm.reset()
      addForm.setData({ name: '', status: 'active' })
    }, 300)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedPaymentMethod(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setPaymentMethodToRemove(null)
    }, 300)
  }

  useEffect(() => {
    if (flash?.success) {
      closeAddModal()
      closeEditModal()
      closeRemoveModal()
      addForm.reset()
      editForm.reset()
      setShowSuccessAlert(true)
    }
    if (flash?.error) setShowErrorAlert(true)
  }, [flash])

  const getBaseRoute = () => {
    if (auth.user.user_type === 'super_admin') return '/dashboard/super-admin/payment-methods'
    if (auth.user.user_type === 'admin') return '/dashboard/admin/payment-methods'
    return '/dashboard/payment-methods'
  }

  const baseRoute = getBaseRoute()

  const handleStatusToggle = (e, pm) => {
    e.stopPropagation()
    if (statusToggleForm.processing) return
    const newStatus = (pm.status_label || pm.status) === 'active' ? 'inactive' : 'active'
    statusToggleForm.setData({ name: pm.name, status: newStatus })
    statusToggleForm.put(`${baseRoute}/${pm.id}`, { preserveScroll: true })
  }

  const handleAddPaymentMethod = (e) => {
    e.preventDefault()
    addForm.post(baseRoute, { preserveScroll: true, onSuccess: () => addForm.reset() })
  }

  const handleEditPaymentMethod = (pm) => {
    setSelectedPaymentMethod(pm)
    editForm.setData({
      name: String(pm.name || ''),
      status: String(pm.status_label || (pm.status ? 'active' : 'inactive')),
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdatePaymentMethod = (e) => {
    e.preventDefault()
    if (!selectedPaymentMethod) return
    editForm.put(`${baseRoute}/${selectedPaymentMethod.id}`, {
      preserveScroll: true,
      onSuccess: () => closeEditModal(),
    })
  }

  const handleDeletePaymentMethod = (id) => {
    const pm = paymentMethods.find((p) => p.id === id)
    setPaymentMethodToRemove(pm)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmDeletePaymentMethod = () => {
    if (paymentMethodToRemove) {
      router.delete(`${baseRoute}/${paymentMethodToRemove.id}`, {
        preserveScroll: true,
        onSuccess: () => closeRemoveModal(),
      })
    }
  }

  const sortedMethods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = paymentMethods.filter((pm) => {
      const isActive = (pm.status_label || pm.status) === 'active'
      if (statusFilter === 'Active' && !isActive) return false
      if (statusFilter === 'Inactive' && isActive) return false
      if (!q) return true
      return (pm.name || '').toLowerCase().includes(q)
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })
    return list
  }, [paymentMethods, searchQuery, sortBy, statusFilter])

  const totalPages = Math.max(1, Math.ceil(sortedMethods.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayedMethods = sortedMethods.slice(startIndex, endIndex)

  useEffect(() => { setCurrentPage(1) }, [searchQuery, sortBy, statusFilter, itemsPerPage])
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages))
  }, [currentPage, totalPages])

  const filterSelectClass =
    'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]'

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Payment Methods">
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
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Payment Methods</h1>
            <p className="text-sm text-[#6B7280]">
              Manage payment methods available in the system
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddModal(true); setShowAddModalAnimation(false) }}
            className="shrink-0 rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#102059]"
          >
            Add Payment Method
          </button>
        </div>

        {/* Filters bar */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-transparent">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search payment method name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#ffffff] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
                <option value="name">Sort by Name</option>
                <option value="date">Sort by Date Added</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
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

        {/* List */}
        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <div className="divide-y divide-[#E5E7EB]">
            {displayedMethods.length > 0 ? (
              displayedMethods.map((pm) => {
                const isActive = (pm.status_label || pm.status) === 'active'
                const dateAdded = pm.created_at
                  ? new Date(pm.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'N/A'
                return (
                  <div key={pm.id} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                        <span className="text-sm font-bold text-white">{getInitials(pm.name)}</span>
                      </div>

                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-3 lg:grid-cols-[1fr_200px_140px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#102059]">{pm.name || 'N/A'}</div>
                          <div className="mt-1 text-xs text-[#9CA3AF] lg:hidden">Added {dateAdded}</div>
                        </div>

                        <div className="hidden items-center lg:flex">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Date Added</div>
                            <div className="mt-0.5 text-xs text-[#9CA3AF]">{dateAdded}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => handleStatusToggle(e, pm)}
                            disabled={statusToggleForm.processing}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 ${
                              isActive ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                            }`}
                            aria-pressed={isActive}
                            aria-label={`Toggle status for ${pm.name}`}
                            style={{ borderRadius: '0.7rem' }}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ${
                                isActive ? 'translate-x-[22px]' : 'translate-x-[2px]'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-semibold text-[#6B7280]">
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditPaymentMethod(pm)}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="Edit payment method"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePaymentMethod(pm.id)}
                            className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                            title="Delete payment method"
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
                  No payment methods found matching your search criteria
                </p>
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
                {sortedMethods.length === 0 ? '0' : `${startIndex + 1}-${Math.min(endIndex, sortedMethods.length)}`}
              </span>{' '}
              of <span className="font-semibold text-[#102059]">{sortedMethods.length}</span> payment methods
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

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Payment Method</h4>
                  <button type="button" className="close" onClick={closeAddModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddPaymentMethod}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.name ? 'is-invalid' : ''}`}
                        value={addForm.data.name}
                        onChange={(e) => addForm.setData('name', e.target.value)}
                        required
                        maxLength={100}
                      />
                      {addForm.errors.name && <div className="invalid-feedback">{addForm.errors.name}</div>}
                    </div>
                    <div className="form-group">
                      <label>Status <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${addForm.errors.status ? 'is-invalid' : ''}`}
                        value={addForm.data.status}
                        onChange={(e) => addForm.setData('status', e.target.value)}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {addForm.errors.status && <div className="invalid-feedback">{addForm.errors.status}</div>}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAddModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                      {addForm.processing ? 'Creating...' : 'Create Payment Method'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Payment Method Modal */}
      {showEditModal && selectedPaymentMethod && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Payment Method</h4>
                  <button type="button" className="close" onClick={closeEditModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdatePaymentMethod}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${editForm.errors.name ? 'is-invalid' : ''}`}
                        value={editForm.data.name}
                        onChange={(e) => editForm.setData('name', e.target.value)}
                        required
                        maxLength={100}
                      />
                      {editForm.errors.name && <div className="invalid-feedback">{editForm.errors.name}</div>}
                    </div>
                    <div className="form-group">
                      <label>Status <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${editForm.errors.status ? 'is-invalid' : ''}`}
                        value={editForm.data.status}
                        onChange={(e) => editForm.setData('status', e.target.value)}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {editForm.errors.status && <div className="invalid-feedback">{editForm.errors.status}</div>}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={editForm.processing}>
                      {editForm.processing ? 'Updating...' : 'Update Payment Method'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showRemoveModal && paymentMethodToRemove && (
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
                  <p>Are you sure you want to delete <strong>{paymentMethodToRemove.name}</strong>?</p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeletePaymentMethod}>
                    Delete Payment Method
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
