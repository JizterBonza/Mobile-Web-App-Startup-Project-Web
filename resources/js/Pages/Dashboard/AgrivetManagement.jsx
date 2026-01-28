import { useState, useEffect } from 'react'
import { useForm, router, Link } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'

export default function AgrivetManagement({ auth, agrivets = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedAgrivet, setSelectedAgrivet] = useState(null)
  const [agrivetToRemove, setAgrivetToRemove] = useState(null)

  const addForm = useForm({
    name: '',
    registered_business_name: '',
    owner_name: '',
    description: '',
    address: '',
    contact_number: '',
    email: '',
    permits: '',
    logo_url: '',
    status: 'active',
  })

  const editForm = useForm({
    name: '',
    registered_business_name: '',
    owner_name: '',
    description: '',
    address: '',
    contact_number: '',
    email: '',
    permits: '',
    logo_url: '',
    status: 'active',
  })

  // Handle add modal animation
  useEffect(() => {
    if (showAddModal) {
      setTimeout(() => setShowAddModalAnimation(true), 10)
    } else {
      setShowAddModalAnimation(false)
    }
  }, [showAddModal])

  // Handle edit modal animation
  useEffect(() => {
    if (showEditModal) {
      setTimeout(() => setShowEditModalAnimation(true), 10)
    } else {
      setShowEditModalAnimation(false)
    }
  }, [showEditModal])

  // Handle remove modal animation
  useEffect(() => {
    if (showRemoveModal) {
      setTimeout(() => setShowRemoveModalAnimation(true), 10)
    } else {
      setShowRemoveModalAnimation(false)
    }
  }, [showRemoveModal])

  // Modal close handlers with animation
  const closeAddModal = () => {
    setShowAddModalAnimation(false)
    setTimeout(() => {
      setShowAddModal(false)
      addForm.reset()
    }, 300)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedAgrivet(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setAgrivetToRemove(null)
    }, 300)
  }

  // Show success/error messages
  useEffect(() => {
    if (flash?.success) {
      closeAddModal()
      closeEditModal()
      closeRemoveModal()
      addForm.reset()
      editForm.reset()
      setAgrivetToRemove(null)
    }
  }, [flash])

  // Determine base route based on user type
  const getBaseRoute = () => {
    return auth?.user?.user_type === 'admin' 
      ? '/dashboard/admin/agrivets' 
      : '/dashboard/super-admin/agrivets'
  }

  const handleAddAgrivet = (e) => {
    e.preventDefault()
    addForm.post(getBaseRoute(), {
      preserveScroll: true,
      onSuccess: () => {
        addForm.reset()
      },
    })
  }

  const handleEditAgrivet = (agrivet) => {
    setSelectedAgrivet(agrivet)
    editForm.setData({
      name: agrivet.name,
      registered_business_name: agrivet.registered_business_name || '',
      owner_name: agrivet.owner_name || '',
      description: agrivet.description || '',
      address: agrivet.address || '',
      contact_number: agrivet.contact_number || '',
      email: agrivet.email || '',
      permits: agrivet.permits || '',
      logo_url: agrivet.logo_url || '',
      status: agrivet.status,
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateAgrivet = (e) => {
    e.preventDefault()
    editForm.put(`${getBaseRoute()}/${selectedAgrivet.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeEditModal()
      },
    })
  }

  const handleDeactivateAgrivet = (agrivetId) => {
    const agrivet = agrivets.find(a => a.id === agrivetId)
    setAgrivetToRemove(agrivet)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmRemoveAgrivet = () => {
    if (agrivetToRemove) {
      router.delete(`${getBaseRoute()}/${agrivetToRemove.id}`, {
        preserveScroll: true,
        onSuccess: () => {
          closeRemoveModal()
        },
      })
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="badge badge-success">Active</span>
    }
    return <span className="badge badge-danger">Inactive</span>
  }

  return (
    <AdminLayout auth={auth} title="Agrivet Management">
      {/* Flash Messages */}
      {flash?.success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={() => router.reload({ only: ['flash'] })}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {flash?.error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {flash.error}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={() => router.reload({ only: ['flash'] })}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Agrivet List</h3>
              <div className="card-tools">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowAddModal(true)
                    setShowAddModalAnimation(false)
                  }}
                >
                  <i className="fas fa-plus"></i> Add Agrivet
                </button>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Agrivet Name</th>
                    <th>Contact Number</th>
                    <th>Email</th>
                    <th>Shops</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agrivets.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center">No agrivets found</td>
                    </tr>
                  ) : (
                    agrivets.map((agrivet) => (
                      <tr key={agrivet.id}>
                        <td>{agrivet.id}</td>
                        <td>{agrivet.name}</td>
                        <td>{agrivet.contact_number || '-'}</td>
                        <td>{agrivet.email || '-'}</td>
                        <td>
                          <span className="badge badge-info">{agrivet.shops_count || 0} shop(s)</span>
                        </td>
                        <td>{getStatusBadge(agrivet.status)}</td>
                        <td>{new Date(agrivet.created_at).toLocaleDateString()}</td>
                        <td>
                          <Link
                            href={`${getBaseRoute()}/${agrivet.id}/shops`}
                            className="btn btn-sm btn-success mr-1"
                            title="View Shops"
                          >
                            <i className="fas fa-store"></i>
                          </Link>
                          <button
                            className="btn btn-sm btn-info mr-1"
                            onClick={() => handleEditAgrivet(agrivet)}
                            title="Edit Agrivet"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {agrivet.status === 'active' && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeactivateAgrivet(agrivet.id)}
                              title="Deactivate Agrivet"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
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

      {/* Add Agrivet Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Agrivet</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeAddModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddAgrivet}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Store Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.name ? 'is-invalid' : ''}`}
                            value={addForm.data.name}
                            onChange={(e) => addForm.setData('name', e.target.value)}
                            required
                          />
                          {addForm.errors.name && (
                            <div className="invalid-feedback">{addForm.errors.name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Registered Business Name</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.registered_business_name ? 'is-invalid' : ''}`}
                            value={addForm.data.registered_business_name}
                            onChange={(e) => addForm.setData('registered_business_name', e.target.value)}
                          />
                          {addForm.errors.registered_business_name && (
                            <div className="invalid-feedback">{addForm.errors.registered_business_name}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Point of Contact Person Name</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.owner_name ? 'is-invalid' : ''}`}
                            value={addForm.data.owner_name}
                            onChange={(e) => addForm.setData('owner_name', e.target.value)}
                          />
                          {addForm.errors.owner_name && (
                            <div className="invalid-feedback">{addForm.errors.owner_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
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
                          {addForm.errors.status && (
                            <div className="invalid-feedback">{addForm.errors.status}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            className={`form-control ${addForm.errors.description ? 'is-invalid' : ''}`}
                            value={addForm.data.description}
                            onChange={(e) => addForm.setData('description', e.target.value)}
                            rows="2"
                          />
                          {addForm.errors.description && (
                            <div className="invalid-feedback">{addForm.errors.description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Address</label>
                          <textarea
                            className={`form-control ${addForm.errors.address ? 'is-invalid' : ''}`}
                            value={addForm.data.address}
                            onChange={(e) => addForm.setData('address', e.target.value)}
                            rows="2"
                            placeholder="Enter full address details"
                          />
                          {addForm.errors.address && (
                            <div className="invalid-feedback">{addForm.errors.address}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Contact Number</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.contact_number ? 'is-invalid' : ''}`}
                            value={addForm.data.contact_number}
                            onChange={(e) => addForm.setData('contact_number', e.target.value)}
                          />
                          {addForm.errors.contact_number && (
                            <div className="invalid-feedback">{addForm.errors.contact_number}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Email</label>
                          <input
                            type="email"
                            className={`form-control ${addForm.errors.email ? 'is-invalid' : ''}`}
                            value={addForm.data.email}
                            onChange={(e) => addForm.setData('email', e.target.value)}
                          />
                          {addForm.errors.email && (
                            <div className="invalid-feedback">{addForm.errors.email}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Necessary Permits for Operation</label>
                          <textarea
                            className={`form-control ${addForm.errors.permits ? 'is-invalid' : ''}`}
                            value={addForm.data.permits}
                            onChange={(e) => addForm.setData('permits', e.target.value)}
                            rows="3"
                            placeholder="List all necessary permits (e.g., Business Permit, DTI Registration, etc.)"
                          />
                          {addForm.errors.permits && (
                            <div className="invalid-feedback">{addForm.errors.permits}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Logo URL</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.logo_url ? 'is-invalid' : ''}`}
                            value={addForm.data.logo_url}
                            onChange={(e) => addForm.setData('logo_url', e.target.value)}
                            placeholder="https://example.com/logo.png"
                          />
                          {addForm.errors.logo_url && (
                            <div className="invalid-feedback">{addForm.errors.logo_url}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="alert alert-info mt-3 mb-0">
                      <i className="fas fa-info-circle mr-2"></i>
                      After creating the agrivet, you can add shops from the "View Shops" button.
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeAddModal}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                      {addForm.processing ? 'Creating...' : 'Create Agrivet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Agrivet Modal */}
      {showEditModal && selectedAgrivet && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Agrivet</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeEditModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateAgrivet}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Store Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.name ? 'is-invalid' : ''}`}
                            value={editForm.data.name}
                            onChange={(e) => editForm.setData('name', e.target.value)}
                            required
                          />
                          {editForm.errors.name && (
                            <div className="invalid-feedback">{editForm.errors.name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Registered Business Name</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.registered_business_name ? 'is-invalid' : ''}`}
                            value={editForm.data.registered_business_name}
                            onChange={(e) => editForm.setData('registered_business_name', e.target.value)}
                          />
                          {editForm.errors.registered_business_name && (
                            <div className="invalid-feedback">{editForm.errors.registered_business_name}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Owner/Point of Contact Person Name</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.owner_name ? 'is-invalid' : ''}`}
                            value={editForm.data.owner_name}
                            onChange={(e) => editForm.setData('owner_name', e.target.value)}
                          />
                          {editForm.errors.owner_name && (
                            <div className="invalid-feedback">{editForm.errors.owner_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
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
                          {editForm.errors.status && (
                            <div className="invalid-feedback">{editForm.errors.status}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            className={`form-control ${editForm.errors.description ? 'is-invalid' : ''}`}
                            value={editForm.data.description}
                            onChange={(e) => editForm.setData('description', e.target.value)}
                            rows="2"
                          />
                          {editForm.errors.description && (
                            <div className="invalid-feedback">{editForm.errors.description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Address</label>
                          <textarea
                            className={`form-control ${editForm.errors.address ? 'is-invalid' : ''}`}
                            value={editForm.data.address}
                            onChange={(e) => editForm.setData('address', e.target.value)}
                            rows="2"
                            placeholder="Enter full address details"
                          />
                          {editForm.errors.address && (
                            <div className="invalid-feedback">{editForm.errors.address}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Contact Number</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.contact_number ? 'is-invalid' : ''}`}
                            value={editForm.data.contact_number}
                            onChange={(e) => editForm.setData('contact_number', e.target.value)}
                          />
                          {editForm.errors.contact_number && (
                            <div className="invalid-feedback">{editForm.errors.contact_number}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Email</label>
                          <input
                            type="email"
                            className={`form-control ${editForm.errors.email ? 'is-invalid' : ''}`}
                            value={editForm.data.email}
                            onChange={(e) => editForm.setData('email', e.target.value)}
                          />
                          {editForm.errors.email && (
                            <div className="invalid-feedback">{editForm.errors.email}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Necessary Permits for Operation</label>
                          <textarea
                            className={`form-control ${editForm.errors.permits ? 'is-invalid' : ''}`}
                            value={editForm.data.permits}
                            onChange={(e) => editForm.setData('permits', e.target.value)}
                            rows="3"
                            placeholder="List all necessary permits (e.g., Business Permit, DTI Registration, etc.)"
                          />
                          {editForm.errors.permits && (
                            <div className="invalid-feedback">{editForm.errors.permits}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Logo URL</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.logo_url ? 'is-invalid' : ''}`}
                            value={editForm.data.logo_url}
                            onChange={(e) => editForm.setData('logo_url', e.target.value)}
                            placeholder="https://example.com/logo.png"
                          />
                          {editForm.errors.logo_url && (
                            <div className="invalid-feedback">{editForm.errors.logo_url}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="alert alert-info mt-3 mb-0">
                      <i className="fas fa-info-circle mr-2"></i>
                      To manage shops for this agrivet, use the "View Shops" button in the agrivet list.
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeEditModal}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={editForm.processing}>
                      {editForm.processing ? 'Updating...' : 'Update Agrivet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remove Agrivet Confirmation Modal */}
      {showRemoveModal && agrivetToRemove && (
        <>
          <div className={`modal-backdrop fade ${showRemoveModalAnimation ? 'show' : ''}`} onClick={closeRemoveModal}></div>
          <div className={`modal fade ${showRemoveModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Confirm Deactivation</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeRemoveModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p>
                    Are you sure you want to deactivate <strong>{agrivetToRemove.name}</strong>?
                  </p>
                  <p className="text-muted mb-0">
                    This will set the status to "Inactive". The agrivet will not be visible to users.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeRemoveModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmRemoveAgrivet}
                  >
                    Deactivate Agrivet
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

