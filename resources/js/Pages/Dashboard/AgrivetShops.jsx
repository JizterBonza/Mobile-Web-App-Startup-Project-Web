import { useState, useEffect } from 'react'
import { useForm, router, Link } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'
import PinLocationMap from '../../Components/PinLocationMap'

export default function AgrivetShops({ auth, agrivet, shops = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedShop, setSelectedShop] = useState(null)
  const [shopToRemove, setShopToRemove] = useState(null)

  const addForm = useForm({
    shop_name: '',
    shop_description: '',
    shop_address: '',
    shop_city: '',
    shop_postal_code: '',
    shop_lat: '',
    shop_long: '',
    contact_number: '',
    shop_status: 'active',
  })

  const editForm = useForm({
    shop_name: '',
    shop_description: '',
    shop_address: '',
    shop_city: '',
    shop_postal_code: '',
    shop_lat: '',
    shop_long: '',
    contact_number: '',
    shop_status: 'active',
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
      setSelectedShop(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setShopToRemove(null)
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
      setShopToRemove(null)
    }
  }, [flash])

  // Determine base route based on user type
  const getBaseRoute = () => {
    return auth?.user?.user_type === 'admin' 
      ? '/dashboard/admin/agrivets' 
      : '/dashboard/super-admin/agrivets'
  }

  const handleAddShop = (e) => {
    e.preventDefault()
    addForm.post(`${getBaseRoute()}/${agrivet.id}/shops`, {
      preserveScroll: true,
      onSuccess: () => {
        addForm.reset()
      },
    })
  }

  const handleEditShop = (shop) => {
    setSelectedShop(shop)
    editForm.setData({
      shop_name: shop.shop_name,
      shop_description: shop.shop_description || '',
      shop_address: shop.shop_address || '',
      shop_city: shop.shop_city || '',
      shop_postal_code: shop.shop_postal_code || '',
      shop_lat: shop.shop_lat || '',
      shop_long: shop.shop_long || '',
      contact_number: shop.contact_number || '',
      shop_status: shop.shop_status || 'active',
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateShop = (e) => {
    e.preventDefault()
    editForm.put(`${getBaseRoute()}/${agrivet.id}/shops/${selectedShop.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeEditModal()
      },
    })
  }

  const handleRemoveShop = (shopId) => {
    const shop = shops.find(s => s.id === shopId)
    setShopToRemove(shop)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmRemoveShop = () => {
    if (shopToRemove) {
      router.delete(`${getBaseRoute()}/${agrivet.id}/shops/${shopToRemove.id}`, {
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
    <AdminLayout auth={auth} title={`Shops - ${agrivet.name}`}>
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
              <h3 className="card-title">Shops for {agrivet.name}</h3>
              <div className="card-tools">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowAddModal(true)
                    setShowAddModalAnimation(false)
                  }}
                >
                  <i className="fas fa-plus"></i> Add Shop
                </button>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Shop Name</th>
                    <th>Address</th>
                    <th>Contact</th>
                    <th>Vendors</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center">No shops found</td>
                    </tr>
                  ) : (
                    shops.map((shop) => (
                      <tr key={shop.id}>
                        <td>{shop.id}</td>
                        <td>{shop.shop_name}</td>
                        <td>{shop.shop_address || '-'}</td>
                        <td>{shop.contact_number || '-'}</td>
                        <td>
                          <span className="badge badge-info">{shop.vendors_count || 0} vendor(s)</span>
                        </td>
                        <td>
                          <span className="badge badge-warning">
                            <i className="fas fa-star mr-1"></i>
                            {shop.average_rating || '0.00'} ({shop.total_reviews || 0})
                          </span>
                        </td>
                        <td>{getStatusBadge(shop.shop_status)}</td>
                        <td>{new Date(shop.created_at).toLocaleDateString()}</td>
                        <td>
                          <Link
                            href={`${getBaseRoute()}/${agrivet.id}/shops/${shop.id}/vendors`}
                            className="btn btn-sm btn-primary mr-1"
                            title="View Vendors"
                          >
                            <i className="fas fa-users"></i>
                          </Link>
                          <button
                            className="btn btn-sm btn-info mr-1"
                            onClick={() => handleEditShop(shop)}
                            title="Edit Shop"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {shop.shop_status === 'active' && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRemoveShop(shop.id)}
                              title="Deactivate Shop"
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

      {/* Add Shop Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Shop</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeAddModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddShop}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Shop Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_name ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_name}
                            onChange={(e) => addForm.setData('shop_name', e.target.value)}
                            required
                          />
                          {addForm.errors.shop_name && (
                            <div className="invalid-feedback">{addForm.errors.shop_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Status <span className="text-danger">*</span></label>
                          <select
                            className={`form-control ${addForm.errors.shop_status ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_status}
                            onChange={(e) => addForm.setData('shop_status', e.target.value)}
                            required
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          {addForm.errors.shop_status && (
                            <div className="invalid-feedback">{addForm.errors.shop_status}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            className={`form-control ${addForm.errors.shop_description ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_description}
                            onChange={(e) => addForm.setData('shop_description', e.target.value)}
                            rows="2"
                          />
                          {addForm.errors.shop_description && (
                            <div className="invalid-feedback">{addForm.errors.shop_description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Pin Location</label>
                          <PinLocationMap
                            initialLat={addForm.data.shop_lat ? parseFloat(addForm.data.shop_lat) : undefined}
                            initialLng={addForm.data.shop_long ? parseFloat(addForm.data.shop_long) : undefined}
                            initialAddress={addForm.data.shop_address}
                            initialCity={addForm.data.shop_city}
                            initialPostalCode={addForm.data.shop_postal_code}
                            onLocationSelect={(loc) => {
                              addForm.setData({
                                shop_lat: loc.latitude,
                                shop_long: loc.longitude,
                              })
                            }}
                            height={320}
                            error={addForm.errors.shop_address}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Address</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_address ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_address}
                            onChange={(e) => addForm.setData('shop_address', e.target.value)}
                            placeholder="Enter address"
                          />
                          {addForm.errors.shop_address && (
                            <div className="invalid-feedback">{addForm.errors.shop_address}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>City</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_city ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_city}
                            onChange={(e) => addForm.setData('shop_city', e.target.value)}
                            placeholder="Enter city"
                          />
                          {addForm.errors.shop_city && (
                            <div className="invalid-feedback">{addForm.errors.shop_city}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Postal Code</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_postal_code ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_postal_code}
                            onChange={(e) => addForm.setData('shop_postal_code', e.target.value)}
                            placeholder="Enter postal code"
                          />
                          {addForm.errors.shop_postal_code && (
                            <div className="invalid-feedback">{addForm.errors.shop_postal_code}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Latitude</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_lat ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_lat}
                            onChange={(e) => addForm.setData('shop_lat', e.target.value)}
                            placeholder="Auto-filled"
                          />
                          {addForm.errors.shop_lat && (
                            <div className="invalid-feedback">{addForm.errors.shop_lat}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Longitude</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_long ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_long}
                            onChange={(e) => addForm.setData('shop_long', e.target.value)}
                            placeholder="Auto-filled"
                          />
                          {addForm.errors.shop_long && (
                            <div className="invalid-feedback">{addForm.errors.shop_long}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
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
                      {addForm.processing ? 'Creating...' : 'Create Shop'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Shop Modal */}
      {showEditModal && selectedShop && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Shop</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeEditModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateShop}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Shop Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_name ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_name}
                            onChange={(e) => editForm.setData('shop_name', e.target.value)}
                            required
                          />
                          {editForm.errors.shop_name && (
                            <div className="invalid-feedback">{editForm.errors.shop_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Status <span className="text-danger">*</span></label>
                          <select
                            className={`form-control ${editForm.errors.shop_status ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_status}
                            onChange={(e) => editForm.setData('shop_status', e.target.value)}
                            required
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          {editForm.errors.shop_status && (
                            <div className="invalid-feedback">{editForm.errors.shop_status}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            className={`form-control ${editForm.errors.shop_description ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_description}
                            onChange={(e) => editForm.setData('shop_description', e.target.value)}
                            rows="2"
                          />
                          {editForm.errors.shop_description && (
                            <div className="invalid-feedback">{editForm.errors.shop_description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Pin Location</label>
                          <PinLocationMap
                            initialLat={editForm.data.shop_lat ? parseFloat(editForm.data.shop_lat) : undefined}
                            initialLng={editForm.data.shop_long ? parseFloat(editForm.data.shop_long) : undefined}
                            initialAddress={editForm.data.shop_address}
                            initialCity={editForm.data.shop_city}
                            initialPostalCode={editForm.data.shop_postal_code}
                            onLocationSelect={(loc) => {
                              editForm.setData({
                                shop_address: loc.address,
                                shop_city: loc.city ?? '',
                                shop_postal_code: loc.postal_code ?? '',
                                shop_lat: loc.latitude,
                                shop_long: loc.longitude,
                              })
                            }}
                            height={320}
                            error={editForm.errors.shop_address}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Address</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_address ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_address}
                            onChange={(e) => editForm.setData('shop_address', e.target.value)}
                            placeholder="Filled by pinned location"
                            readOnly
                          />
                          {editForm.errors.shop_address && (
                            <div className="invalid-feedback">{editForm.errors.shop_address}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>City</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_city ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_city}
                            onChange={(e) => editForm.setData('shop_city', e.target.value)}
                            placeholder="Auto-filled or enter city"
                          />
                          {editForm.errors.shop_city && (
                            <div className="invalid-feedback">{editForm.errors.shop_city}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Postal Code</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_postal_code ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_postal_code}
                            onChange={(e) => editForm.setData('shop_postal_code', e.target.value)}
                            placeholder="Auto-filled or enter postal code"
                          />
                          {editForm.errors.shop_postal_code && (
                            <div className="invalid-feedback">{editForm.errors.shop_postal_code}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Latitude</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_lat ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_lat}
                            onChange={(e) => editForm.setData('shop_lat', e.target.value)}
                            placeholder="Auto-filled"
                          />
                          {editForm.errors.shop_lat && (
                            <div className="invalid-feedback">{editForm.errors.shop_lat}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Longitude</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_long ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_long}
                            onChange={(e) => editForm.setData('shop_long', e.target.value)}
                            placeholder="Auto-filled"
                          />
                          {editForm.errors.shop_long && (
                            <div className="invalid-feedback">{editForm.errors.shop_long}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
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
                    </div>

                    {/* Read-only Shop Stats */}
                    <hr className="my-4" />
                    <h5 className="text-info mb-3"><i className="fas fa-chart-bar mr-2"></i>Shop Statistics (Read-only)</h5>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Average Rating</label>
                          <input
                            type="text"
                            className="form-control"
                            value={selectedShop.average_rating || '0.00'}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Total Reviews</label>
                          <input
                            type="text"
                            className="form-control"
                            value={selectedShop.total_reviews || '0'}
                            readOnly
                            disabled
                          />
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
                      {editForm.processing ? 'Updating...' : 'Update Shop'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remove Shop Confirmation Modal */}
      {showRemoveModal && shopToRemove && (
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
                    Are you sure you want to deactivate <strong>{shopToRemove.shop_name}</strong>?
                  </p>
                  <p className="text-muted mb-0">
                    This will set the shop status to "Inactive". The shop will not be visible to users.
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
                    onClick={confirmRemoveShop}
                  >
                    Deactivate Shop
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
