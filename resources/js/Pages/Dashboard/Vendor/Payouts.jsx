import { useState } from 'react'
import { router } from '@inertiajs/react'
import AdminLayout from '../../../Layouts/AdminLayout'

export default function Payouts({ auth, payouts = [], totalRevenue = 0, totalOrders = 0, shop, flash }) {
  return (
    <AdminLayout auth={auth} title="Payouts">
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

      {/* Summary Cards */}
      <div className="row">
        <div className="col-lg-4 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{totalOrders}</h3>
              <p>Total Orders</p>
            </div>
            <div className="icon">
              <i className="fas fa-shopping-bag"></i>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>${parseFloat(totalRevenue).toFixed(2)}</h3>
              <p>Total Revenue</p>
            </div>
            <div className="icon">
              <i className="fas fa-dollar-sign"></i>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>${parseFloat(totalRevenue).toFixed(2)}</h3>
              <p>Available Payout</p>
            </div>
            <div className="icon">
              <i className="fas fa-money-bill-wave"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Payout History</h3>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Ordered At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center">No completed orders found</td>
                    </tr>
                  ) : (
                    payouts.map((payout) => (
                      <tr key={payout.id}>
                        <td>#{payout.order_id}</td>
                        <td>Order Item #{payout.id}</td>
                        <td>{payout.quantity}</td>
                        <td>${parseFloat(payout.price_at_purchase).toFixed(2)}</td>
                        <td>${parseFloat(payout.total).toFixed(2)}</td>
                        <td>{new Date(payout.ordered_at).toLocaleDateString()}</td>
                        <td><span className="badge badge-success">Delivered</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="row">
        <div className="col-12">
          <div className="card card-info">
            <div className="card-header">
              <h3 className="card-title"><i className="fas fa-info-circle"></i> Payout Information</h3>
            </div>
            <div className="card-body">
              <p>This page shows all completed orders that are eligible for payout. Orders are marked as "Delivered" and are included in your total revenue calculation.</p>
              <p className="mb-0"><strong>Note:</strong> Payouts are processed based on your store's payout schedule. Contact support for more information about payout processing.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

