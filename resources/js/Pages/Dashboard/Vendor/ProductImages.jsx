import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../../Layouts/AdminLayout'

export default function ProductImages({ auth, productImages = [], shop, agrivet, flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteModalAnimation, setShowDeleteModalAnimation] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageToDelete, setImageToDelete] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)

  const addForm = useForm({
    name: '',
    image: null,
    category: '',
    status: 'active',
  })

  const editForm = useForm({
    name: '',
    image: null,
    category: '',
    status: 'active',
  })

  // Get unique categories for filter dropdown
  const categories = [...new Set(productImages.map(img => img.category).filter(Boolean))]

  // Filter images
  const filteredImages = productImages.filter(img => {
    const matchesCategory = !filterCategory || img.category === filterCategory
    const matchesStatus = !filterStatus || img.status === filterStatus
    const matchesSearch = !searchTerm || 
      img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (img.category && img.category.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesCategory && matchesStatus && matchesSearch
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
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
      }
    }, 300)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedImage(null)
      editForm.reset()
      if (editImagePreview && editImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(editImagePreview)
      }
      setEditImagePreview(null)
    }, 300)
  }

  const closeDeleteModal = () => {
    setShowDeleteModalAnimation(false)
    setTimeout(() => {
      setShowDeleteModal(false)
      setImageToDelete(null)
    }, 300)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      addForm.setData('image', file)
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleEditImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      editForm.setData('image', file)
      if (editImagePreview && editImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(editImagePreview)
      }
      setEditImagePreview(URL.createObjectURL(file))
    }
    e.target.value = ''
  }

  useEffect(() => {
    if (flash?.success) {
      closeAddModal()
      closeEditModal()
      closeDeleteModal()
      addForm.reset()
      editForm.reset()
      setShowSuccessAlert(true)
    }
    if (flash?.error) {
      setShowErrorAlert(true)
    }
  }, [flash])

  const handleAddImage = (e) => {
    e.preventDefault()
    addForm.post('/dashboard/vendor/product-images', {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        addForm.reset()
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview)
          setImagePreview(null)
        }
      },
    })
  }

  const handleEditImage = (image) => {
    setSelectedImage(image)
    editForm.setData({
      name: image.name || '',
      image: null,
      category: image.category || '',
      status: image.status || 'active',
    })
    setEditImagePreview(image.image_url)
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateImage = (e) => {
    e.preventDefault()
    if (!selectedImage) return

    // For PUT requests with file uploads, use transform to add _method field
    editForm.transform(data => ({
      ...data,
      _method: 'PUT',
    })).post(`/dashboard/vendor/product-images/${selectedImage.id}`, {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        if (editImagePreview && editImagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(editImagePreview)
        }
        closeEditModal()
      },
    })
  }

  const handleDeleteImage = (image) => {
    setImageToDelete(image)
    setShowDeleteModal(true)
    setShowDeleteModalAnimation(false)
  }

  const confirmDeleteImage = () => {
    if (imageToDelete) {
      router.delete(`/dashboard/vendor/product-images/${imageToDelete.id}`, {
        preserveScroll: true,
        onSuccess: () => {
          closeDeleteModal()
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
    <AdminLayout auth={auth} title="Product Images">
      {/* Flash Messages */}
      {flash?.success && showSuccessAlert && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={(e) => {
            e.preventDefault()
            setShowSuccessAlert(false)
          }}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {flash?.error && showErrorAlert && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {flash.error}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={(e) => {
            e.preventDefault()
            setShowErrorAlert(false)
          }}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {/* Info Card */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="callout callout-info">
            <h5><i className="fas fa-info-circle mr-2"></i>Product Image Stock</h5>
            <p className="mb-0">
              Manage your product image library here. Upload images once and reuse them across multiple products 
              to ensure consistency and uniformity in your product listings.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-3">
        <div className="col-md-4">
          <div className="form-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-3">
          <div className="form-group">
            <select
              className="form-control"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-md-2">
          <div className="form-group">
            <select
              className="form-control"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="col-md-3 text-right">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowAddModal(true)
              setShowAddModalAnimation(false)
            }}
          >
            <i className="fas fa-plus mr-1"></i> Add Image
          </button>
        </div>
      </div>

      {/* Image Grid */}
      <div className="row">
        {filteredImages.length === 0 ? (
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="fas fa-images fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">No product images found</h5>
                <p className="text-muted mb-3">
                  {searchTerm || filterCategory || filterStatus 
                    ? 'Try adjusting your filters or search term.'
                    : 'Start by adding your first product image to the library.'}
                </p>
                {!searchTerm && !filterCategory && !filterStatus && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setShowAddModal(true)
                      setShowAddModalAnimation(false)
                    }}
                  >
                    <i className="fas fa-plus mr-1"></i> Add Your First Image
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          filteredImages.map((image) => (
            <div key={image.id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
              <div className="card h-100">
                <div className="position-relative">
                  <img
                    src={image.image_url}
                    alt={image.name}
                    className="card-img-top"
                    style={{ height: '180px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = '/images/placeholder.png'
                    }}
                  />
                  <div className="position-absolute" style={{ top: '10px', right: '10px' }}>
                    {getStatusBadge(image.status)}
                  </div>
                </div>
                <div className="card-body p-3">
                  <h6 className="card-title mb-1 text-truncate" title={image.name}>
                    {image.name}
                  </h6>
                  {image.category && (
                    <small className="text-muted d-block mb-2">
                      <i className="fas fa-folder mr-1"></i> {image.category}
                    </small>
                  )}
                </div>
                <div className="card-footer bg-transparent p-2">
                  <button
                    className="btn btn-sm btn-info mr-1"
                    onClick={() => handleEditImage(image)}
                    title="Edit"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteImage(image)}
                    title="Delete"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Image Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add Product Image</h4>
                  <button type="button" className="close" onClick={closeAddModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddImage}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Image Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.name ? 'is-invalid' : ''}`}
                        value={addForm.data.name}
                        onChange={(e) => addForm.setData('name', e.target.value)}
                        placeholder="e.g., Chicken Feed - Premium"
                        required
                      />
                      {addForm.errors.name && (
                        <div className="invalid-feedback">{addForm.errors.name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Image <span className="text-danger">*</span></label>
                      <input
                        type="file"
                        className={`form-control ${addForm.errors.image ? 'is-invalid' : ''}`}
                        onChange={handleImageChange}
                        accept="image/*"
                        required
                      />
                      {addForm.errors.image && (
                        <div className="invalid-feedback">{addForm.errors.image}</div>
                      )}
                      <small className="form-text text-muted">
                        JPEG, PNG, JPG, or GIF - Max 5MB
                      </small>
                      {imagePreview && (
                        <div className="mt-3 text-center">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="img-thumbnail"
                            style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        className={`form-control ${addForm.errors.category ? 'is-invalid' : ''}`}
                        value={addForm.data.category}
                        onChange={(e) => addForm.setData('category', e.target.value)}
                      >
                        <option value="">Select Category</option>
                        <option value="Animal Feed">Animal Feed</option>
                        <option value="Feed Supplements">Feed Supplements</option>
                        <option value="Animal Vitamins & Nutritional Supplements">Animal Vitamins & Nutritional Supplements</option>
                      </select>
                      {addForm.errors.category && (
                        <div className="invalid-feedback">{addForm.errors.category}</div>
                      )}
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
                      {addForm.processing ? 'Uploading...' : 'Add Image'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Image Modal */}
      {showEditModal && selectedImage && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Product Image</h4>
                  <button type="button" className="close" onClick={closeEditModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateImage}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Image Name <span className="text-danger">*</span></label>
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
                    <div className="form-group">
                      <label>Current Image</label>
                      {editImagePreview && (
                        <div className="mb-2 text-center">
                          <img
                            src={editImagePreview}
                            alt="Current"
                            className="img-thumbnail"
                            style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              e.target.src = '/images/placeholder.png'
                            }}
                          />
                        </div>
                      )}
                      <input
                        type="file"
                        className={`form-control ${editForm.errors.image ? 'is-invalid' : ''}`}
                        onChange={handleEditImageChange}
                        accept="image/*"
                      />
                      {editForm.errors.image && (
                        <div className="invalid-feedback">{editForm.errors.image}</div>
                      )}
                      <small className="form-text text-muted">
                        Leave empty to keep current image. JPEG, PNG, JPG, or GIF - Max 5MB
                      </small>
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        className={`form-control ${editForm.errors.category ? 'is-invalid' : ''}`}
                        value={editForm.data.category}
                        onChange={(e) => editForm.setData('category', e.target.value)}
                      >
                        <option value="">Select Category</option>
                        <option value="Animal Feed">Animal Feed</option>
                        <option value="Feed Supplements">Feed Supplements</option>
                        <option value="Animal Vitamins & Nutritional Supplements">Animal Vitamins & Nutritional Supplements</option>
                      </select>
                      {editForm.errors.category && (
                        <div className="invalid-feedback">{editForm.errors.category}</div>
                      )}
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
                      {editForm.processing ? 'Updating...' : 'Update Image'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && imageToDelete && (
        <>
          <div className={`modal-backdrop fade ${showDeleteModalAnimation ? 'show' : ''}`} onClick={closeDeleteModal}></div>
          <div className={`modal fade ${showDeleteModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Confirm Delete</h4>
                  <button type="button" className="close" onClick={closeDeleteModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="text-center mb-3">
                    <img
                      src={imageToDelete.image_url}
                      alt={imageToDelete.name}
                      className="img-thumbnail"
                      style={{ maxHeight: '150px', maxWidth: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.src = '/images/placeholder.png'
                      }}
                    />
                  </div>
                  <p>Are you sure you want to delete <strong>{imageToDelete.name}</strong>?</p>
                  <p className="text-muted mb-0">This action cannot be undone. Products using this image will not be affected.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeDeleteModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteImage}>
                    Delete Image
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

