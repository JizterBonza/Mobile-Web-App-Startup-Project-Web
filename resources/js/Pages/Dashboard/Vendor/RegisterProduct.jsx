import { useState } from 'react'
import { useForm, router } from '@inertiajs/react'
import VendorKlasmeytLayout from '../../../Layouts/VendorKlasmeytLayout'

export default function RegisterProduct({ auth, shop, stockImages = [], categories = [], subCategories = [] }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [errorMessage, setErrorMessage] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [imagePreviews, setImagePreviews] = useState([])
  const [imageSourceTab, setImageSourceTab] = useState('upload')
  const [selectedStockImages, setSelectedStockImages] = useState([])

  const form = useForm({
    item_name: '',
    item_description: '',
    item_price: '',
    item_quantity: '',
    weight: '',
    metric: '',
    category: '',
    sub_category_id: '',
    item_images: [],
    stock_image_urls: [],
    item_status: 'active',
  })

  const steps = [
    { number: 1, title: 'Product Information' },
    { number: 2, title: 'Images' },
    { number: 3, title: 'Review & Confirm' },
  ]

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      form.setData('item_images', files)
      const previews = files.map(file => URL.createObjectURL(file))
      setImagePreviews(previews)
    }
    e.target.value = ''
  }

  const removeImage = (index) => {
    const newFiles = Array.from(form.data.item_images)
    newFiles.splice(index, 1)
    form.setData('item_images', newFiles)
    const newPreviews = [...imagePreviews]
    URL.revokeObjectURL(newPreviews[index])
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
  }

  const toggleStockImage = (imageUrl) => {
    setSelectedStockImages(prev =>
      prev.includes(imageUrl) ? prev.filter(url => url !== imageUrl) : [...prev, imageUrl]
    )
  }

  const removeStockImage = (imageUrl) => {
    setSelectedStockImages(prev => prev.filter(url => url !== imageUrl))
  }

  const nextStep = () => {
    setErrorMessage(null)

    if (currentStep === 1) {
      if (!form.data.item_name || !form.data.item_price || !form.data.item_quantity) {
        setErrorMessage('Please fill in all required fields: Product Name, Price, and Quantity.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }

    if (currentStep === 2) {
      const hasUploadedImages = form.data.item_images && form.data.item_images.length > 0
      const hasStockImages = selectedStockImages.length > 0
      if (!hasUploadedImages && !hasStockImages) {
        setErrorMessage('Please upload at least one product image.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (currentStep !== 3) return

    form.transform(data => ({
      ...data,
      stock_image_urls: selectedStockImages,
    }))

    form.post('/dashboard/vendor/products', {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        setShowSuccessModal(true)
      },
    })
  }

  const getCategoryName = (id) => {
    const cat = categories.find(c => String(c.id) === String(id))
    return cat ? cat.name : id
  }

  const getSubCategoryName = (id) => {
    const sub = subCategories.find(s => String(s.id) === String(id))
    return sub ? sub.name : id
  }

  const totalImages = imagePreviews.length + selectedStockImages.length

  return (
    <VendorKlasmeytLayout auth={auth} title="Register Product">
      {/* Back Button Row */}
      <div className="mb-3">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => router.visit('/dashboard/vendor/products')}
        >
          <i className="fas fa-arrow-left mr-1"></i> Back to Products
        </button>
      </div>

      <div className="row">
        <div className="col-12">
          {/* Page Header */}
          <div className="mb-4">
            <h4 className="mb-1" style={{ color: '#102059', fontWeight: 600 }}>Register New Product</h4>
            <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
              Add a new product to your store in 3 simple steps.
            </p>
          </div>

          {/* Stepper */}
          <div className="card mb-4" style={{ borderRadius: 8 }}>
            <div className="card-body py-3">
              <div className="d-flex align-items-center justify-content-between">
                {steps.map((step, index) => (
                  <div key={step.number} className="d-flex align-items-center flex-fill">
                    <div className="d-flex align-items-center">
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: currentStep >= step.number ? '#102059' : '#E5E7EB',
                          border: `2px solid ${currentStep >= step.number ? '#102059' : '#E5E7EB'}`,
                          flexShrink: 0,
                        }}
                      >
                        {currentStep > step.number ? (
                          <i className="fas fa-check" style={{ color: '#fff', fontSize: 12 }}></i>
                        ) : (
                          <span style={{ color: currentStep === step.number ? '#fff' : '#9CA3AF', fontSize: 13, fontWeight: 600 }}>
                            {step.number}
                          </span>
                        )}
                      </div>
                      <span
                        className="ml-2 d-none d-md-inline"
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: currentStep >= step.number ? '#102059' : '#9CA3AF',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className="flex-fill mx-3"
                        style={{
                          height: 2,
                          background: currentStep > step.number ? '#102059' : '#E5E7EB',
                          transition: 'background 0.3s',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="alert alert-danger alert-dismissible" role="alert">
              <button type="button" className="close" onClick={() => setErrorMessage(null)}>
                <span>&times;</span>
              </button>
              <strong>Validation Error:</strong> {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Product Information */}
            {currentStep === 1 && (
              <div className="card" style={{ borderRadius: 8 }}>
                <div className="card-header" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
                  <h5 className="mb-0" style={{ color: '#102059', fontWeight: 600 }}>Step 1 — Product Information</h5>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                      Product Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${form.errors.item_name ? 'is-invalid' : ''}`}
                      value={form.data.item_name}
                      onChange={e => form.setData('item_name', e.target.value)}
                      placeholder="Enter product name"
                    />
                    {form.errors.item_name && <div className="invalid-feedback">{form.errors.item_name}</div>}
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#6B7280' }}>Description</label>
                    <textarea
                      className={`form-control ${form.errors.item_description ? 'is-invalid' : ''}`}
                      value={form.data.item_description}
                      onChange={e => form.setData('item_description', e.target.value)}
                      rows="4"
                      maxLength={500}
                      placeholder="Enter product description"
                    />
                    <small className="text-muted float-right">{form.data.item_description.length}/500</small>
                    {form.errors.item_description && <div className="invalid-feedback">{form.errors.item_description}</div>}
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                          Price <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text">$</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`form-control ${form.errors.item_price ? 'is-invalid' : ''}`}
                            value={form.data.item_price}
                            onChange={e => form.setData('item_price', e.target.value)}
                            placeholder="0.00"
                          />
                          {form.errors.item_price && <div className="invalid-feedback">{form.errors.item_price}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                          Quantity <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          className={`form-control ${form.errors.item_quantity ? 'is-invalid' : ''}`}
                          value={form.data.item_quantity}
                          onChange={e => form.setData('item_quantity', e.target.value)}
                          placeholder="0"
                        />
                        {form.errors.item_quantity && <div className="invalid-feedback">{form.errors.item_quantity}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: '#6B7280' }}>Weight</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`form-control ${form.errors.weight ? 'is-invalid' : ''}`}
                          value={form.data.weight}
                          onChange={e => form.setData('weight', e.target.value)}
                          placeholder="e.g. 1.5"
                        />
                        {form.errors.weight && <div className="invalid-feedback">{form.errors.weight}</div>}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: '#6B7280' }}>Metric</label>
                        <select
                          className={`form-control ${form.errors.metric ? 'is-invalid' : ''}`}
                          value={form.data.metric}
                          onChange={e => form.setData('metric', e.target.value)}
                        >
                          <option value="">Select Metric</option>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="lb">lb</option>
                          <option value="oz">oz</option>
                          <option value="l">l</option>
                          <option value="ml">ml</option>
                          <option value="piece">piece</option>
                          <option value="pack">pack</option>
                          <option value="box">box</option>
                        </select>
                        {form.errors.metric && <div className="invalid-feedback">{form.errors.metric}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: '#6B7280' }}>Category</label>
                        <select
                          className={`form-control ${form.errors.category ? 'is-invalid' : ''}`}
                          value={form.data.category}
                          onChange={e => form.setData('category', e.target.value)}
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        {form.errors.category && <div className="invalid-feedback">{form.errors.category}</div>}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: '#6B7280' }}>Sub Category</label>
                        <select
                          className={`form-control ${form.errors.sub_category_id ? 'is-invalid' : ''}`}
                          value={form.data.sub_category_id}
                          onChange={e => form.setData('sub_category_id', e.target.value)}
                        >
                          <option value="">Select Sub Category</option>
                          {subCategories.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                        {form.errors.sub_category_id && <div className="invalid-feedback">{form.errors.sub_category_id}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                      Status <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-control ${form.errors.item_status ? 'is-invalid' : ''}`}
                      value={form.data.item_status}
                      onChange={e => form.setData('item_status', e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    {form.errors.item_status && <div className="invalid-feedback">{form.errors.item_status}</div>}
                  </div>
                </div>
                <div className="card-footer text-right" style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={nextStep}
                    style={{ background: '#102059', borderColor: '#102059' }}
                  >
                    Next: Images <i className="fas fa-arrow-right ml-1"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Images */}
            {currentStep === 2 && (
              <div className="card" style={{ borderRadius: 8 }}>
                <div className="card-header" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
                  <h5 className="mb-0" style={{ color: '#102059', fontWeight: 600 }}>Step 2 — Product Images</h5>
                </div>
                <div className="card-body">
                  {/* Image Source Tabs */}
                  <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                      <a
                        className={`nav-link ${imageSourceTab === 'upload' ? 'active' : ''}`}
                        href="#"
                        onClick={e => { e.preventDefault(); setImageSourceTab('upload') }}
                      >
                        <i className="fas fa-upload mr-1"></i> Upload New
                      </a>
                    </li>
                    <li className="nav-item">
                      <a
                        className={`nav-link ${imageSourceTab === 'stock' ? 'active' : ''}`}
                        href="#"
                        onClick={e => { e.preventDefault(); setImageSourceTab('stock') }}
                      >
                        <i className="fas fa-images mr-1"></i> From Stock ({stockImages.length})
                      </a>
                    </li>
                  </ul>

                  {/* Upload Tab */}
                  {imageSourceTab === 'upload' && (
                    <div>
                      <input
                        type="file"
                        className="form-control"
                        onChange={handleImageChange}
                        accept="image/*"
                        multiple
                      />
                      <small className="form-text text-muted">
                        Upload product images (JPEG, PNG, JPG, GIF — max 5MB each)
                      </small>
                      {imagePreviews.length > 0 && (
                        <div className="mt-3">
                          <label className="d-block font-weight-bold mb-2">Uploaded Images:</label>
                          <div className="row">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="col-md-3 mb-2 position-relative">
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="img-thumbnail"
                                  style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger position-absolute"
                                  style={{ top: 5, right: 20 }}
                                  onClick={() => removeImage(index)}
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stock Tab */}
                  {imageSourceTab === 'stock' && (
                    <div>
                      {stockImages.length === 0 ? (
                        <div className="alert alert-info">
                          <i className="fas fa-info-circle mr-2"></i>
                          No stock images available.{' '}
                          <a href="/dashboard/vendor/product-images" className="alert-link">
                            Add some to your library first.
                          </a>
                        </div>
                      ) : (
                        <>
                          <small className="form-text text-muted mb-2">
                            Click images to select/deselect.
                          </small>
                          <div className="row" style={{ maxHeight: 280, overflowY: 'auto' }}>
                            {stockImages.map(img => (
                              <div key={img.id} className="col-md-3 mb-2">
                                <div
                                  className={`card h-100 ${selectedStockImages.includes(img.image_url) ? 'border-primary' : ''}`}
                                  style={{ cursor: 'pointer', borderWidth: selectedStockImages.includes(img.image_url) ? 2 : 1 }}
                                  onClick={() => toggleStockImage(img.image_url)}
                                >
                                  <div className="position-relative">
                                    <img
                                      src={img.image_url}
                                      alt={img.name}
                                      className="card-img-top"
                                      style={{ height: 80, objectFit: 'cover' }}
                                      onError={e => { e.target.src = '/images/placeholder.png' }}
                                    />
                                    {selectedStockImages.includes(img.image_url) && (
                                      <div className="position-absolute" style={{ top: 5, right: 5 }}>
                                        <span className="badge badge-primary">
                                          <i className="fas fa-check"></i>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="card-body p-1">
                                    <small className="text-truncate d-block" title={img.name}>{img.name}</small>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Selected Stock Images Summary */}
                  {selectedStockImages.length > 0 && (
                    <div className="mt-3">
                      <label className="d-block font-weight-bold mb-2">
                        Selected Stock Images ({selectedStockImages.length}):
                      </label>
                      <div className="row">
                        {selectedStockImages.map((url, index) => (
                          <div key={index} className="col-md-3 mb-2 position-relative">
                            <img
                              src={url}
                              alt={`Stock ${index + 1}`}
                              className="img-thumbnail"
                              style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                              onError={e => { e.target.src = '/images/placeholder.png' }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-danger position-absolute"
                              style={{ top: 5, right: 20 }}
                              onClick={() => removeStockImage(url)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total count */}
                  <div className="mt-2">
                    <small className={totalImages > 0 ? 'text-success' : 'text-warning'}>
                      <i className={`fas ${totalImages > 0 ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1`}></i>
                      Total images selected: {totalImages}
                      {totalImages === 0 && ' (at least 1 required)'}
                    </small>
                  </div>
                </div>
                <div className="card-footer d-flex justify-content-between" style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
                  <button type="button" className="btn btn-secondary" onClick={prevStep}>
                    <i className="fas fa-arrow-left mr-1"></i> Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={nextStep}
                    style={{ background: '#102059', borderColor: '#102059' }}
                  >
                    Next: Review <i className="fas fa-arrow-right ml-1"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {currentStep === 3 && (
              <div className="card" style={{ borderRadius: 8 }}>
                <div className="card-header" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
                  <h5 className="mb-0" style={{ color: '#102059', fontWeight: 600 }}>Step 3 — Review & Confirm</h5>
                </div>
                <div className="card-body">
                  {/* Product Info Summary */}
                  <div className="mb-4">
                    <h6 className="text-uppercase text-muted mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                      Product Information
                    </h6>
                    <div className="p-3 rounded" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <div className="row mb-2">
                        <div className="col-5 text-muted" style={{ fontSize: '0.875rem' }}>Product Name:</div>
                        <div className="col-7 font-weight-bold" style={{ fontSize: '0.875rem', color: '#102059' }}>
                          {form.data.item_name || '—'}
                        </div>
                      </div>
                      <div className="row mb-2">
                        <div className="col-5 text-muted" style={{ fontSize: '0.875rem' }}>Price:</div>
                        <div className="col-7 font-weight-bold" style={{ fontSize: '0.875rem', color: '#102059' }}>
                          {form.data.item_price ? `$${parseFloat(form.data.item_price).toFixed(2)}` : '—'}
                        </div>
                      </div>
                      <div className="row mb-2">
                        <div className="col-5 text-muted" style={{ fontSize: '0.875rem' }}>Quantity:</div>
                        <div className="col-7 font-weight-bold" style={{ fontSize: '0.875rem', color: '#102059' }}>
                          {form.data.item_quantity || '—'}
                        </div>
                      </div>
                      {(form.data.weight || form.data.metric) && (
                        <div className="row mb-2">
                          <div className="col-5 text-muted" style={{ fontSize: '0.875rem' }}>Weight:</div>
                          <div className="col-7 font-weight-bold" style={{ fontSize: '0.875rem', color: '#102059' }}>
                            {form.data.weight} {form.data.metric}
                          </div>
                        </div>
                      )}
                      {form.data.category && (
                        <div className="row mb-2">
                          <div className="col-5 text-muted" style={{ fontSize: '0.875rem' }}>Category:</div>
                          <div className="col-7 font-weight-bold" style={{ fontSize: '0.875rem', color: '#102059' }}>
                            {getCategoryName(form.data.category)}
                          </div>
                        </div>
                      )}
                      {form.data.sub_category_id && (
                        <div className="row mb-2">
                          <div className="col-5 text-muted" style={{ fontSize: '0.875rem' }}>Sub Category:</div>
                          <div className="col-7 font-weight-bold" style={{ fontSize: '0.875rem', color: '#102059' }}>
                            {getSubCategoryName(form.data.sub_category_id)}
                          </div>
                        </div>
                      )}
                      <div className="row mb-2">
                        <div className="col-5 text-muted" style={{ fontSize: '0.875rem' }}>Status:</div>
                        <div className="col-7">
                          <span className={`badge ${form.data.item_status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                            {form.data.item_status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      {form.data.item_description && (
                        <div className="row">
                          <div className="col-5 text-muted" style={{ fontSize: '0.875rem' }}>Description:</div>
                          <div className="col-7" style={{ fontSize: '0.875rem', color: '#102059' }}>
                            {form.data.item_description}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Images Summary */}
                  <div className="mb-4">
                    <h6 className="text-uppercase text-muted mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                      Product Images ({totalImages})
                    </h6>
                    <div className="p-3 rounded" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <div className="row">
                        {imagePreviews.map((preview, index) => (
                          <div key={`up-${index}`} className="col-md-2 col-4 mb-2">
                            <img
                              src={preview}
                              alt={`Upload ${index + 1}`}
                              className="img-thumbnail"
                              style={{ width: '100%', height: 70, objectFit: 'cover' }}
                            />
                          </div>
                        ))}
                        {selectedStockImages.map((url, index) => (
                          <div key={`st-${index}`} className="col-md-2 col-4 mb-2">
                            <img
                              src={url}
                              alt={`Stock ${index + 1}`}
                              className="img-thumbnail"
                              style={{ width: '100%', height: 70, objectFit: 'cover' }}
                              onError={e => { e.target.src = '/images/placeholder.png' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Info note */}
                  <div className="alert alert-info mb-0" style={{ background: '#F0F7FF', borderColor: 'rgba(16,32,89,0.2)', color: '#102059' }}>
                    <i className="fas fa-info-circle mr-2"></i>
                    <strong>Please review all information carefully.</strong> Once submitted, the product will be added to your store with the selected status.
                  </div>
                </div>
                <div className="card-footer d-flex justify-content-between" style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
                  <button type="button" className="btn btn-secondary" onClick={prevStep}>
                    <i className="fas fa-arrow-left mr-1"></i> Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={form.processing}
                    style={{ background: '#102059', borderColor: '#102059' }}
                  >
                    {form.processing ? (
                      <><i className="fas fa-spinner fa-spin mr-1"></i> Submitting...</>
                    ) : (
                      <><i className="fas fa-check mr-1"></i> Submit Product</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-body text-center p-5">
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,201,80,0.1)' }}
                  >
                    <i className="fas fa-check-circle" style={{ fontSize: 36, color: '#00C950' }}></i>
                  </div>
                  <h4 style={{ color: '#102059', fontWeight: 700 }}>Product Registered!</h4>
                  <p className="text-muted mb-4">
                    <strong>{form.data.item_name}</strong> has been successfully added to your store.
                  </p>
                  <div className="d-flex gap-2 justify-content-center">
                    <button
                      className="btn btn-primary"
                      style={{ background: '#102059', borderColor: '#102059' }}
                      onClick={() => router.visit('/dashboard/vendor/products')}
                    >
                      Back to Products
                    </button>
                    <button
                      className="btn btn-outline-primary ml-2"
                      style={{ color: '#102059', borderColor: '#102059' }}
                      onClick={() => {
                        setShowSuccessModal(false)
                        setCurrentStep(1)
                        setImagePreviews([])
                        setSelectedStockImages([])
                        setImageSourceTab('upload')
                        form.reset()
                      }}
                    >
                      Add Another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </VendorKlasmeytLayout>
  )
}
