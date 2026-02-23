import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'

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

  const addForm = useForm({
    name: '',
    status: 'active',
  })

  const editForm = useForm({
    name: '',
    status: 'active',
  })

  useEffect(() => {
    if (showAddModal) {
      setTimeout(() => setShowAddModalAnimation(true), 10)
    } else {
      setShowAddModalAnimation(false)
    }
  }, [showAddModal])

  useEffect(() => {
    if (showEditModal) {
      setTimeout(() => setShowEditModalAnimation(true), 10)
    } else {
      setShowEditModalAnimation(false)
    }
  }, [showEditModal])

  useEffect(() => {
    if (showRemoveModal) {
      setTimeout(() => setShowRemoveModalAnimation(true), 10)
    } else {
      setShowRemoveModalAnimation(false)
    }
  }, [showRemoveModal])

  const closeAddModal = () => {
    setShowAddModalAnimation(false)
    setTimeout(() => {
      setShowAddModal(false)
      addForm.reset()
      addForm.setData({
        name: '',
        status: 'active',
      })
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
    if (flash?.error) {
      setShowErrorAlert(true)
    }
  }, [flash])

  const handleAddPaymentMethod = (e) => {
    e.preventDefault()
    addForm.post(baseRoute, {
      preserveScroll: true,
      onSuccess: () => {
        addForm.reset()
      },
    })
  }

  const handleEditPaymentMethod = (pm) => {
    setSelectedPaymentMethod(pm)
    editForm.setData({
      name: String(pm.name || ''),
      status: String(pm.status_label || pm.status ? 'active' : 'inactive'),
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdatePaymentMethod = (e) => {
    e.preventDefault()
    if (!selectedPaymentMethod) return
    editForm.put(`${baseRoute}/${selectedPaymentMethod.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeEditModal()
      },
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
        onSuccess: () => {
          closeRemoveModal()
        },
      })
    }
  }

  const getStatusBadge = (statusLabel) => {
    if (statusLabel === 'active') {
      return <span className="badge badge-success">Active</span>
    }
    return <span className="badge badge-danger">Inactive</span>
  }

  const getBaseRoute = () => {
    if (auth.user.user_type === 'super_admin') {
      return '/dashboard/super-admin/payment-methods'
    }
    if (auth.user.user_type === 'admin') {
      return '/dashboard/admin/payment-methods'
    }
    return '/dashboard/payment-methods'
  }

  const baseRoute = getBaseRoute()

  return (
    <AdminLayout auth={auth} title="Payment Methods">
      {flash?.success && showSuccessAlert && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button
            type="button"
            className="close"
            data-dismiss="alert"
            aria-label="Close"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowSuccessAlert(false)
            }}
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
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowErrorAlert(false)
            }}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Payment Method List</h3>
              <div className="card-tools">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowAddModal(true)
                    setShowAddModalAnimation(false)
                  }}
                >
                  <i className="fas fa-plus"></i> Add Payment Method
                </button>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMethods.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center">
                        No payment methods found
                      </td>
                    </tr>
                  ) : (
                    paymentMethods.map((pm) => (
                      <tr key={pm.id}>
                        <td>{pm.id}</td>
                        <td>{pm.name}</td>
                        <td>{getStatusBadge(pm.status_label)}</td>
                        <td>{pm.created_at ? new Date(pm.created_at).toLocaleDateString() : '-'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-info mr-1"
                            onClick={() => handleEditPaymentMethod(pm)}
                            title="Edit Payment Method"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeletePaymentMethod(pm.id)}
                            title="Delete Payment Method"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <>
          <div
            className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`}
            onClick={closeAddModal}
          ></div>
          <div
            className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`}
            tabIndex="-1"
            style={{ zIndex: 1050 }}
          >
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
                      <label>
                        Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.name ? 'is-invalid' : ''}`}
                        value={addForm.data.name}
                        onChange={(e) => addForm.setData('name', e.target.value)}
                        required
                        maxLength={100}
                      />
                      {addForm.errors.name && (
                        <div className="invalid-feedback">{addForm.errors.name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-control ${addForm.errors.status ? 'is-invalid' : ''}`}
                        value={addForm.data.status}
                        onChange={(e) => addForm.setData('status', e.target.value)}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {addForm.errors.status && (
                        <div className="invalid-feedback">{addForm.errors.status}</div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAddModal}>
                      Cancel
                    </button>
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
          <div
            className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`}
            onClick={closeEditModal}
          ></div>
          <div
            className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`}
            tabIndex="-1"
            style={{ zIndex: 1050 }}
          >
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
                      <label>
                        Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${editForm.errors.name ? 'is-invalid' : ''}`}
                        value={editForm.data.name}
                        onChange={(e) => editForm.setData('name', e.target.value)}
                        required
                        maxLength={100}
                      />
                      {editForm.errors.name && (
                        <div className="invalid-feedback">{editForm.errors.name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-control ${editForm.errors.status ? 'is-invalid' : ''}`}
                        value={editForm.data.status}
                        onChange={(e) => editForm.setData('status', e.target.value)}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {editForm.errors.status && (
                        <div className="invalid-feedback">{editForm.errors.status}</div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                      Cancel
                    </button>
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
          <div
            className={`modal-backdrop fade ${showRemoveModalAnimation ? 'show' : ''}`}
            onClick={closeRemoveModal}
          ></div>
          <div
            className={`modal fade ${showRemoveModalAnimation ? 'show' : ''} d-block`}
            tabIndex="-1"
            style={{ zIndex: 1050 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Confirm Delete</h4>
                  <button type="button" className="close" onClick={closeRemoveModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p>
                    Are you sure you want to delete <strong>{paymentMethodToRemove.name}</strong>?
                  </p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmDeletePaymentMethod}
                  >
                    Delete Payment Method
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
