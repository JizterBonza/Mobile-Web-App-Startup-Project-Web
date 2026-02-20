import { useState, useEffect } from 'react'
import { useForm, Link, router } from '@inertiajs/react'
import AdminLayout from '../../../Layouts/AdminLayout'

export default function OrderItems({ auth, order, orderItems = [], orderItemStatuses = [], flash }) {
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showStatusModalAnimation, setShowStatusModalAnimation] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

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
      setSelectedItem(null)
      statusForm.reset()
    }, 300)
  }

  useEffect(() => {
    if (flash?.success) {
      closeStatusModal()
      statusForm.reset()
    }
  }, [flash])

  const itemStatusToFormValue = (v) => {
    if (v == null || v === '') return ''
    const n = Number(v)
    if (!Number.isNaN(n) && n > 0) return String(n)
    return typeof v === 'string' ? v : ''
  }

  const handleUpdateStatus = (item) => {
    setSelectedItem(item)
    statusForm.setData({
      item_status: itemStatusToFormValue(item.item_status),
    })
    setShowStatusModal(true)
    setShowStatusModalAnimation(false)
  }

  const handleSubmitStatus = (e) => {
    e.preventDefault()
    statusForm.setData({ ...statusForm.data, return_to_order_id: order?.id })
    statusForm.put(`/dashboard/vendor/orders/${selectedItem.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeStatusModal()
      },
    })
  }

  const pendingStatusId = orderItemStatuses.find((s) => String(s.stat_description).toLowerCase() === 'pending')?.id
  const preparingStatusId = orderItemStatuses.find((s) => String(s.stat_description).toLowerCase() === 'preparing')?.id

  const isPending = (item) => {
    const statusId = item.item_status != null ? Number(item.item_status) : null
    return statusId === pendingStatusId
  }

  const [confirmingId, setConfirmingId] = useState(null)
  const handleConfirm = (item) => {
    if (preparingStatusId == null) return
    setConfirmingId(item.id)
    router.put(`/dashboard/vendor/orders/${item.id}`, {
      item_status: preparingStatusId,
      return_to_order_id: order?.id,
    }, {
      preserveScroll: true,
      onFinish: () => setConfirmingId(null),
    })
  }

  const statusColorMap = {
    'pending': 'warning',
    'processing': 'info',
    'ready for pickup': 'info',
    'in-transit': 'info',
    'delivered': 'success',
    'cancelled': 'danger',
  }
  const getStatusBadge = (status) => {
    if (status == null || status === '') return <span className="badge badge-secondary">—</span>
    const id = Number(status)
    if (!Number.isNaN(id) && orderItemStatuses.length > 0) {
      const found = orderItemStatuses.find((s) => s.id === id)
      if (found) {
        const color = statusColorMap[found.stat_description?.toLowerCase()] || 'secondary'
        return <span className={`badge badge-${color}`}>{found.stat_description}</span>
      }
    }
    const str = String(status)
    const color = statusColorMap[str?.toLowerCase()] || 'secondary'
    const label = str.charAt(0).toUpperCase() + str.slice(1)
    return <span className={`badge badge-${color}`}>{label}</span>
  }

  return (
    <AdminLayout auth={auth} title={`Order #${order?.id} – Items`}>
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

      <div className="mb-3">
        <Link href="/dashboard/vendor/orders" className="btn btn-outline-secondary btn-sm">
          <i className="fas fa-arrow-left mr-1"></i> Back to Orders
        </Link>
      </div>

      {order && (
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">Order #{order.id}</h5>
            <p className="mb-1"><strong>Customer:</strong> {order.customer_name} ({order.customer_email})</p>
            <p className="mb-1"><strong>Order status:</strong> <span className="badge badge-info">{order.order_status}</span></p>
            <p className="mb-0"><strong>Ordered at:</strong> {new Date(order.ordered_at).toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Order Items</h3>
        </div>
        <div className="card-body table-responsive p-0">
          <table className="table table-hover text-nowrap">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
                <th>Item Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">No items in this order</td>
                </tr>
              ) : (
                orderItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.item_name}</td>
                    <td>{item.quantity}</td>
                    <td>${parseFloat(item.price_at_purchase).toFixed(2)}</td>
                    <td>${parseFloat(item.total).toFixed(2)}</td>
                    <td>{getStatusBadge(item.item_status)}</td>
                    <td>
                      {isPending(item) && (
                        <button
                          className="btn btn-sm btn-success mr-1"
                          onClick={() => handleConfirm(item)}
                          disabled={confirmingId === item.id}
                          title="Confirm"
                        >
                          {confirmingId === item.id ? (
                            <>Confirming...</>
                          ) : (
                            <><i className="fas fa-check"></i> Confirm</>
                          )}
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => handleUpdateStatus(item)}
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

      {showStatusModal && selectedItem && (
        <>
          <div className={`modal-backdrop fade ${showStatusModalAnimation ? 'show' : ''}`} onClick={closeStatusModal}></div>
          <div className={`modal fade ${showStatusModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Update Item Status</h4>
                  <button type="button" className="close" onClick={closeStatusModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleSubmitStatus}>
                  <div className="modal-body">
                    <p><strong>Product:</strong> {selectedItem.item_name}</p>
                    <div className="form-group">
                      <label>Item Status <span className="text-danger">*</span></label>
                      <select
                        className={`form-control ${statusForm.errors.item_status ? 'is-invalid' : ''}`}
                        value={statusForm.data.item_status}
                        onChange={(e) => statusForm.setData('item_status', e.target.value)}
                        required
                      >
                        <option value="">Select status...</option>
                        {orderItemStatuses.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.stat_description}
                          </option>
                        ))}
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
