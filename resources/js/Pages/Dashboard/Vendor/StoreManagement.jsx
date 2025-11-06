import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../../Layouts/AdminLayout'

export default function StoreManagement({ auth, store, flash }) {
  const [showModal, setShowModal] = useState(false)
  const [showModalAnimation, setShowModalAnimation] = useState(false)

  const form = useForm({
    shop_name: store?.shop_name || '',
    shop_description: store?.shop_description || '',
    shop_address: store?.shop_address || '',
    shop_lat: store?.shop_lat || '',
    shop_long: store?.shop_long || '',
    contact_number: store?.contact_number || '',
    logo_url: store?.logo_url || '',
    shop_status: store?.shop_status || 'active',
    email: store?.email || '',
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
        form.reset()
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

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Store Information</h3>
              <div className="card-tools">
                {store && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setShowModal(true)
                      setShowModalAnimation(false)
                    }}
                  >
                    <i className="fas fa-edit"></i> Edit Agrivet Information
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              {store ? (
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Store Name:</strong> {store.shop_name}</p>
                    <p><strong>Description:</strong> {store.shop_description || 'N/A'}</p>
                    <p><strong>Address:</strong> {store.shop_address || 'N/A'}</p>
                    <p><strong>Contact Number:</strong> {store.contact_number || 'N/A'}</p>
                    {store.email && <p><strong>Email:</strong> {store.email}</p>}
                  </div>
                  <div className="col-md-6">
                    <p><strong>Status:</strong> 
                      <span className={`badge badge-${store.shop_status === 'active' ? 'success' : 'danger'} ml-2`}>
                        {store.shop_status}
                      </span>
                    </p>
                    <p><strong>Created:</strong> {new Date(store.created_at).toLocaleDateString()}</p>
                    <p><strong>Last Updated:</strong> {new Date(store.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No store information found. Please contact an administrator.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Store Modal */}
      {showModal && (
        <>
          <div className={`modal-backdrop fade ${showModalAnimation ? 'show' : ''}`} onClick={closeModal}></div>
          <div className={`modal fade ${showModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Agrivet Information</h4>
                  <button type="button" className="close" onClick={closeModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Store Name <span className="text-danger">*</span></label>
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
                      <input
                        type="text"
                        className={`form-control ${form.errors.shop_address ? 'is-invalid' : ''}`}
                        value={form.data.shop_address}
                        onChange={(e) => form.setData('shop_address', e.target.value)}
                      />
                      {form.errors.shop_address && (
                        <div className="invalid-feedback">{form.errors.shop_address}</div>
                      )}
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Latitude</label>
                          <input
                            type="number"
                            step="any"
                            className={`form-control ${form.errors.shop_lat ? 'is-invalid' : ''}`}
                            value={form.data.shop_lat}
                            onChange={(e) => form.setData('shop_lat', e.target.value)}
                          />
                          {form.errors.shop_lat && (
                            <div className="invalid-feedback">{form.errors.shop_lat}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Longitude</label>
                          <input
                            type="number"
                            step="any"
                            className={`form-control ${form.errors.shop_long ? 'is-invalid' : ''}`}
                            value={form.data.shop_long}
                            onChange={(e) => form.setData('shop_long', e.target.value)}
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
                      <label>Email</label>
                      <input
                        type="email"
                        className={`form-control ${form.errors.email ? 'is-invalid' : ''}`}
                        value={form.data.email || ''}
                        onChange={(e) => form.setData('email', e.target.value)}
                      />
                      {form.errors.email && (
                        <div className="invalid-feedback">{form.errors.email}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Logo URL</label>
                      <input
                        type="text"
                        className={`form-control ${form.errors.logo_url ? 'is-invalid' : ''}`}
                        value={form.data.logo_url}
                        onChange={(e) => form.setData('logo_url', e.target.value)}
                        placeholder="https://example.com/logo.png"
                      />
                      {form.errors.logo_url && (
                        <div className="invalid-feedback">{form.errors.logo_url}</div>
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
                      {form.processing ? 'Saving...' : 'Save Store'}
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

