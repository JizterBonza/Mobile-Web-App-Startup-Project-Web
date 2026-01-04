import { useState } from 'react'
import { useForm } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'
import AddressAutocomplete from '../../Components/AddressAutocomplete'

export default function Profile({ auth, profileData, flash }) {
  const [isEditing, setIsEditing] = useState(false)
  
  const { data, setData, put, processing, errors, reset } = useForm({
    first_name: profileData.first_name || '',
    middle_name: profileData.middle_name || '',
    last_name: profileData.last_name || '',
    email: profileData.email || '',
    mobile_number: profileData.mobile_number || '',
    shipping_address: profileData.shipping_address || '',
    username: profileData.username || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    put('/profile', {
      onSuccess: () => {
        setIsEditing(false)
      },
    })
  }

  const handleCancel = () => {
    reset()
    setIsEditing(false)
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
    <AdminLayout auth={auth} title="My Profile">
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
        {/* Profile Card */}
        <div className="col-md-4">
          <div className="card card-primary card-outline">
            <div className="card-body box-profile">
              <div className="text-center">
                <div 
                  className="profile-user-img img-fluid img-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '128px',
                    height: '128px',
                    margin: '0 auto',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    fontSize: '48px',
                    fontWeight: 'bold',
                  }}
                >
                  {profileData.first_name?.charAt(0)?.toUpperCase() || 'U'}
                  {profileData.last_name?.charAt(0)?.toUpperCase() || ''}
                </div>
              </div>

              <h3 className="profile-username text-center mt-3">
                {profileData.first_name} {profileData.middle_name} {profileData.last_name}
              </h3>

              <p className="text-muted text-center">
                <span className={`badge ${getUserTypeBadgeClass(profileData.user_type)}`}>
                  {getUserTypeLabel(profileData.user_type)}
                </span>
              </p>

              <ul className="list-group list-group-unbordered mb-3">
                <li className="list-group-item">
                  <b><i className="fas fa-envelope mr-2"></i> Email</b>
                  <span className="float-right text-muted">{profileData.email}</span>
                </li>
                <li className="list-group-item">
                  <b><i className="fas fa-user mr-2"></i> Username</b>
                  <span className="float-right text-muted">{profileData.username || 'Not set'}</span>
                </li>
                <li className="list-group-item">
                  <b><i className="fas fa-calendar mr-2"></i> Member Since</b>
                  <span className="float-right text-muted">
                    {new Date(profileData.created_at).toLocaleDateString()}
                  </span>
                </li>
                <li className="list-group-item">
                  <b><i className="fas fa-check-circle mr-2"></i> Status</b>
                  <span className="float-right">
                    <span className={`badge ${profileData.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {profileData.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                </li>
              </ul>

              {!isEditing && (
                <button 
                  className="btn btn-primary btn-block"
                  onClick={() => setIsEditing(true)}
                >
                  <i className="fas fa-edit mr-2"></i> Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details / Edit Form */}
        <div className="col-md-8">
          <div className="card">
            <div className="card-header p-2">
              <h3 className="card-title pt-1">
                {isEditing ? (
                  <>
                    <i className="fas fa-edit mr-2"></i> Edit Profile
                  </>
                ) : (
                  <>
                    <i className="fas fa-user mr-2"></i> Profile Details
                  </>
                )}
              </h3>
            </div>
            <div className="card-body">
              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label htmlFor="first_name">
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                          id="first_name"
                          value={data.first_name}
                          onChange={(e) => setData('first_name', e.target.value)}
                          placeholder="Enter first name"
                        />
                        {errors.first_name && (
                          <span className="invalid-feedback">{errors.first_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label htmlFor="middle_name">Middle Name</label>
                        <input
                          type="text"
                          className={`form-control ${errors.middle_name ? 'is-invalid' : ''}`}
                          id="middle_name"
                          value={data.middle_name}
                          onChange={(e) => setData('middle_name', e.target.value)}
                          placeholder="Enter middle name"
                        />
                        {errors.middle_name && (
                          <span className="invalid-feedback">{errors.middle_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label htmlFor="last_name">
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                          id="last_name"
                          value={data.last_name}
                          onChange={(e) => setData('last_name', e.target.value)}
                          placeholder="Enter last name"
                        />
                        {errors.last_name && (
                          <span className="invalid-feedback">{errors.last_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="email">
                          Email <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          id="email"
                          value={data.email}
                          onChange={(e) => setData('email', e.target.value)}
                          placeholder="Enter email"
                        />
                        {errors.email && (
                          <span className="invalid-feedback">{errors.email}</span>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                          type="text"
                          className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                          id="username"
                          value={data.username}
                          onChange={(e) => setData('username', e.target.value)}
                          placeholder="Enter username"
                        />
                        {errors.username && (
                          <span className="invalid-feedback">{errors.username}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="mobile_number">Mobile Number</label>
                        <input
                          type="text"
                          className={`form-control ${errors.mobile_number ? 'is-invalid' : ''}`}
                          id="mobile_number"
                          value={data.mobile_number}
                          onChange={(e) => setData('mobile_number', e.target.value)}
                          placeholder="Enter mobile number"
                        />
                        {errors.mobile_number && (
                          <span className="invalid-feedback">{errors.mobile_number}</span>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="shipping_address">Shipping Address</label>
                        <AddressAutocomplete
                          id="shipping_address"
                          value={data.shipping_address}
                          onChange={(address) => setData('shipping_address', address)}
                          onPlaceSelect={(place) => setData('shipping_address', place.address)}
                          placeholder="Enter shipping address"
                          error={errors.shipping_address}
                          inputComponent="textarea"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <button 
                      type="submit" 
                      className="btn btn-primary mr-2"
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <span className="spinner-border spinner-border-sm mr-2"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save mr-2"></i> Save Changes
                        </>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleCancel}
                      disabled={processing}
                    >
                      <i className="fas fa-times mr-2"></i> Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <tbody>
                      <tr>
                        <th style={{ width: '200px' }}>
                          <i className="fas fa-user mr-2"></i> Full Name
                        </th>
                        <td>
                          {profileData.first_name} {profileData.middle_name} {profileData.last_name}
                        </td>
                      </tr>
                      <tr>
                        <th>
                          <i className="fas fa-envelope mr-2"></i> Email
                        </th>
                        <td>{profileData.email}</td>
                      </tr>
                      <tr>
                        <th>
                          <i className="fas fa-at mr-2"></i> Username
                        </th>
                        <td>{profileData.username || <span className="text-muted">Not set</span>}</td>
                      </tr>
                      <tr>
                        <th>
                          <i className="fas fa-phone mr-2"></i> Mobile Number
                        </th>
                        <td>
                          {profileData.mobile_number || <span className="text-muted">Not set</span>}
                        </td>
                      </tr>
                      <tr>
                        <th>
                          <i className="fas fa-map-marker-alt mr-2"></i> Shipping Address
                        </th>
                        <td>
                          {profileData.shipping_address || <span className="text-muted">Not set</span>}
                        </td>
                      </tr>
                      <tr>
                        <th>
                          <i className="fas fa-user-tag mr-2"></i> Account Type
                        </th>
                        <td>
                          <span className={`badge ${getUserTypeBadgeClass(profileData.user_type)}`}>
                            {getUserTypeLabel(profileData.user_type)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <th>
                          <i className="fas fa-check-circle mr-2"></i> Account Status
                        </th>
                        <td>
                          <span className={`badge ${profileData.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                            {profileData.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <th>
                          <i className="fas fa-calendar-alt mr-2"></i> Member Since
                        </th>
                        <td>{new Date(profileData.created_at).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

