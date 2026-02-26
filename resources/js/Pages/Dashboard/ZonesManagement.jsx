import { useState, useEffect } from 'react'
import { useForm, router } from '@inertiajs/react'
import AdminLayout from '../../Layouts/AdminLayout'
import ZoneDrawMap from '../../Components/ZoneDrawMap'

export default function ZonesManagement({ auth, zones = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedZone, setSelectedZone] = useState(null)
  const [zoneToRemove, setZoneToRemove] = useState(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)

  const addForm = useForm({
    name: '',
    description: '',
    boundary: [],
    status: 'active',
  })

  const editForm = useForm({
    name: '',
    description: '',
    boundary: [],
    status: 'active',
  })

  useEffect(() => {
    if (showAddModal) setTimeout(() => setShowAddModalAnimation(true), 10)
    else setShowAddModalAnimation(false)
  }, [showAddModal])

  useEffect(() => {
    if (showEditModal) setTimeout(() => setShowEditModalAnimation(true), 10)
    else setShowEditModalAnimation(false)
  }, [showEditModal])

  useEffect(() => {
    if (showRemoveModal) setTimeout(() => setShowRemoveModalAnimation(true), 10)
    else setShowRemoveModalAnimation(false)
  }, [showRemoveModal])

  const closeAddModal = () => {
    setShowAddModalAnimation(false)
    setTimeout(() => {
      setShowAddModal(false)
      addForm.reset()
      addForm.setData({ name: '', description: '', boundary: [], status: 'active' })
    }, 300)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedZone(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setZoneToRemove(null)
    }, 300)
  }

  useEffect(() => {
    if (flash?.success) {
      closeAddModal()
      closeEditModal()
      closeRemoveModal()
      addForm.reset()
      editForm.reset()
      setShowSuccessAlert(true)
    }
    if (flash?.error) setShowErrorAlert(true)
  }, [flash])

  const getBaseRoute = () => {
    if (auth.user.user_type === 'super_admin') return '/dashboard/super-admin/zones'
    if (auth.user.user_type === 'admin') return '/dashboard/admin/zones'
    return '/dashboard/zones'
  }

  const baseRoute = getBaseRoute()

  const handleAddZone = (e) => {
    e.preventDefault()
    if (!addForm.data.boundary || addForm.data.boundary.length < 3) {
      addForm.setError('boundary', 'Draw a zone boundary on the map (at least 3 points).')
      return
    }
    addForm.clearErrors()
    addForm.post(baseRoute, { preserveScroll: true, onSuccess: () => addForm.reset() })
  }

  const handleEditZone = (zone) => {
    setSelectedZone(zone)
    editForm.setData({
      name: String(zone.name || ''),
      description: String(zone.description || ''),
      boundary: Array.isArray(zone.boundary) && zone.boundary.length ? zone.boundary : [],
      status: zone.status_label || (zone.status ? 'active' : 'inactive'),
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateZone = (e) => {
    e.preventDefault()
    if (!selectedZone) return
    if (!editForm.data.boundary || editForm.data.boundary.length < 3) {
      editForm.setError('boundary', 'Draw a zone boundary on the map (at least 3 points).')
      return
    }
    editForm.clearErrors()
    editForm.put(`${baseRoute}/${selectedZone.id}`, {
      preserveScroll: true,
      onSuccess: () => closeEditModal(),
    })
  }

  const handleDeleteZone = (id) => {
    const z = zones.find((x) => x.id === id)
    setZoneToRemove(z)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmDeleteZone = () => {
    if (zoneToRemove) {
      router.delete(`${baseRoute}/${zoneToRemove.id}`, {
        preserveScroll: true,
        onSuccess: () => closeRemoveModal(),
      })
    }
  }

  const getStatusBadge = (statusLabel) =>
    statusLabel === 'active' ? (
      <span className="badge badge-success">Active</span>
    ) : (
      <span className="badge badge-danger">Inactive</span>
    )

  return (
    <AdminLayout auth={auth} title="Zones">
      {flash?.success && showSuccessAlert && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={() => setShowSuccessAlert(false)}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {flash?.error && showErrorAlert && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {flash.error}
          <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={() => setShowErrorAlert(false)}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Zone List</h3>
              <div className="card-tools">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => { setShowAddModal(true); setShowAddModalAnimation(false) }}
                >
                  <i className="fas fa-plus"></i> Add Zone
                </button>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Shops</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center">No zones found. Add a zone by drawing a boundary on the map.</td>
                    </tr>
                  ) : (
                    zones.map((z) => (
                      <tr key={z.id}>
                        <td>{z.id}</td>
                        <td>{z.name}</td>
                        <td>{z.description ? (z.description.length > 50 ? z.description.slice(0, 50) + '…' : z.description) : '-'}</td>
                        <td><span className="badge badge-info">{z.shops_count ?? 0} shop(s)</span></td>
                        <td>{getStatusBadge(z.status_label)}</td>
                        <td>{z.created_at ? new Date(z.created_at).toLocaleDateString() : '-'}</td>
                        <td>
                          <button className="btn btn-sm btn-info mr-1" onClick={() => handleEditZone(z)} title="Edit Zone">
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteZone(z.id)} title="Delete Zone">
                            <i className="fas fa-trash"></i>
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

      {/* Add Zone Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Zone</h4>
                  <button type="button" className="close" onClick={closeAddModal}><span>&times;</span></button>
                </div>
                <form onSubmit={handleAddZone}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${addForm.errors.name ? 'is-invalid' : ''}`}
                        value={addForm.data.name}
                        onChange={(e) => addForm.setData('name', e.target.value)}
                        required
                        maxLength={150}
                      />
                      {addForm.errors.name && <div className="invalid-feedback">{addForm.errors.name}</div>}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className={`form-control ${addForm.errors.description ? 'is-invalid' : ''}`}
                        value={addForm.data.description}
                        onChange={(e) => addForm.setData('description', e.target.value)}
                        rows={2}
                        maxLength={500}
                      />
                      {addForm.errors.description && <div className="invalid-feedback">{addForm.errors.description}</div>}
                    </div>
                    <div className="form-group">
                      <label>Zone boundary (draw on map) <span className="text-danger">*</span></label>
                      <ZoneDrawMap
                        initialBoundary={addForm.data.boundary}
                        onBoundaryChange={(boundary) => addForm.setData('boundary', boundary)}
                        height={320}
                      />
                      {addForm.errors.boundary && <div className="invalid-feedback d-block">{addForm.errors.boundary}</div>}
                    </div>
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
                      {addForm.errors.status && <div className="invalid-feedback">{addForm.errors.status}</div>}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAddModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                      {addForm.processing ? 'Creating...' : 'Create Zone'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Zone Modal */}
      {showEditModal && selectedZone && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Zone</h4>
                  <button type="button" className="close" onClick={closeEditModal}><span>&times;</span></button>
                </div>
                <form onSubmit={handleUpdateZone}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${editForm.errors.name ? 'is-invalid' : ''}`}
                        value={editForm.data.name}
                        onChange={(e) => editForm.setData('name', e.target.value)}
                        required
                        maxLength={150}
                      />
                      {editForm.errors.name && <div className="invalid-feedback">{editForm.errors.name}</div>}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        className={`form-control ${editForm.errors.description ? 'is-invalid' : ''}`}
                        value={editForm.data.description}
                        onChange={(e) => editForm.setData('description', e.target.value)}
                        rows={2}
                        maxLength={500}
                      />
                      {editForm.errors.description && <div className="invalid-feedback">{editForm.errors.description}</div>}
                    </div>
                    <div className="form-group">
                      <label>Zone boundary (draw on map) <span className="text-danger">*</span></label>
                      <ZoneDrawMap
                        key={selectedZone.id}
                        initialBoundary={editForm.data.boundary}
                        onBoundaryChange={(boundary) => editForm.setData('boundary', boundary)}
                        height={320}
                      />
                      {editForm.errors.boundary && <div className="invalid-feedback d-block">{editForm.errors.boundary}</div>}
                    </div>
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
                      {editForm.errors.status && <div className="invalid-feedback">{editForm.errors.status}</div>}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={editForm.processing}>
                      {editForm.processing ? 'Updating...' : 'Update Zone'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {showRemoveModal && zoneToRemove && (
        <>
          <div className={`modal-backdrop fade ${showRemoveModalAnimation ? 'show' : ''}`} onClick={closeRemoveModal}></div>
          <div className={`modal fade ${showRemoveModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Confirm Delete</h4>
                  <button type="button" className="close" onClick={closeRemoveModal}><span>&times;</span></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete zone <strong>{zoneToRemove.name}</strong>?</p>
                  <p className="text-muted mb-0">Shops in this zone will be unassigned from the zone. This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteZone}>Delete Zone</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
