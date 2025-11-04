import { useEffect, useState } from 'react'
import AdminLayout from '../../Layouts/AdminLayout'

export default function SuperAdminDashboard({ auth }) {
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
    <AdminLayout auth={auth} title="Super Admin Dashboard">
      {/* Session Status Alert */}
      {!sessionValid && (
        <div className="alert alert-danger alert-dismissible">
          <button type="button" className="close" data-dismiss="alert" aria-hidden="true">&times;</button>
          <h5><i className="icon fas fa-ban"></i> Session Expired!</h5>
          Your session has expired. Please refresh the page to login again.
        </div>
      )}

      {/* Dashboard Content */}
      <div className="row">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>0</h3>
              <p>Total Admins</p>
            </div>
            <div className="icon">
              <i className="fas fa-users-cog"></i>
            </div>
            <a href="#" className="small-box-footer">More info <i className="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>
        
        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>0</h3>
              <p>Total Vendors</p>
            </div>
            <div className="icon">
              <i className="fas fa-store"></i>
            </div>
            <a href="#" className="small-box-footer">More info <i className="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>
        
        <div className="col-lg-3 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>0</h3>
              <p>Total Veterinarians</p>
            </div>
            <div className="icon">
              <i className="fas fa-user-md"></i>
            </div>
            <a href="#" className="small-box-footer">More info <i className="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>
        
        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>0</h3>
              <p>System Status</p>
            </div>
            <div className="icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <a href="#" className="small-box-footer">More info <i className="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Super Admin Dashboard</h3>
            </div>
            <div className="card-body">
              <div className="text-center">
                <h4>Welcome, {auth.user.name}!</h4>
                <p className="text-muted">You are logged in as <strong>Super Admin</strong></p>
                <p className="text-muted">You have full system access and can manage all users, settings, and configurations.</p>
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

