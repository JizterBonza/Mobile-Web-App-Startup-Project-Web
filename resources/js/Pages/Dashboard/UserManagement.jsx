import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'

export default function UserManagement({ auth, users = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userToRemove, setUserToRemove] = useState(null)

  const addForm = useForm({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    mobile_number: '',
    password: '',
    password_confirmation: '',
    username: '',
    user_type: 'vendor',
    status: 'active',
  })

  const editForm = useForm({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    mobile_number: '',
    password: '',
    password_confirmation: '',
    username: '',
    user_type: 'vendor',
    status: 'active',
  })

  // Handle add modal animation
  useEffect(() => {
    if (showAddModal) {
      // Trigger fade-in animation
      setTimeout(() => setShowAddModalAnimation(true), 10)
    } else {
      setShowAddModalAnimation(false)
    }
  }, [showAddModal])

  // Handle edit modal animation
  useEffect(() => {
    if (showEditModal) {
      // Trigger fade-in animation
      setTimeout(() => setShowEditModalAnimation(true), 10)
    } else {
      setShowEditModalAnimation(false)
    }
  }, [showEditModal])

  // Handle remove modal animation
  useEffect(() => {
    if (showRemoveModal) {
      // Trigger fade-in animation
      setTimeout(() => setShowRemoveModalAnimation(true), 10)
    } else {
      setShowRemoveModalAnimation(false)
    }
  }, [showRemoveModal])

  // Modal close handlers with animation
  const closeAddModal = () => {
    setShowAddModalAnimation(false)
    setTimeout(() => {
      setShowAddModal(false)
      addForm.reset()
    }, 300) // Wait for fade-out animation (0.3s)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedUser(null)
      editForm.reset()
    }, 300) // Wait for fade-out animation (0.3s)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setUserToRemove(null)
    }, 300) // Wait for fade-out animation (0.3s)
  }

  // Show success/error messages
  useEffect(() => {
    if (flash?.success) {
      closeAddModal()
      closeEditModal()
      closeRemoveModal()
      addForm.reset()
      editForm.reset()
      setUserToRemove(null)
    }
  }, [flash])

  const handleAddUser = (e) => {
    e.preventDefault()
    addForm.post(getBaseRoute(), {
      preserveScroll: true,
      onSuccess: () => {
        addForm.reset()
      },
    })
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    editForm.setData({
      first_name: user.first_name,
      middle_name: user.middle_name || '',
      last_name: user.last_name,
      email: user.email,
      mobile_number: user.mobile_number || '',
      password: '',
      password_confirmation: '',
      username: user.username,
      user_type: user.user_type,
      status: user.status,
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false) // Reset animation state
  }

  const handleUpdateUser = (e) => {
    e.preventDefault()
    editForm.put(`${getBaseRoute()}/${selectedUser.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeEditModal()
      },
    })
  }

  const handleDeactivateUser = (userId) => {
    const user = users.find(u => u.id === userId)
    setUserToRemove(user)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false) // Reset animation state
  }

  const confirmRemoveUser = () => {
    if (userToRemove) {
      router.delete(`${getBaseRoute()}/${userToRemove.id}`, {
        preserveScroll: true,
        onSuccess: () => {
          closeRemoveModal()
        },
      })
    }
  }

  // Get allowed user types based on current user's role
  const getAllowedUserTypes = () => {
    if (auth?.user?.user_type === 'admin') {
      // Admin can only add/edit Vendors, Veterinarians, and Riders
      return [
        { value: 'vendor', label: 'Vendor' },
        { value: 'veterinarian', label: 'Veterinarian' },
        { value: 'rider', label: 'Rider' },
      ]
    }
    // Super Admin can add/edit all user types
    return [
      { value: 'super_admin', label: 'Super Admin' },
      { value: 'admin', label: 'Admin' },
      { value: 'vendor', label: 'Vendor' },
      { value: 'veterinarian', label: 'Veterinarian' },
      { value: 'customer', label: 'Customer' },
      { value: 'rider', label: 'Rider' },
    ]
  }

  const userTypes = getAllowedUserTypes()
  
  // Determine base route based on user type
  const getBaseRoute = () => {
    return auth?.user?.user_type === 'admin' 
      ? '/dashboard/admin/users' 
      : '/dashboard/super-admin/users'
  }

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="badge badge-success">Active</span>
    }
    return <span className="badge badge-danger">Inactive</span>
  }

  const getUserTypeLabel = (userType) => {
    const type = userTypes.find(t => t.value === userType)
    return type ? type.label : userType
  }

  return (
    <AdminLayout auth={auth} title="User Management">
      {/* Flash Messages */}
      {flash?.success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={(e) => {
            e.preventDefault()
            router.visit(window.location.pathname, { 
              only: ['users', 'auth'],
              preserveState: true,
              preserveScroll: true
            })
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
            router.visit(window.location.pathname, { 
              only: ['users', 'auth'],
              preserveState: true,
              preserveScroll: true
            })
          }}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">User List</h3>
              <div className="card-tools">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowAddModal(true)
                    setShowAddModalAnimation(false) // Reset animation state
                  }}
                >
                  <i className="fas fa-plus"></i> Add User
                </button>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Username</th>
                    <th>User Type</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center">No users found</td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{`${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}`}</td>
                        <td>{user.email}</td>
                        <td>{user.mobile_number || '-'}</td>
                        <td>{user.username}</td>
                        <td>{getUserTypeLabel(user.user_type)}</td>
                        <td>{getStatusBadge(user.status)}</td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-info mr-1"
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {user.status === 'active' && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeactivateUser(user.id)}
                              title="Deactivate User"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
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

      {/* Add User Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add New User</h4>
                <button
                  type="button"
                  className="close"
                  onClick={closeAddModal}
                >
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleAddUser}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>First Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${addForm.errors.first_name ? 'is-invalid' : ''}`}
                          value={addForm.data.first_name}
                          onChange={(e) => addForm.setData('first_name', e.target.value)}
                          required
                        />
                        {addForm.errors.first_name && (
                          <div className="invalid-feedback">{addForm.errors.first_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Middle Name</label>
                        <input
                          type="text"
                          className={`form-control ${addForm.errors.middle_name ? 'is-invalid' : ''}`}
                          value={addForm.data.middle_name}
                          onChange={(e) => addForm.setData('middle_name', e.target.value)}
                        />
                        {addForm.errors.middle_name && (
                          <div className="invalid-feedback">{addForm.errors.middle_name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Last Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${addForm.errors.last_name ? 'is-invalid' : ''}`}
                          value={addForm.data.last_name}
                          onChange={(e) => addForm.setData('last_name', e.target.value)}
                          required
                        />
                        {addForm.errors.last_name && (
                          <div className="invalid-feedback">{addForm.errors.last_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Email <span className="text-danger">*</span></label>
                        <input
                          type="email"
                          className={`form-control ${addForm.errors.email ? 'is-invalid' : ''}`}
                          value={addForm.data.email}
                          onChange={(e) => addForm.setData('email', e.target.value)}
                          required
                        />
                        {addForm.errors.email && (
                          <div className="invalid-feedback">{addForm.errors.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Mobile Number</label>
                        <input
                          type="text"
                          className={`form-control ${addForm.errors.mobile_number ? 'is-invalid' : ''}`}
                          value={addForm.data.mobile_number}
                          onChange={(e) => addForm.setData('mobile_number', e.target.value)}
                        />
                        {addForm.errors.mobile_number && (
                          <div className="invalid-feedback">{addForm.errors.mobile_number}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Username</label>
                        <input
                          type="text"
                          className={`form-control ${addForm.errors.username ? 'is-invalid' : ''}`}
                          value={addForm.data.username}
                          onChange={(e) => addForm.setData('username', e.target.value)}
                          placeholder="Auto-generated if empty"
                        />
                        {addForm.errors.username && (
                          <div className="invalid-feedback">{addForm.errors.username}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Password <span className="text-danger">*</span></label>
                        <input
                          type="password"
                          className={`form-control ${addForm.errors.password ? 'is-invalid' : ''}`}
                          value={addForm.data.password}
                          onChange={(e) => addForm.setData('password', e.target.value)}
                          required
                        />
                        {addForm.errors.password && (
                          <div className="invalid-feedback">{addForm.errors.password}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Confirm Password <span className="text-danger">*</span></label>
                        <input
                          type="password"
                          className={`form-control ${addForm.errors.password_confirmation ? 'is-invalid' : ''}`}
                          value={addForm.data.password_confirmation}
                          onChange={(e) => addForm.setData('password_confirmation', e.target.value)}
                          required
                        />
                        {addForm.errors.password_confirmation && (
                          <div className="invalid-feedback">{addForm.errors.password_confirmation}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>User Type <span className="text-danger">*</span></label>
                        <select
                          className={`form-control ${addForm.errors.user_type ? 'is-invalid' : ''}`}
                          value={addForm.data.user_type}
                          onChange={(e) => addForm.setData('user_type', e.target.value)}
                          required
                        >
                          {userTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        {addForm.errors.user_type && (
                          <div className="invalid-feedback">{addForm.errors.user_type}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Status <span className="text-danger">*</span></label>
                        <select
                          className={`form-control ${addForm.errors.status ? 'is-invalid' : ''}`}
                          value={addForm.data.status}
                          onChange={(e) => addForm.setData('status', e.target.value)}
                          required
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                        {addForm.errors.status && (
                          <div className="invalid-feedback">{addForm.errors.status}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeAddModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                    {addForm.processing ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit User</h4>
                <button
                  type="button"
                  className="close"
                  onClick={closeEditModal}
                >
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleUpdateUser}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>First Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${editForm.errors.first_name ? 'is-invalid' : ''}`}
                          value={editForm.data.first_name}
                          onChange={(e) => editForm.setData('first_name', e.target.value)}
                          required
                        />
                        {editForm.errors.first_name && (
                          <div className="invalid-feedback">{editForm.errors.first_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Middle Name</label>
                        <input
                          type="text"
                          className={`form-control ${editForm.errors.middle_name ? 'is-invalid' : ''}`}
                          value={editForm.data.middle_name}
                          onChange={(e) => editForm.setData('middle_name', e.target.value)}
                        />
                        {editForm.errors.middle_name && (
                          <div className="invalid-feedback">{editForm.errors.middle_name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Last Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${editForm.errors.last_name ? 'is-invalid' : ''}`}
                          value={editForm.data.last_name}
                          onChange={(e) => editForm.setData('last_name', e.target.value)}
                          required
                        />
                        {editForm.errors.last_name && (
                          <div className="invalid-feedback">{editForm.errors.last_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Email <span className="text-danger">*</span></label>
                        <input
                          type="email"
                          className={`form-control ${editForm.errors.email ? 'is-invalid' : ''}`}
                          value={editForm.data.email}
                          onChange={(e) => editForm.setData('email', e.target.value)}
                          required
                        />
                        {editForm.errors.email && (
                          <div className="invalid-feedback">{editForm.errors.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Mobile Number</label>
                        <input
                          type="text"
                          className={`form-control ${editForm.errors.mobile_number ? 'is-invalid' : ''}`}
                          value={editForm.data.mobile_number}
                          onChange={(e) => editForm.setData('mobile_number', e.target.value)}
                        />
                        {editForm.errors.mobile_number && (
                          <div className="invalid-feedback">{editForm.errors.mobile_number}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Username</label>
                        <input
                          type="text"
                          className={`form-control ${editForm.errors.username ? 'is-invalid' : ''}`}
                          value={editForm.data.username}
                          onChange={(e) => editForm.setData('username', e.target.value)}
                        />
                        {editForm.errors.username && (
                          <div className="invalid-feedback">{editForm.errors.username}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Password (leave blank to keep current)</label>
                        <input
                          type="password"
                          className={`form-control ${editForm.errors.password ? 'is-invalid' : ''}`}
                          value={editForm.data.password}
                          onChange={(e) => editForm.setData('password', e.target.value)}
                          placeholder="Leave blank to keep current password"
                        />
                        {editForm.errors.password && (
                          <div className="invalid-feedback">{editForm.errors.password}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                          type="password"
                          className={`form-control ${editForm.errors.password_confirmation ? 'is-invalid' : ''}`}
                          value={editForm.data.password_confirmation}
                          onChange={(e) => editForm.setData('password_confirmation', e.target.value)}
                          placeholder="Required if changing password"
                        />
                        {editForm.errors.password_confirmation && (
                          <div className="invalid-feedback">{editForm.errors.password_confirmation}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>User Type <span className="text-danger">*</span></label>
                        <select
                          className={`form-control ${editForm.errors.user_type ? 'is-invalid' : ''}`}
                          value={editForm.data.user_type}
                          onChange={(e) => editForm.setData('user_type', e.target.value)}
                          required
                        >
                          {userTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        {editForm.errors.user_type && (
                          <div className="invalid-feedback">{editForm.errors.user_type}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Status <span className="text-danger">*</span></label>
                        <select
                          className={`form-control ${editForm.errors.status ? 'is-invalid' : ''}`}
                          value={editForm.data.status}
                          onChange={(e) => editForm.setData('status', e.target.value)}
                          required
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                        {editForm.errors.status && (
                          <div className="invalid-feedback">{editForm.errors.status}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeEditModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={editForm.processing}>
                    {editForm.processing ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remove User Confirmation Modal */}
      {showRemoveModal && userToRemove && (
        <>
          <div className={`modal-backdrop fade ${showRemoveModalAnimation ? 'show' : ''}`} onClick={closeRemoveModal}></div>
          <div className={`modal fade ${showRemoveModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Confirm Deactivation</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeRemoveModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p>
                    Are you sure you want to deactivate{' '}
                    <strong>{userToRemove.first_name} {userToRemove.middle_name ? userToRemove.middle_name + ' ' : ''}{userToRemove.last_name}</strong>?
                  </p>
                  <p className="text-muted mb-0">
                    This will set their status to "Inactive". The user will not be able to access the system.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeRemoveModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmRemoveUser}
                  >
                    Deactivate User
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
