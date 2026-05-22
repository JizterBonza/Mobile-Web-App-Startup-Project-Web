import { useState, useEffect, useMemo } from 'react'
import { useForm, router, Link } from '@inertiajs/react'
import { ArrowLeft, Plus, Search, Pencil, Trash2, Tag } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

export default function SubCategories({ auth, subCategories = [], flash }) {
  const [showAddModal, setShowAddModal]                   = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal]                 = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal]             = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedSubCategory, setSelectedSubCategory]     = useState(null)
  const [subCategoryToRemove, setSubCategoryToRemove]     = useState(null)
  const [showSuccessAlert, setShowSuccessAlert]           = useState(true)
  const [showErrorAlert, setShowErrorAlert]               = useState(true)
  const [searchQuery, setSearchQuery]                     = useState('')
  const [statusFilter, setStatusFilter]                   = useState('All')
  const [itemsPerPage, setItemsPerPage]                   = useState(10)
  const [currentPage, setCurrentPage]                     = useState(1)

  const addForm  = useForm({ sub_category_name: '', sub_category_description: '', sub_category_status: 'active' })
  const editForm = useForm({ sub_category_name: '', sub_category_description: '', sub_category_status: 'active' })

  useEffect(() => { showAddModal    ? setTimeout(() => setShowAddModalAnimation(true), 10)    : setShowAddModalAnimation(false) },    [showAddModal])
  useEffect(() => { showEditModal   ? setTimeout(() => setShowEditModalAnimation(true), 10)   : setShowEditModalAnimation(false) },   [showEditModal])
  useEffect(() => { showRemoveModal ? setTimeout(() => setShowRemoveModalAnimation(true), 10) : setShowRemoveModalAnimation(false) }, [showRemoveModal])

  const closeAddModal = () => {
    setShowAddModalAnimation(false)
    setTimeout(() => { setShowAddModal(false); addForm.reset() }, 300)
  }
  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => { setShowEditModal(false); setSelectedSubCategory(null); editForm.reset() }, 300)
  }
  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => { setShowRemoveModal(false); setSubCategoryToRemove(null) }, 300)
  }

  useEffect(() => {
    if (flash?.success) { closeAddModal(); closeEditModal(); closeRemoveModal(); addForm.reset(); editForm.reset(); setShowSuccessAlert(true) }
    if (flash?.error)   { setShowErrorAlert(true) }
  }, [flash])

  const getBaseRoute = () => {
    if (auth.user.user_type === 'super_admin') return '/dashboard/super-admin/sub-categories'
    if (auth.user.user_type === 'admin')       return '/dashboard/admin/sub-categories'
    return '/dashboard/sub-categories'
  }
  const baseRoute = getBaseRoute()

  const getProductsRoute = () => {
    if (auth.user.user_type === 'super_admin') return '/dashboard/super-admin/products'
    if (auth.user.user_type === 'admin') return '/dashboard/admin/products'
    return '/dashboard/products'
  }
  const productsRoute = getProductsRoute()
  const hasProductCatalog = ['super_admin', 'admin'].includes(auth.user.user_type)

  const handleAddSubCategory = (e) => {
    e.preventDefault()
    addForm.post(baseRoute, { preserveScroll: true, onSuccess: () => addForm.reset() })
  }

  const handleEditSubCategory = (subCategory) => {
    setSelectedSubCategory(subCategory)
    editForm.setData({
      sub_category_name:        String(subCategory.sub_category_name || ''),
      sub_category_description: String(subCategory.sub_category_description || ''),
      sub_category_status:      String(subCategory.sub_category_status || 'active'),
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateSubCategory = (e) => {
    e.preventDefault()
    if (!selectedSubCategory) return
    editForm.put(`${baseRoute}/${selectedSubCategory.id}`, { preserveScroll: true, onSuccess: () => closeEditModal() })
  }

  const handleDeleteSubCategory = (subCategoryId) => {
    setSubCategoryToRemove(subCategories.find(sc => sc.id === subCategoryId))
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmDeleteSubCategory = () => {
    if (subCategoryToRemove) {
      router.delete(`${baseRoute}/${subCategoryToRemove.id}`, { preserveScroll: true, onSuccess: () => closeRemoveModal() })
    }
  }

  // ── Filtering / pagination ──────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return subCategories.filter(sc => {
      const matchSearch = !q || (sc.sub_category_name || '').toLowerCase().includes(q) || String(sc.id).includes(q)
      const matchStatus = statusFilter === 'All' || (sc.sub_category_status || 'active') === statusFilter.toLowerCase()
      return matchSearch && matchStatus
    })
  }, [subCategories, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const displayed  = filtered.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => setCurrentPage(1), [searchQuery, statusFilter, itemsPerPage])

  const filterClass = 'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-4 py-2 bg-white'

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Sub-Categories">

      {/* Back button — Product Catalog */}
      {hasProductCatalog && (
        <Link
          href={productsRoute}
          className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#102059]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Product Catalog
        </Link>
      )}

      {/* Flash success */}
      {flash?.success && showSuccessAlert && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-[#00C950]/30 bg-[#00C950]/10 px-4 py-3">
          <p className="text-sm font-medium text-[#00C950]">{flash.success}</p>
          <button type="button" onClick={() => setShowSuccessAlert(false)} className="ml-4 text-[#00C950] hover:opacity-70">×</button>
        </div>
      )}
      {flash?.error && showErrorAlert && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-[#E20E28]/30 bg-[#FEE2E2] px-4 py-3">
          <p className="text-sm font-medium text-[#E20E28]">{flash.error}</p>
          <button type="button" onClick={() => setShowErrorAlert(false)} className="ml-4 text-[#E20E28] hover:opacity-70">×</button>
        </div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-[#102059]">Sub-Categories</h1>
        <p className="text-sm text-[#6B7280]">Manage product sub-categories used across the platform catalog.</p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => { setShowAddModal(true); setShowAddModalAnimation(false) }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#102059] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#244693]"
          >
            <Plus className="h-4 w-4" /> Add Sub-Category
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={filterClass}>
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className={filterClass}>
            <option value={5}>Show 5</option>
            <option value={10}>Show 10</option>
            <option value={25}>Show 25</option>
            <option value={50}>Show 50</option>
          </select>
        </div>
      </div>

      {/* Sub-category list */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white">
        <div className="divide-y divide-[#E5E7EB]">
          {displayed.length > 0 ? displayed.map(subCategory => (
            <div key={subCategory.id} className="px-6 py-4 transition-colors hover:bg-[#F8F9FB]">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F0F2F5]">
                  <Tag className="h-5 w-5 text-[#9CA3AF]" />
                </div>

                {/* Info */}
                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[1fr_100px_160px_80px]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#102059]">{subCategory.sub_category_name}</p>
                    <p className="truncate text-xs text-[#6B7280]">{subCategory.sub_category_description || '—'}</p>
                  </div>
                  <div className="flex items-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">ID</p>
                      <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">#{subCategory.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Added</p>
                      <p className="mt-0.5 text-xs text-[#102059]">{new Date(subCategory.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      (subCategory.sub_category_status || 'active') === 'active' ? 'bg-[#00C950]/10 text-[#00C950]' : 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}>
                      {(subCategory.sub_category_status || 'active') === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditSubCategory(subCategory)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] transition-colors hover:border-[#102059] hover:text-[#102059]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubCategory(subCategory.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] transition-colors hover:border-[#E20E28] hover:text-[#E20E28]"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-16 text-center">
              <Tag className="mx-auto mb-3 h-10 w-10 text-[#E5E7EB]" />
              <p className="text-sm text-[#9CA3AF]">No sub-categories found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#6B7280]">
            Showing <span className="font-semibold text-[#102059]">
              {filtered.length === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + itemsPerPage, filtered.length)}`}
            </span> of <span className="font-semibold text-[#102059]">{filtered.length}</span> sub-categories
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50">
                Previous
              </button>
              <span className="text-xs text-[#6B7280]">Page {currentPage} of {totalPages}</span>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50">
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Modal ── */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Sub-Category</h4>
                  <button type="button" className="close" onClick={closeAddModal}><span>&times;</span></button>
                </div>
                <form onSubmit={handleAddSubCategory}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Sub-Category Name <span className="text-danger">*</span></label>
                      <input type="text" className={`form-control ${addForm.errors.sub_category_name ? 'is-invalid' : ''}`}
                        value={addForm.data.sub_category_name} onChange={e => addForm.setData('sub_category_name', e.target.value)} required />
                      {addForm.errors.sub_category_name && <div className="invalid-feedback">{addForm.errors.sub_category_name}</div>}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea className={`form-control ${addForm.errors.sub_category_description ? 'is-invalid' : ''}`}
                        value={addForm.data.sub_category_description} onChange={e => addForm.setData('sub_category_description', e.target.value)} rows="3" />
                      {addForm.errors.sub_category_description && <div className="invalid-feedback">{addForm.errors.sub_category_description}</div>}
                    </div>
                    <div className="form-group">
                      <label>Status <span className="text-danger">*</span></label>
                      <select className={`form-control ${addForm.errors.sub_category_status ? 'is-invalid' : ''}`}
                        value={addForm.data.sub_category_status} onChange={e => addForm.setData('sub_category_status', e.target.value)} required>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {addForm.errors.sub_category_status && <div className="invalid-feedback">{addForm.errors.sub_category_status}</div>}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAddModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                      {addForm.processing ? 'Creating...' : 'Create Sub-Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && selectedSubCategory && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Sub-Category</h4>
                  <button type="button" className="close" onClick={closeEditModal}><span>&times;</span></button>
                </div>
                <form onSubmit={handleUpdateSubCategory}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Sub-Category Name <span className="text-danger">*</span></label>
                      <input type="text" className={`form-control ${editForm.errors.sub_category_name ? 'is-invalid' : ''}`}
                        value={editForm.data.sub_category_name} onChange={e => editForm.setData('sub_category_name', e.target.value)} required />
                      {editForm.errors.sub_category_name && <div className="invalid-feedback">{editForm.errors.sub_category_name}</div>}
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea className={`form-control ${editForm.errors.sub_category_description ? 'is-invalid' : ''}`}
                        value={editForm.data.sub_category_description} onChange={e => editForm.setData('sub_category_description', e.target.value)} rows="3" />
                      {editForm.errors.sub_category_description && <div className="invalid-feedback">{editForm.errors.sub_category_description}</div>}
                    </div>
                    <div className="form-group">
                      <label>Status <span className="text-danger">*</span></label>
                      <select className={`form-control ${editForm.errors.sub_category_status ? 'is-invalid' : ''}`}
                        value={editForm.data.sub_category_status} onChange={e => editForm.setData('sub_category_status', e.target.value)} required>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {editForm.errors.sub_category_status && <div className="invalid-feedback">{editForm.errors.sub_category_status}</div>}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={editForm.processing}>
                      {editForm.processing ? 'Updating...' : 'Update Sub-Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showRemoveModal && subCategoryToRemove && (
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
                  <p>Are you sure you want to delete <strong>{subCategoryToRemove.sub_category_name}</strong>?</p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteSubCategory}>Delete Sub-Category</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </SuperAdminOrAdminLayout>
  )
}
