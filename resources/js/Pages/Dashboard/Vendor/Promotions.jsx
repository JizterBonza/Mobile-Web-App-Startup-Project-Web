import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../../Layouts/AdminLayout'

export default function Promotions({ auth, promotions = [], products = [], promotionTypes = {}, shop, agrivet, flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteModalAnimation, setShowDeleteModalAnimation] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState(null)
  const [promotionToDelete, setPromotionToDelete] = useState(null)

  const addForm = useForm({
    name: '',
    description: '',
    type: 'percentage_off',
    discount_value: '',
    buy_quantity: '',
    get_quantity: '',
    minimum_order_amount: '',
    maximum_discount: '',
    applicable_items: [],
    bundle_items: [],
    bundle_price: '',
    start_date: '',
    end_date: '',
    usage_limit: '',
    per_customer_limit: '',
    promo_code: '',
    status: 'active',
  })

  const editForm = useForm({
    name: '',
    description: '',
    type: 'percentage_off',
    discount_value: '',
    buy_quantity: '',
    get_quantity: '',
    minimum_order_amount: '',
    maximum_discount: '',
    applicable_items: [],
    bundle_items: [],
    bundle_price: '',
    start_date: '',
    end_date: '',
    usage_limit: '',
    per_customer_limit: '',
    promo_code: '',
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
    if (showDeleteModal) {
      setTimeout(() => setShowDeleteModalAnimation(true), 10)
    } else {
      setShowDeleteModalAnimation(false)
    }
  }, [showDeleteModal])

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
      setSelectedPromotion(null)
      editForm.reset()
    }, 300)
  }

  const closeDeleteModal = () => {
    setShowDeleteModalAnimation(false)
    setTimeout(() => {
      setShowDeleteModal(false)
      setPromotionToDelete(null)
    }, 300)
  }

  useEffect(() => {
    if (flash?.success) {
      closeAddModal()
      closeEditModal()
      closeDeleteModal()
      addForm.reset()
      editForm.reset()
    }
  }, [flash])

  const handleAddPromotion = (e) => {
    e.preventDefault()
    addForm.post('/dashboard/vendor/promotions', {
      preserveScroll: true,
      onSuccess: () => {
        addForm.reset()
      },
    })
  }

  const handleEditPromotion = (promotion) => {
    setSelectedPromotion(promotion)
    
    // Format dates for datetime-local input
    const formatDateForInput = (dateStr) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toISOString().slice(0, 16)
    }
    
    editForm.setData({
      name: promotion.name || '',
      description: promotion.description || '',
      type: promotion.type || 'percentage_off',
      discount_value: promotion.discount_value || '',
      buy_quantity: promotion.buy_quantity || '',
      get_quantity: promotion.get_quantity || '',
      minimum_order_amount: promotion.minimum_order_amount || '',
      maximum_discount: promotion.maximum_discount || '',
      applicable_items: promotion.applicable_items || [],
      bundle_items: promotion.bundle_items || [],
      bundle_price: promotion.bundle_price || '',
      start_date: formatDateForInput(promotion.start_date),
      end_date: formatDateForInput(promotion.end_date),
      usage_limit: promotion.usage_limit || '',
      per_customer_limit: promotion.per_customer_limit || '',
      promo_code: promotion.promo_code || '',
      status: promotion.status || 'active',
    })
    
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdatePromotion = (e) => {
    e.preventDefault()
    if (!selectedPromotion) return
    
    editForm.put(`/dashboard/vendor/promotions/${selectedPromotion.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeEditModal()
      },
    })
  }

  const handleDeletePromotion = (promotion) => {
    setPromotionToDelete(promotion)
    setShowDeleteModal(true)
    setShowDeleteModalAnimation(false)
  }

  const confirmDeletePromotion = () => {
    if (promotionToDelete) {
      router.delete(`/dashboard/vendor/promotions/${promotionToDelete.id}`, {
        preserveScroll: true,
        onSuccess: () => {
          closeDeleteModal()
        },
      })
    }
  }

  const getStatusBadge = (status) => {
    const statusColors = {
      'active': 'success',
      'inactive': 'secondary',
      'expired': 'danger',
      'scheduled': 'info',
    }
    const color = statusColors[status] || 'secondary'
    return <span className={`badge badge-${color}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  const getTypeBadge = (type) => {
    const typeColors = {
      'percentage_off': 'primary',
      'fixed_amount_off': 'info',
      'buy_x_get_y': 'warning',
      'bundle': 'success',
      'free_shipping': 'dark',
    }
    const color = typeColors[type] || 'secondary'
    return <span className={`badge badge-${color}`}>{promotionTypes[type] || type}</span>
  }

  const getPromotionValue = (promotion) => {
    switch (promotion.type) {
      case 'percentage_off':
        return `${promotion.discount_value}% OFF`
      case 'fixed_amount_off':
        return `$${parseFloat(promotion.discount_value).toFixed(2)} OFF`
      case 'buy_x_get_y':
        return `Buy ${promotion.buy_quantity} Get ${promotion.get_quantity} FREE`
      case 'bundle':
        return `Bundle: $${parseFloat(promotion.bundle_price).toFixed(2)}`
      case 'free_shipping':
        return 'FREE Shipping'
      default:
        return '-'
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Render type-specific fields for add form
  const renderTypeFields = (form, isEdit = false) => {
    const type = form.data.type

    return (
      <>
        {/* Percentage Off / Fixed Amount Off fields */}
        {(type === 'percentage_off' || type === 'fixed_amount_off') && (
          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label>
                  {type === 'percentage_off' ? 'Discount Percentage' : 'Discount Amount'} <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  {type === 'fixed_amount_off' && <div className="input-group-prepend"><span className="input-group-text">$</span></div>}
                  <input
                    type="number"
                    step={type === 'percentage_off' ? '1' : '0.01'}
                    min="0"
                    max={type === 'percentage_off' ? '100' : undefined}
                    className={`form-control ${form.errors.discount_value ? 'is-invalid' : ''}`}
                    value={form.data.discount_value}
                    onChange={(e) => form.setData('discount_value', e.target.value)}
                    required
                  />
                  {type === 'percentage_off' && <div className="input-group-append"><span className="input-group-text">%</span></div>}
                </div>
                {form.errors.discount_value && <div className="invalid-feedback d-block">{form.errors.discount_value}</div>}
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label>Maximum Discount (Optional)</label>
                <div className="input-group">
                  <div className="input-group-prepend"><span className="input-group-text">$</span></div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`form-control ${form.errors.maximum_discount ? 'is-invalid' : ''}`}
                    value={form.data.maximum_discount}
                    onChange={(e) => form.setData('maximum_discount', e.target.value)}
                    placeholder="No limit"
                  />
                </div>
                {form.errors.maximum_discount && <div className="invalid-feedback d-block">{form.errors.maximum_discount}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Buy X Get Y fields */}
        {type === 'buy_x_get_y' && (
          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label>Buy Quantity <span className="text-danger">*</span></label>
                <input
                  type="number"
                  min="1"
                  className={`form-control ${form.errors.buy_quantity ? 'is-invalid' : ''}`}
                  value={form.data.buy_quantity}
                  onChange={(e) => form.setData('buy_quantity', e.target.value)}
                  placeholder="e.g., 1"
                  required
                />
                {form.errors.buy_quantity && <div className="invalid-feedback">{form.errors.buy_quantity}</div>}
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label>Get Quantity (FREE) <span className="text-danger">*</span></label>
                <input
                  type="number"
                  min="1"
                  className={`form-control ${form.errors.get_quantity ? 'is-invalid' : ''}`}
                  value={form.data.get_quantity}
                  onChange={(e) => form.setData('get_quantity', e.target.value)}
                  placeholder="e.g., 1"
                  required
                />
                {form.errors.get_quantity && <div className="invalid-feedback">{form.errors.get_quantity}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Bundle fields */}
        {type === 'bundle' && (
          <>
            <div className="form-group">
              <label>Bundle Products <span className="text-danger">*</span></label>
              <select
                multiple
                className={`form-control ${form.errors.bundle_items ? 'is-invalid' : ''}`}
                value={form.data.bundle_items.map(String)}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                  form.setData('bundle_items', selected)
                }}
                style={{ height: '150px' }}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.item_name} - ${parseFloat(product.item_price).toFixed(2)}
                  </option>
                ))}
              </select>
              <small className="form-text text-muted">Hold Ctrl/Cmd to select multiple products</small>
              {form.errors.bundle_items && <div className="invalid-feedback">{form.errors.bundle_items}</div>}
            </div>
            <div className="form-group">
              <label>Bundle Price <span className="text-danger">*</span></label>
              <div className="input-group">
                <div className="input-group-prepend"><span className="input-group-text">$</span></div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`form-control ${form.errors.bundle_price ? 'is-invalid' : ''}`}
                  value={form.data.bundle_price}
                  onChange={(e) => form.setData('bundle_price', e.target.value)}
                  required
                />
              </div>
              {form.errors.bundle_price && <div className="invalid-feedback d-block">{form.errors.bundle_price}</div>}
            </div>
          </>
        )}

        {/* Minimum order amount for all types except bundle */}
        {type !== 'bundle' && (
          <div className="form-group">
            <label>Minimum Order Amount (Optional)</label>
            <div className="input-group">
              <div className="input-group-prepend"><span className="input-group-text">$</span></div>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`form-control ${form.errors.minimum_order_amount ? 'is-invalid' : ''}`}
                value={form.data.minimum_order_amount}
                onChange={(e) => form.setData('minimum_order_amount', e.target.value)}
                placeholder="No minimum"
              />
            </div>
            {form.errors.minimum_order_amount && <div className="invalid-feedback d-block">{form.errors.minimum_order_amount}</div>}
          </div>
        )}

        {/* Applicable Items (for non-bundle types) */}
        {type !== 'bundle' && type !== 'free_shipping' && (
          <div className="form-group">
            <label>Applicable Products (Optional)</label>
            <select
              multiple
              className={`form-control ${form.errors.applicable_items ? 'is-invalid' : ''}`}
              value={form.data.applicable_items.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                form.setData('applicable_items', selected)
              }}
              style={{ height: '120px' }}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.item_name}
                </option>
              ))}
            </select>
            <small className="form-text text-muted">Leave empty to apply to all products. Hold Ctrl/Cmd to select multiple.</small>
            {form.errors.applicable_items && <div className="invalid-feedback">{form.errors.applicable_items}</div>}
          </div>
        )}
      </>
    )
  }

  return (
    <AdminLayout auth={auth} title="Promotions">
      {/* Flash Messages */}
      {flash?.success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={(e) => {
            e.preventDefault()
            router.visit(window.location.pathname, { preserveState: true, preserveScroll: true })
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
            router.visit(window.location.pathname, { preserveState: true, preserveScroll: true })
          }}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{promotions.length}</h3>
              <p>Total Promotions</p>
            </div>
            <div className="icon">
              <i className="fas fa-tags"></i>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>{promotions.filter(p => p.status === 'active').length}</h3>
              <p>Active Promotions</p>
            </div>
            <div className="icon">
              <i className="fas fa-check-circle"></i>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>{promotions.filter(p => p.status === 'scheduled').length}</h3>
              <p>Scheduled</p>
            </div>
            <div className="icon">
              <i className="fas fa-clock"></i>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>{promotions.filter(p => p.status === 'expired').length}</h3>
              <p>Expired</p>
            </div>
            <div className="icon">
              <i className="fas fa-times-circle"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Promotions List</h3>
              <div className="card-tools">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowAddModal(true)
                    setShowAddModalAnimation(false)
                  }}
                >
                  <i className="fas fa-plus"></i> Create Promotion
                </button>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Promo Code</th>
                    <th>Valid Period</th>
                    <th>Usage</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-4">
                        <div className="text-muted">
                          <i className="fas fa-tags fa-3x mb-3"></i>
                          <p>No promotions found. Create your first promotion!</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    promotions.map((promotion) => (
                      <tr key={promotion.id}>
                        <td>{promotion.id}</td>
                        <td>
                          <strong>{promotion.name}</strong>
                          {promotion.description && (
                            <small className="d-block text-muted">{promotion.description.substring(0, 50)}{promotion.description.length > 50 ? '...' : ''}</small>
                          )}
                        </td>
                        <td>{getTypeBadge(promotion.type)}</td>
                        <td>{getPromotionValue(promotion)}</td>
                        <td>
                          {promotion.promo_code ? (
                            <code className="bg-light p-1 rounded">{promotion.promo_code}</code>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <small>
                            {formatDate(promotion.start_date)} - {formatDate(promotion.end_date)}
                          </small>
                        </td>
                        <td>
                          {promotion.usage_count}/{promotion.usage_limit || '∞'}
                        </td>
                        <td>{getStatusBadge(promotion.status)}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-info mr-1"
                            onClick={() => handleEditPromotion(promotion)}
                            title="Edit Promotion"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeletePromotion(promotion)}
                            title="Delete Promotion"
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

      {/* Add Promotion Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h4 className="modal-title"><i className="fas fa-plus mr-2"></i>Create New Promotion</h4>
                  <button type="button" className="close text-white" onClick={closeAddModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddPromotion}>
                  <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className="form-group">
                      <label>Promotion Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.name ? 'is-invalid' : ''}`}
                        value={addForm.data.name}
                        onChange={(e) => addForm.setData('name', e.target.value)}
                        placeholder="e.g., Summer Sale 20% Off"
                        required
                      />
                      {addForm.errors.name && <div className="invalid-feedback">{addForm.errors.name}</div>}
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className={`form-control ${addForm.errors.description ? 'is-invalid' : ''}`}
                        value={addForm.data.description}
                        onChange={(e) => addForm.setData('description', e.target.value)}
                        rows="2"
                        placeholder="Describe your promotion..."
                      />
                      {addForm.errors.description && <div className="invalid-feedback">{addForm.errors.description}</div>}
                    </div>

                    <div className="form-group">
                      <label>Promotion Type <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${addForm.errors.type ? 'is-invalid' : ''}`}
                        value={addForm.data.type}
                        onChange={(e) => addForm.setData('type', e.target.value)}
                        required
                      >
                        {Object.entries(promotionTypes).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      {addForm.errors.type && <div className="invalid-feedback">{addForm.errors.type}</div>}
                    </div>

                    {renderTypeFields(addForm)}

                    <hr />
                    <h6 className="text-muted mb-3"><i className="fas fa-calendar-alt mr-2"></i>Validity Period</h6>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Start Date <span className="text-danger">*</span></label>
                          <input
                            type="datetime-local"
                            className={`form-control ${addForm.errors.start_date ? 'is-invalid' : ''}`}
                            value={addForm.data.start_date}
                            onChange={(e) => addForm.setData('start_date', e.target.value)}
                            required
                          />
                          {addForm.errors.start_date && <div className="invalid-feedback">{addForm.errors.start_date}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>End Date <span className="text-danger">*</span></label>
                          <input
                            type="datetime-local"
                            className={`form-control ${addForm.errors.end_date ? 'is-invalid' : ''}`}
                            value={addForm.data.end_date}
                            onChange={(e) => addForm.setData('end_date', e.target.value)}
                            required
                          />
                          {addForm.errors.end_date && <div className="invalid-feedback">{addForm.errors.end_date}</div>}
                        </div>
                      </div>
                    </div>

                    <hr />
                    <h6 className="text-muted mb-3"><i className="fas fa-cog mr-2"></i>Usage Limits & Promo Code</h6>

                    <div className="row">
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>Total Usage Limit</label>
                          <input
                            type="number"
                            min="1"
                            className={`form-control ${addForm.errors.usage_limit ? 'is-invalid' : ''}`}
                            value={addForm.data.usage_limit}
                            onChange={(e) => addForm.setData('usage_limit', e.target.value)}
                            placeholder="Unlimited"
                          />
                          {addForm.errors.usage_limit && <div className="invalid-feedback">{addForm.errors.usage_limit}</div>}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>Per Customer Limit</label>
                          <input
                            type="number"
                            min="1"
                            className={`form-control ${addForm.errors.per_customer_limit ? 'is-invalid' : ''}`}
                            value={addForm.data.per_customer_limit}
                            onChange={(e) => addForm.setData('per_customer_limit', e.target.value)}
                            placeholder="Unlimited"
                          />
                          {addForm.errors.per_customer_limit && <div className="invalid-feedback">{addForm.errors.per_customer_limit}</div>}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>Promo Code (Optional)</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.promo_code ? 'is-invalid' : ''}`}
                            value={addForm.data.promo_code}
                            onChange={(e) => addForm.setData('promo_code', e.target.value.toUpperCase())}
                            placeholder="e.g., SUMMER20"
                            style={{ textTransform: 'uppercase' }}
                          />
                          {addForm.errors.promo_code && <div className="invalid-feedback">{addForm.errors.promo_code}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Status</label>
                      <select
                        className={`form-control ${addForm.errors.status ? 'is-invalid' : ''}`}
                        value={addForm.data.status}
                        onChange={(e) => addForm.setData('status', e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="scheduled">Scheduled</option>
                      </select>
                      {addForm.errors.status && <div className="invalid-feedback">{addForm.errors.status}</div>}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAddModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                      {addForm.processing ? 'Creating...' : 'Create Promotion'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Promotion Modal */}
      {showEditModal && selectedPromotion && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header bg-info text-white">
                  <h4 className="modal-title"><i className="fas fa-edit mr-2"></i>Edit Promotion</h4>
                  <button type="button" className="close text-white" onClick={closeEditModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdatePromotion}>
                  <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className="form-group">
                      <label>Promotion Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${editForm.errors.name ? 'is-invalid' : ''}`}
                        value={editForm.data.name}
                        onChange={(e) => editForm.setData('name', e.target.value)}
                        required
                      />
                      {editForm.errors.name && <div className="invalid-feedback">{editForm.errors.name}</div>}
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className={`form-control ${editForm.errors.description ? 'is-invalid' : ''}`}
                        value={editForm.data.description}
                        onChange={(e) => editForm.setData('description', e.target.value)}
                        rows="2"
                      />
                      {editForm.errors.description && <div className="invalid-feedback">{editForm.errors.description}</div>}
                    </div>

                    <div className="form-group">
                      <label>Promotion Type <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${editForm.errors.type ? 'is-invalid' : ''}`}
                        value={editForm.data.type}
                        onChange={(e) => editForm.setData('type', e.target.value)}
                        required
                      >
                        {Object.entries(promotionTypes).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      {editForm.errors.type && <div className="invalid-feedback">{editForm.errors.type}</div>}
                    </div>

                    {renderTypeFields(editForm, true)}

                    <hr />
                    <h6 className="text-muted mb-3"><i className="fas fa-calendar-alt mr-2"></i>Validity Period</h6>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Start Date <span className="text-danger">*</span></label>
                          <input
                            type="datetime-local"
                            className={`form-control ${editForm.errors.start_date ? 'is-invalid' : ''}`}
                            value={editForm.data.start_date}
                            onChange={(e) => editForm.setData('start_date', e.target.value)}
                            required
                          />
                          {editForm.errors.start_date && <div className="invalid-feedback">{editForm.errors.start_date}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>End Date <span className="text-danger">*</span></label>
                          <input
                            type="datetime-local"
                            className={`form-control ${editForm.errors.end_date ? 'is-invalid' : ''}`}
                            value={editForm.data.end_date}
                            onChange={(e) => editForm.setData('end_date', e.target.value)}
                            required
                          />
                          {editForm.errors.end_date && <div className="invalid-feedback">{editForm.errors.end_date}</div>}
                        </div>
                      </div>
                    </div>

                    <hr />
                    <h6 className="text-muted mb-3"><i className="fas fa-cog mr-2"></i>Usage Limits & Promo Code</h6>

                    <div className="row">
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>Total Usage Limit</label>
                          <input
                            type="number"
                            min="1"
                            className={`form-control ${editForm.errors.usage_limit ? 'is-invalid' : ''}`}
                            value={editForm.data.usage_limit}
                            onChange={(e) => editForm.setData('usage_limit', e.target.value)}
                            placeholder="Unlimited"
                          />
                          {editForm.errors.usage_limit && <div className="invalid-feedback">{editForm.errors.usage_limit}</div>}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>Per Customer Limit</label>
                          <input
                            type="number"
                            min="1"
                            className={`form-control ${editForm.errors.per_customer_limit ? 'is-invalid' : ''}`}
                            value={editForm.data.per_customer_limit}
                            onChange={(e) => editForm.setData('per_customer_limit', e.target.value)}
                            placeholder="Unlimited"
                          />
                          {editForm.errors.per_customer_limit && <div className="invalid-feedback">{editForm.errors.per_customer_limit}</div>}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>Promo Code</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.promo_code ? 'is-invalid' : ''}`}
                            value={editForm.data.promo_code}
                            onChange={(e) => editForm.setData('promo_code', e.target.value.toUpperCase())}
                            style={{ textTransform: 'uppercase' }}
                          />
                          {editForm.errors.promo_code && <div className="invalid-feedback">{editForm.errors.promo_code}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Status</label>
                      <select
                        className={`form-control ${editForm.errors.status ? 'is-invalid' : ''}`}
                        value={editForm.data.status}
                        onChange={(e) => editForm.setData('status', e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="expired">Expired</option>
                      </select>
                      {editForm.errors.status && <div className="invalid-feedback">{editForm.errors.status}</div>}
                    </div>

                    {/* Usage info */}
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle mr-2"></i>
                      This promotion has been used <strong>{selectedPromotion.usage_count}</strong> time(s).
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-info" disabled={editForm.processing}>
                      {editForm.processing ? 'Updating...' : 'Update Promotion'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && promotionToDelete && (
        <>
          <div className={`modal-backdrop fade ${showDeleteModalAnimation ? 'show' : ''}`} onClick={closeDeleteModal}></div>
          <div className={`modal fade ${showDeleteModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-danger text-white">
                  <h4 className="modal-title"><i className="fas fa-exclamation-triangle mr-2"></i>Confirm Delete</h4>
                  <button type="button" className="close text-white" onClick={closeDeleteModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete the promotion <strong>"{promotionToDelete.name}"</strong>?</p>
                  <div className="alert alert-warning mb-0">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    This action cannot be undone. This promotion has been used {promotionToDelete.usage_count} time(s).
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeDeleteModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeletePromotion}>
                    Delete Promotion
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

