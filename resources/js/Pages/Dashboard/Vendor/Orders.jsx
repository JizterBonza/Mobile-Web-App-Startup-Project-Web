import { Link, router } from '@inertiajs/react'
import AdminLayout from '../../../Layouts/AdminLayout'

export default function Orders({ auth, orders = [], shop, flash }) {
  const getOrderStatusBadge = (description) => {
    if (description == null || description === '' || description === '—') return <span className="badge badge-secondary">—</span>
    const str = String(description).toLowerCase()
    const colorMap = {
      'pending': 'warning',
      'preparing': 'info',
      'ready for pickup': 'info',
      'ready for delivery': 'info',
      'in-transit': 'primary',
      'delivered': 'success',
      'cancelled': 'danger',
    }
    const color = colorMap[str] || 'secondary'
    const label = String(description).charAt(0).toUpperCase() + String(description).slice(1)
    return <span className={`badge badge-${color}`}>{label}</span>
  }

  return (
    <AdminLayout auth={auth} title="Orders">
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
                    <th>Customer</th>
                    <th>Order Status</th>
                    <th>Ordered At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center">No orders found</td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>
                          <div>{order.customer_name}</div>
                          <small className="text-muted">{order.customer_email}</small>
                        </td>
                        <td>{getOrderStatusBadge(order.order_status_description)}</td>
                        <td>{new Date(order.ordered_at).toLocaleDateString()}</td>
                        <td>
                          <Link
                            href={`/dashboard/vendor/orders/${order.id}/items`}
                            className="btn btn-sm btn-primary"
                            title="Show order items"
                          >
                            <i className="fas fa-list"></i> Show order items
                          </Link>
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
    </AdminLayout>
  )
}
