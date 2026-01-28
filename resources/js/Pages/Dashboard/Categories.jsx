import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'

export default function Categories({ auth, categories = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryToRemove, setCategoryToRemove] = useState(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)

  const addForm = useForm({
    category_name: '',
    category_description: '',
    category_image_url: '',
    status: 'active',
  })

  const editForm = useForm({
    category_name: '',
    category_description: '',
    category_image_url: '',
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
        category_name: '',
        category_description: '',
        category_image_url: '',
        status: 'active',
      })
    }, 300)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedCategory(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setCategoryToRemove(null)
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

  const handleAddCategory = (e) => {
    e.preventDefault()
    addForm.post(baseRoute, {
      preserveScroll: true,
      onSuccess: () => {
        addForm.reset()
      },
    })
  }

  const handleEditCategory = (category) => {
    setSelectedCategory(category)
    editForm.setData({
      category_name: String(category.category_name || ''),
      category_description: String(category.category_description || ''),
      category_image_url: String(category.category_image_url || ''),
      status: String(category.status || 'active'),
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateCategory = (e) => {
    e.preventDefault()
    if (!selectedCategory) {
      return
    }
    editForm.put(`${baseRoute}/${selectedCategory.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeEditModal()
      },
    })
  }

  const handleDeleteCategory = (categoryId) => {
    const category = categories.find(c => c.id === categoryId)
    setCategoryToRemove(category)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmDeleteCategory = () => {
    if (categoryToRemove) {
      router.delete(`${baseRoute}/${categoryToRemove.id}`, {
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

  // Determine the base route based on user type
  const getBaseRoute = () => {
    if (auth.user.user_type === 'super_admin') {
      return '/dashboard/super-admin/categories'
    } else if (auth.user.user_type === 'admin') {
      return '/dashboard/admin/categories'
    }
    return '/dashboard/categories'
  }

  const baseRoute = getBaseRoute()

  return (
    <AdminLayout auth={auth} title="Categories">
      {/* Flash Messages */}
      {flash?.success && showSuccessAlert && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
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
            e.stopPropagation()
            setShowErrorAlert(false)
          }}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Category List</h3>
              <div className="card-tools">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowAddModal(true)
                    setShowAddModalAnimation(false)
                  }}
                >
                  <i className="fas fa-plus"></i> Add Category
                </button>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Image URL</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center">No categories found</td>
                    </tr>
                  ) : (
                    categories.map((category) => (
                      <tr key={category.id}>
                        <td>{category.id}</td>
                        <td>{category.category_name}</td>
                        <td>{category.category_description || '-'}</td>
                        <td>
                          {category.category_image_url ? (
                            <a href={category.category_image_url} target="_blank" rel="noopener noreferrer">
                              <i className="fas fa-image"></i> View
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{getStatusBadge(category.status)}</td>
                        <td>{new Date(category.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-info mr-1"
                            onClick={() => handleEditCategory(category)}
                            title="Edit Category"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteCategory(category.id)}
                            title="Delete Category"
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

      {/* Add Category Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Category</h4>
                  <button type="button" className="close" onClick={closeAddModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddCategory}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Category Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.category_name ? 'is-invalid' : ''}`}
                        value={addForm.data.category_name}
                        onChange={(e) => addForm.setData('category_name', e.target.value)}
                        required
                      />
                      {addForm.errors.category_name && (
                        <div className="invalid-feedback">{addForm.errors.category_name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className={`form-control ${addForm.errors.category_description ? 'is-invalid' : ''}`}
                        value={addForm.data.category_description}
                        onChange={(e) => addForm.setData('category_description', e.target.value)}
                        rows="3"
                      />
                      {addForm.errors.category_description && (
                        <div className="invalid-feedback">{addForm.errors.category_description}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Image URL</label>
                      <input
                        type="url"
                        className={`form-control ${addForm.errors.category_image_url ? 'is-invalid' : ''}`}
                        value={addForm.data.category_image_url}
                        onChange={(e) => addForm.setData('category_image_url', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                      />
                      {addForm.errors.category_image_url && (
                        <div className="invalid-feedback">{addForm.errors.category_image_url}</div>
                      )}
                    </div>
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
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAddModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                      {addForm.processing ? 'Creating...' : 'Create Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Category</h4>
                  <button type="button" className="close" onClick={closeEditModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateCategory}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Category Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${editForm.errors.category_name ? 'is-invalid' : ''}`}
                        value={editForm.data.category_name}
                        onChange={(e) => editForm.setData('category_name', e.target.value)}
                        required
                      />
                      {editForm.errors.category_name && (
                        <div className="invalid-feedback">{editForm.errors.category_name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className={`form-control ${editForm.errors.category_description ? 'is-invalid' : ''}`}
                        value={editForm.data.category_description}
                        onChange={(e) => editForm.setData('category_description', e.target.value)}
                        rows="3"
                      />
                      {editForm.errors.category_description && (
                        <div className="invalid-feedback">{editForm.errors.category_description}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Image URL</label>
                      <input
                        type="url"
                        className={`form-control ${editForm.errors.category_image_url ? 'is-invalid' : ''}`}
                        value={editForm.data.category_image_url}
                        onChange={(e) => editForm.setData('category_image_url', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                      />
                      {editForm.errors.category_image_url && (
                        <div className="invalid-feedback">{editForm.errors.category_image_url}</div>
                      )}
                    </div>
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
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={editForm.processing}>
                      {editForm.processing ? 'Updating...' : 'Update Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showRemoveModal && categoryToRemove && (
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
                  <p>Are you sure you want to delete <strong>{categoryToRemove.category_name}</strong>?</p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteCategory}>
                    Delete Category
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
