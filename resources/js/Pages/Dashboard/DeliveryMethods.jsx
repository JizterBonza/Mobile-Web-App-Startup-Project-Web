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

export default function DeliveryMethods({ auth, deliveryMethods = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState(null)
  const [deliveryMethodToRemove, setDeliveryMethodToRemove] = useState(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('description')
  const [statusFilter, setStatusFilter] = useState('All')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const addForm = useForm({ description: '', status: 'active' })
  const editForm = useForm({ description: '', status: 'active' })
  const statusToggleForm = useForm({ description: '', status: 'active' })

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
      addForm.setData({ description: '', status: 'active' })
    }, 300)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedDeliveryMethod(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setDeliveryMethodToRemove(null)
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
    if (auth.user.user_type === 'super_admin') return '/dashboard/super-admin/delivery-methods'
    if (auth.user.user_type === 'admin') return '/dashboard/admin/delivery-methods'
    return '/dashboard/delivery-methods'
  }

  const baseRoute = getBaseRoute()

  const handleStatusToggle = (e, dm) => {
    e.stopPropagation()
    if (statusToggleForm.processing) return
    const isActive = (dm.status_label || dm.status) === 'active'
    const newStatus = isActive ? 'inactive' : 'active'
    statusToggleForm.setData({ description: dm.description, status: newStatus })
    statusToggleForm.put(`${baseRoute}/${dm.id}`, { preserveScroll: true })
  }

  const handleAddDeliveryMethod = (e) => {
    e.preventDefault()
    addForm.post(baseRoute, { preserveScroll: true, onSuccess: () => addForm.reset() })
  }

  const handleEditDeliveryMethod = (dm) => {
    setSelectedDeliveryMethod(dm)
    editForm.setData({
      description: String(dm.description || ''),
      status: String(dm.status_label || (dm.status ? 'active' : 'inactive')),
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateDeliveryMethod = (e) => {
    e.preventDefault()
    if (!selectedDeliveryMethod) return
    editForm.put(`${baseRoute}/${selectedDeliveryMethod.id}`, {
      preserveScroll: true,
      onSuccess: () => closeEditModal(),
    })
  }

  const handleDeleteDeliveryMethod = (id) => {
    const dm = deliveryMethods.find((d) => d.id === id)
    setDeliveryMethodToRemove(dm)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmDeleteDeliveryMethod = () => {
    if (deliveryMethodToRemove) {
      router.delete(`${baseRoute}/${deliveryMethodToRemove.id}`, {
        preserveScroll: true,
        onSuccess: () => closeRemoveModal(),
      })
    }
  }

  const sortedMethods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = deliveryMethods.filter((dm) => {
      const isActive = (dm.status_label || dm.status) === 'active'
      if (statusFilter === 'Active' && !isActive) return false
      if (statusFilter === 'Inactive' && isActive) return false
      if (!q) return true
      return (dm.description || '').toLowerCase().includes(q)
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'description') return (a.description || '').localeCompare(b.description || '')
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })
    return list
  }, [deliveryMethods, searchQuery, sortBy, statusFilter])

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
    <SuperAdminOrAdminLayout auth={auth} title="Delivery Methods">
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
            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Delivery Methods</h1>
            <p className="text-sm text-[#6B7280]">
              Manage delivery methods available in the system
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddModal(true); setShowAddModalAnimation(false) }}
            className="shrink-0 rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#102059]"
          >
            Add Delivery Method
          </button>
        </div>

        {/* Filters bar */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-transparent">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search delivery method description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#ffffff] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
                <option value="description">Sort by Description</option>
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
              displayedMethods.map((dm) => {
                const isActive = (dm.status_label || dm.status) === 'active'
                const dateAdded = dm.created_at
                  ? new Date(dm.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'N/A'
                return (
                  <div key={dm.id} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                        <span className="text-sm font-bold text-white">{getInitials(dm.description)}</span>
                      </div>

                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-3 lg:grid-cols-[1fr_200px_140px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#102059]">{dm.description || 'N/A'}</div>
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
                            onClick={(e) => handleStatusToggle(e, dm)}
                            disabled={statusToggleForm.processing}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 ${
                              isActive ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                            }`}
                            aria-pressed={isActive}
                            aria-label={`Toggle status for ${dm.description}`}
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
                            onClick={() => handleEditDeliveryMethod(dm)}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="Edit delivery method"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeliveryMethod(dm.id)}
                            className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                            title="Delete delivery method"
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
                  No delivery methods found matching your search criteria
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
              of <span className="font-semibold text-[#102059]">{sortedMethods.length}</span> delivery methods
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

      {/* Add Delivery Method Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Delivery Method</h4>
                  <button type="button" className="close" onClick={closeAddModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddDeliveryMethod}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Description <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.description ? 'is-invalid' : ''}`}
                        value={addForm.data.description}
                        onChange={(e) => addForm.setData('description', e.target.value)}
                        required
                        maxLength={100}
                      />
                      {addForm.errors.description && <div className="invalid-feedback">{addForm.errors.description}</div>}
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
                      {addForm.processing ? 'Creating...' : 'Create Delivery Method'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Delivery Method Modal */}
      {showEditModal && selectedDeliveryMethod && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Delivery Method</h4>
                  <button type="button" className="close" onClick={closeEditModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateDeliveryMethod}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Description <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${editForm.errors.description ? 'is-invalid' : ''}`}
                        value={editForm.data.description}
                        onChange={(e) => editForm.setData('description', e.target.value)}
                        required
                        maxLength={100}
                      />
                      {editForm.errors.description && <div className="invalid-feedback">{editForm.errors.description}</div>}
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
                      {editForm.processing ? 'Updating...' : 'Update Delivery Method'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showRemoveModal && deliveryMethodToRemove && (
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
                  <p>Are you sure you want to delete <strong>{deliveryMethodToRemove.description}</strong>?</p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteDeliveryMethod}>
                    Delete Delivery Method
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
