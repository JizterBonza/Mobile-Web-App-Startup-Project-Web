import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'

export default function SubCategories({ auth, subCategories = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedSubCategory, setSelectedSubCategory] = useState(null)
  const [subCategoryToRemove, setSubCategoryToRemove] = useState(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)

  const addForm = useForm({
    sub_category_name: '',
    sub_category_description: '',
    sub_category_status: 'active',
  })

  const editForm = useForm({
    sub_category_name: '',
    sub_category_description: '',
    sub_category_status: 'active',
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
        sub_category_name: '',
        sub_category_description: '',
        sub_category_status: 'active',
      })
    }, 300)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedSubCategory(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setSubCategoryToRemove(null)
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

  // Determine the base route based on user type
  const getBaseRoute = () => {
    if (auth.user.user_type === 'super_admin') {
      return '/dashboard/super-admin/sub-categories'
    } else if (auth.user.user_type === 'admin') {
      return '/dashboard/admin/sub-categories'
    }
    return '/dashboard/sub-categories'
  }

  const baseRoute = getBaseRoute()

  const handleAddSubCategory = (e) => {
    e.preventDefault()
    addForm.post(baseRoute, {
      preserveScroll: true,
      onSuccess: () => {
        addForm.reset()
      },
    })
  }

  const handleEditSubCategory = (subCategory) => {
    setSelectedSubCategory(subCategory)
    editForm.setData({
      sub_category_name: String(subCategory.sub_category_name || ''),
      sub_category_description: String(subCategory.sub_category_description || ''),
      sub_category_status: String(subCategory.sub_category_status || 'active'),
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateSubCategory = (e) => {
    e.preventDefault()
    if (!selectedSubCategory) {
      return
    }
    editForm.put(`${baseRoute}/${selectedSubCategory.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeEditModal()
      },
    })
  }

  const handleDeleteSubCategory = (subCategoryId) => {
    const subCategory = subCategories.find(sc => sc.id === subCategoryId)
    setSubCategoryToRemove(subCategory)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmDeleteSubCategory = () => {
    if (subCategoryToRemove) {
      router.delete(`${baseRoute}/${subCategoryToRemove.id}`, {
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
    <AdminLayout auth={auth} title="Sub-Categories">
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
              <h3 className="card-title">Sub-Category List</h3>
              <div className="card-tools">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowAddModal(true)
                    setShowAddModalAnimation(false)
                  }}
                >
                  <i className="fas fa-plus"></i> Add Sub-Category
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
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subCategories.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center">No sub-categories found</td>
                    </tr>
                  ) : (
                    subCategories.map((subCategory) => (
                      <tr key={subCategory.id}>
                        <td>{subCategory.id}</td>
                        <td>{subCategory.sub_category_name}</td>
                        <td>{subCategory.sub_category_description || '-'}</td>
                        <td>{getStatusBadge(subCategory.sub_category_status)}</td>
                        <td>{new Date(subCategory.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-info mr-1"
                            onClick={() => handleEditSubCategory(subCategory)}
                            title="Edit Sub-Category"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteSubCategory(subCategory.id)}
                            title="Delete Sub-Category"
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

      {/* Add Sub-Category Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Sub-Category</h4>
                  <button type="button" className="close" onClick={closeAddModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddSubCategory}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Sub-Category Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.sub_category_name ? 'is-invalid' : ''}`}
                        value={addForm.data.sub_category_name}
                        onChange={(e) => addForm.setData('sub_category_name', e.target.value)}
                        required
                      />
                      {addForm.errors.sub_category_name && (
                        <div className="invalid-feedback">{addForm.errors.sub_category_name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className={`form-control ${addForm.errors.sub_category_description ? 'is-invalid' : ''}`}
                        value={addForm.data.sub_category_description}
                        onChange={(e) => addForm.setData('sub_category_description', e.target.value)}
                        rows="3"
                      />
                      {addForm.errors.sub_category_description && (
                        <div className="invalid-feedback">{addForm.errors.sub_category_description}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Status <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${addForm.errors.sub_category_status ? 'is-invalid' : ''}`}
                        value={addForm.data.sub_category_status}
                        onChange={(e) => addForm.setData('sub_category_status', e.target.value)}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {addForm.errors.sub_category_status && (
                        <div className="invalid-feedback">{addForm.errors.sub_category_status}</div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAddModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                      {addForm.processing ? 'Creating...' : 'Create Sub-Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Sub-Category Modal */}
      {showEditModal && selectedSubCategory && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Sub-Category</h4>
                  <button type="button" className="close" onClick={closeEditModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateSubCategory}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Sub-Category Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${editForm.errors.sub_category_name ? 'is-invalid' : ''}`}
                        value={editForm.data.sub_category_name}
                        onChange={(e) => editForm.setData('sub_category_name', e.target.value)}
                        required
                      />
                      {editForm.errors.sub_category_name && (
                        <div className="invalid-feedback">{editForm.errors.sub_category_name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className={`form-control ${editForm.errors.sub_category_description ? 'is-invalid' : ''}`}
                        value={editForm.data.sub_category_description}
                        onChange={(e) => editForm.setData('sub_category_description', e.target.value)}
                        rows="3"
                      />
                      {editForm.errors.sub_category_description && (
                        <div className="invalid-feedback">{editForm.errors.sub_category_description}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Status <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${editForm.errors.sub_category_status ? 'is-invalid' : ''}`}
                        value={editForm.data.sub_category_status}
                        onChange={(e) => editForm.setData('sub_category_status', e.target.value)}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {editForm.errors.sub_category_status && (
                        <div className="invalid-feedback">{editForm.errors.sub_category_status}</div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={editForm.processing}>
                      {editForm.processing ? 'Updating...' : 'Update Sub-Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showRemoveModal && subCategoryToRemove && (
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
                  <p>Are you sure you want to delete <strong>{subCategoryToRemove.sub_category_name}</strong>?</p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteSubCategory}>
                    Delete Sub-Category
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
