import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../../Layouts/AdminLayout'

export default function Inventory({ auth, inventory = [], store, flash }) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const editForm = useForm({
    item_quantity: '',
  })

  useEffect(() => {
    if (showEditModal) {
      setTimeout(() => setShowEditModalAnimation(true), 10)
    } else {
      setShowEditModalAnimation(false)
    }
  }, [showEditModal])

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedItem(null)
      editForm.reset()
    }, 300)
  }

  useEffect(() => {
    if (flash?.success) {
      closeEditModal()
      editForm.reset()
    }
  }, [flash])

  const handleEditInventory = (item) => {
    setSelectedItem(item)
    editForm.setData({
      item_quantity: item.item_quantity,
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateInventory = (e) => {
    e.preventDefault()
    editForm.put(`/dashboard/vendor/inventory/${selectedItem.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeEditModal()
      },
    })
  }

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="badge badge-success">Active</span>
    }
    return <span className="badge badge-danger">Inactive</span>
  }

  const getStockStatus = (quantity) => {
    if (quantity === 0) {
      return <span className="badge badge-danger">Out of Stock</span>
    } else if (quantity < 10) {
      return <span className="badge badge-warning">Low Stock</span>
    }
    return <span className="badge badge-success">In Stock</span>
  }

  return (
    <AdminLayout auth={auth} title="Inventory Management">
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
              <h3 className="card-title">Inventory</h3>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Stock Status</th>
                    <th>Status</th>
                    <th>Sold</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center">No inventory items found</td>
                    </tr>
                  ) : (
                    inventory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.item_name}</td>
                        <td>{item.category || '-'}</td>
                        <td>${parseFloat(item.item_price).toFixed(2)}</td>
                        <td>{item.item_quantity}</td>
                        <td>{getStockStatus(item.item_quantity)}</td>
                        <td>{getStatusBadge(item.item_status)}</td>
                        <td>{item.sold_count}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-info"
                            onClick={() => handleEditInventory(item)}
                            title="Update Quantity"
                          >
                            <i className="fas fa-edit"></i> Update
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

      {/* Edit Inventory Modal */}
      {showEditModal && selectedItem && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Update Inventory</h4>
                  <button type="button" className="close" onClick={closeEditModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateInventory}>
                  <div className="modal-body">
                    <p><strong>Product:</strong> {selectedItem.item_name}</p>
                    <div className="form-group">
                      <label>Quantity <span className="text-danger">*</span></label>
                      <input
                        type="number"
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
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={editForm.processing}>
                      {editForm.processing ? 'Updating...' : 'Update Quantity'}
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

