import { useEffect, useState } from 'react'
import { Link } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'

export default function VendorDashboard({ auth, shop, agrivet, stats = {} }) {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [sessionValid, setSessionValid] = useState(true);

  // Check session validity periodically
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/session/check', {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSessionInfo(data.session_data);
          setSessionValid(data.valid);
        } else {
          setSessionValid(false);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setSessionValid(false);
      }
    };

    // Check session immediately
    checkSession();

    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout auth={auth} title="Vendor Dashboard">
      {/* Session Status Alert */}
      {!sessionValid && (
        <div className="alert alert-danger alert-dismissible">
          <button type="button" className="close" data-dismiss="alert" aria-hidden="true">&times;</button>
          <h5><i className="icon fas fa-ban"></i> Session Expired!</h5>
          Your session has expired. Please refresh the page to login again.
        </div>
      )}

      {/* Shop Not Associated Warning */}
      {!shop && (
        <div className="alert alert-warning">
          <h5><i className="icon fas fa-exclamation-triangle"></i> No Shop Assigned</h5>
          You are not currently associated with any shop. Please contact an administrator to be assigned to a shop.
        </div>
      )}

      {/* Shop Information Card */}
      {shop && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card card-primary card-outline">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-store mr-2"></i>
                  {shop.shop_name}
                </h3>
                <div className="card-tools">
                  <span className={`badge badge-${shop.shop_status === 'active' ? 'success' : 'danger'}`}>
                    {shop.shop_status}
                  </span>
                </div>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    {shop.shop_description && (
                      <p><i className="fas fa-info-circle mr-2 text-muted"></i>{shop.shop_description}</p>
                    )}
                    {shop.shop_address && (
                      <p><i className="fas fa-map-marker-alt mr-2 text-muted"></i>{shop.shop_address}</p>
                    )}
                  </div>
                  <div className="col-md-6">
                    {agrivet && (
                      <p>
                        <i className="fas fa-building mr-2 text-muted"></i>
                        <strong>Agrivet:</strong> {agrivet.name}
                      </p>
                    )}
                    <p>
                      <i className="fas fa-star mr-2 text-warning"></i>
                      <strong>Rating:</strong> {parseFloat(shop.average_rating || 0).toFixed(1)} ({shop.total_reviews || 0} reviews)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Stats */}
      <div className="row">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{stats.new_orders || 0}</h3>
              <p>New Orders</p>
            </div>
            <div className="icon">
              <i className="fas fa-shopping-bag"></i>
            </div>
            <Link href="/dashboard/vendor/orders" className="small-box-footer">
              More info <i className="fas fa-arrow-circle-right"></i>
            </Link>
          </div>
        </div>
        
        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>{stats.products || 0}</h3>
              <p>Products</p>
            </div>
            <div className="icon">
              <i className="fas fa-box"></i>
            </div>
            <Link href="/dashboard/vendor/products" className="small-box-footer">
              More info <i className="fas fa-arrow-circle-right"></i>
            </Link>
          </div>
        </div>
        
        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>{stats.pending_reviews || 0}</h3>
              <p>Pending Reviews</p>
            </div>
            <div className="icon">
              <i className="fas fa-star"></i>
            </div>
            <a href="#" className="small-box-footer">More info <i className="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>
        
        <div className="col-lg-3 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>${parseFloat(stats.total_revenue || 0).toFixed(2)}</h3>
              <p>Total Revenue</p>
            </div>
            <div className="icon">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <Link href="/dashboard/vendor/payouts" className="small-box-footer">
              More info <i className="fas fa-arrow-circle-right"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* Welcome Card */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Vendor Dashboard</h3>
            </div>
            <div className="card-body">
              <div className="text-center">
                <h4>Welcome, {auth.user.name}!</h4>
                <p className="text-muted">You are logged in as <strong>Vendor</strong></p>
                <p className="text-muted">Manage your products, orders, and inventory from here.</p>
                {sessionValid && (
                  <div className="alert alert-success">
                    <i className="fas fa-check"></i> Session is active and valid
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

