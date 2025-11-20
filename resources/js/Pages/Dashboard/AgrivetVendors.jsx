import { useState, useEffect } from 'react'
import { useForm, router, Link } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'

export default function AgrivetVendors({ auth, agrivet, vendors = [], availableVendors = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [showAddExistingModal, setShowAddExistingModal] = useState(false)
  const [showAddExistingModalAnimation, setShowAddExistingModalAnimation] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [vendorToRemove, setVendorToRemove] = useState(null)

  const addForm = useForm({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    mobile_number: '',
    password: '',
    password_confirmation: '',
    username: '',
    status: 'active',
  })

  const editForm = useForm({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    mobile_number: '',
    password: '',
    password_confirmation: '',
    username: '',
    status: 'active',
  })

  const addExistingForm = useForm({
    vendor_id: '',
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

  // Handle add existing modal animation
  useEffect(() => {
    if (showAddExistingModal) {
      setTimeout(() => setShowAddExistingModalAnimation(true), 10)
    } else {
      setShowAddExistingModalAnimation(false)
    }
  }, [showAddExistingModal])

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
      setSelectedVendor(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setVendorToRemove(null)
    }, 300)
  }

  const closeAddExistingModal = () => {
    setShowAddExistingModalAnimation(false)
    setTimeout(() => {
      setShowAddExistingModal(false)
      addExistingForm.reset()
    }, 300)
  }

  // Show success/error messages
  useEffect(() => {
    if (flash?.success) {
      closeAddModal()
      closeEditModal()
      closeRemoveModal()
      closeAddExistingModal()
      addForm.reset()
      editForm.reset()
      addExistingForm.reset()
      setVendorToRemove(null)
    }
  }, [flash])

  // Determine base route based on user type
  const getBaseRoute = () => {
    return auth?.user?.user_type === 'admin' 
      ? '/dashboard/admin/agrivets' 
      : '/dashboard/super-admin/agrivets'
  }

  const handleAddVendor = (e) => {
    e.preventDefault()
    addForm.post(`${getBaseRoute()}/${agrivet.id}/vendors`, {
      preserveScroll: true,
      onSuccess: () => {
        addForm.reset()
      },
    })
  }

  const handleEditVendor = (vendor) => {
    setSelectedVendor(vendor)
    editForm.setData({
      first_name: vendor.first_name,
      middle_name: vendor.middle_name || '',
      last_name: vendor.last_name,
      email: vendor.email,
      mobile_number: vendor.mobile_number || '',
      password: '',
      password_confirmation: '',
      username: vendor.username,
      status: vendor.pivot?.status || vendor.status || 'active',
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateVendor = (e) => {
    e.preventDefault()
    editForm.put(`${getBaseRoute()}/${agrivet.id}/vendors/${selectedVendor.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeEditModal()
      },
    })
  }

  const handleRemoveVendor = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId)
    setVendorToRemove(vendor)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmRemoveVendor = () => {
    if (vendorToRemove) {
      router.delete(`${getBaseRoute()}/${agrivet.id}/vendors/${vendorToRemove.id}`, {
        preserveScroll: true,
        onSuccess: () => {
          closeRemoveModal()
        },
      })
    }
  }

  const handleAddExistingVendor = (e) => {
    e.preventDefault()
    addExistingForm.post(`${getBaseRoute()}/${agrivet.id}/vendors/add-existing`, {
      preserveScroll: true,
      onSuccess: () => {
        addExistingForm.reset()
      },
    })
  }

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="badge badge-success">Active</span>
    }
    return <span className="badge badge-danger">Inactive</span>
  }

  return (
    <AdminLayout auth={auth} title={`Vendors - ${agrivet.name}`}>
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

      <div className="row mb-3">
        <div className="col-12">
          <Link href={getBaseRoute()} className="btn btn-secondary btn-sm">
            <i className="fas fa-arrow-left"></i> Back to Agrivets
          </Link>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Vendors for {agrivet.name}</h3>
              <div className="card-tools">
                <button
                  type="button"
                  className="btn btn-success btn-sm mr-2"
                  onClick={() => {
                    setShowAddExistingModal(true)
                    setShowAddExistingModalAnimation(false)
                  }}
                >
                  <i className="fas fa-plus-circle"></i> Add Existing Vendor
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowAddModal(true)
                    setShowAddModalAnimation(false)
                  }}
                >
                  <i className="fas fa-plus"></i> Create New Vendor
                </button>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Username</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center">No vendors found</td>
                    </tr>
                  ) : (
                    vendors.map((vendor) => (
                      <tr key={vendor.id}>
                        <td>{vendor.id}</td>
                        <td>{`${vendor.first_name} ${vendor.middle_name ? vendor.middle_name + ' ' : ''}${vendor.last_name}`}</td>
                        <td>{vendor.email}</td>
                        <td>{vendor.mobile_number || '-'}</td>
                        <td>{vendor.username}</td>
                        <td>{getStatusBadge(vendor.pivot?.status || vendor.status)}</td>
                        <td>{new Date(vendor.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-info mr-1"
                            onClick={() => handleEditVendor(vendor)}
                            title="Edit Vendor"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {(vendor.pivot?.status === 'active' || vendor.status === 'active') && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRemoveVendor(vendor.id)}
                              title="Remove Vendor"
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

      {/* Add New Vendor Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Create New Vendor</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeAddModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddVendor}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>First Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.first_name ? 'is-invalid' : ''}`}
                            value={addForm.data.first_name}
                            onChange={(e) => addForm.setData('first_name', e.target.value)}
                            required
                          />
                          {addForm.errors.first_name && (
                            <div className="invalid-feedback">{addForm.errors.first_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Middle Name</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.middle_name ? 'is-invalid' : ''}`}
                            value={addForm.data.middle_name}
                            onChange={(e) => addForm.setData('middle_name', e.target.value)}
                          />
                          {addForm.errors.middle_name && (
                            <div className="invalid-feedback">{addForm.errors.middle_name}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Last Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.last_name ? 'is-invalid' : ''}`}
                            value={addForm.data.last_name}
                            onChange={(e) => addForm.setData('last_name', e.target.value)}
                            required
                          />
                          {addForm.errors.last_name && (
                            <div className="invalid-feedback">{addForm.errors.last_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Email <span className="text-danger">*</span></label>
                          <input
                            type="email"
                            className={`form-control ${addForm.errors.email ? 'is-invalid' : ''}`}
                            value={addForm.data.email}
                            onChange={(e) => addForm.setData('email', e.target.value)}
                            required
                          />
                          {addForm.errors.email && (
                            <div className="invalid-feedback">{addForm.errors.email}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Mobile Number</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.mobile_number ? 'is-invalid' : ''}`}
                            value={addForm.data.mobile_number}
                            onChange={(e) => addForm.setData('mobile_number', e.target.value)}
                          />
                          {addForm.errors.mobile_number && (
                            <div className="invalid-feedback">{addForm.errors.mobile_number}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Username</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.username ? 'is-invalid' : ''}`}
                            value={addForm.data.username}
                            onChange={(e) => addForm.setData('username', e.target.value)}
                            placeholder="Auto-generated if empty"
                          />
                          {addForm.errors.username && (
                            <div className="invalid-feedback">{addForm.errors.username}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Password <span className="text-danger">*</span></label>
                          <input
                            type="password"
                            className={`form-control ${addForm.errors.password ? 'is-invalid' : ''}`}
                            value={addForm.data.password}
                            onChange={(e) => addForm.setData('password', e.target.value)}
                            required
                          />
                          {addForm.errors.password && (
                            <div className="invalid-feedback">{addForm.errors.password}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Confirm Password <span className="text-danger">*</span></label>
                          <input
                            type="password"
                            className={`form-control ${addForm.errors.password_confirmation ? 'is-invalid' : ''}`}
                            value={addForm.data.password_confirmation}
                            onChange={(e) => addForm.setData('password_confirmation', e.target.value)}
                            required
                          />
                          {addForm.errors.password_confirmation && (
                            <div className="invalid-feedback">{addForm.errors.password_confirmation}</div>
                          )}
                        </div>
                      </div>
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
                      {addForm.processing ? 'Creating...' : 'Create Vendor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Vendor Modal */}
      {showEditModal && selectedVendor && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Vendor</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeEditModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateVendor}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>First Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.first_name ? 'is-invalid' : ''}`}
                            value={editForm.data.first_name}
                            onChange={(e) => editForm.setData('first_name', e.target.value)}
                            required
                          />
                          {editForm.errors.first_name && (
                            <div className="invalid-feedback">{editForm.errors.first_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Middle Name</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.middle_name ? 'is-invalid' : ''}`}
                            value={editForm.data.middle_name}
                            onChange={(e) => editForm.setData('middle_name', e.target.value)}
                          />
                          {editForm.errors.middle_name && (
                            <div className="invalid-feedback">{editForm.errors.middle_name}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Last Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.last_name ? 'is-invalid' : ''}`}
                            value={editForm.data.last_name}
                            onChange={(e) => editForm.setData('last_name', e.target.value)}
                            required
                          />
                          {editForm.errors.last_name && (
                            <div className="invalid-feedback">{editForm.errors.last_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Email <span className="text-danger">*</span></label>
                          <input
                            type="email"
                            className={`form-control ${editForm.errors.email ? 'is-invalid' : ''}`}
                            value={editForm.data.email}
                            onChange={(e) => editForm.setData('email', e.target.value)}
                            required
                          />
                          {editForm.errors.email && (
                            <div className="invalid-feedback">{editForm.errors.email}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Mobile Number</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.mobile_number ? 'is-invalid' : ''}`}
                            value={editForm.data.mobile_number}
                            onChange={(e) => editForm.setData('mobile_number', e.target.value)}
                          />
                          {editForm.errors.mobile_number && (
                            <div className="invalid-feedback">{editForm.errors.mobile_number}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Username</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.username ? 'is-invalid' : ''}`}
                            value={editForm.data.username}
                            onChange={(e) => editForm.setData('username', e.target.value)}
                          />
                          {editForm.errors.username && (
                            <div className="invalid-feedback">{editForm.errors.username}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Password (leave blank to keep current)</label>
                          <input
                            type="password"
                            className={`form-control ${editForm.errors.password ? 'is-invalid' : ''}`}
                            value={editForm.data.password}
                            onChange={(e) => editForm.setData('password', e.target.value)}
                            placeholder="Leave blank to keep current password"
                          />
                          {editForm.errors.password && (
                            <div className="invalid-feedback">{editForm.errors.password}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Confirm Password</label>
                          <input
                            type="password"
                            className={`form-control ${editForm.errors.password_confirmation ? 'is-invalid' : ''}`}
                            value={editForm.data.password_confirmation}
                            onChange={(e) => editForm.setData('password_confirmation', e.target.value)}
                            placeholder="Required if changing password"
                          />
                          {editForm.errors.password_confirmation && (
                            <div className="invalid-feedback">{editForm.errors.password_confirmation}</div>
                          )}
                        </div>
                      </div>
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
                      {editForm.processing ? 'Updating...' : 'Update Vendor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remove Vendor Confirmation Modal */}
      {showRemoveModal && vendorToRemove && (
        <>
          <div className={`modal-backdrop fade ${showRemoveModalAnimation ? 'show' : ''}`} onClick={closeRemoveModal}></div>
          <div className={`modal fade ${showRemoveModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Confirm Removal</h4>
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
                    Are you sure you want to remove{' '}
                    <strong>{vendorToRemove.first_name} {vendorToRemove.middle_name ? vendorToRemove.middle_name + ' ' : ''}{vendorToRemove.last_name}</strong> from this Agrivet?
                  </p>
                  <p className="text-muted mb-0">
                    This will set the vendor's status to "Inactive" for this Agrivet. The vendor will still exist in the system.
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
                    onClick={confirmRemoveVendor}
                  >
                    Remove Vendor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Existing Vendor Modal */}
      {showAddExistingModal && (
        <>
          <div className={`modal-backdrop fade ${showAddExistingModalAnimation ? 'show' : ''}`} onClick={closeAddExistingModal}></div>
          <div className={`modal fade ${showAddExistingModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add Existing Vendor</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeAddExistingModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddExistingVendor}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Select Vendor <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${addExistingForm.errors.vendor_id ? 'is-invalid' : ''}`}
                        value={addExistingForm.data.vendor_id}
                        onChange={(e) => addExistingForm.setData('vendor_id', e.target.value)}
                        required
                      >
                        <option value="">-- Select a vendor --</option>
                        {availableVendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {`${vendor.first_name} ${vendor.middle_name ? vendor.middle_name + ' ' : ''}${vendor.last_name} (${vendor.email})`}
                          </option>
                        ))}
                      </select>
                      {addExistingForm.errors.vendor_id && (
                        <div className="invalid-feedback">{addExistingForm.errors.vendor_id}</div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeAddExistingModal}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={addExistingForm.processing}>
                      {addExistingForm.processing ? 'Adding...' : 'Add Vendor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}

