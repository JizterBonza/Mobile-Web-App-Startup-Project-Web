import { useState } from 'react'
import { useForm, Link } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'

export default function Settings({ auth, userData, flash }) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { data, setData, put, processing, errors, reset } = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    put('/settings/password', {
      onSuccess: () => {
        reset()
      },
    })
  }

  const getUserTypeLabel = (type) => {
    const labels = {
      super_admin: 'Super Administrator',
      admin: 'Administrator',
      vendor: 'Vendor',
      veterinarian: 'Veterinarian',
      customer: 'Customer',
      rider: 'Rider',
    }
    return labels[type] || type
  }

  const getUserTypeBadgeClass = (type) => {
    const classes = {
      super_admin: 'badge-danger',
      admin: 'badge-primary',
      vendor: 'badge-success',
      veterinarian: 'badge-info',
      customer: 'badge-secondary',
      rider: 'badge-warning',
    }
    return classes[type] || 'badge-secondary'
  }

  return (
    <AdminLayout auth={auth} title="Settings">
      {/* Success Alert */}
      {flash?.success && (
        <div className="alert alert-success alert-dismissible fade show">
          <button type="button" className="close" data-dismiss="alert" aria-hidden="true">&times;</button>
          <i className="icon fas fa-check"></i> {flash.success}
        </div>
      )}

      {/* Error Alert */}
      {errors.error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <button type="button" className="close" data-dismiss="alert" aria-hidden="true">&times;</button>
          <i className="icon fas fa-ban"></i> {errors.error}
        </div>
      )}

      <div className="row">
        {/* Account Overview */}
        <div className="col-md-4">
          <div className="card card-primary card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-user-circle mr-2"></i> Account Overview
              </h3>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span><i className="fas fa-envelope mr-2 text-muted"></i> Email</span>
                  <span className="text-muted">{userData.email}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span><i className="fas fa-user mr-2 text-muted"></i> Username</span>
                  <span className="text-muted">{userData.username || 'Not set'}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span><i className="fas fa-user-tag mr-2 text-muted"></i> Account Type</span>
                  <span className={`badge ${getUserTypeBadgeClass(userData.user_type)}`}>
                    {getUserTypeLabel(userData.user_type)}
                  </span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span><i className="fas fa-clock mr-2 text-muted"></i> Last Login</span>
                  <span className="text-muted">
                    {userData.last_login 
                      ? new Date(userData.last_login).toLocaleString() 
                      : 'N/A'}
                  </span>
                </li>
              </ul>

              <div className="mt-3">
                <Link href="/profile" className="btn btn-outline-primary btn-block">
                  <i className="fas fa-user-edit mr-2"></i> Edit Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-link mr-2"></i> Quick Links
              </h3>
            </div>
            <div className="card-body p-0">
              <ul className="nav nav-pills flex-column">
                <li className="nav-item">
                  <Link href="/profile" className="nav-link">
                    <i className="fas fa-user mr-2"></i> My Profile
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/dashboard" className="nav-link">
                    <i className="fas fa-tachometer-alt mr-2"></i> Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="col-md-8">
          {/* Change Password Card */}
          <div className="card card-primary">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-key mr-2"></i> Change Password
              </h3>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="card-body">
                <p className="text-muted mb-4">
                  Ensure your account is using a strong password to stay secure.
                </p>

                <div className="form-group">
                  <label htmlFor="current_password">
                    Current Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className={`form-control ${errors.current_password ? 'is-invalid' : ''}`}
                      id="current_password"
                      value={data.current_password}
                      onChange={(e) => setData('current_password', e.target.value)}
                      placeholder="Enter current password"
                    />
                    <div className="input-group-append">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        <i className={`fas ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {errors.current_password && (
                      <span className="invalid-feedback">{errors.current_password}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password">
                    New Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      id="password"
                      value={data.password}
                      onChange={(e) => setData('password', e.target.value)}
                      placeholder="Enter new password"
                    />
                    <div className="input-group-append">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {errors.password && (
                      <span className="invalid-feedback">{errors.password}</span>
                    )}
                  </div>
                  <small className="form-text text-muted">
                    Password must be at least 6 characters long.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="password_confirmation">
                    Confirm New Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`}
                      id="password_confirmation"
                      value={data.password_confirmation}
                      onChange={(e) => setData('password_confirmation', e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <div className="input-group-append">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {errors.password_confirmation && (
                      <span className="invalid-feedback">{errors.password_confirmation}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2"></span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i> Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Security Tips Card */}
          <div className="card card-info">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-shield-alt mr-2"></i> Security Tips
              </h3>
            </div>
            <div className="card-body">
              <ul className="mb-0">
                <li className="mb-2">
                  <strong>Use a strong password:</strong> Combine uppercase, lowercase, numbers, and special characters.
                </li>
                <li className="mb-2">
                  <strong>Don't reuse passwords:</strong> Use unique passwords for different accounts.
                </li>
                <li className="mb-2">
                  <strong>Keep it private:</strong> Never share your password with anyone.
                </li>
                <li className="mb-2">
                  <strong>Update regularly:</strong> Change your password periodically for better security.
                </li>
                <li>
                  <strong>Log out when done:</strong> Always log out when using shared or public computers.
                </li>
              </ul>
            </div>
          </div>

          {/* Session Information Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-desktop mr-2"></i> Session Information
              </h3>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-sm">
                  <tbody>
                    <tr>
                      <th style={{ width: '40%' }}>
                        <i className="fas fa-clock mr-2"></i> Last Login
                      </th>
                      <td>
                        {userData.last_login 
                          ? new Date(userData.last_login).toLocaleString() 
                          : 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <th>
                        <i className="fas fa-check-circle mr-2"></i> Session Status
                      </th>
                      <td>
                        <span className="badge badge-success">
                          <i className="fas fa-check mr-1"></i> Active
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

