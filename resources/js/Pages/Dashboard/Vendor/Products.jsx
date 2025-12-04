import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../../Layouts/AdminLayout'

export default function Products({ auth, products = [], store, flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productToRemove, setProductToRemove] = useState(null)
  const [imagePreviews, setImagePreviews] = useState([])
  const [editImagePreviews, setEditImagePreviews] = useState([])
  const [editExistingImages, setEditExistingImages] = useState([])

  const addForm = useForm({
    item_name: '',
    item_description: '',
    item_price: '',
    item_quantity: '',
    category: '',
    item_images: [],
    item_status: 'active',
  })

  const editForm = useForm({
    item_name: '',
    item_description: '',
    item_price: '',
    item_quantity: '',
    category: '',
    item_images: [],
    item_status: 'active',
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
      setImagePreviews([])
    }, 300)
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      addForm.setData('item_images', files)
      
      // Create previews
      const previews = files.map(file => URL.createObjectURL(file))
      setImagePreviews(previews)
    }
  }

  const removeImage = (index) => {
    const newFiles = Array.from(addForm.data.item_images)
    newFiles.splice(index, 1)
    addForm.setData('item_images', newFiles)
    
    const newPreviews = [...imagePreviews]
    URL.revokeObjectURL(newPreviews[index])
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedProduct(null)
      editForm.reset()
      setEditImagePreviews([])
      setEditExistingImages([])
      // Clean up any object URLs
      editImagePreviews.forEach(preview => {
        if (preview && preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview)
        }
      })
    }, 300)
  }

  const handleEditImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      // Append to existing new images if any
      const currentFiles = editForm.data.item_images || []
      const allFiles = [...currentFiles, ...files]
      editForm.setData('item_images', allFiles)
      
      // Create previews for new files
      const newPreviews = files.map(file => URL.createObjectURL(file))
      setEditImagePreviews(prev => [...prev, ...newPreviews])
    }
    // Reset input to allow selecting same file again
    e.target.value = ''
  }

  const removeEditImage = (index) => {
    const currentFiles = Array.from(editForm.data.item_images || [])
    const currentPreviews = [...editImagePreviews]
    
    // Revoke object URL before removing
    if (currentPreviews[index] && currentPreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(currentPreviews[index])
    }
    
    // Remove from both arrays
    currentFiles.splice(index, 1)
    currentPreviews.splice(index, 1)
    
    editForm.setData('item_images', currentFiles)
    setEditImagePreviews(currentPreviews)
  }

  const removeEditExistingImage = (index) => {
    const newExisting = [...editExistingImages]
    newExisting.splice(index, 1)
    setEditExistingImages(newExisting)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setProductToRemove(null)
    }, 300)
  }

  useEffect(() => {
    if (flash?.success) {
      closeAddModal()
      closeEditModal()
      closeRemoveModal()
      addForm.reset()
      editForm.reset()
    }
  }, [flash])

  const handleAddProduct = (e) => {
    e.preventDefault()
    addForm.post('/dashboard/vendor/products', {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        addForm.reset()
        setImagePreviews([])
      },
    })
  }

  const handleEditProduct = (product) => {
    setSelectedProduct(product)
    
    // Get existing images - ensure they're in array format
    let existingImages = []
    if (product.item_images) {
      if (Array.isArray(product.item_images)) {
        existingImages = product.item_images
      } else if (typeof product.item_images === 'string') {
        try {
          existingImages = JSON.parse(product.item_images)
        } catch (e) {
          existingImages = [product.item_images]
        }
      }
    }
    
    // Ensure images are properly formatted URLs
    existingImages = existingImages.map(img => {
      if (!img) return null
      // If it's already a full URL, return as is
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img
      }
      // If it starts with /storage/, return as is
      if (img.startsWith('/storage/')) {
        return img
      }
      // Otherwise, prepend /storage/
      return `/storage/${img.replace(/^storage\//, '')}`
    }).filter(img => img !== null)
    
    // Initialize form with product data - ensure all values are strings for inputs
    editForm.setData({
      item_name: String(product.item_name || ''),
      item_description: String(product.item_description || ''),
      item_price: product.item_price != null ? String(product.item_price) : '',
      item_quantity: product.item_quantity != null ? String(product.item_quantity) : '',
      category: String(product.category || ''),
      item_images: [],
      item_status: String(product.item_status || 'active'),
      existing_images: existingImages,
    })
    
    // Set state for existing images and clear new image previews
    setEditExistingImages(existingImages)
    setEditImagePreviews([])
    
    // Open modal
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateProduct = (e) => {
    e.preventDefault()
    if (!selectedProduct) {
      return
    }
    
    // Get current form values directly from the form state
    const currentData = editForm.data
    const hasNewImages = currentData.item_images && currentData.item_images.length > 0
    const hasExistingImages = editExistingImages && editExistingImages.length > 0
    
    // Validate that at least one image exists (existing or new)
    if (!hasExistingImages && !hasNewImages) {
      editForm.setError('item_images', 'At least one product image is required.')
      return
    }
    
    // Ensure all required fields have values - validate before submission
    if (!currentData.item_name || String(currentData.item_name).trim() === '') {
      editForm.setError('item_name', 'The item name field is required.')
      return
    }
    if (!currentData.item_price || currentData.item_price === '' || currentData.item_price == null) {
      editForm.setError('item_price', 'The item price field is required.')
      return
    }
    if (!currentData.item_quantity || currentData.item_quantity === '' || currentData.item_quantity == null) {
      editForm.setError('item_quantity', 'The item quantity field is required.')
      return
    }
    
    // Ensure existing_images is set in form data (it should already be set, but ensure it's current)
    // Only update if it's different to avoid unnecessary state updates
    if (JSON.stringify(currentData.existing_images || []) !== JSON.stringify(editExistingImages || [])) {
      editForm.setData('existing_images', editExistingImages || [])
    }
    
    // If there are no new images, ensure item_images is an empty array
    // This is important for the backend to know we're not uploading new files
    if (!hasNewImages && currentData.item_images && currentData.item_images.length > 0) {
      editForm.setData('item_images', [])
    }
    
    // Submit the form
    // forceFormData is needed when we have file uploads
    editForm.put(`/dashboard/vendor/products/${selectedProduct.id}`, {
      preserveScroll: true,
      forceFormData: hasNewImages,
      onSuccess: () => {
        // Clean up object URLs
        editImagePreviews.forEach(preview => {
          if (preview && preview.startsWith('blob:')) {
            URL.revokeObjectURL(preview)
          }
        })
        closeEditModal()
      },
      onError: (errors) => {
        // Errors will be displayed automatically by Inertia
        console.error('Update product errors:', errors)
      },
    })
  }

  const handleDeleteProduct = (productId) => {
    const product = products.find(p => p.id === productId)
    setProductToRemove(product)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmDeleteProduct = () => {
    if (productToRemove) {
      router.delete(`/dashboard/vendor/products/${productToRemove.id}`, {
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
    <AdminLayout auth={auth} title="Products">
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

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Product List</h3>
              <div className="card-tools">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowAddModal(true)
                    setShowAddModalAnimation(false)
                  }}
                >
                  <i className="fas fa-plus"></i> Add Product
                </button>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Sold</th>
                    <th>Rating</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center">No products found</td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.id}</td>
                        <td>{product.item_name}</td>
                        <td>${parseFloat(product.item_price).toFixed(2)}</td>
                        <td>{product.item_quantity}</td>
                        <td>{product.category || '-'}</td>
                        <td>{getStatusBadge(product.item_status)}</td>
                        <td>{product.sold_count}</td>
                        <td>{product.average_rating} ({product.total_reviews})</td>
                        <td>
                          <button
                            className="btn btn-sm btn-info mr-1"
                            onClick={() => handleEditProduct(product)}
                            title="Edit Product"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteProduct(product.id)}
                            title="Delete Product"
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

      {/* Add Product Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Product</h4>
                  <button type="button" className="close" onClick={closeAddModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddProduct}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Product Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.item_name ? 'is-invalid' : ''}`}
                        value={addForm.data.item_name}
                        onChange={(e) => addForm.setData('item_name', e.target.value)}
                        required
                      />
                      {addForm.errors.item_name && (
                        <div className="invalid-feedback">{addForm.errors.item_name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className={`form-control ${addForm.errors.item_description ? 'is-invalid' : ''}`}
                        value={addForm.data.item_description}
                        onChange={(e) => addForm.setData('item_description', e.target.value)}
                        rows="3"
                      />
                      {addForm.errors.item_description && (
                        <div className="invalid-feedback">{addForm.errors.item_description}</div>
                      )}
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Price <span className="text-danger">*</span></label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`form-control ${addForm.errors.item_price ? 'is-invalid' : ''}`}
                            value={addForm.data.item_price}
                            onChange={(e) => addForm.setData('item_price', e.target.value)}
                            required
                          />
                          {addForm.errors.item_price && (
                            <div className="invalid-feedback">{addForm.errors.item_price}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Quantity <span className="text-danger">*</span></label>
                          <input
                            type="number"
                            min="0"
                            className={`form-control ${addForm.errors.item_quantity ? 'is-invalid' : ''}`}
                            value={addForm.data.item_quantity}
                            onChange={(e) => addForm.setData('item_quantity', e.target.value)}
                            required
                          />
                          {addForm.errors.item_quantity && (
                            <div className="invalid-feedback">{addForm.errors.item_quantity}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.category ? 'is-invalid' : ''}`}
                        value={addForm.data.category}
                        onChange={(e) => addForm.setData('category', e.target.value)}
                      />
                      {addForm.errors.category && (
                        <div className="invalid-feedback">{addForm.errors.category}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Product Images <span className="text-danger">*</span></label>
                      <input
                        type="file"
                        className={`form-control ${addForm.errors.item_images ? 'is-invalid' : ''}`}
                        onChange={handleImageChange}
                        accept="image/*"
                        multiple
                        required
                      />
                      {addForm.errors.item_images && (
                        <div className="invalid-feedback">{addForm.errors.item_images}</div>
                      )}
                      {addForm.errors['item_images.0'] && (
                        <div className="invalid-feedback">{addForm.errors['item_images.0']}</div>
                      )}
                      <small className="form-text text-muted">
                        Upload at least one product image (JPEG, PNG, JPG, GIF - Max 5MB per image)
                      </small>
                      {imagePreviews.length > 0 && (
                        <div className="mt-3">
                          <div className="row">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="col-md-3 mb-2 position-relative">
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="img-thumbnail"
                                  style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger position-absolute"
                                  style={{ top: '5px', right: '5px' }}
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
                    <div className="form-group">
                      <label>Status <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${addForm.errors.item_status ? 'is-invalid' : ''}`}
                        value={addForm.data.item_status}
                        onChange={(e) => addForm.setData('item_status', e.target.value)}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {addForm.errors.item_status && (
                        <div className="invalid-feedback">{addForm.errors.item_status}</div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAddModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                      {addForm.processing ? 'Creating...' : 'Create Product'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Product</h4>
                  <button type="button" className="close" onClick={closeEditModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateProduct} noValidate>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Product Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        name="item_name"
                        className={`form-control ${editForm.errors.item_name ? 'is-invalid' : ''}`}
                        value={editForm.data.item_name}
                        onChange={(e) => editForm.setData('item_name', e.target.value)}
                        required
                      />
                      {editForm.errors.item_name && (
                        <div className="invalid-feedback">{editForm.errors.item_name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        name="item_description"
                        className={`form-control ${editForm.errors.item_description ? 'is-invalid' : ''}`}
                        value={editForm.data.item_description}
                        onChange={(e) => editForm.setData('item_description', e.target.value)}
                        rows="3"
                      />
                      {editForm.errors.item_description && (
                        <div className="invalid-feedback">{editForm.errors.item_description}</div>
                      )}
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Price <span className="text-danger">*</span></label>
                          <input
                            type="number"
                            name="item_price"
                            step="0.01"
                            min="0"
                            className={`form-control ${editForm.errors.item_price ? 'is-invalid' : ''}`}
                            value={editForm.data.item_price}
                            onChange={(e) => editForm.setData('item_price', e.target.value)}
                            required
                          />
                          {editForm.errors.item_price && (
                            <div className="invalid-feedback">{editForm.errors.item_price}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Quantity <span className="text-danger">*</span></label>
                          <input
                            type="number"
                            name="item_quantity"
                            min="0"
                            className={`form-control ${editForm.errors.item_quantity ? 'is-invalid' : ''}`}
                            value={editForm.data.item_quantity}
                            onChange={(e) => editForm.setData('item_quantity', e.target.value)}
                            required
                          />
                          {editForm.errors.item_quantity && (
                            <div className="invalid-feedback">{editForm.errors.item_quantity}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <input
                        type="text"
                        name="category"
                        className={`form-control ${editForm.errors.category ? 'is-invalid' : ''}`}
                        value={editForm.data.category}
                        onChange={(e) => editForm.setData('category', e.target.value)}
                      />
                      {editForm.errors.category && (
                        <div className="invalid-feedback">{editForm.errors.category}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Product Images</label>
                      {(editExistingImages.length > 0 || editImagePreviews.length > 0) && (
                        <div className="mb-3">
                          {editExistingImages.length > 0 && (
                            <>
                              <label className="d-block font-weight-bold mb-2">Current Images:</label>
                              <div className="row">
                                {editExistingImages.map((image, index) => {
                                  // Ensure image URL is properly formatted
                                  const imageUrl = image.startsWith('http') || image.startsWith('/') 
                                    ? image 
                                    : `/storage/${image.replace(/^storage\//, '')}`
                                  return (
                                    <div key={`existing-${index}`} className="col-md-3 mb-2 position-relative">
                                      <img
                                        src={imageUrl}
                                        alt={`Existing ${index + 1}`}
                                        className="img-thumbnail"
                                        style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                                        onError={(e) => {
                                          // Fallback if image fails to load
                                          e.target.src = '/images/placeholder.png'
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-danger position-absolute"
                                        style={{ top: '5px', right: '5px', zIndex: 10 }}
                                        onClick={() => removeEditExistingImage(index)}
                                        title="Remove this image"
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            </>
                          )}
                          {editImagePreviews.length > 0 && (
                            <>
                              <label className="d-block font-weight-bold mb-2 mt-3">New Images (to be added):</label>
                              <div className="row">
                                {editImagePreviews.map((preview, index) => (
                                  <div key={`new-${index}`} className="col-md-3 mb-2 position-relative">
                                    <img
                                      src={preview}
                                      alt={`New Preview ${index + 1}`}
                                      className="img-thumbnail"
                                      style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger position-absolute"
                                      style={{ top: '5px', right: '5px', zIndex: 10 }}
                                      onClick={() => removeEditImage(index)}
                                      title="Remove this image"
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      <input
                        type="file"
                        name="item_images[]"
                        className={`form-control ${editForm.errors.item_images ? 'is-invalid' : ''}`}
                        onChange={handleEditImageChange}
                        accept="image/*"
                        multiple
                      />
                      {editForm.errors.item_images && (
                        <div className="invalid-feedback">{editForm.errors.item_images}</div>
                      )}
                      {editForm.errors['item_images.0'] && (
                        <div className="invalid-feedback">{editForm.errors['item_images.0']}</div>
                      )}
                      <small className="form-text text-muted">
                        {editExistingImages.length > 0 
                          ? 'Add more images or remove existing ones. At least one image is required.'
                          : 'Upload at least one product image (JPEG, PNG, JPG, GIF - Max 5MB per image)'
                        }
                      </small>
                    </div>
                    <div className="form-group">
                      <label>Status <span className="text-danger">*</span></label>
                      <select
                        name="item_status"
                        className={`form-control ${editForm.errors.item_status ? 'is-invalid' : ''}`}
                        value={editForm.data.item_status}
                        onChange={(e) => editForm.setData('item_status', e.target.value)}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {editForm.errors.item_status && (
                        <div className="invalid-feedback">{editForm.errors.item_status}</div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={editForm.processing}>
                      {editForm.processing ? 'Updating...' : 'Update Product'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showRemoveModal && productToRemove && (
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
                  <p>Are you sure you want to delete <strong>{productToRemove.item_name}</strong>?</p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteProduct}>
                    Delete Product
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

