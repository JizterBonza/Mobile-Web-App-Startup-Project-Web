import { useEffect, useState } from 'react'
import AdminLayout from '../Layouts/AdminLayout'

export default function Dashboard({ auth }) {
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
    <AdminLayout auth={auth} title="Dashboard">
      {/* Session Status Alert */}
      {!sessionValid && (
        <div className="alert alert-danger alert-dismissible">
          <button type="button" className="close" data-dismiss="alert" aria-hidden="true">&times;</button>
          <h5><i className="icon fas fa-ban"></i> Session Expired!</h5>
          Your session has expired. Please refresh the page to login again.
        </div>
      )}

      {/* Session Information */}
      {sessionInfo && sessionValid && (
        <div className="alert alert-info alert-dismissible">
          <button type="button" className="close" data-dismiss="alert" aria-hidden="true">&times;</button>
          <h5><i className="icon fas fa-info"></i> Session Information</h5>
          <div className="row">
            <div className="col-md-4">
              <strong>Login Time:</strong><br />
              {new Date(sessionInfo.login_time).toLocaleString()}
            </div>
            <div className="col-md-4">
              <strong>Last Activity:</strong><br />
              {new Date(sessionInfo.last_activity).toLocaleString()}
            </div>
            <div className="col-md-4">
              <strong>Session Timeout:</strong><br />
              {new Date(sessionInfo.session_timeout).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="row">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>150</h3>
              <p>New Orders</p>
            </div>
            <div className="icon">
              <i className="ion ion-bag"></i>
            </div>
            <a href="#" className="small-box-footer">More info <i className="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>
        
        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>53<sup style={{fontSize: '20px'}}>%</sup></h3>
              <p>Bounce Rate</p>
            </div>
            <div className="icon">
              <i className="ion ion-stats-bars"></i>
            </div>
            <a href="#" className="small-box-footer">More info <i className="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>
        
        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>44</h3>
              <p>User Registrations</p>
            </div>
            <div className="icon">
              <i className="ion ion-person-add"></i>
            </div>
            <a href="#" className="small-box-footer">More info <i className="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>
        
        <div className="col-lg-3 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>65</h3>
              <p>Unique Visitors</p>
            </div>
            <div className="icon">
              <i className="ion ion-pie-graph"></i>
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
              <h3 className="card-title">Welcome to Agrify Connect Dashboard</h3>
            </div>
            <div className="card-body">
              <div className="text-center">
                <h4>Dashboard Content</h4>
                <p className="text-muted">Your dashboard is ready! Start building your application.</p>
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
