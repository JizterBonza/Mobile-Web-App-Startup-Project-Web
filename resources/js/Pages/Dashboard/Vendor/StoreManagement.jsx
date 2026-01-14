import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../../Layouts/AdminLayout'
import AddressAutocomplete from '../../../Components/AddressAutocomplete'

export default function StoreManagement({ auth, shop, agrivet, flash }) {
  const [showModal, setShowModal] = useState(false)
  const [showModalAnimation, setShowModalAnimation] = useState(false)

  const form = useForm({
    shop_name: shop?.shop_name || '',
    shop_description: shop?.shop_description || '',
    shop_address: shop?.shop_address || '',
    shop_lat: shop?.shop_lat || '',
    shop_long: shop?.shop_long || '',
    contact_number: shop?.contact_number || '',
    shop_status: shop?.shop_status || 'active',
  })

  useEffect(() => {
    if (showModal) {
      setTimeout(() => setShowModalAnimation(true), 10)
    } else {
      setShowModalAnimation(false)
    }
  }, [showModal])

  const closeModal = () => {
    setShowModalAnimation(false)
    setTimeout(() => {
      setShowModal(false)
    }, 300)
  }

  useEffect(() => {
    if (flash?.success) {
      closeModal()
    }
  }, [flash])

  const handleSubmit = (e) => {
    e.preventDefault()
    form.post('/dashboard/vendor/store', {
      preserveScroll: true,
      onSuccess: () => {
        // Form will be updated with new data from server
      },
    })
  }

  return (
    <AdminLayout auth={auth} title="Store Management">
      {/* Flash Messages */}
      {flash?.success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={(e) => {
            e.preventDefault()
            router.visit(window.location.pathname, { 
              preserveState: true,
              preserveScroll: true
            })
          }}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {flash?.error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {flash.error}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={(e) => {
            e.preventDefault()
            router.visit(window.location.pathname, { 
              preserveState: true,
              preserveScroll: true
            })
          }}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {/* Shop Information Card */}
      <div className="row">
        <div className="col-12">
          <div className="card card-primary card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-store mr-2"></i>
                Shop Information
              </h3>
              <div className="card-tools">
                {shop && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setShowModal(true)
                      setShowModalAnimation(false)
                    }}
                  >
                    <i className="fas fa-edit"></i> Edit Shop Information
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              {shop ? (
                <div className="row">
                  <div className="col-md-6">
                    <dl className="row">
                      <dt className="col-sm-4">Shop Name:</dt>
                      <dd className="col-sm-8">{shop.shop_name}</dd>
                      
                      <dt className="col-sm-4">Description:</dt>
                      <dd className="col-sm-8">{shop.shop_description || <span className="text-muted">N/A</span>}</dd>
                      
                      <dt className="col-sm-4">Address:</dt>
                      <dd className="col-sm-8">{shop.shop_address || <span className="text-muted">N/A</span>}</dd>
                      
                      <dt className="col-sm-4">Contact Number:</dt>
                      <dd className="col-sm-8">{shop.contact_number || <span className="text-muted">N/A</span>}</dd>
                    </dl>
                  </div>
                  <div className="col-md-6">
                    <dl className="row">
                      <dt className="col-sm-4">Status:</dt>
                      <dd className="col-sm-8">
                        <span className={`badge badge-${shop.shop_status === 'active' ? 'success' : 'danger'}`}>
                          {shop.shop_status}
                        </span>
                      </dd>
                      
                      <dt className="col-sm-4">Rating:</dt>
                      <dd className="col-sm-8">
                        <i className="fas fa-star text-warning mr-1"></i>
                        {parseFloat(shop.average_rating || 0).toFixed(1)} ({shop.total_reviews || 0} reviews)
                      </dd>
                      
                      <dt className="col-sm-4">Created:</dt>
                      <dd className="col-sm-8">{new Date(shop.created_at).toLocaleDateString()}</dd>
                      
                      <dt className="col-sm-4">Last Updated:</dt>
                      <dd className="col-sm-8">{new Date(shop.updated_at).toLocaleDateString()}</dd>
                    </dl>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-store fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No shop information found. Please contact an administrator.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agrivet Information Card (Read-Only) */}
      {agrivet && (
        <div className="row">
          <div className="col-12">
            <div className="card card-secondary card-outline">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-building mr-2"></i>
                  Agrivet Information
                </h3>
                <div className="card-tools">
                  <span className="badge badge-secondary">
                    <i className="fas fa-lock mr-1"></i> Read Only
                  </span>
                </div>
              </div>
              <div className="card-body">
                <p className="text-muted mb-3">
                  <small>
                    <i className="fas fa-info-circle mr-1"></i>
                    Your shop belongs to this Agrivet. Contact the administrator to update Agrivet information.
                  </small>
                </p>
                <div className="row">
                  <div className="col-md-6">
                    <dl className="row">
                      <dt className="col-sm-4">Agrivet Name:</dt>
                      <dd className="col-sm-8">{agrivet.name}</dd>
                      
                      <dt className="col-sm-4">Description:</dt>
                      <dd className="col-sm-8">{agrivet.description || <span className="text-muted">N/A</span>}</dd>
                    </dl>
                  </div>
                  <div className="col-md-6">
                    <dl className="row">
                      <dt className="col-sm-4">Contact:</dt>
                      <dd className="col-sm-8">{agrivet.contact_number || <span className="text-muted">N/A</span>}</dd>
                      
                      <dt className="col-sm-4">Email:</dt>
                      <dd className="col-sm-8">{agrivet.email || <span className="text-muted">N/A</span>}</dd>
                      
                      <dt className="col-sm-4">Status:</dt>
                      <dd className="col-sm-8">
                        <span className={`badge badge-${agrivet.status === 'active' ? 'success' : 'danger'}`}>
                          {agrivet.status}
                        </span>
                      </dd>
                    </dl>
                  </div>
                </div>
                {agrivet.logo_url && (
                  <div className="text-center mt-3">
                    <img 
                      src={agrivet.logo_url} 
                      alt={`${agrivet.name} Logo`} 
                      className="img-thumbnail"
                      style={{ maxHeight: '100px' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shop Modal */}
      {showModal && (
        <>
          <div className={`modal-backdrop fade ${showModalAnimation ? 'show' : ''}`} onClick={closeModal}></div>
          <div className={`modal fade ${showModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h4 className="modal-title">
                    <i className="fas fa-edit mr-2"></i>
                    Edit Shop Information
                  </h4>
                  <button type="button" className="close text-white" onClick={closeModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Shop Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${form.errors.shop_name ? 'is-invalid' : ''}`}
                        value={form.data.shop_name}
                        onChange={(e) => form.setData('shop_name', e.target.value)}
                        required
                      />
                      {form.errors.shop_name && (
                        <div className="invalid-feedback">{form.errors.shop_name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className={`form-control ${form.errors.shop_description ? 'is-invalid' : ''}`}
                        value={form.data.shop_description}
                        onChange={(e) => form.setData('shop_description', e.target.value)}
                        rows="3"
                      />
                      {form.errors.shop_description && (
                        <div className="invalid-feedback">{form.errors.shop_description}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Address</label>
                      <AddressAutocomplete
                        value={form.data.shop_address}
                        onChange={(address) => form.setData('shop_address', address)}
                        onPlaceSelect={(place) => {
                          form.setData({
                            ...form.data,
                            shop_address: place.address,
                            shop_lat: place.lat || '',
                            shop_long: place.lng || '',
                          })
                        }}
                        placeholder="Enter shop address"
                        error={form.errors.shop_address}
                      />
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Latitude <small className="text-muted">(auto-filled from address)</small></label>
                          <input
                            type="number"
                            step="any"
                            className={`form-control ${form.errors.shop_lat ? 'is-invalid' : ''}`}
                            value={form.data.shop_lat}
                            onChange={(e) => form.setData('shop_lat', e.target.value)}
                            placeholder="Auto-filled when address is selected"
                          />
                          {form.errors.shop_lat && (
                            <div className="invalid-feedback">{form.errors.shop_lat}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Longitude <small className="text-muted">(auto-filled from address)</small></label>
                          <input
                            type="number"
                            step="any"
                            className={`form-control ${form.errors.shop_long ? 'is-invalid' : ''}`}
                            value={form.data.shop_long}
                            onChange={(e) => form.setData('shop_long', e.target.value)}
                            placeholder="Auto-filled when address is selected"
                          />
                          {form.errors.shop_long && (
                            <div className="invalid-feedback">{form.errors.shop_long}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Contact Number</label>
                      <input
                        type="text"
                        className={`form-control ${form.errors.contact_number ? 'is-invalid' : ''}`}
                        value={form.data.contact_number}
                        onChange={(e) => form.setData('contact_number', e.target.value)}
                      />
                      {form.errors.contact_number && (
                        <div className="invalid-feedback">{form.errors.contact_number}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Status <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${form.errors.shop_status ? 'is-invalid' : ''}`}
                        value={form.data.shop_status}
                        onChange={(e) => form.setData('shop_status', e.target.value)}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {form.errors.shop_status && (
                        <div className="invalid-feedback">{form.errors.shop_status}</div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={form.processing}>
                      {form.processing ? 'Saving...' : 'Save Shop'}
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
