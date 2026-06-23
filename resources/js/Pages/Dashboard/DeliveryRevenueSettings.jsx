import { useState, useEffect, useMemo } from 'react'
import { useForm, router } from '@inertiajs/react'
import { Search, Pencil, Trash2, Zap, Plus } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

const EMPTY_FORM = {
  reduced_base_fee: '',
  standard_base_fee: '',
  reduced_base_weight_threshold_kg: '',
  included_km: '',
  km_rate: '',
  weight_free_tier_kg: '',
  weight_block_kg: '',
  heavy_tier1_max_units: '',
  heavy_tier1_fee: '',
  heavy_tier2_max_units: '',
  heavy_tier2_fee: '',
  heavy_tier3_fee: '',
  single_item_heavy_exempt_tolerance_kg: '',
  max_stores_per_order: '',
  inter_store_radius_km: '',
  multi_store_promo_months: '',
  multi_store_fee_per_extra_store: '',
  multi_store_third_store_fee: '',
  mov_first_store: '',
  mov_first_store_penalty_fee: '',
  mov_consecutive_store: '',
  mov_penalty_base_fee: '',
  mov_consecutive_store_met_fee: '',
  pickup_delivery_method_id: '',
  note: '',
}

function settingToForm(s) {
  const pick = (v) => (v === null || v === undefined ? '' : String(v))
  return {
    reduced_base_fee: pick(s.reduced_base_fee),
    standard_base_fee: pick(s.standard_base_fee),
    reduced_base_weight_threshold_kg: pick(s.reduced_base_weight_threshold_kg),
    included_km: pick(s.included_km),
    km_rate: pick(s.km_rate),
    weight_free_tier_kg: pick(s.weight_free_tier_kg),
    weight_block_kg: pick(s.weight_block_kg),
    heavy_tier1_max_units: pick(s.heavy_tier1_max_units),
    heavy_tier1_fee: pick(s.heavy_tier1_fee),
    heavy_tier2_max_units: pick(s.heavy_tier2_max_units),
    heavy_tier2_fee: pick(s.heavy_tier2_fee),
    heavy_tier3_fee: pick(s.heavy_tier3_fee),
    single_item_heavy_exempt_tolerance_kg: pick(s.single_item_heavy_exempt_tolerance_kg),
    max_stores_per_order: pick(s.max_stores_per_order),
    inter_store_radius_km: pick(s.inter_store_radius_km),
    multi_store_promo_months: pick(s.multi_store_promo_months),
    multi_store_fee_per_extra_store: pick(s.multi_store_fee_per_extra_store),
    multi_store_third_store_fee: pick(s.multi_store_third_store_fee),
    mov_first_store: pick(s.mov_first_store),
    mov_first_store_penalty_fee: pick(s.mov_first_store_penalty_fee),
    mov_consecutive_store: pick(s.mov_consecutive_store),
    mov_penalty_base_fee: pick(s.mov_penalty_base_fee),
    mov_consecutive_store_met_fee: pick(s.mov_consecutive_store_met_fee),
    pickup_delivery_method_id: pick(s.pickup_delivery_method_id),
    note: pick(s.note),
  }
}

function StatusBadge({ status }) {
  const map = {
    active:   { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]', label: 'Active' },
    draft:    { bg: 'bg-[#DBEAFE]', text: 'text-[#1e40af]', label: 'Draft' },
    archived: { bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]', label: 'Archived' },
  }
  const { bg, text, label } = map[status] ?? map.archived
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bg} ${text}`}>
      {label}
    </span>
  )
}

function FormSection({ title, children }) {
  return (
    <div className="mb-5">
      <h6 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#9CA3AF] border-b border-[#E5E7EB] pb-1">
        {title}
      </h6>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {children}
      </div>
    </div>
  )
}

function Field({ label, name, form, type = 'number', step = '0.01', min = '0', hint }) {
  return (
    <div className="form-group mb-0">
      <label className="mb-1 block text-sm font-medium text-[#374151]">
        {label} <span className="text-danger">*</span>
      </label>
      <input
        type={type}
        step={step}
        min={min}
        className={`form-control${form.errors[name] ? ' is-invalid' : ''}`}
        value={form.data[name]}
        onChange={(e) => form.setData(name, e.target.value)}
      />
      {hint && <small className="form-text text-muted">{hint}</small>}
      {form.errors[name] && <div className="invalid-feedback">{form.errors[name]}</div>}
    </div>
  )
}

export default function DeliveryRevenueSettings({ auth, settings = [], flash }) {
  const [showFormModal, setShowFormModal] = useState(false)
  const [showFormModalAnim, setShowFormModalAnim] = useState(false)
  const [editingSetting, setEditingSetting] = useState(null)

  const [showActivateModal, setShowActivateModal] = useState(false)
  const [showActivateModalAnim, setShowActivateModalAnim] = useState(false)
  const [activatingId, setActivatingId] = useState(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteModalAnim, setShowDeleteModalAnim] = useState(false)
  const [deletingSetting, setDeletingSetting] = useState(null)

  const [showSuccessAlert, setShowSuccessAlert] = useState(true)
  const [showErrorAlert, setShowErrorAlert] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('status')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const form = useForm({ ...EMPTY_FORM })

  useEffect(() => {
    if (showFormModal) setTimeout(() => setShowFormModalAnim(true), 10)
    else setShowFormModalAnim(false)
  }, [showFormModal])

  useEffect(() => {
    if (showActivateModal) setTimeout(() => setShowActivateModalAnim(true), 10)
    else setShowActivateModalAnim(false)
  }, [showActivateModal])

  useEffect(() => {
    if (showDeleteModal) setTimeout(() => setShowDeleteModalAnim(true), 10)
    else setShowDeleteModalAnim(false)
  }, [showDeleteModal])

  useEffect(() => {
    if (flash?.success || flash?.error) {
      closeFormModal()
      closeActivateModal()
      closeDeleteModal()
      setShowSuccessAlert(true)
      setShowErrorAlert(true)
    }
  }, [flash])

  const getBaseRoute = () => {
    if (auth.user.user_type === 'super_admin') return '/dashboard/super-admin/delivery-revenue-settings'
    return '/dashboard/admin/delivery-revenue-settings'
  }
  const baseRoute = getBaseRoute()

  const closeFormModal = () => {
    setShowFormModalAnim(false)
    setTimeout(() => {
      setShowFormModal(false)
      setEditingSetting(null)
      form.reset()
      form.clearErrors()
    }, 300)
  }

  const closeActivateModal = () => {
    setShowActivateModalAnim(false)
    setTimeout(() => { setShowActivateModal(false); setActivatingId(null) }, 300)
  }

  const closeDeleteModal = () => {
    setShowDeleteModalAnim(false)
    setTimeout(() => { setShowDeleteModal(false); setDeletingSetting(null) }, 300)
  }

  const openCreate = () => {
    setEditingSetting(null)
    form.setData({ ...EMPTY_FORM })
    form.clearErrors()
    setShowFormModal(true)
    setShowFormModalAnim(false)
  }

  const openEdit = (s) => {
    setEditingSetting(s)
    form.setData(settingToForm(s))
    form.clearErrors()
    setShowFormModal(true)
    setShowFormModalAnim(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingSetting) {
      form.put(`${baseRoute}/${editingSetting.id}`, { preserveScroll: true })
    } else {
      form.post(baseRoute, { preserveScroll: true })
    }
  }

  const handleActivate = () => {
    if (!activatingId) return
    router.post(`${baseRoute}/${activatingId}/activate`, {}, {
      preserveScroll: true,
      onFinish: closeActivateModal,
    })
  }

  const handleDelete = () => {
    if (!deletingSetting) return
    router.delete(`${baseRoute}/${deletingSetting.id}`, {
      preserveScroll: true,
      onFinish: closeDeleteModal,
    })
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = settings.filter((s) => {
      if (statusFilter !== 'All' && s.status !== statusFilter.toLowerCase()) return false
      if (!q) return true
      return (
        String(s.id).includes(q) ||
        (s.note || '').toLowerCase().includes(q)
      )
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'status') {
        const order = { active: 0, draft: 1, archived: 2 }
        return (order[a.status] ?? 3) - (order[b.status] ?? 3)
      }
      return new Date(b.updated_at) - new Date(a.updated_at)
    })
    return list
  }, [settings, searchQuery, statusFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const displayed = filtered.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => setCurrentPage(1), [searchQuery, statusFilter, sortBy, itemsPerPage])
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages))
  }, [currentPage, totalPages])

  const filterSelectClass =
    'text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]'

  const activatingSetting = settings.find((s) => s.id === activatingId)

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Delivery Revenue Settings">
      {flash?.success && showSuccessAlert && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button type="button" className="close" onClick={() => setShowSuccessAlert(false)}>
            <span>&times;</span>
          </button>
        </div>
      )}
      {flash?.error && showErrorAlert && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {flash.error}
          <button type="button" className="close" onClick={() => setShowErrorAlert(false)}>
            <span>&times;</span>
          </button>
        </div>
      )}

      <div>
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Delivery Revenue Settings</h1>
            <p className="text-sm text-[#6B7280]">
              Manage delivery fee configurations. One configuration is active at a time; others are drafts or archived.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#102059]"
          >
            <Plus className="h-4 w-4" />
            New Draft
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-transparent">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search by ID or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
              <option value="status">Sort by Status</option>
              <option value="date">Sort by Last Updated</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]"
            >
              <option value={5}>Show 5</option>
              <option value={10}>Show 10</option>
              <option value={25}>Show 25</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <div className="divide-y divide-[#E5E7EB]">
            {displayed.length > 0 ? (
              displayed.map((s) => {
                const updatedAt = s.updated_at
                  ? new Date(s.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'N/A'
                const createdAt = s.created_at
                  ? new Date(s.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'N/A'
                return (
                  <div key={s.id} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                        <span className="text-xs font-bold text-white">#{s.id}</span>
                      </div>

                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[1fr_120px_160px_160px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#102059]">
                            Configuration #{s.id}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-[#6B7280]">
                            {s.note || <span className="italic text-[#9CA3AF]">No note</span>}
                          </div>
                        </div>

                        <div>
                          <StatusBadge status={s.status} />
                        </div>

                        <div className="hidden lg:block">
                          <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Created</div>
                          <div className="mt-0.5 text-xs text-[#6B7280]">{createdAt}</div>
                        </div>

                        <div className="hidden lg:block">
                          <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Last Updated</div>
                          <div className="mt-0.5 text-xs text-[#6B7280]">{updatedAt}</div>
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="Edit configuration"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          {s.status !== 'active' && (
                            <button
                              type="button"
                              onClick={() => { setActivatingId(s.id); setShowActivateModal(true); setShowActivateModalAnim(false) }}
                              className="rounded-lg p-1.5 text-[#00C950] transition-colors hover:bg-[#DCFCE7]"
                              title="Activate this configuration"
                            >
                              <Zap className="h-5 w-5" />
                            </button>
                          )}
                          {s.status !== 'active' && (
                            <button
                              type="button"
                              onClick={() => { setDeletingSetting(s); setShowDeleteModal(true); setShowDeleteModalAnim(false) }}
                              className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                              title="Delete configuration"
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
                <p className="text-sm text-[#9CA3AF]">No configurations found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B7280]">
              Showing{' '}
              <span className="font-semibold text-[#102059]">
                {filtered.length === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + itemsPerPage, filtered.length)}`}
              </span>{' '}
              of <span className="font-semibold text-[#102059]">{filtered.length}</span> configurations
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

      {/* Create / Edit Modal */}
      {showFormModal && (
        <>
          <div className={`modal-backdrop fade ${showFormModalAnim ? 'show' : ''}`} onClick={closeFormModal} />
          <div
            className={`modal fade ${showFormModalAnim ? 'show' : ''} d-block`}
            tabIndex="-1"
            style={{ zIndex: 1050 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">
                    {editingSetting ? `Edit Configuration #${editingSetting.id}` : 'New Draft Configuration'}
                  </h4>
                  <button type="button" className="close" onClick={closeFormModal}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">

                    <FormSection title="Base Delivery Fee">
                      <Field label="Reduced Base Fee (₱)" name="reduced_base_fee" form={form}
                        hint="Fee for orders below the reduced weight threshold" />
                      <Field label="Standard Base Fee (₱)" name="standard_base_fee" form={form}
                        hint="Fee for orders above the reduced weight threshold" />
                      <Field label="Reduced Base Weight Threshold (kg)" name="reduced_base_weight_threshold_kg" form={form} step="0.001"
                        hint="Max weight to qualify for reduced base fee" />
                    </FormSection>

                    <FormSection title="Distance Pricing">
                      <Field label="Included KM" name="included_km" form={form} step="0.001"
                        hint="KM included in the base fee before km_rate applies" />
                      <Field label="KM Rate (₱ / km)" name="km_rate" form={form}
                        hint="Fee per km beyond the included distance" />
                    </FormSection>

                    <FormSection title="Weight Surcharges">
                      <Field label="Free Tier Weight (kg)" name="weight_free_tier_kg" form={form} step="0.001"
                        hint="Total weight exempt from heavy surcharge" />
                      <Field label="Weight Block Size (kg)" name="weight_block_kg" form={form} step="0.001"
                        hint="Block size used to count surcharge units" />
                      <Field label="Single-Item Heavy Exempt Tolerance (kg)" name="single_item_heavy_exempt_tolerance_kg" form={form} step="0.001"
                        hint="Single-item weight tolerance before heavy surcharge applies" />
                      <Field label="Tier 1 Max Units" name="heavy_tier1_max_units" form={form} type="number" step="1"
                        hint="Max surcharge blocks for Tier 1 rate" />
                      <Field label="Tier 1 Fee (₱ / block)" name="heavy_tier1_fee" form={form}
                        hint="Surcharge per block in Tier 1" />
                      <Field label="Tier 2 Max Units" name="heavy_tier2_max_units" form={form} type="number" step="1"
                        hint="Max surcharge blocks for Tier 2 rate" />
                      <Field label="Tier 2 Fee (₱ / block)" name="heavy_tier2_fee" form={form}
                        hint="Surcharge per block in Tier 2" />
                      <Field label="Tier 3 Fee (₱ / block)" name="heavy_tier3_fee" form={form}
                        hint="Surcharge per block beyond Tier 2" />
                    </FormSection>

                    <FormSection title="Multi-Store Settings">
                      <Field label="Max Stores per Order" name="max_stores_per_order" form={form} type="number" step="1" min="1"
                        hint="Maximum number of stores allowed in a single order" />
                      <Field label="Inter-Store Radius (km)" name="inter_store_radius_km" form={form} step="0.001"
                        hint="Radius within which stores are considered nearby" />
                      <Field label="Promo Duration (months)" name="multi_store_promo_months" form={form} type="number" step="1" min="0"
                        hint="Promo period for multi-store fee waiver" />
                      <Field label="Fee per Extra Store (₱)" name="multi_store_fee_per_extra_store" form={form}
                        hint="Additional fee for each extra store beyond the first" />
                      <Field label="Third Store Fee (₱)" name="multi_store_third_store_fee" form={form}
                        hint="Fee applied for the third store in an order" />
                    </FormSection>

                    <FormSection title="Minimum Order Value (MOV) Penalties">
                      <Field label="MOV — First Store (₱)" name="mov_first_store" form={form}
                        hint="Minimum order value required for the first store" />
                      <Field label="First Store Penalty Fee (₱)" name="mov_first_store_penalty_fee" form={form}
                        hint="Penalty when first store MOV is not met" />
                      <Field label="MOV — Consecutive Store (₱)" name="mov_consecutive_store" form={form}
                        hint="Minimum order value for each consecutive store" />
                      <Field label="MOV Penalty Base Fee (₱)" name="mov_penalty_base_fee" form={form}
                        hint="Base penalty when consecutive store MOV is not met" />
                      <Field label="Consecutive Store Met Fee (₱)" name="mov_consecutive_store_met_fee" form={form}
                        hint="Fee applied when consecutive store MOV is met" />
                    </FormSection>

                    <FormSection title="Other">
                      <Field label="Pickup Delivery Method ID" name="pickup_delivery_method_id" form={form} type="number" step="1" min="1"
                        hint="ID of the delivery method used for pickup orders" />
                    </FormSection>

                    <div className="form-group">
                      <label className="mb-1 block text-sm font-medium text-[#374151]">Note</label>
                      <textarea
                        className={`form-control${form.errors.note ? ' is-invalid' : ''}`}
                        rows={3}
                        maxLength={500}
                        placeholder="Optional description for this configuration..."
                        value={form.data.note}
                        onChange={(e) => form.setData('note', e.target.value)}
                      />
                      {form.errors.note && <div className="invalid-feedback">{form.errors.note}</div>}
                    </div>

                    {editingSetting && (
                      <div className="mt-2 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] px-4 py-3 text-xs text-[#92400E]">
                        Editing does not change the status. Use the <strong>Activate</strong> (⚡) action on the list to make this configuration live.
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeFormModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={form.processing}>
                      {form.processing
                        ? (editingSetting ? 'Saving...' : 'Creating...')
                        : (editingSetting ? 'Save Changes' : 'Create Draft')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Activate Confirmation Modal */}
      {showActivateModal && activatingSetting && (
        <>
          <div className={`modal-backdrop fade ${showActivateModalAnim ? 'show' : ''}`} onClick={closeActivateModal} />
          <div className={`modal fade ${showActivateModalAnim ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Activate Configuration #{activatingSetting.id}</h4>
                  <button type="button" className="close" onClick={closeActivateModal}><span>&times;</span></button>
                </div>
                <div className="modal-body">
                  <p>
                    This will set <strong>Configuration #{activatingSetting.id}</strong> as the active delivery fee configuration.
                  </p>
                  <p className="text-muted mb-0">
                    Any currently active configuration will be automatically archived. The delivery fee cache will be cleared immediately.
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeActivateModal}>Cancel</button>
                  <button type="button" className="btn btn-success" onClick={handleActivate}>
                    Activate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingSetting && (
        <>
          <div className={`modal-backdrop fade ${showDeleteModalAnim ? 'show' : ''}`} onClick={closeDeleteModal} />
          <div className={`modal fade ${showDeleteModalAnim ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Delete Configuration #{deletingSetting.id}</h4>
                  <button type="button" className="close" onClick={closeDeleteModal}><span>&times;</span></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete <strong>Configuration #{deletingSetting.id}</strong>?</p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeDeleteModal}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={handleDelete}>
                    Delete
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
