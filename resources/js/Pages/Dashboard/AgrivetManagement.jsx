import { useState, useEffect, useMemo } from 'react'
import { useForm, router } from '@inertiajs/react'
import { Search, Trash2, Pencil, Store, Upload, X } from 'lucide-react'
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

function agrivetImageUrl(imageUrl) {
  return storageUrl(imageUrl)
}

function parseAgrivetPermits(permits) {
  if (!permits || typeof permits !== 'string') {
    return { type: 'text', notes: '' }
  }

  const trimmed = permits.trim()
  if (!trimmed.startsWith('{')) {
    return { type: 'text', notes: permits }
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') {
      const hasStructured =
        'permit_document_url' in parsed ||
        'operating_days' in parsed ||
        'operating_hours' in parsed

      if (hasStructured) {
        return {
          type: 'structured',
          permitDocumentUrl: parsed.permit_document_url || null,
          operatingDays: parsed.operating_days || '',
          operatingHours: parsed.operating_hours || '',
          notes: parsed.notes || '',
        }
      }
    }
  } catch {
    // Not valid JSON — treat as plain text.
  }

  return { type: 'text', notes: permits }
}

function serializeAgrivetPermits(structured, notes) {
  return JSON.stringify({
    permit_document_url: structured.permitDocumentUrl,
    operating_days: structured.operatingDays,
    operating_hours: structured.operatingHours,
    notes: notes || '',
  })
}

function isPermitPdf(url) {
  return Boolean(url && /\.pdf(\?|$)/i.test(url))
}

export default function AgrivetManagement({ auth, agrivets = [], flash }) {
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedAgrivet, setSelectedAgrivet] = useState(null)
  const [agrivetToRemove, setAgrivetToRemove] = useState(null)
  const [addLogoPreview, setAddLogoPreview] = useState(null)
  const [addBannerPreview, setAddBannerPreview] = useState(null)
  const [editLogoPreview, setEditLogoPreview] = useState(null)
  const [editBannerPreview, setEditBannerPreview] = useState(null)
  const [editPermitsStructured, setEditPermitsStructured] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [statusFilter, setStatusFilter] = useState('All')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentAgrivetPage, setCurrentAgrivetPage] = useState(1)

  const addForm = useForm({
    name: '',
    registered_business_name: '',
    owner_name: '',
    description: '',
    contact_number: '',
    email: '',
    permits: '',
    logo: null,
    banner: null,
    status: 'active',
  })

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
    status: 'active',
  })

  const statusToggleForm = useForm({
    name: '',
    registered_business_name: '',
    owner_name: '',
    description: '',
    contact_number: '',
    email: '',
    permits: '',
    logo_url: '',
    banner_url: '',
    status: 'active',
  })

  // Handle add modal animation
  useEffect(() => {
    if (showAddModal) {
      setTimeout(() => setShowAddModalAnimation(true), 10)
    } else {
      setShowAddModalAnimation(false)
    }
  }, [showAddModal])

  // Handle edit modal animation
  useEffect(() => {
    if (showEditModal) {
      setTimeout(() => setShowEditModalAnimation(true), 10)
    } else {
      setShowEditModalAnimation(false)
    }
  }, [showEditModal])

  // Handle remove modal animation
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

  // Modal close handlers with animation
  const closeAddModal = () => {
    setShowAddModalAnimation(false)
    setTimeout(() => {
      setShowAddModal(false)
      addForm.reset()
      setAddLogoPreview(null)
      setAddBannerPreview(null)
    }, 300)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedAgrivet(null)
      editForm.reset()
      setEditLogoPreview(null)
      setEditBannerPreview(null)
      setEditPermitsStructured(null)
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setAgrivetToRemove(null)
    }, 300)
  }

  // Show success/error messages
  useEffect(() => {
    if (flash?.success) {
      closeAddModal()
      closeEditModal()
      closeRemoveModal()
      addForm.reset()
      editForm.reset()
      setAgrivetToRemove(null)
    }
  }, [flash])

  // Determine base route based on user type
  const getBaseRoute = () => {
    return auth?.user?.user_type === 'admin' 
      ? '/dashboard/admin/agrivets' 
      : '/dashboard/super-admin/agrivets'
  }

  const sortedAgrivets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = agrivets.filter((a) => {
      if (statusFilter === 'Active' && a.status !== 'active') return false
      if (statusFilter === 'Inactive' && a.status !== 'inactive') return false
      if (!q) return true
      const name = (a.name || '').toLowerCase()
      const owner = (a.owner_name || '').toLowerCase()
      const email = (a.email || '').toLowerCase()
      return name.includes(q) || owner.includes(q) || email.includes(q)
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
  }, [agrivets, searchQuery, sortBy, statusFilter])

  const totalAgrivetPages = Math.max(1, Math.ceil(sortedAgrivets.length / itemsPerPage))
  const agrivetStartIndex = (currentAgrivetPage - 1) * itemsPerPage
  const agrivetEndIndex = agrivetStartIndex + itemsPerPage
  const displayedAgrivets = sortedAgrivets.slice(agrivetStartIndex, agrivetEndIndex)

  useEffect(() => {
    setCurrentAgrivetPage(1)
  }, [searchQuery, sortBy, statusFilter, itemsPerPage])

  useEffect(() => {
    if (currentAgrivetPage > totalAgrivetPages) {
      setCurrentAgrivetPage(Math.max(1, totalAgrivetPages))
    }
  }, [currentAgrivetPage, totalAgrivetPages])

  const handleStatusToggle = (e, agrivet) => {
    e.stopPropagation()
    if (statusToggleForm.processing) return
    const newStatus = agrivet.status === 'active' ? 'inactive' : 'active'
    statusToggleForm.setData({
      name: agrivet.name,
      registered_business_name: agrivet.registered_business_name || '',
      owner_name: agrivet.owner_name || '',
      description: agrivet.description || '',
      contact_number: agrivet.contact_number || '',
      email: agrivet.email || '',
      permits: agrivet.permits || '',
      logo_url: agrivet.logo_url || '',
      banner_url: agrivet.banner_url || '',
      status: newStatus,
    })
    statusToggleForm.put(`${getBaseRoute()}/${agrivet.id}`, {
      preserveScroll: true,
    })
  }

  const handleAddAgrivet = (e) => {
    e.preventDefault()
    addForm.post(getBaseRoute(), {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        addForm.reset()
        setAddLogoPreview(null)
        setAddBannerPreview(null)
      },
    })
  }

  const handleImageUpload = (form, field, file, setPreview) => {
    if (!file) return
    form.setData(field, file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleEditAgrivet = (agrivet) => {
    const parsedPermits = parseAgrivetPermits(agrivet.permits)
    setSelectedAgrivet(agrivet)
    setEditPermitsStructured(parsedPermits.type === 'structured' ? parsedPermits : null)
    editForm.setData({
      name: agrivet.name,
      registered_business_name: agrivet.registered_business_name || '',
      owner_name: agrivet.owner_name || '',
      description: agrivet.description || '',
      contact_number: agrivet.contact_number || '',
      email: agrivet.email || '',
      permits: parsedPermits.notes,
      logo: null,
      banner: null,
      status: agrivet.status,
    })
    setEditLogoPreview(agrivetImageUrl(agrivet.logo_url))
    setEditBannerPreview(agrivetImageUrl(agrivet.banner_url))
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateAgrivet = (e) => {
    e.preventDefault()
    const hasNewImages = !!(editForm.data.logo || editForm.data.banner)
    editForm.transform((data) => {
      if (editPermitsStructured) {
        return {
          ...data,
          permits: serializeAgrivetPermits(editPermitsStructured, data.permits),
        }
      }
      return data
    })
    editForm.put(`${getBaseRoute()}/${selectedAgrivet.id}`, {
      preserveScroll: true,
      forceFormData: hasNewImages,
      onSuccess: () => {
        closeEditModal()
      },
      onFinish: () => {
        editForm.transform((data) => data)
      },
    })
  }

  const handleDeactivateAgrivet = (agrivetId) => {
    const agrivet = agrivets.find(a => a.id === agrivetId)
    setAgrivetToRemove(agrivet)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmRemoveAgrivet = () => {
    if (agrivetToRemove) {
      router.delete(`${getBaseRoute()}/${agrivetToRemove.id}`, {
        preserveScroll: true,
        onSuccess: () => {
          closeRemoveModal()
        },
      })
    }
  }

  const filterSelectClass =
    'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]'

  const modalInputClass =
    'w-full rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-2.5 text-sm text-[#102059] outline-none transition-all focus:border-[#244693] focus:ring-2 focus:ring-[#244693]/20'

  const modalLabelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]'

  const modalSectionClass = 'rounded-lg border border-[#E5E7EB] bg-white p-8'

  const modalSectionTitleClass = 'mb-4 border-b border-[#E5E7EB] pb-3 text-sm font-semibold text-[#102059]'

  const renderImageUpload = ({
    id,
    label,
    hint,
    preview,
    error,
    onChange,
  }) => (
    <div>
      <label className={modalLabelClass} htmlFor={id}>
        {label}
      </label>
      <div className="cursor-pointer rounded-xl border-2 border-dashed border-[#E5E7EB] bg-[#F8F9FB] p-6 text-center transition-colors hover:border-[#244693] hover:bg-[#F3F4F6]">
        <input id={id} type="file" accept="image/*" className="hidden" onChange={onChange} />
        <label htmlFor={id} className="mb-0 block w-full cursor-pointer">
          {preview ? (
            <div>
              <img
                src={preview}
                alt={`${label} preview`}
                className={`mx-auto mb-3 rounded-lg object-cover ${
                  label === 'Banner' ? 'h-32 w-full' : 'h-28 w-28'
                }`}
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
      {error && <p className="mt-2 text-xs text-[#E20E28]">{error}</p>}
    </div>
  )

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Agrivet Management">
      {/* Flash Messages */}
      {flash?.success && showSuccessAlert && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button
            type="button"
            className="close"
            data-dismiss="alert"
            aria-label="Close"
            onClick={(e) => {
              e.preventDefault()
              setShowSuccessAlert(false)
            }}
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
            onClick={(e) => {
              e.preventDefault()
              setShowErrorAlert(false)
            }}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div>
        {/* Page header — matches SuperAdminDashboard Agrivets tab */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Agrivets</h1>
            <p className="text-sm text-[#6B7280]">
              Manage all registered agrivet stores in the system
            </p>
          </div>
          {/* <button
            type="button"
            onClick={() => {
              setShowAddModal(true)
              setShowAddModalAnimation(false)
            }}
            className="shrink-0 rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#102059]"
          >
            Add Agrivet
          </button> */}
        </div>

        {/* Filters bar */}
        <div className="mb-6 p-[0px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-transparent">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search agrivet name, owner, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#ffffff] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={filterSelectClass}
              >
                <option value="name">Sort by Name</option>
                <option value="date">Sort by Date Added</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={filterSelectClass}
              >
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

        {/* Agrivets list */}
        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <div className="divide-y divide-[#E5E7EB]">
            {displayedAgrivets.length > 0 ? (
              displayedAgrivets.map((agrivet) => {
                const statusLabel = agrivet.status === 'active' ? 'Active' : 'Inactive'
                const dateAdded = agrivet.created_at
                  ? new Date(agrivet.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'N/A'
                return (
                  <div
                    key={agrivet.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.visit(`${getBaseRoute()}/${agrivet.id}/shops`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.visit(`${getBaseRoute()}/${agrivet.id}/shops`)
                      }
                    }}
                    className="cursor-pointer px-6 py-4 transition-colors hover:bg-[#F8F9FB]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                        <span className="text-sm font-bold text-white">
                          {getInitials(agrivet.name)}
                        </span>
                      </div>

                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-3 lg:grid-cols-[1fr_200px_140px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#102059]">
                            {agrivet.name || 'N/A'}
                          </div>
                          <div className="text-sm text-[#6B7280]">
                            {agrivet.owner_name || 'N/A'}
                            {agrivet.email ? (
                              <span className="block truncate text-xs text-[#9CA3AF] sm:inline sm:ml-2">
                                {agrivet.email}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-[#9CA3AF] lg:hidden">
                            {agrivet.shops_count ?? 0} shop(s) · Added {dateAdded}
                          </div>
                        </div>

                        <div className="hidden items-center lg:flex">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                              Date Added
                            </div>
                            <div className="mt-0.5 text-xs text-[#9CA3AF]">{dateAdded}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => handleStatusToggle(e, agrivet)}
                            disabled={statusToggleForm.processing}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 ${
                              agrivet.status === 'active' ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                            }`}
                            aria-pressed={agrivet.status === 'active'}
                            aria-label={`Toggle status for ${agrivet.name}`}
                            style={{ borderRadius: '0.7rem' }}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ${
                                agrivet.status === 'active' ? 'translate-x-[22px]' : 'translate-x-[2px]'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-semibold text-[#6B7280]">{statusLabel}</span>
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          {/* <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.visit(`${getBaseRoute()}/${agrivet.id}/shops`)
                            }}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="View shops"
                          >
                            <Store className="h-5 w-5" />
                          </button> */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditAgrivet(agrivet)
                            }}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="Edit agrivet"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          {agrivet.status === 'active' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeactivateAgrivet(agrivet.id)
                              }}
                              className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                              title="Deactivate agrivet"
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
                <p className="text-sm text-[#9CA3AF]">
                  No agrivets found matching your search criteria
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Results count + pagination */}
        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B7280]">
              Showing{' '}
              <span className="font-semibold text-[#102059]">
                {sortedAgrivets.length === 0
                  ? '0'
                  : `${agrivetStartIndex + 1}-${Math.min(agrivetEndIndex, sortedAgrivets.length)}`}
              </span>{' '}
              of <span className="font-semibold text-[#102059]">{sortedAgrivets.length}</span> agrivets
              {searchQuery && ` matching "${searchQuery}"`}
              {statusFilter !== 'All' && ` with status "${statusFilter}"`}
            </p>

            {totalAgrivetPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#244693] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentAgrivetPage === 1}
                  onClick={() => setCurrentAgrivetPage(currentAgrivetPage - 1)}
                >
                  Previous
                </button>
                <span className="text-xs text-[#6B7280]">
                  Page {currentAgrivetPage} of {totalAgrivetPages}
                </span>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentAgrivetPage === totalAgrivetPages}
                  onClick={() => setCurrentAgrivetPage(currentAgrivetPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Agrivet Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Agrivet</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeAddModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddAgrivet}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Store Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.name ? 'is-invalid' : ''}`}
                            value={addForm.data.name}
                            onChange={(e) => addForm.setData('name', e.target.value)}
                            required
                          />
                          {addForm.errors.name && (
                            <div className="invalid-feedback">{addForm.errors.name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Registered Business Name</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.registered_business_name ? 'is-invalid' : ''}`}
                            value={addForm.data.registered_business_name}
                            onChange={(e) => addForm.setData('registered_business_name', e.target.value)}
                          />
                          {addForm.errors.registered_business_name && (
                            <div className="invalid-feedback">{addForm.errors.registered_business_name}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Point of Contact Person Name</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.owner_name ? 'is-invalid' : ''}`}
                            value={addForm.data.owner_name}
                            onChange={(e) => addForm.setData('owner_name', e.target.value)}
                          />
                          {addForm.errors.owner_name && (
                            <div className="invalid-feedback">{addForm.errors.owner_name}</div>
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
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            className={`form-control ${addForm.errors.description ? 'is-invalid' : ''}`}
                            value={addForm.data.description}
                            onChange={(e) => addForm.setData('description', e.target.value)}
                            rows="2"
                          />
                          {addForm.errors.description && (
                            <div className="invalid-feedback">{addForm.errors.description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Contact Number</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.contact_number ? 'is-invalid' : ''}`}
                            value={addForm.data.contact_number}
                            onChange={(e) => addForm.setData('contact_number', e.target.value)}
                          />
                          {addForm.errors.contact_number && (
                            <div className="invalid-feedback">{addForm.errors.contact_number}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Email</label>
                          <input
                            type="email"
                            className={`form-control ${addForm.errors.email ? 'is-invalid' : ''}`}
                            value={addForm.data.email}
                            onChange={(e) => addForm.setData('email', e.target.value)}
                          />
                          {addForm.errors.email && (
                            <div className="invalid-feedback">{addForm.errors.email}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Necessary Permits for Operation</label>
                          <textarea
                            className={`form-control ${addForm.errors.permits ? 'is-invalid' : ''}`}
                            value={addForm.data.permits}
                            onChange={(e) => addForm.setData('permits', e.target.value)}
                            rows="3"
                            placeholder="List all necessary permits (e.g., Business Permit, DTI Registration, etc.)"
                          />
                          {addForm.errors.permits && (
                            <div className="invalid-feedback">{addForm.errors.permits}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Logo</label>
                          <div
                            className="rounded border border-dashed bg-light p-4 text-center"
                            style={{ cursor: 'pointer' }}
                          >
                            <input
                              id="add_agrivet_logo"
                              type="file"
                              accept="image/*"
                              className="d-none"
                              onChange={(e) =>
                                handleImageUpload(addForm, 'logo', e.target.files?.[0], setAddLogoPreview)
                              }
                            />
                            <label htmlFor="add_agrivet_logo" className="mb-0 w-100" style={{ cursor: 'pointer' }}>
                              {addLogoPreview ? (
                                <div>
                                  <img
                                    src={addLogoPreview}
                                    alt="Logo preview"
                                    className="img-fluid rounded mb-3"
                                    style={{ maxHeight: '10rem' }}
                                  />
                                  <p className="text-muted small mb-0">Click to change logo</p>
                                </div>
                              ) : (
                                <div>
                                  <Upload className="mx-auto mb-2 text-muted" size={32} />
                                  <p className="mb-1">Upload logo</p>
                                  <p className="text-muted small mb-0">PNG, JPG, WEBP up to 5MB</p>
                                </div>
                              )}
                            </label>
                          </div>
                          {addForm.errors.logo && (
                            <div className="text-danger small mt-1">{addForm.errors.logo}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Banner</label>
                          <div
                            className="rounded border border-dashed bg-light p-4 text-center"
                            style={{ cursor: 'pointer' }}
                          >
                            <input
                              id="add_agrivet_banner"
                              type="file"
                              accept="image/*"
                              className="d-none"
                              onChange={(e) =>
                                handleImageUpload(addForm, 'banner', e.target.files?.[0], setAddBannerPreview)
                              }
                            />
                            <label htmlFor="add_agrivet_banner" className="mb-0 w-100" style={{ cursor: 'pointer' }}>
                              {addBannerPreview ? (
                                <div>
                                  <img
                                    src={addBannerPreview}
                                    alt="Banner preview"
                                    className="img-fluid rounded mb-3"
                                    style={{ maxHeight: '10rem' }}
                                  />
                                  <p className="text-muted small mb-0">Click to change banner</p>
                                </div>
                              ) : (
                                <div>
                                  <Upload className="mx-auto mb-2 text-muted" size={32} />
                                  <p className="mb-1">Upload banner</p>
                                  <p className="text-muted small mb-0">PNG, JPG, WEBP up to 10MB</p>
                                </div>
                              )}
                            </label>
                          </div>
                          {addForm.errors.banner && (
                            <div className="text-danger small mt-1">{addForm.errors.banner}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="alert alert-info mt-3 mb-0">
                      <i className="fas fa-info-circle mr-2"></i>
                      Store address and map location are set per shop. After creating the agrivet, open &quot;View Shops&quot;
                      to add branches.
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
                      {addForm.processing ? 'Creating...' : 'Create Agrivet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Agrivet Modal */}
      {showEditModal && selectedAgrivet && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content overflow-hidden border-0 shadow-lg">
                <div className="border-b border-[#E5E7EB] bg-[#F8F9FB] px-6" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="mb-1 text-xl font-semibold text-[#102059]">Edit Agrivet</h4>
                      <p className="mb-0 text-sm text-[#6B7280]">
                        Update business profile for <span className="font-medium text-[#102059]">{selectedAgrivet.name}</span>
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

                <form onSubmit={handleUpdateAgrivet}>
                  <div className="modal-body bg-[#F8F9FB] px-6 py-6">
                    <div className="space-y-5">
                      <section className={modalSectionClass}>
                        <h5 className={modalSectionTitleClass}>Business Details</h5>
                        <div className="grid gap-5 md:grid-cols-2">
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_agrivet_name">
                              Store Name <span className="text-[#E20E28]">*</span>
                            </label>
                            <input
                              id="edit_agrivet_name"
                              type="text"
                              className={`${modalInputClass} ${editForm.errors.name ? 'border-[#E20E28] ring-1 ring-[#E20E28]/20' : ''}`}
                              value={editForm.data.name}
                              onChange={(e) => editForm.setData('name', e.target.value)}
                              required
                            />
                            {editForm.errors.name && (
                              <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.name}</p>
                            )}
                          </div>
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_registered_business_name">
                              Registered Business Name
                            </label>
                            <input
                              id="edit_registered_business_name"
                              type="text"
                              className={`${modalInputClass} ${editForm.errors.registered_business_name ? 'border-[#E20E28] ring-1 ring-[#E20E28]/20' : ''}`}
                              value={editForm.data.registered_business_name}
                              onChange={(e) => editForm.setData('registered_business_name', e.target.value)}
                            />
                            {editForm.errors.registered_business_name && (
                              <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.registered_business_name}</p>
                            )}
                          </div>
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_owner_name">
                              Owner / Point of Contact
                            </label>
                            <input
                              id="edit_owner_name"
                              type="text"
                              className={`${modalInputClass} ${editForm.errors.owner_name ? 'border-[#E20E28] ring-1 ring-[#E20E28]/20' : ''}`}
                              value={editForm.data.owner_name}
                              onChange={(e) => editForm.setData('owner_name', e.target.value)}
                            />
                            {editForm.errors.owner_name && (
                              <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.owner_name}</p>
                            )}
                          </div>
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_status">
                              Status <span className="text-[#E20E28]">*</span>
                            </label>
                            <select
                              id="edit_status"
                              className={`${modalInputClass} ${editForm.errors.status ? 'border-[#E20E28] ring-1 ring-[#E20E28]/20' : ''}`}
                              value={editForm.data.status}
                              onChange={(e) => editForm.setData('status', e.target.value)}
                              required
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                            {editForm.errors.status && (
                              <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.status}</p>
                            )}
                          </div>
                        </div>
                      </section>

                      <section className={modalSectionClass}>
                        <h5 className={modalSectionTitleClass}>About the Business</h5>
                        <div>
                          <label className={modalLabelClass} htmlFor="edit_description">
                            Business Description
                          </label>
                          <textarea
                            id="edit_description"
                            className={`${modalInputClass} min-h-[120px] resize-y ${editForm.errors.description ? 'border-[#E20E28] ring-1 ring-[#E20E28]/20' : ''}`}
                            value={editForm.data.description}
                            onChange={(e) => editForm.setData('description', e.target.value)}
                            rows={4}
                            placeholder="Describe the agrivet, its products, and services..."
                          />
                          {editForm.errors.description && (
                            <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.description}</p>
                          )}
                        </div>
                      </section>

                      <section className={modalSectionClass}>
                        <h5 className={modalSectionTitleClass}>Contact Information</h5>
                        <div className="grid gap-5 md:grid-cols-2">
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_contact_number">
                              Contact Number
                            </label>
                            <input
                              id="edit_contact_number"
                              type="text"
                              className={`${modalInputClass} ${editForm.errors.contact_number ? 'border-[#E20E28] ring-1 ring-[#E20E28]/20' : ''}`}
                              value={editForm.data.contact_number}
                              onChange={(e) => editForm.setData('contact_number', e.target.value)}
                              placeholder="e.g. 0917 123 4567"
                            />
                            {editForm.errors.contact_number && (
                              <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.contact_number}</p>
                            )}
                          </div>
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_email">
                              Email Address
                            </label>
                            <input
                              id="edit_email"
                              type="email"
                              className={`${modalInputClass} ${editForm.errors.email ? 'border-[#E20E28] ring-1 ring-[#E20E28]/20' : ''}`}
                              value={editForm.data.email}
                              onChange={(e) => editForm.setData('email', e.target.value)}
                              placeholder="business@example.com"
                            />
                            {editForm.errors.email && (
                              <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.email}</p>
                            )}
                          </div>
                        </div>
                      </section>

                      <section className={modalSectionClass}>
                        <h5 className={modalSectionTitleClass}>Branding</h5>
                        <p className="mb-5 text-sm text-[#6B7280]">
                          Upload a square logo and a wide banner image for this agrivet profile.
                        </p>
                        <div className="grid gap-5 md:grid-cols-2">
                          {renderImageUpload({
                            id: 'edit_agrivet_logo',
                            label: 'Logo',
                            hint: 'PNG, JPG, WEBP up to 5MB',
                            preview: editLogoPreview,
                            error: editForm.errors.logo,
                            onChange: (e) =>
                              handleImageUpload(editForm, 'logo', e.target.files?.[0], setEditLogoPreview),
                          })}
                          {renderImageUpload({
                            id: 'edit_agrivet_banner',
                            label: 'Banner',
                            hint: 'PNG, JPG, WEBP up to 10MB',
                            preview: editBannerPreview,
                            error: editForm.errors.banner,
                            onChange: (e) =>
                              handleImageUpload(editForm, 'banner', e.target.files?.[0], setEditBannerPreview),
                          })}
                        </div>
                      </section>

                      {/* <section className={modalSectionClass}>
                        <h5 className={modalSectionTitleClass}>Compliance</h5>

                        {editPermitsStructured ? (
                          <div className="space-y-5">
                            <div>
                              <p className={modalLabelClass}>Business Permit Document</p>
                              {editPermitsStructured.permitDocumentUrl ? (
                                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FB] p-4">
                                  {isPermitPdf(editPermitsStructured.permitDocumentUrl) ? (
                                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-[#102059]">PDF document on file</p>
                                        <p className="text-xs text-[#6B7280]">Uploaded during registration</p>
                                      </div>
                                      <a
                                        href={agrivetImageUrl(editPermitsStructured.permitDocumentUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg bg-[#102059] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#244693]"
                                      >
                                        View permit
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <img
                                        src={agrivetImageUrl(editPermitsStructured.permitDocumentUrl)}
                                        alt="Business permit"
                                        className="mx-auto max-h-56 rounded-lg border border-[#E5E7EB] object-contain"
                                      />
                                      <div className="text-center">
                                        <a
                                          href={agrivetImageUrl(editPermitsStructured.permitDocumentUrl)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs font-semibold text-[#244693] hover:underline"
                                        >
                                          Open full-size permit
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-[#9CA3AF]">No permit document uploaded.</p>
                              )}
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-3">
                                <p className={modalLabelClass}>Operating Days</p>
                                <p className="text-sm text-[#102059]">
                                  {editPermitsStructured.operatingDays || '—'}
                                </p>
                              </div>
                              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-3">
                                <p className={modalLabelClass}>Operating Hours</p>
                                <p className="text-sm text-[#102059]">
                                  {editPermitsStructured.operatingHours || '—'}
                                </p>
                              </div>
                            </div>

                            <div>
                              <label className={modalLabelClass} htmlFor="edit_permits_notes">
                                Additional Permit Notes
                              </label>
                              <textarea
                                id="edit_permits_notes"
                                className={`${modalInputClass} min-h-[90px] resize-y ${editForm.errors.permits ? 'border-[#E20E28] ring-1 ring-[#E20E28]/20' : ''}`}
                                value={editForm.data.permits}
                                onChange={(e) => editForm.setData('permits', e.target.value)}
                                rows={3}
                                placeholder="Add notes about other permits (e.g., DTI Registration, Mayor's Permit)..."
                              />
                              {editForm.errors.permits && (
                                <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.permits}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className={modalLabelClass} htmlFor="edit_permits">
                              Necessary Permits for Operation
                            </label>
                            <textarea
                              id="edit_permits"
                              className={`${modalInputClass} min-h-[110px] resize-y ${editForm.errors.permits ? 'border-[#E20E28] ring-1 ring-[#E20E28]/20' : ''}`}
                              value={editForm.data.permits}
                              onChange={(e) => editForm.setData('permits', e.target.value)}
                              rows={4}
                              placeholder="List all necessary permits (e.g., Business Permit, DTI Registration, etc.)"
                            />
                            {editForm.errors.permits && (
                              <p className="mt-2 text-xs text-[#E20E28]">{editForm.errors.permits}</p>
                            )}
                          </div>
                        )}
                      </section> */}

                      <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-5 py-4 text-sm text-[#1E3A8A]">
                        Shop addresses, operating hours, and branch management are handled separately. Open the agrivet
                        from the list to manage its shops.
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-[#E5E7EB] bg-white px-6 sm:flex-row sm:justify-end" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
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

      {/* Remove Agrivet Confirmation Modal */}
      {showRemoveModal && agrivetToRemove && (
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
                    Are you sure you want to deactivate <strong>{agrivetToRemove.name}</strong>?
                  </p>
                  <p className="text-muted mb-0">
                    This will set the status to "Inactive". The agrivet will not be visible to users.
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
                    onClick={confirmRemoveAgrivet}
                  >
                    Deactivate Agrivet
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

