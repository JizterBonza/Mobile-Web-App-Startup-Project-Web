import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../../Layouts/AdminLayout'

export default function Orders({ auth, orders = [], shop, flash }) {
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showStatusModalAnimation, setShowStatusModalAnimation] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  const statusForm = useForm({
    item_status: '',
  })

  useEffect(() => {
    if (showStatusModal) {
      setTimeout(() => setShowStatusModalAnimation(true), 10)
    } else {
      setShowStatusModalAnimation(false)
    }
  }, [showStatusModal])

  const closeStatusModal = () => {
    setShowStatusModalAnimation(false)
    setTimeout(() => {
      setShowStatusModal(false)
      setSelectedOrder(null)
      statusForm.reset()
    }, 300)
  }

  useEffect(() => {
    if (flash?.success) {
      closeStatusModal()
      statusForm.reset()
    }
  }, [flash])

  const handleUpdateStatus = (order) => {
    setSelectedOrder(order)
    statusForm.setData({
      item_status: order.item_status,
    })
    setShowStatusModal(true)
    setShowStatusModalAnimation(false)
  }

  const handleSubmitStatus = (e) => {
    e.preventDefault()
    statusForm.put(`/dashboard/vendor/orders/${selectedOrder.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeStatusModal()
      },
    })
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'ordered': 'warning',
      'shipped': 'info',
      'delivered': 'success',
      'cancelled': 'danger',
    }
    const color = statusMap[status] || 'secondary'
    return <span className={`badge badge-${color}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  const getOrderStatusBadge = (status) => {
    const statusMap = {
      'pending': 'warning',
      'processing': 'info',
      'completed': 'success',
      'cancelled': 'danger',
    }
    const color = statusMap[status] || 'secondary'
    return <span className={`badge badge-${color}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  return (
    <AdminLayout auth={auth} title="Orders">
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
              <h3 className="card-title">Order List</h3>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Item Status</th>
                    <th>Order Status</th>
                    <th>Ordered At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center">No orders found</td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.order_id}</td>
                        <td>{order.item_name}</td>
                        <td>
                          <div>{order.customer_name}</div>
                          <small className="text-muted">{order.customer_email}</small>
                        </td>
                        <td>{order.quantity}</td>
                        <td>${parseFloat(order.price_at_purchase).toFixed(2)}</td>
                        <td>${parseFloat(order.total).toFixed(2)}</td>
                        <td>{getStatusBadge(order.item_status)}</td>
                        <td>{getOrderStatusBadge(order.order_status)}</td>
                        <td>{new Date(order.ordered_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-info"
                            onClick={() => handleUpdateStatus(order)}
                            title="Update Status"
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

      {/* Update Status Modal */}
      {showStatusModal && selectedOrder && (
        <>
          <div className={`modal-backdrop fade ${showStatusModalAnimation ? 'show' : ''}`} onClick={closeStatusModal}></div>
          <div className={`modal fade ${showStatusModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Update Order Status</h4>
                  <button type="button" className="close" onClick={closeStatusModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleSubmitStatus}>
                  <div className="modal-body">
                    <p><strong>Order ID:</strong> #{selectedOrder.order_id}</p>
                    <p><strong>Product:</strong> {selectedOrder.item_name}</p>
                    <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
                    <div className="form-group">
                      <label>Item Status <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${statusForm.errors.item_status ? 'is-invalid' : ''}`}
                        value={statusForm.data.item_status}
                        onChange={(e) => statusForm.setData('item_status', e.target.value)}
                        required
                      >
                        <option value="ordered">Ordered</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      {statusForm.errors.item_status && (
                        <div className="invalid-feedback">{statusForm.errors.item_status}</div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeStatusModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={statusForm.processing}>
                      {statusForm.processing ? 'Updating...' : 'Update Status'}
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

