import { useState, useEffect, useMemo } from 'react'
import { useForm, router } from '@inertiajs/react'
import { Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'
import { storageUrl } from '../../utils/storageUrl'

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function FarmManagement({ auth, farms = [], flash }) {
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [farmToRemove, setFarmToRemove] = useState(null)
  const [editLogoPreview, setEditLogoPreview] = useState(null)
  const [editBannerPreview, setEditBannerPreview] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [statusFilter, setStatusFilter] = useState('All')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const editForm = useForm({
    name: '',
    registered_business_name: '',
    owner_name: '',
    description: '',
    contact_number: '',
    email: '',
    permits: '',
    logo: null,
    banner: null,
    address: '',
    city: '',
    province: '',
    postal_code: '',
    operating_days: '',
    operating_hours: '',
    status: 'active',
  })

  const statusToggleForm = useForm({})

  useEffect(() => {
    if (showEditModal) {
      setTimeout(() => setShowEditModalAnimation(true), 10)
    } else {
      setShowEditModalAnimation(false)
    }
  }, [showEditModal])

  useEffect(() => {
    if (showRemoveModal) {
      setTimeout(() => setShowRemoveModalAnimation(true), 10)
    } else {
      setShowRemoveModalAnimation(false)
    }
  }, [showRemoveModal])

  useEffect(() => {
    if (flash?.success) setShowSuccessAlert(true)
    if (flash?.error) setShowErrorAlert(true)
  }, [flash?.success, flash?.error])

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedFarm(null)
      editForm.reset()
      setEditLogoPreview(null)
      setEditBannerPreview(null)
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setFarmToRemove(null)
    }, 300)
  }

  useEffect(() => {
    if (flash?.success) {
      closeEditModal()
      closeRemoveModal()
    }
  }, [flash])

  const getBaseRoute = () =>
    auth?.user?.user_type === 'admin' ? '/dashboard/admin/farms' : '/dashboard/super-admin/farms'

  const sortedFarms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = farms.filter((farm) => {
      if (statusFilter === 'Active' && farm.status !== 'active') return false
      if (statusFilter === 'Inactive' && farm.status !== 'inactive') return false
      if (!q) return true
      const name = (farm.name || '').toLowerCase()
      const owner = (farm.owner_name || '').toLowerCase()
      const email = (farm.email || '').toLowerCase()
      const manager = (farm.owner_manager_email || '').toLowerCase()
      return name.includes(q) || owner.includes(q) || email.includes(q) || manager.includes(q)
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '')
      }
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })
    return list
  }, [farms, searchQuery, sortBy, statusFilter])

  const totalPages = Math.max(1, Math.ceil(sortedFarms.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const displayedFarms = sortedFarms.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy, statusFilter, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages))
    }
  }, [currentPage, totalPages])

  const farmPayload = (farm, status) => ({
    name: farm.name || '',
    registered_business_name: farm.registered_business_name || '',
    owner_name: farm.owner_name || '',
    description: farm.description || '',
    contact_number: farm.contact_number || '',
    email: farm.email || '',
    permits: farm.permits || '',
    logo_url: farm.logo_url || '',
    banner_url: farm.banner_url || '',
    address: farm.address || '',
    city: farm.city || '',
    province: farm.province || '',
    postal_code: farm.postal_code || '',
    operating_days: farm.operating_days || '',
    operating_hours: farm.operating_hours || '',
    status,
  })

  const handleStatusToggle = (e, farm) => {
    e.stopPropagation()
    if (statusToggleForm.processing) return
    const newStatus = farm.status === 'active' ? 'inactive' : 'active'
    statusToggleForm.transform(() => farmPayload(farm, newStatus))
    statusToggleForm.put(`${getBaseRoute()}/${farm.id}`, {
      preserveScroll: true,
      onFinish: () => {
        statusToggleForm.transform((data) => data)
      },
    })
  }

  const handleImageUpload = (field, file, setPreview) => {
    if (!file) return
    editForm.setData(field, file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleEditFarm = (farm) => {
    setSelectedFarm(farm)
    editForm.setData({
      name: farm.name || '',
      registered_business_name: farm.registered_business_name || '',
      owner_name: farm.owner_name || '',
      description: farm.description || '',
      contact_number: farm.contact_number || '',
      email: farm.email || '',
      permits: farm.permits || '',
      logo: null,
      banner: null,
      address: farm.address || '',
      city: farm.city || '',
      province: farm.province || '',
      postal_code: farm.postal_code || '',
      operating_days: farm.operating_days || '',
      operating_hours: farm.operating_hours || '',
      status: farm.status || 'active',
    })
    setEditLogoPreview(storageUrl(farm.logo_url))
    setEditBannerPreview(storageUrl(farm.banner_url))
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateFarm = (e) => {
    e.preventDefault()
    const hasNewImages = !!(editForm.data.logo || editForm.data.banner)
    editForm.put(`${getBaseRoute()}/${selectedFarm.id}`, {
      preserveScroll: true,
      forceFormData: hasNewImages,
      onSuccess: () => closeEditModal(),
    })
  }

  const confirmRemoveFarm = () => {
    if (!farmToRemove) return
    router.delete(`${getBaseRoute()}/${farmToRemove.id}`, {
      preserveScroll: true,
      onSuccess: () => closeRemoveModal(),
    })
  }

  const filterSelectClass =
    'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]'

  const modalInputClass =
    'w-full rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-2.5 text-sm text-[#102059] outline-none transition-all focus:border-[#244693] focus:ring-2 focus:ring-[#244693]/20'

  const modalLabelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]'

  const modalSectionClass = 'rounded-lg border border-[#E5E7EB] bg-white p-8'

  const modalSectionTitleClass = 'mb-4 border-b border-[#E5E7EB] pb-3 text-sm font-semibold text-[#102059]'

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Farm Management">
      {flash?.success && showSuccessAlert && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button type="button" className="close" aria-label="Close" onClick={() => setShowSuccessAlert(false)}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {(flash?.error || editForm.errors.error) && showErrorAlert && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {flash?.error || editForm.errors.error}
          <button type="button" className="close" aria-label="Close" onClick={() => setShowErrorAlert(false)}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Farms</h1>
            <p className="text-sm text-[#6B7280]">
              Manage registered farms. Adding a farm also creates its owner/manager login.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.visit(`${getBaseRoute()}/create`)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#102059]"
          >
            <Plus className="h-4 w-4" />
            Add Farm
          </button>
        </div>

        <div className="mb-6">
          <div className="flex flex-col gap-4 bg-transparent md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search farm name, owner, or email..."
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
            {displayedFarms.length > 0 ? (
              displayedFarms.map((farm) => {
                const statusLabel = farm.status === 'active' ? 'Active' : 'Inactive'
                const dateAdded = farm.created_at
                  ? new Date(farm.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'N/A'
                const location = [farm.city, farm.province].filter(Boolean).join(', ')
                return (
                  <div key={farm.id} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                        <span className="text-sm font-bold text-white">{getInitials(farm.name)}</span>
                      </div>
                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-3 lg:grid-cols-[1fr_200px_140px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#102059]">{farm.name || 'N/A'}</div>
                          <div className="text-sm text-[#6B7280]">
                            {farm.owner_name || farm.owner_manager_name || 'N/A'}
                            {farm.email ? (
                              <span className="block truncate text-xs text-[#9CA3AF] sm:ml-2 sm:inline">{farm.email}</span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-[#9CA3AF] lg:hidden">
                            {location || 'No location'} · Added {dateAdded}
                          </div>
                        </div>
                        <div className="hidden items-center lg:flex">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Date Added</div>
                            <div className="mt-0.5 text-xs text-[#9CA3AF]">{dateAdded}</div>
                            {location ? <div className="mt-0.5 text-xs text-[#9CA3AF]">{location}</div> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => handleStatusToggle(e, farm)}
                            disabled={statusToggleForm.processing}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 ${
                              farm.status === 'active' ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                            }`}
                            aria-pressed={farm.status === 'active'}
                            aria-label={`Toggle status for ${farm.name}`}
                            style={{ borderRadius: '0.7rem' }}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ${
                                farm.status === 'active' ? 'translate-x-[22px]' : 'translate-x-[2px]'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-semibold text-[#6B7280]">{statusLabel}</span>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditFarm(farm)}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="Edit farm"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          {farm.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => {
                                setFarmToRemove(farm)
                                setShowRemoveModal(true)
                                setShowRemoveModalAnimation(false)
                              }}
                              className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                              title="Deactivate farm"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-[#9CA3AF]">No farms found matching your search criteria</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B7280]">
              Showing{' '}
              <span className="font-semibold text-[#102059]">
                {sortedFarms.length === 0 ? '0' : `${startIndex + 1}-${Math.min(startIndex + itemsPerPage, sortedFarms.length)}`}
              </span>{' '}
              of <span className="font-semibold text-[#102059]">{sortedFarms.length}</span> farms
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
                <span className="text-xs text-[#6B7280]">
                  Page {currentPage} of {totalPages}
                </span>
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

      {showEditModal && selectedFarm && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content overflow-hidden border-0 shadow-lg">
                <div className="border-b border-[#E5E7EB] bg-[#F8F9FB] px-6" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="mb-1 text-xl font-semibold text-[#102059]">Edit Farm</h4>
                      <p className="mb-0 text-sm text-[#6B7280]">
                        Update farm profile for <span className="font-medium text-[#102059]">{selectedFarm.name}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="rounded-lg border border-[#E5E7EB] bg-white p-2 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#102059]"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <form onSubmit={handleUpdateFarm}>
                  <div className="modal-body bg-[#F8F9FB] px-6 py-6">
                    <div className="space-y-5">
                      <section className={modalSectionClass}>
                        <h5 className={modalSectionTitleClass}>Farm Details</h5>
                        <div className="grid gap-5 md:grid-cols-2">
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_farm_name">
                              Farm Name <span className="text-[#E20E28]">*</span>
                            </label>
                            <input
                              id="edit_farm_name"
                              type="text"
                              required
                              className={modalInputClass}
                              value={editForm.data.name}
                              onChange={(e) => editForm.setData('name', e.target.value)}
                            />
                            {editForm.errors.name && <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.name}</p>}
                          </div>
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_registered_business_name">
                              Registered Business Name
                            </label>
                            <input
                              id="edit_registered_business_name"
                              type="text"
                              className={modalInputClass}
                              value={editForm.data.registered_business_name}
                              onChange={(e) => editForm.setData('registered_business_name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_owner_name">
                              Owner / Point of Contact
                            </label>
                            <input
                              id="edit_owner_name"
                              type="text"
                              className={modalInputClass}
                              value={editForm.data.owner_name}
                              onChange={(e) => editForm.setData('owner_name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_status">
                              Status
                            </label>
                            <select
                              id="edit_status"
                              className={modalInputClass}
                              value={editForm.data.status}
                              onChange={(e) => editForm.setData('status', e.target.value)}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        </div>
                      </section>

                      <section className={modalSectionClass}>
                        <h5 className={modalSectionTitleClass}>About the Farm</h5>
                        <textarea
                          className={`${modalInputClass} min-h-[120px] resize-y`}
                          value={editForm.data.description}
                          onChange={(e) => editForm.setData('description', e.target.value)}
                          rows={4}
                          placeholder="Describe the farm, its livestock, and operations..."
                        />
                      </section>

                      <section className={modalSectionClass}>
                        <h5 className={modalSectionTitleClass}>Contact</h5>
                        <div className="grid gap-5 md:grid-cols-2">
                          <input
                            type="text"
                            className={modalInputClass}
                            placeholder="Contact number"
                            value={editForm.data.contact_number}
                            onChange={(e) => editForm.setData('contact_number', e.target.value)}
                          />
                          <input
                            type="email"
                            className={modalInputClass}
                            placeholder="Email"
                            value={editForm.data.email}
                            onChange={(e) => editForm.setData('email', e.target.value)}
                          />
                        </div>
                      </section>

                      <section className={modalSectionClass}>
                        <h5 className={modalSectionTitleClass}>Location</h5>
                        <div className="grid gap-5 md:grid-cols-2">
                          <input
                            type="text"
                            className={`${modalInputClass} md:col-span-2`}
                            placeholder="Street, barangay"
                            value={editForm.data.address}
                            onChange={(e) => editForm.setData('address', e.target.value)}
                          />
                          <input
                            type="text"
                            className={modalInputClass}
                            placeholder="City"
                            value={editForm.data.city}
                            onChange={(e) => editForm.setData('city', e.target.value)}
                          />
                          <input
                            type="text"
                            className={modalInputClass}
                            placeholder="Province"
                            value={editForm.data.province}
                            onChange={(e) => editForm.setData('province', e.target.value)}
                          />
                          <input
                            type="text"
                            className={modalInputClass}
                            placeholder="Postal code"
                            value={editForm.data.postal_code}
                            onChange={(e) => editForm.setData('postal_code', e.target.value)}
                          />
                          <input
                            type="text"
                            className={modalInputClass}
                            placeholder="Operating days"
                            value={editForm.data.operating_days}
                            onChange={(e) => editForm.setData('operating_days', e.target.value)}
                          />
                          <input
                            type="text"
                            className={`${modalInputClass} md:col-span-2`}
                            placeholder="Operating hours"
                            value={editForm.data.operating_hours}
                            onChange={(e) => editForm.setData('operating_hours', e.target.value)}
                          />
                        </div>
                      </section>

                      <section className={modalSectionClass}>
                        <h5 className={modalSectionTitleClass}>Branding</h5>
                        <div className="grid gap-5 md:grid-cols-2">
                          <ImageField
                            id="edit_farm_logo"
                            label="Logo"
                            hint="PNG, JPG, WEBP up to 5MB"
                            preview={editLogoPreview}
                            onChange={(file) => handleImageUpload('logo', file, setEditLogoPreview)}
                          />
                          <ImageField
                            id="edit_farm_banner"
                            label="Banner"
                            hint="PNG, JPG, WEBP up to 10MB"
                            preview={editBannerPreview}
                            wide
                            onChange={(file) => handleImageUpload('banner', file, setEditBannerPreview)}
                          />
                        </div>
                      </section>
                    </div>
                  </div>
                  <div
                    className="flex flex-col-reverse gap-3 border-t border-[#E5E7EB] bg-white px-6 sm:flex-row sm:justify-end"
                    style={{ paddingTop: '10px', paddingBottom: '10px' }}
                  >
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="rounded-lg border border-[#E5E7EB] px-5 py-2.5 text-sm font-semibold text-[#6B7280] transition-colors hover:border-[#102059] hover:text-[#102059]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editForm.processing}
                      className="rounded-lg bg-[#102059] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244693] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {editForm.processing ? 'Saving changes...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {showRemoveModal && farmToRemove && (
        <>
          <div className={`modal-backdrop fade ${showRemoveModalAnimation ? 'show' : ''}`} onClick={closeRemoveModal}></div>
          <div className={`modal fade ${showRemoveModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Confirm Deactivation</h4>
                  <button type="button" className="close" onClick={closeRemoveModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p>
                    Are you sure you want to deactivate <strong>{farmToRemove.name}</strong>?
                  </p>
                  <p className="mb-0 text-muted">The farm will be marked inactive. Its owner/manager login stays in Accounts.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmRemoveFarm}>
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </SuperAdminOrAdminLayout>
  )
}

function ImageField({ id, label, hint, preview, onChange, wide = false }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]" htmlFor={id}>
        {label}
      </label>
      <div className="cursor-pointer rounded-xl border-2 border-dashed border-[#E5E7EB] bg-[#F8F9FB] p-6 text-center transition-colors hover:border-[#244693]">
        <input
          id={id}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0])}
        />
        <label htmlFor={id} className="mb-0 block w-full cursor-pointer">
          {preview ? (
            <div>
              <img
                src={preview}
                alt={`${label} preview`}
                className={`mx-auto mb-3 rounded-lg object-cover ${wide ? 'h-32 w-full' : 'h-28 w-28'}`}
              />
              <p className="text-xs font-medium text-[#244693]">Click to replace image</p>
            </div>
          ) : (
            <div className="py-2">
              <Upload className="mx-auto mb-3 h-9 w-9 text-[#9CA3AF]" />
              <p className="mb-1 text-sm font-medium text-[#102059]">Upload {label.toLowerCase()}</p>
              <p className="text-xs text-[#9CA3AF]">{hint}</p>
            </div>
          )}
        </label>
      </div>
    </div>
  )
}
