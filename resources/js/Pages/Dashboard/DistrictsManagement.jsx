import { useState, useEffect, useMemo } from 'react'
import { useForm, router } from '@inertiajs/react'
import { Search, Pencil, Trash2 } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'
import ZoneDrawMap from '../../Components/ZoneDrawMap'

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function DistrictsManagement({ auth, districts = [], flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [districtToRemove, setDistrictToRemove] = useState(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [statusFilter, setStatusFilter] = useState('All')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const [togglingDistrictId, setTogglingDistrictId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const addForm = useForm({ name: '', description: '', boundary: [], status: 'active' })
  const editForm = useForm({ name: '', description: '', boundary: [], status: 'active' })

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
      setSelectedDistrict(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    if (isDeleting) return
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setDistrictToRemove(null)
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
    if (auth.user.user_type === 'super_admin') return '/dashboard/super-admin/districts'
    if (auth.user.user_type === 'admin') return '/dashboard/admin/districts'
    return '/dashboard/districts'
  }

  const baseRoute = getBaseRoute()

  const handleStatusToggle = (e, district) => {
    e.stopPropagation()
    if (togglingDistrictId !== null) return
    const isActive = district.status_label === 'active' || district.status === true
    const newStatus = isActive ? 'inactive' : 'active'
    setTogglingDistrictId(district.id)
    router.put(
      `${baseRoute}/${district.id}`,
      {
        name: district.name,
        description: district.description || '',
        boundary: Array.isArray(district.boundary) ? district.boundary : [],
        status: newStatus,
      },
      {
        preserveScroll: true,
        onFinish: () => setTogglingDistrictId(null),
      },
    )
  }

  const handleAddDistrict = (e) => {
    e.preventDefault()
    if (!addForm.data.boundary || addForm.data.boundary.length < 3) {
      addForm.setError('boundary', 'Draw a district boundary on the map (at least 3 points).')
      return
    }
    addForm.clearErrors()
    addForm.post(baseRoute, { preserveScroll: true, onSuccess: () => addForm.reset() })
  }

  const handleEditDistrict = (district) => {
    setSelectedDistrict(district)
    editForm.setData({
      name: String(district.name || ''),
      description: String(district.description || ''),
      boundary: Array.isArray(district.boundary) && district.boundary.length ? district.boundary : [],
      status: district.status_label || (district.status ? 'active' : 'inactive'),
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateDistrict = (e) => {
    e.preventDefault()
    if (!selectedDistrict) return
    if (!editForm.data.boundary || editForm.data.boundary.length < 3) {
      editForm.setError('boundary', 'Draw a district boundary on the map (at least 3 points).')
      return
    }
    editForm.clearErrors()
    editForm.put(`${baseRoute}/${selectedDistrict.id}`, {
      preserveScroll: true,
      onSuccess: () => closeEditModal(),
    })
  }

  const handleDeleteDistrict = (district) => {
    setDistrictToRemove(district)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmDeleteDistrict = () => {
    if (!districtToRemove || isDeleting) return
    setIsDeleting(true)
    router.delete(`${baseRoute}/${districtToRemove.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        setIsDeleting(false)
        closeRemoveModal()
      },
      onError: () => setIsDeleting(false),
      onFinish: () => setIsDeleting(false),
    })
  }

  const districtsWithBoundary = useMemo(
    () => districts.filter((d) => Array.isArray(d.boundary) && d.boundary.length >= 3),
    [districts]
  )

  const editMapReferenceDistricts = useMemo(
    () => districtsWithBoundary.filter((d) => d.id !== selectedDistrict?.id),
    [districtsWithBoundary, selectedDistrict?.id]
  )

  const sortedDistricts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = districts.filter((d) => {
      const isActive = d.status_label === 'active' || d.status === true
      if (statusFilter === 'Active' && !isActive) return false
      if (statusFilter === 'Inactive' && isActive) return false
      if (!q) return true
      const name = (d.name || '').toLowerCase()
      const desc = (d.description || '').toLowerCase()
      const zoneNames = Array.isArray(d.zone_names) ? d.zone_names.join(' ').toLowerCase() : ''
      return name.includes(q) || desc.includes(q) || zoneNames.includes(q)
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })
    return list
  }, [districts, searchQuery, sortBy, statusFilter])

  const totalPages = Math.max(1, Math.ceil(sortedDistricts.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayedDistricts = sortedDistricts.slice(startIndex, endIndex)

  useEffect(() => { setCurrentPage(1) }, [searchQuery, sortBy, statusFilter, itemsPerPage])
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages))
  }, [currentPage, totalPages])

  const filterSelectClass =
    'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]'

  const zoneSummary = (district) => {
    const names = Array.isArray(district.zone_names) ? district.zone_names.filter(Boolean) : []
    const countLabel = `${district.zones_count ?? names.length} zone(s)`
    if (names.length === 0) return countLabel
    const preview = names.slice(0, 3).join(', ')
    const extra = names.length > 3 ? ` +${names.length - 3}` : ''
    return `${countLabel}: ${preview}${extra}`
  }

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Districts">
      {flash?.success && showSuccessAlert && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button
            type="button"
            className="close"
            data-dismiss="alert"
            aria-label="Close"
            onClick={() => setShowSuccessAlert(false)}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {flash?.error && showErrorAlert && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {flash.error}
          <button
            type="button"
            className="close"
            data-dismiss="alert"
            aria-label="Close"
            onClick={() => setShowErrorAlert(false)}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Districts</h1>
            <p className="text-sm text-[#6B7280]">
              Manage districts. Each district sits above its zones.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddModal(true); setShowAddModalAnimation(false) }}
            className="shrink-0 rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#102059]"
          >
            + Add District
          </button>
        </div>

        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-transparent">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search district name, description, or zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#ffffff] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
                <option value="name">Sort by Name</option>
                <option value="date">Sort by Date Added</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="rounded-lg border border-[#E5E7EB] bg-[#ffffff] px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
              >
                <option value={5}>Show 5</option>
                <option value={10}>Show 10</option>
                <option value={25}>Show 25</option>
                <option value={50}>Show 50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <div className="divide-y divide-[#E5E7EB]">
            {displayedDistricts.length > 0 ? (
              displayedDistricts.map((d) => {
                const isActive = d.status_label === 'active' || d.status === true
                const dateAdded = d.created_at
                  ? new Date(d.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'N/A'
                return (
                  <div key={d.id} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                        <span className="text-sm font-bold text-white">{getInitials(d.name)}</span>
                      </div>

                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-3 lg:grid-cols-[1fr_200px_140px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#102059]">{d.name || 'N/A'}</div>
                          <div className="text-sm text-[#6B7280]">
                            {d.description
                              ? d.description.length > 60
                                ? d.description.slice(0, 60) + '…'
                                : d.description
                              : null}
                            <span className="block text-xs text-[#9CA3AF] sm:inline sm:ml-2">
                              {zoneSummary(d)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-[#9CA3AF] lg:hidden">Added {dateAdded}</div>
                        </div>

                        <div className="hidden items-center lg:flex">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Date Added</div>
                            <div className="mt-0.5 text-xs text-[#9CA3AF]">{dateAdded}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => handleStatusToggle(e, d)}
                            disabled={togglingDistrictId === d.id}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 ${
                              isActive ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                            }`}
                            aria-pressed={isActive}
                            aria-label={`Toggle status for ${d.name}`}
                            style={{ borderRadius: '0.7rem' }}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ${
                                isActive ? 'translate-x-[22px]' : 'translate-x-[2px]'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-semibold text-[#6B7280]">
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditDistrict(d)}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="Edit district"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDistrict(d)}
                            className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                            title="Delete district"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-[#9CA3AF]">
                  No districts found matching your search criteria
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B7280]">
              Showing{' '}
              <span className="font-semibold text-[#102059]">
                {sortedDistricts.length === 0 ? '0' : `${startIndex + 1}-${Math.min(endIndex, sortedDistricts.length)}`}
              </span>{' '}
              of <span className="font-semibold text-[#102059]">{sortedDistricts.length}</span> districts
              {searchQuery && ` matching "${searchQuery}"`}
              {statusFilter !== 'All' && ` with status "${statusFilter}"`}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#244693] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span className="text-xs text-[#6B7280]">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New District</h4>
                  <button type="button" className="close" onClick={closeAddModal}><span>&times;</span></button>
                </div>
                <form onSubmit={handleAddDistrict}>
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
                      <label>District boundary (draw on map) <span className="text-danger">*</span></label>
                      <ZoneDrawMap
                        key={showAddModal ? 'add-district-map' : 'add-district-map-closed'}
                        initialBoundary={addForm.data.boundary}
                        otherZones={districtsWithBoundary}
                        onBoundaryChange={(boundary) => addForm.setData('boundary', boundary)}
                        height={320}
                        active={showAddModalAnimation}
                        areaNoun="district"
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
                      {addForm.processing ? 'Creating...' : 'Create District'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {showEditModal && selectedDistrict && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit District</h4>
                  <button type="button" className="close" onClick={closeEditModal}><span>&times;</span></button>
                </div>
                <form onSubmit={handleUpdateDistrict}>
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
                      <label>District boundary (draw on map) <span className="text-danger">*</span></label>
                      <ZoneDrawMap
                        key={selectedDistrict.id}
                        initialBoundary={editForm.data.boundary}
                        otherZones={editMapReferenceDistricts}
                        onBoundaryChange={(boundary) => editForm.setData('boundary', boundary)}
                        height={320}
                        active={showEditModalAnimation}
                        areaNoun="district"
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
                      {editForm.processing ? 'Updating...' : 'Update District'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {showRemoveModal && districtToRemove && (
        <>
          <button
            type="button"
            className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${showRemoveModalAnimation ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Close"
            onClick={closeRemoveModal}
            disabled={isDeleting}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className={`pointer-events-auto w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl transition-all ${
                showRemoveModalAnimation ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-district-title"
            >
              <h4 id="delete-district-title" className="text-lg font-bold text-[#102059]">
                Delete district
              </h4>
              <p className="mt-3 text-sm text-[#6B7280]">
                Are you sure you want to delete{' '}
                <strong className="text-[#1F2937]">{districtToRemove.name}</strong>?
              </p>
              <p className="mt-2 text-sm text-[#6B7280]">
                Zones in this district will be unassigned. This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-full border border-[#E5E7EB] bg-white px-5 py-2 text-sm font-medium text-[#374151] transition-colors hover:bg-[#F3F4F6] disabled:opacity-60"
                  onClick={closeRemoveModal}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[#E20E28] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c40b22] disabled:opacity-60"
                  onClick={confirmDeleteDistrict}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Delete District'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </SuperAdminOrAdminLayout>
  )
}
