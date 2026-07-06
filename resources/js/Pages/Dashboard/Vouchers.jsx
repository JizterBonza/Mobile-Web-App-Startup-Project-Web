import { useState, useEffect, useMemo } from 'react'
import { useForm, router } from '@inertiajs/react'
import { Search, Pencil, Trash2 } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  type: 'percentage_off',
  discount_value: '',
  minimum_order_amount: '',
  maximum_discount: '',
  start_date: '',
  end_date: '',
  usage_limit: '',
  per_customer_limit: '',
  status: 'active',
}

function formatDateForInput(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateRange(start, end) {
  if (!start || !end) return 'N/A'
  const opts = { year: 'numeric', month: 'short', day: 'numeric' }
  return `${new Date(start).toLocaleDateString('en-US', opts)} – ${new Date(end).toLocaleDateString('en-US', opts)}`
}

function getDiscountLabel(voucher) {
  switch (voucher.type) {
    case 'percentage_off':
      return `${parseFloat(voucher.discount_value || 0)}% off`
    case 'fixed_amount_off':
      return `₱${parseFloat(voucher.discount_value || 0).toFixed(2)} off`
    case 'free_shipping':
      return 'Free shipping'
    default:
      return voucher.type_label || voucher.type
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'active':
      return 'bg-[#DCFCE7] text-[#166534]'
    case 'scheduled':
      return 'bg-[#DBEAFE] text-[#1E40AF]'
    case 'expired':
      return 'bg-[#F3F4F6] text-[#6B7280]'
    default:
      return 'bg-[#FEE2E2] text-[#991B1B]'
  }
}

function VoucherFormFields({ form, voucherTypes }) {
  const showDiscountValue = form.data.type !== 'free_shipping'
  const showMaxDiscount = form.data.type === 'percentage_off'

  return (
    <>
      <div className="form-group">
        <label>Voucher Code <span className="text-danger">*</span></label>
        <input
          type="text"
          className={`form-control ${form.errors.code ? 'is-invalid' : ''}`}
          value={form.data.code}
          onChange={(e) => form.setData('code', e.target.value.toUpperCase())}
          required
          maxLength={50}
          placeholder="e.g. SAVE10"
        />
        {form.errors.code && <div className="invalid-feedback">{form.errors.code}</div>}
      </div>

      <div className="form-group">
        <label>Name <span className="text-danger">*</span></label>
        <input
          type="text"
          className={`form-control ${form.errors.name ? 'is-invalid' : ''}`}
          value={form.data.name}
          onChange={(e) => form.setData('name', e.target.value)}
          required
          maxLength={150}
        />
        {form.errors.name && <div className="invalid-feedback">{form.errors.name}</div>}
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          className={`form-control ${form.errors.description ? 'is-invalid' : ''}`}
          value={form.data.description}
          onChange={(e) => form.setData('description', e.target.value)}
          rows={2}
          maxLength={1000}
        />
        {form.errors.description && <div className="invalid-feedback">{form.errors.description}</div>}
      </div>

      <div className="form-group">
        <label>Type <span className="text-danger">*</span></label>
        <select
          className={`form-control ${form.errors.type ? 'is-invalid' : ''}`}
          value={form.data.type}
          onChange={(e) => form.setData('type', e.target.value)}
          required
        >
          {Object.entries(voucherTypes).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {form.errors.type && <div className="invalid-feedback">{form.errors.type}</div>}
      </div>

      {showDiscountValue && (
        <div className="form-group">
          <label>
            {form.data.type === 'percentage_off' ? 'Discount Percentage (%)' : 'Discount Amount (₱)'}{' '}
            <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={form.data.type === 'percentage_off' ? '100' : undefined}
            className={`form-control ${form.errors.discount_value ? 'is-invalid' : ''}`}
            value={form.data.discount_value}
            onChange={(e) => form.setData('discount_value', e.target.value)}
            required
          />
          {form.errors.discount_value && <div className="invalid-feedback">{form.errors.discount_value}</div>}
        </div>
      )}

      <div className="form-group">
        <label>Minimum Order Amount (₱)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className={`form-control ${form.errors.minimum_order_amount ? 'is-invalid' : ''}`}
          value={form.data.minimum_order_amount}
          onChange={(e) => form.setData('minimum_order_amount', e.target.value)}
        />
        {form.errors.minimum_order_amount && <div className="invalid-feedback">{form.errors.minimum_order_amount}</div>}
      </div>

      {showMaxDiscount && (
        <div className="form-group">
          <label>Maximum Discount Cap (₱)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`form-control ${form.errors.maximum_discount ? 'is-invalid' : ''}`}
            value={form.data.maximum_discount}
            onChange={(e) => form.setData('maximum_discount', e.target.value)}
          />
          {form.errors.maximum_discount && <div className="invalid-feedback">{form.errors.maximum_discount}</div>}
        </div>
      )}

      <div className="row">
        <div className="col-md-6">
          <div className="form-group">
            <label>Start Date <span className="text-danger">*</span></label>
            <input
              type="datetime-local"
              className={`form-control ${form.errors.start_date ? 'is-invalid' : ''}`}
              value={form.data.start_date}
              onChange={(e) => form.setData('start_date', e.target.value)}
              required
            />
            {form.errors.start_date && <div className="invalid-feedback">{form.errors.start_date}</div>}
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group">
            <label>End Date <span className="text-danger">*</span></label>
            <input
              type="datetime-local"
              className={`form-control ${form.errors.end_date ? 'is-invalid' : ''}`}
              value={form.data.end_date}
              onChange={(e) => form.setData('end_date', e.target.value)}
              required
            />
            {form.errors.end_date && <div className="invalid-feedback">{form.errors.end_date}</div>}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="form-group">
            <label>Total Usage Limit</label>
            <input
              type="number"
              min="1"
              className={`form-control ${form.errors.usage_limit ? 'is-invalid' : ''}`}
              value={form.data.usage_limit}
              onChange={(e) => form.setData('usage_limit', e.target.value)}
              placeholder="Leave empty for unlimited"
            />
            {form.errors.usage_limit && <div className="invalid-feedback">{form.errors.usage_limit}</div>}
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group">
            <label>Per Customer Limit</label>
            <input
              type="number"
              min="1"
              className={`form-control ${form.errors.per_customer_limit ? 'is-invalid' : ''}`}
              value={form.data.per_customer_limit}
              onChange={(e) => form.setData('per_customer_limit', e.target.value)}
              placeholder="Leave empty for unlimited"
            />
            {form.errors.per_customer_limit && <div className="invalid-feedback">{form.errors.per_customer_limit}</div>}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Status</label>
        <select
          className={`form-control ${form.errors.status ? 'is-invalid' : ''}`}
          value={form.data.status}
          onChange={(e) => form.setData('status', e.target.value)}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="scheduled">Scheduled</option>
        </select>
        {form.errors.status && <div className="invalid-feedback">{form.errors.status}</div>}
      </div>
    </>
  )
}

export default function Vouchers({ auth, vouchers = [], voucherTypes = {}, flash }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [voucherToRemove, setVoucherToRemove] = useState(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [statusFilter, setStatusFilter] = useState('All')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const addForm = useForm({ ...EMPTY_FORM })
  const editForm = useForm({ ...EMPTY_FORM })

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
      addForm.setData({ ...EMPTY_FORM })
    }, 300)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedVoucher(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setVoucherToRemove(null)
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
    if (auth.user.user_type === 'super_admin') return '/dashboard/super-admin/vouchers'
    if (auth.user.user_type === 'admin') return '/dashboard/admin/vouchers'
    return '/dashboard/vouchers'
  }

  const baseRoute = getBaseRoute()

  const handleAddVoucher = (e) => {
    e.preventDefault()
    addForm.post(baseRoute, { preserveScroll: true, onSuccess: () => addForm.reset() })
  }

  const handleEditVoucher = (voucher) => {
    setSelectedVoucher(voucher)
    editForm.setData({
      code: voucher.code || '',
      name: voucher.name || '',
      description: voucher.description || '',
      type: voucher.type || 'percentage_off',
      discount_value: voucher.discount_value ?? '',
      minimum_order_amount: voucher.minimum_order_amount ?? '',
      maximum_discount: voucher.maximum_discount ?? '',
      start_date: formatDateForInput(voucher.start_date),
      end_date: formatDateForInput(voucher.end_date),
      usage_limit: voucher.usage_limit ?? '',
      per_customer_limit: voucher.per_customer_limit ?? '',
      status: voucher.status === 'expired' ? 'inactive' : (voucher.status || 'active'),
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateVoucher = (e) => {
    e.preventDefault()
    if (!selectedVoucher) return
    editForm.put(`${baseRoute}/${selectedVoucher.id}`, {
      preserveScroll: true,
      onSuccess: () => closeEditModal(),
    })
  }

  const handleDeleteVoucher = (voucher) => {
    setVoucherToRemove(voucher)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmDeleteVoucher = () => {
    if (voucherToRemove) {
      router.delete(`${baseRoute}/${voucherToRemove.id}`, {
        preserveScroll: true,
        onSuccess: () => closeRemoveModal(),
      })
    }
  }

  const sortedVouchers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = vouchers.filter((v) => {
      if (statusFilter !== 'All' && v.status !== statusFilter.toLowerCase()) return false
      if (!q) return true
      return (
        (v.code || '').toLowerCase().includes(q)
        || (v.name || '').toLowerCase().includes(q)
      )
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '')
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })
    return list
  }, [vouchers, searchQuery, sortBy, statusFilter])

  const totalPages = Math.max(1, Math.ceil(sortedVouchers.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayedVouchers = sortedVouchers.slice(startIndex, endIndex)

  useEffect(() => { setCurrentPage(1) }, [searchQuery, sortBy, statusFilter, itemsPerPage])
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages))
  }, [currentPage, totalPages])

  const filterSelectClass =
    'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]'

  const activeCount = vouchers.filter((v) => v.status === 'active').length
  const scheduledCount = vouchers.filter((v) => v.status === 'scheduled').length
  const expiredCount = vouchers.filter((v) => v.status === 'expired').length

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Vouchers">
      {flash?.success && showSuccessAlert && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button type="button" className="close" aria-label="Close" onClick={() => setShowSuccessAlert(false)}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {flash?.error && showErrorAlert && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {flash.error}
          <button type="button" className="close" aria-label="Close" onClick={() => setShowErrorAlert(false)}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Vouchers</h1>
            <p className="text-sm text-[#6B7280]">
              Create and manage platform-wide discount vouchers for customers
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddModal(true); setShowAddModalAnimation(false) }}
            className="shrink-0 rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#102059]"
          >
            + Create Voucher
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[#E5E7EB] bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Active</p>
            <p className="mt-1 text-2xl font-bold text-[#102059]">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-[#E5E7EB] bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Scheduled</p>
            <p className="mt-1 text-2xl font-bold text-[#102059]">{scheduledCount}</p>
          </div>
          <div className="rounded-lg border border-[#E5E7EB] bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Expired</p>
            <p className="mt-1 text-2xl font-bold text-[#102059]">{expiredCount}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-transparent">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#ffffff] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
                <option value="date">Sort by Date</option>
                <option value="code">Sort by Code</option>
                <option value="name">Sort by Name</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Inactive">Inactive</option>
                <option value="Expired">Expired</option>
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
            {displayedVouchers.length > 0 ? (
              displayedVouchers.map((voucher) => (
                <div key={voucher.id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                      <span className="text-xs font-bold text-white">{(voucher.code || '?').slice(0, 3)}</span>
                    </div>

                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-3 lg:grid-cols-[1fr_180px_160px_120px_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="rounded bg-[#F3F4F6] px-2 py-0.5 text-sm font-bold text-[#102059]">
                            {voucher.code}
                          </code>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${getStatusBadgeClass(voucher.status)}`}>
                            {voucher.status}
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-[#102059]">{voucher.name}</div>
                        <div className="mt-0.5 text-xs text-[#6B7280]">{getDiscountLabel(voucher)}</div>
                      </div>

                      <div className="hidden lg:block">
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Valid Period</div>
                        <div className="mt-0.5 text-xs text-[#6B7280]">
                          {formatDateRange(voucher.start_date, voucher.end_date)}
                        </div>
                      </div>

                      <div className="hidden lg:block">
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Usage</div>
                        <div className="mt-0.5 text-xs text-[#6B7280]">
                          {voucher.usage_count}/{voucher.usage_limit ?? '∞'}
                        </div>
                      </div>

                      <div className="hidden lg:block">
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Type</div>
                        <div className="mt-0.5 text-xs text-[#6B7280]">{voucher.type_label || voucher.type}</div>
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditVoucher(voucher)}
                          className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                          title="Edit voucher"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVoucher(voucher)}
                          className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                          title="Delete voucher"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-[#9CA3AF]">No vouchers found matching your search criteria</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B7280]">
              Showing{' '}
              <span className="font-semibold text-[#102059]">
                {sortedVouchers.length === 0 ? '0' : `${startIndex + 1}-${Math.min(endIndex, sortedVouchers.length)}`}
              </span>{' '}
              of <span className="font-semibold text-[#102059]">{sortedVouchers.length}</span> vouchers
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
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal} />
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Create Voucher</h4>
                  <button type="button" className="close" onClick={closeAddModal}><span>&times;</span></button>
                </div>
                <form onSubmit={handleAddVoucher}>
                  <div className="modal-body">
                    <VoucherFormFields form={addForm} voucherTypes={voucherTypes} />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeAddModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={addForm.processing}>
                      {addForm.processing ? 'Creating...' : 'Create Voucher'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {showEditModal && selectedVoucher && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal} />
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Voucher</h4>
                  <button type="button" className="close" onClick={closeEditModal}><span>&times;</span></button>
                </div>
                <form onSubmit={handleUpdateVoucher}>
                  <div className="modal-body">
                    <VoucherFormFields form={editForm} voucherTypes={voucherTypes} />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={editForm.processing}>
                      {editForm.processing ? 'Updating...' : 'Update Voucher'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {showRemoveModal && voucherToRemove && (
        <>
          <div className={`modal-backdrop fade ${showRemoveModalAnimation ? 'show' : ''}`} onClick={closeRemoveModal} />
          <div className={`modal fade ${showRemoveModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Confirm Delete</h4>
                  <button type="button" className="close" onClick={closeRemoveModal}><span>&times;</span></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete voucher <strong>{voucherToRemove.code}</strong>?</p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeRemoveModal}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteVoucher}>
                    Delete Voucher
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
