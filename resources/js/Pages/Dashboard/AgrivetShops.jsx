import { useState, useEffect, useMemo } from 'react'
import { useForm, router } from '@inertiajs/react'
import { ArrowLeft, Plus, Star, Store, Trash2, Pencil, Users } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'
import PinLocationMap from '../../Components/PinLocationMap'

export default function AgrivetShops({ auth, agrivet, zones = [], shops = [], flash }) {
  // Zones with valid boundaries for map (polygons + labels)
  const zonesForMap = useMemo(
    () =>
      (zones || []).filter(
        (z) => z.boundary && Array.isArray(z.boundary) && z.boundary.length >= 3
      ),
    [zones]
  )
  // Shops with valid coordinates for map markers
  const shopsForMap = useMemo(
    () =>
      (shops || []).filter((s) => {
        const lat = Number(s.shop_lat ?? s.latitude)
        const lng = Number(s.shop_long ?? s.longitude)
        return !Number.isNaN(lat) && !Number.isNaN(lng)
      }),
    [shops]
  )

  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddModalAnimation, setShowAddModalAnimation] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditModalAnimation, setShowEditModalAnimation] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showRemoveModalAnimation, setShowRemoveModalAnimation] = useState(false)
  const [selectedShop, setSelectedShop] = useState(null)
  const [shopToRemove, setShopToRemove] = useState(null)
  const [flashSuccessDismissed, setFlashSuccessDismissed] = useState(false)
  const [flashErrorDismissed, setFlashErrorDismissed] = useState(false)

  const addForm = useForm({
    shop_name: '',
    shop_description: '',
    shop_address: '',
    shop_city: '',
    shop_province: '',
    shop_postal_code: '',
    shop_lat: '',
    shop_long: '',
    contact_number: '',
    shop_status: 'active',
  })

  const editForm = useForm({
    shop_name: '',
    shop_description: '',
    shop_address: '',
    shop_city: '',
    shop_province: '',
    shop_postal_code: '',
    shop_lat: '',
    shop_long: '',
    contact_number: '',
    shop_status: 'active',
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

  // Modal close handlers with animation
  const closeAddModal = () => {
    setShowAddModalAnimation(false)
    setTimeout(() => {
      setShowAddModal(false)
      addForm.reset()
    }, 300)
  }

  const closeEditModal = () => {
    setShowEditModalAnimation(false)
    setTimeout(() => {
      setShowEditModal(false)
      setSelectedShop(null)
      editForm.reset()
    }, 300)
  }

  const closeRemoveModal = () => {
    setShowRemoveModalAnimation(false)
    setTimeout(() => {
      setShowRemoveModal(false)
      setShopToRemove(null)
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
      setShopToRemove(null)
    }
  }, [flash])

  useEffect(() => {
    setFlashSuccessDismissed(false)
    setFlashErrorDismissed(false)
  }, [flash?.success, flash?.error])

  // Determine base route based on user type
  const getBaseRoute = () => {
    return auth?.user?.user_type === 'admin' 
      ? '/dashboard/admin/agrivets' 
      : '/dashboard/super-admin/agrivets'
  }

  const handleAddShop = (e) => {
    e.preventDefault()
    addForm.post(`${getBaseRoute()}/${agrivet.id}/shops`, {
      preserveScroll: true,
      onSuccess: () => {
        addForm.reset()
      },
    })
  }

  const handleEditShop = (shop) => {
    setSelectedShop(shop)
    editForm.setData({
      shop_name: shop.shop_name,
      shop_description: shop.shop_description || '',
      shop_address: shop.shop_address || '',
      shop_city: shop.shop_city || '',
      shop_province: shop.shop_province || '',
      shop_postal_code: shop.shop_postal_code || '',
      shop_lat: shop.shop_lat || '',
      shop_long: shop.shop_long || '',
      contact_number: shop.contact_number || '',
      shop_status: shop.shop_status || 'active',
    })
    setShowEditModal(true)
    setShowEditModalAnimation(false)
  }

  const handleUpdateShop = (e) => {
    e.preventDefault()
    editForm.put(`${getBaseRoute()}/${agrivet.id}/shops/${selectedShop.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        closeEditModal()
      },
    })
  }

  const handleRemoveShop = (shopId) => {
    const shop = shops.find(s => s.id === shopId)
    setShopToRemove(shop)
    setShowRemoveModal(true)
    setShowRemoveModalAnimation(false)
  }

  const confirmRemoveShop = () => {
    if (shopToRemove) {
      router.delete(`${getBaseRoute()}/${agrivet.id}/shops/${shopToRemove.id}`, {
        preserveScroll: true,
        onSuccess: () => {
          closeRemoveModal()
        },
      })
    }
  }

  const openRemoveStore = (e, shop) => {
    e.stopPropagation()
    handleRemoveShop(shop.id)
  }

  const ratingValue = (shop) => {
    const n = parseFloat(shop.average_rating)
    return Number.isFinite(n) ? n : 0
  }

  return (
    <SuperAdminOrAdminLayout auth={auth} title={`Shops - ${agrivet.name}`}>
      {/* Flash Messages */}
      {flash?.success && !flashSuccessDismissed && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {flash.success}
          <button
            type="button"
            className="close"
            data-dismiss="alert"
            aria-label="Close"
            onClick={() => setFlashSuccessDismissed(true)}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {flash?.error && !flashErrorDismissed && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {flash.error}
          <button
            type="button"
            className="close"
            data-dismiss="alert"
            aria-label="Close"
            onClick={() => setFlashErrorDismissed(true)}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <div>
        {/* Back + title */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.visit(getBaseRoute())}
            className="group mb-4 rounded-lg border border-[#E5E7EB] bg-white p-3 transition-all hover:bg-[#F9FAFB]"
            title="Back to Agrivets"
          >
            <ArrowLeft className="h-5 w-5 text-[#6B7280] transition-colors group-hover:text-[#102059]" />
          </button>
          <h1 className="text-2xl font-semibold text-[#102059]">{agrivet.name}</h1>
        </div>

        {/* Account Information */}
        <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#102059]">Account Information</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Owner Name
              </label>
              <p className="mt-1 text-sm text-[#102059]">{agrivet.owner_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Email Address
              </label>
              <p className="mt-1 text-sm text-[#102059]">{agrivet.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Phone Number
              </label>
              <p className="mt-1 text-sm text-[#102059]">{agrivet.contact_number || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* List of Stores */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-[#102059]">List of Stores</h2>
          {shops.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shops.map((shop) => {
                const r = ratingValue(shop)
                const statusActive = shop.shop_status === 'active'
                const statusLabel = statusActive ? 'Active' : 'Inactive'
                return (
                  <div
                    key={shop.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.visit(`${getBaseRoute()}/${agrivet.id}/shops/${shop.id}/vendors`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.visit(`${getBaseRoute()}/${agrivet.id}/shops/${shop.id}/vendors`)
                      }
                    }}
                    className="cursor-pointer overflow-hidden rounded-lg border border-[#E5E7EB] bg-white text-left transition-all hover:border-[#102059] hover:shadow-md"
                  >
                    {/* Cover */}
                    <div className="relative h-40 w-full overflow-hidden bg-[#F8F9FB]">
                      <div className="flex h-full w-full items-center justify-center">
                        <Store className="h-14 w-14 text-[#E5E7EB]" aria-hidden />
                      </div>
                      <span
                        className={`absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${
                          statusActive
                            ? 'bg-[#E8F5E9]/90 text-[#2E7D32]'
                            : 'bg-[#FFEBEE]/90 text-[#C62828]'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <h3 className="flex-1 text-sm font-bold text-[#102059]">{shop.shop_name}</h3>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.visit(`${getBaseRoute()}/${agrivet.id}/shops/${shop.id}/vendors`)
                            }}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="Vendors"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditShop(shop)
                            }}
                            className="rounded-lg p-1.5 text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                            title="Edit shop"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {shop.shop_status === 'active' && (
                            <button
                              type="button"
                              onClick={(e) => openRemoveStore(e, shop)}
                              className="rounded-lg p-1.5 text-[#E20E28] transition-colors hover:bg-[#FEE2E2]"
                              title="Remove store"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mb-3 flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= Math.floor(r)
                                  ? 'fill-[#D3A218] text-[#D3A218]'
                                  : star - 0.5 <= r
                                    ? 'fill-[#D3A218] text-[#D3A218]'
                                    : 'fill-[#E5E7EB] text-[#E5E7EB]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-[#102059]">{r.toFixed(1)}</span>
                        {shop.total_reviews != null && (
                          <span className="text-xs text-[#9CA3AF]">({shop.total_reviews} reviews)</span>
                        )}
                      </div>

                      <div className="mb-3 space-y-0.5 text-xs text-[#6B7280]">
                        <p>{shop.shop_address || '—'}</p>
                        <p>
                          {shop.shop_city || '—'}
                          {shop.shop_province ? `, ${shop.shop_province}` : ''}
                        </p>
                        {shop.shop_postal_code ? <p>{shop.shop_postal_code}</p> : null}
                      </div>

                      <div className="my-3 border-t border-[#E5E7EB]" />

                      <div className="space-y-1 text-xs text-[#6B7280]">
                        <div>
                          <span className="font-semibold text-[#102059]">Zone:</span>{' '}
                          {shop.zone_name || '—'}
                        </div>
                        <div>
                          <span className="font-semibold text-[#102059]">Contact:</span>{' '}
                          {shop.contact_number || '—'}
                        </div>
                        <div>
                          <span className="font-semibold text-[#102059]">Days:</span> —
                        </div>
                        <div>
                          <span className="font-semibold text-[#102059]">Hours:</span> —
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                className="group flex min-h-[280px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] bg-white p-5 transition-all hover:border-[#102059] hover:bg-[#F8F9FB]"
                onClick={() => {
                  setShowAddModal(true)
                  setShowAddModalAnimation(false)
                }}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F8F9FB] transition-colors group-hover:bg-[#102059]">
                  <Plus className="h-6 w-6 text-[#6B7280] transition-colors group-hover:text-white" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-[#102059]">Add New Store</h3>
                <p className="text-center text-xs text-[#6B7280]">
                  Click to add a new branch or store location
                </p>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                className="group flex min-h-[280px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] bg-white p-5 transition-all hover:border-[#102059] hover:bg-[#F8F9FB]"
                onClick={() => {
                  setShowAddModal(true)
                  setShowAddModalAnimation(false)
                }}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F8F9FB] transition-colors group-hover:bg-[#102059]">
                  <Plus className="h-6 w-6 text-[#6B7280] transition-colors group-hover:text-white" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-[#102059]">Add First Store</h3>
                <p className="text-center text-xs text-[#6B7280]">
                  This agrivet has no stores yet.
                  <br />
                  Click to add the first store.
                </p>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Shop Modal */}
      {showAddModal && (
        <>
          <div className={`modal-backdrop fade ${showAddModalAnimation ? 'show' : ''}`} onClick={closeAddModal}></div>
          <div className={`modal fade ${showAddModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Add New Shop</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeAddModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleAddShop}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Shop Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_name ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_name}
                            onChange={(e) => addForm.setData('shop_name', e.target.value)}
                            required
                          />
                          {addForm.errors.shop_name && (
                            <div className="invalid-feedback">{addForm.errors.shop_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Status <span className="text-danger">*</span></label>
                          <select
                            className={`form-control ${addForm.errors.shop_status ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_status}
                            onChange={(e) => addForm.setData('shop_status', e.target.value)}
                            required
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          {addForm.errors.shop_status && (
                            <div className="invalid-feedback">{addForm.errors.shop_status}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            className={`form-control ${addForm.errors.shop_description ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_description}
                            onChange={(e) => addForm.setData('shop_description', e.target.value)}
                            rows="2"
                          />
                          {addForm.errors.shop_description && (
                            <div className="invalid-feedback">{addForm.errors.shop_description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Pin Location</label>
                          <PinLocationMap
                            initialLat={addForm.data.shop_lat ? parseFloat(addForm.data.shop_lat) : undefined}
                            initialLng={addForm.data.shop_long ? parseFloat(addForm.data.shop_long) : undefined}
                            initialAddress={addForm.data.shop_address}
                            initialCity={addForm.data.shop_city}
                            initialProvince={addForm.data.shop_province}
                            initialPostalCode={addForm.data.shop_postal_code}
                            onLocationSelect={(loc) => {
                              addForm.setData({
                                shop_address: loc.address ?? '',
                                shop_city: loc.city ?? '',
                                shop_province: loc.province ?? '',
                                shop_postal_code: loc.postal_code ?? '',
                                shop_lat: loc.latitude,
                                shop_long: loc.longitude,
                              })
                            }}
                            zones={zonesForMap}
                            shopLocations={shopsForMap}
                            height={320}
                            error={addForm.errors.shop_address}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Address</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_address ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_address}
                            onChange={(e) => addForm.setData('shop_address', e.target.value)}
                            placeholder="Enter address"
                          />
                          {addForm.errors.shop_address && (
                            <div className="invalid-feedback">{addForm.errors.shop_address}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>City</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_city ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_city}
                            onChange={(e) => addForm.setData('shop_city', e.target.value)}
                            placeholder="Enter city"
                          />
                          {addForm.errors.shop_city && (
                            <div className="invalid-feedback">{addForm.errors.shop_city}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>Province</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_province ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_province}
                            onChange={(e) => addForm.setData('shop_province', e.target.value)}
                            placeholder="Enter province"
                          />
                          {addForm.errors.shop_province && (
                            <div className="invalid-feedback">{addForm.errors.shop_province}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>Postal Code</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_postal_code ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_postal_code}
                            onChange={(e) => addForm.setData('shop_postal_code', e.target.value)}
                            placeholder="Enter postal code"
                          />
                          {addForm.errors.shop_postal_code && (
                            <div className="invalid-feedback">{addForm.errors.shop_postal_code}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Latitude</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_lat ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_lat}
                            onChange={(e) => addForm.setData('shop_lat', e.target.value)}
                            placeholder="Auto-filled"
                          />
                          {addForm.errors.shop_lat && (
                            <div className="invalid-feedback">{addForm.errors.shop_lat}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Longitude</label>
                          <input
                            type="text"
                            className={`form-control ${addForm.errors.shop_long ? 'is-invalid' : ''}`}
                            value={addForm.data.shop_long}
                            onChange={(e) => addForm.setData('shop_long', e.target.value)}
                            placeholder="Auto-filled"
                          />
                          {addForm.errors.shop_long && (
                            <div className="invalid-feedback">{addForm.errors.shop_long}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
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
                      {addForm.processing ? 'Creating...' : 'Create Shop'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Shop Modal */}
      {showEditModal && selectedShop && (
        <>
          <div className={`modal-backdrop fade ${showEditModalAnimation ? 'show' : ''}`} onClick={closeEditModal}></div>
          <div className={`modal fade ${showEditModalAnimation ? 'show' : ''} d-block`} tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Shop</h4>
                  <button
                    type="button"
                    className="close"
                    onClick={closeEditModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateShop}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Shop Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_name ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_name}
                            onChange={(e) => editForm.setData('shop_name', e.target.value)}
                            required
                          />
                          {editForm.errors.shop_name && (
                            <div className="invalid-feedback">{editForm.errors.shop_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Status <span className="text-danger">*</span></label>
                          <select
                            className={`form-control ${editForm.errors.shop_status ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_status}
                            onChange={(e) => editForm.setData('shop_status', e.target.value)}
                            required
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          {editForm.errors.shop_status && (
                            <div className="invalid-feedback">{editForm.errors.shop_status}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            className={`form-control ${editForm.errors.shop_description ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_description}
                            onChange={(e) => editForm.setData('shop_description', e.target.value)}
                            rows="2"
                          />
                          {editForm.errors.shop_description && (
                            <div className="invalid-feedback">{editForm.errors.shop_description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Pin Location</label>
                          <PinLocationMap
                            initialLat={editForm.data.shop_lat ? parseFloat(editForm.data.shop_lat) : undefined}
                            initialLng={editForm.data.shop_long ? parseFloat(editForm.data.shop_long) : undefined}
                            zones={zonesForMap}
                            shopLocations={shopsForMap}
                            initialAddress={editForm.data.shop_address}
                            initialCity={editForm.data.shop_city}
                            initialProvince={editForm.data.shop_province}
                            initialPostalCode={editForm.data.shop_postal_code}
                            onLocationSelect={(loc) => {
                              editForm.setData({
                                shop_address: loc.address,
                                shop_city: loc.city ?? '',
                                shop_province: loc.province ?? '',
                                shop_postal_code: loc.postal_code ?? '',
                                shop_lat: loc.latitude,
                                shop_long: loc.longitude,
                              })
                            }}
                            height={320}
                            error={editForm.errors.shop_address}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Address</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_address ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_address}
                            onChange={(e) => editForm.setData('shop_address', e.target.value)}
                            placeholder="Filled by pinned location"
                            readOnly
                          />
                          {editForm.errors.shop_address && (
                            <div className="invalid-feedback">{editForm.errors.shop_address}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>City</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_city ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_city}
                            onChange={(e) => editForm.setData('shop_city', e.target.value)}
                            placeholder="Auto-filled or enter city"
                          />
                          {editForm.errors.shop_city && (
                            <div className="invalid-feedback">{editForm.errors.shop_city}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>Province</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_province ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_province}
                            onChange={(e) => editForm.setData('shop_province', e.target.value)}
                            placeholder="Auto-filled or enter province"
                          />
                          {editForm.errors.shop_province && (
                            <div className="invalid-feedback">{editForm.errors.shop_province}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label>Postal Code</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_postal_code ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_postal_code}
                            onChange={(e) => editForm.setData('shop_postal_code', e.target.value)}
                            placeholder="Auto-filled or enter postal code"
                          />
                          {editForm.errors.shop_postal_code && (
                            <div className="invalid-feedback">{editForm.errors.shop_postal_code}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Latitude</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_lat ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_lat}
                            onChange={(e) => editForm.setData('shop_lat', e.target.value)}
                            placeholder="Auto-filled"
                          />
                          {editForm.errors.shop_lat && (
                            <div className="invalid-feedback">{editForm.errors.shop_lat}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Longitude</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.shop_long ? 'is-invalid' : ''}`}
                            value={editForm.data.shop_long}
                            onChange={(e) => editForm.setData('shop_long', e.target.value)}
                            placeholder="Auto-filled"
                          />
                          {editForm.errors.shop_long && (
                            <div className="invalid-feedback">{editForm.errors.shop_long}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="form-group">
                          <label>Contact Number</label>
                          <input
                            type="text"
                            className={`form-control ${editForm.errors.contact_number ? 'is-invalid' : ''}`}
                            value={editForm.data.contact_number}
                            onChange={(e) => editForm.setData('contact_number', e.target.value)}
                          />
                          {editForm.errors.contact_number && (
                            <div className="invalid-feedback">{editForm.errors.contact_number}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Read-only Shop Stats */}
                    <hr className="my-4" />
                    <h5 className="text-info mb-3"><i className="fas fa-chart-bar mr-2"></i>Shop Statistics (Read-only)</h5>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Average Rating</label>
                          <input
                            type="text"
                            className="form-control"
                            value={selectedShop.average_rating || '0.00'}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Total Reviews</label>
                          <input
                            type="text"
                            className="form-control"
                            value={selectedShop.total_reviews || '0'}
                            readOnly
                            disabled
                          />
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
                      {editForm.processing ? 'Updating...' : 'Update Shop'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remove Shop Confirmation Modal */}
      {showRemoveModal && shopToRemove && (
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
                    Are you sure you want to deactivate <strong>{shopToRemove.shop_name}</strong>?
                  </p>
                  <p className="text-muted mb-0">
                    This will set the shop status to "Inactive". The shop will not be visible to users.
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
                    onClick={confirmRemoveShop}
                  >
                    Deactivate Shop
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
