import { useEffect, useState } from "react";
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  X,
  MapPin,
  User,
  Phone,
  Calendar,
  Star,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
  Image as ImageIcon,
} from "lucide-react";

/** Order management UI — layout from StoreOwnerOrders.tsx (Klasmeyt template). */
export default function OwnerManagerOrdersPanel({ orders: initialOrders = [] }) {
  const [activeSection, setActiveSection] = useState('new')
  const [expandedOrders, setExpandedOrders] = useState(() => new Set())
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [declineReason, setDeclineReason] = useState('')
  const [completedFilter, setCompletedFilter] = useState('all')
  const [orders, setOrders] = useState(initialOrders)

  useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])


  const sections = [
    { id: "new", label: "New Orders", icon: Package, color: "#E20E28" },
    { id: "preparing", label: "Preparing", icon: Clock, color: "#D3A218" },
    { id: "for-pickup", label: "For Pick-up", icon: Package, color: "#244693" },
    { id: "in-transit", label: "In Transit", icon: Truck, color: "#102059" },
    { id: "completed", label: "Completed", icon: CheckCircle, color: "#00C950" },
  ];

  const toggleOrderExpand = (orderNumber) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderNumber)) {
      newExpanded.delete(orderNumber);
    } else {
      newExpanded.add(orderNumber);
    }
    setExpandedOrders(newExpanded);
  };

  const calculateOrderTotal = (products) => {
    return products.reduce((total, product) => {
      const discountedPrice = product.discount
        ? product.price * (1 - product.discount / 100)
        : product.price;
      return total + discountedPrice * product.quantity;
    }, 0);
  };

  const calculateOriginalTotal = (products) => {
    return products.reduce((total, product) => {
      return total + product.price * product.quantity;
    }, 0);
  };

  const handleAcceptOrder = (order) => {
    setOrders(prevOrders =>
      prevOrders.map(o =>
        o.orderNumber === order.orderNumber
          ? { ...o, status: "preparing" }
          : o
      )
    );
  };

  const handleDeclineOrder = () => {
    if (selectedOrder && declineReason.trim()) {
      setOrders(prevOrders =>
        prevOrders.map(o =>
          o.orderNumber === selectedOrder.orderNumber
            ? {
                ...o,
                status: "completed",
                isSuccessful: false,
                declineReason: declineReason.trim(),
                completionDate: new Date().toISOString(),
              }
            : o
        )
      );
      setShowDeclineModal(false);
      setDeclineReason("");
      setSelectedOrder(null);
    }
  };

  const openDeclineModal = (order) => {
    setSelectedOrder(order);
    setShowDeclineModal(true);
  };

  const getFilteredOrders = (status) => {
    let filtered = orders.filter(order => order.status === status);
    
    if (status === "completed") {
      if (completedFilter === "successful") {
        filtered = filtered.filter(order => order.isSuccessful === true);
      } else if (completedFilter === "cancelled") {
        filtered = filtered.filter(order => order.isSuccessful === false);
      }
      // Sort by completion date (newest first)
      filtered.sort((a, b) => {
        const dateA = new Date(a.completionDate || 0).getTime();
        const dateB = new Date(b.completionDate || 0).getTime();
        return dateB - dateA;
      });
    }
    
    return filtered;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderOrderCard = (order) => {
    const isExpanded = expandedOrders.has(order.orderNumber);
    const orderTotal = calculateOrderTotal(order.products);
    const originalTotal = calculateOriginalTotal(order.products);
    const hasDiscount = originalTotal > orderTotal;

    return (
      <div
        key={order.orderNumber}
        className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden"
      >
        {/* Order Header */}
        <div
          className="p-4 bg-[#F9FAFB] border-b border-[#E5E7EB] cursor-pointer hover:bg-[#F3F4F6] transition-colors"
          onClick={() => toggleOrderExpand(order.orderNumber)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-bold text-[#102059]">
                  {order.orderNumber}
                </h3>
                {order.status === "completed" && (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      order.isSuccessful
                        ? "bg-[#E8F5E9] text-[#2E7D32]"
                        : "bg-[#FFEBEE] text-[#C62828]"
                    }`}
                  >
                    {order.isSuccessful ? "Delivered" : "Cancelled"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>{order.customerName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(order.dateOfOrder)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-[#102059]">
                  ₱{orderTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
                {hasDiscount && (
                  <p className="text-xs text-[#6B7280] line-through">
                    ₱{originalTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-[#6B7280]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#6B7280]" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Order Details */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Customer Information */}
            <div>
              <h4 className="text-xs font-bold text-[#102059] uppercase tracking-wider mb-2">
                Customer Information
              </h4>
              <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                {order.customerProfilePicture && (
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-[#E5E7EB]">
                    <img 
                      src={order.customerProfilePicture} 
                      alt={order.customerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#6B7280]">Name</label>
                    <p className="text-sm text-[#102059] font-medium">{order.customerName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-[#6B7280]">Phone</label>
                    <p className="text-sm text-[#102059] font-medium">{order.customerPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div>
              <h4 className="text-xs font-bold text-[#102059] uppercase tracking-wider mb-2">
                Products Ordered
              </h4>
              <div className="space-y-2">
                {order.products.map((product) => {
                  const discountedPrice = product.discount
                    ? product.price * (1 - product.discount / 100)
                    : product.price;
                  const itemTotal = discountedPrice * product.quantity;

                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]"
                    >
                      {/* Product Thumbnail */}
                      {product.thumbnail && (
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-[#E5E7EB]">
                          <img 
                            src={product.thumbnail} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#102059] mb-1">{product.name}</p>
                        <p className="text-xs text-[#6B7280]">
                          ₱{(product.discount ? discountedPrice : product.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })} × {product.quantity}
                        </p>
                      </div>
                      
                      {/* Price */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#102059]">
                          ₱{itemTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </p>
                        {product.discount && (
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs text-[#6B7280] line-through">
                              ₱{(product.price * product.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs font-semibold text-[#E20E28]">
                              -{product.discount}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Order Total */}
              <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#102059]">Total Amount</span>
                  <div className="text-right">
                    <p className="text-base font-bold text-[#102059]">
                      ₱{orderTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </p>
                    {hasDiscount && (
                      <p className="text-xs text-[#00C950]">
                        Total Discount ₱{(originalTotal - orderTotal).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <h4 className="text-xs font-bold text-[#102059] uppercase tracking-wider mb-2">
                Delivery Address
              </h4>
              <div className="flex items-start gap-2 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <MapPin className="w-4 h-4 text-[#E20E28] mt-0.5 flex-shrink-0" />
                <div className="text-sm text-[#102059]">
                  <p>{order.deliveryAddress.street}</p>
                  <p>{order.deliveryAddress.barangay}, {order.deliveryAddress.city}</p>
                  <p>{order.deliveryAddress.province}</p>
                </div>
              </div>
            </div>

            {/* Rider Details (for applicable sections) */}
            {(order.status === "for-pickup" || order.status === "in-transit" || 
              (order.status === "completed" && order.riderDetails)) && order.riderDetails && (
              <div>
                <h4 className="text-xs font-bold text-[#102059] uppercase tracking-wider mb-2">
                  Rider Information
                </h4>
                <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  {order.riderDetails.profilePicture && (
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-[#E5E7EB]">
                      <img 
                        src={order.riderDetails.profilePicture} 
                        alt={order.riderDetails.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#6B7280]">Rider Name</label>
                      <p className="text-sm text-[#102059] font-medium">{order.riderDetails.name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#6B7280]">Phone</label>
                      <p className="text-sm text-[#102059] font-medium">{order.riderDetails.phone}</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#6B7280]">Vehicle Type</label>
                      <p className="text-sm text-[#102059] font-medium">{order.riderDetails.vehicleType}</p>
                    </div>
                    <div>
                      <label className="text-xs text-[#6B7280]">Plate Number</label>
                      <p className="text-sm text-[#102059] font-medium">{order.riderDetails.plateNumber}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Proof of Delivery (for completed orders) */}
            {order.status === "completed" && order.proofOfDelivery && order.isSuccessful && (
              <div>
                <h4 className="text-xs font-bold text-[#102059] uppercase tracking-wider mb-2">
                  Proof of Delivery
                </h4>
                <div className="relative w-full h-48 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] overflow-hidden">
                  <img
                    src={order.proofOfDelivery}
                    alt="Proof of delivery"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Rating and Review (for completed orders) */}
            {order.status === "completed" && order.rating && order.isSuccessful && (
              <div>
                <h4 className="text-xs font-bold text-[#102059] uppercase tracking-wider mb-2">
                  Customer Rating & Review
                </h4>
                <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (order.rating || 0)
                              ? "fill-[#D3A218] text-[#D3A218]"
                              : "fill-[#E5E7EB] text-[#E5E7EB]"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-[#102059]">{order.rating}/5</span>
                  </div>
                  {order.review && (
                    <p className="text-sm text-[#6B7280] italic">"{order.review}"</p>
                  )}
                </div>
              </div>
            )}

            {/* Decline Reason (for cancelled orders) */}
            {order.status === "completed" && order.declineReason && !order.isSuccessful && (
              <div>
                <h4 className="text-xs font-bold text-[#102059] uppercase tracking-wider mb-2">
                  Cancellation Reason
                </h4>
                <div className="p-3 bg-[#FEE2E2] rounded-lg border border-[#FCA5A5]">
                  <p className="text-sm text-[#991B1B]">{order.declineReason}</p>
                </div>
              </div>
            )}

            {/* Completion Date (for completed orders) */}
            {order.status === "completed" && order.completionDate && (
              <div>
                <h4 className="text-xs font-bold text-[#102059] uppercase tracking-wider mb-2">
                  Completion Date
                </h4>
                <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(order.completionDate)}</span>
                </div>
              </div>
            )}

            {/* Action Buttons (for new orders only) */}
            {order.status === "new" && (
              <div className="flex items-center gap-3 pt-3 border-t border-[#E5E7EB]">
                <button
                  onClick={() => handleAcceptOrder(order)}
                  className="flex-1 px-4 py-2.5 bg-[#00C950] text-white rounded-lg font-semibold text-sm hover:bg-[#00B048] transition-colors"
                  style={{ fontFamily: "Inter Condensed, sans-serif" }}
                >
                  Accept Order
                </button>
                <button
                  onClick={() => openDeclineModal(order)}
                  className="flex-1 px-4 py-2.5 bg-[#E20E28] text-white rounded-lg font-semibold text-sm hover:bg-[#C00C22] transition-colors"
                  style={{ fontFamily: "Inter Condensed, sans-serif" }}
                >
                  Decline Order
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#102059] mb-2">
          Order Management
        </h1>
        <p className="text-sm text-[#6B7280]">
          Manage and track all customer orders
        </p>
      </div>

      {/* Section Navigation */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
        <div className="flex items-center gap-3 overflow-x-auto">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const sectionOrders = getFilteredOrders(section.id);
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-all border ${
                  isActive
                    ? "border-[#102059] shadow-sm"
                    : "border-[#E5E7EB] hover:border-[#102059]"
                }`}
                style={{
                  fontFamily: "Inter Condensed, sans-serif",
                  backgroundColor: isActive ? `${section.color}10` : "transparent",
                  color: isActive ? section.color : "#6B7280",
                }}
              >
                <SectionIcon className="w-4 h-4" />
                <span>{section.label}</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? "bg-white" : "bg-[#F9FAFB]"
                  }`}
                  style={{ color: isActive ? section.color : "#102059" }}
                >
                  {sectionOrders.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter for Completed Section */}
      {activeSection === "completed" && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-[#6B7280]" />
            <span className="text-sm font-semibold text-[#102059]">Filter by:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompletedFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  completedFilter === "all"
                    ? "bg-[#102059] text-white"
                    : "bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]"
                }`}
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                All Orders
              </button>
              <button
                onClick={() => setCompletedFilter("successful")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  completedFilter === "successful"
                    ? "bg-[#00C950] text-white"
                    : "bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]"
                }`}
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                Successful
              </button>
              <button
                onClick={() => setCompletedFilter("cancelled")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  completedFilter === "cancelled"
                    ? "bg-[#E20E28] text-white"
                    : "bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]"
                }`}
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                Cancelled
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {getFilteredOrders(activeSection).length === 0 ? (
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-12 text-center">
            <Package className="w-12 h-12 text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">No orders in this section</p>
          </div>
        ) : (
          getFilteredOrders(activeSection).map(renderOrderCard)
        )}
      </div>

      {/* Decline Order Modal */}
      {showDeclineModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#102059]">
                Decline Order
              </h3>
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason("");
                  setSelectedOrder(null);
                }}
                className="p-1 hover:bg-[#F9FAFB] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#6B7280]" />
              </button>
            </div>

            <p className="text-sm text-[#6B7280] mb-4">
              Please provide a reason for declining order <strong>{selectedOrder.orderNumber}</strong>
            </p>

            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter reason for declining this order..."
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#102059] resize-none"
              rows={4}
              style={{ fontFamily: "Inter Condensed, sans-serif" }}
            />

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason("");
                  setSelectedOrder(null);
                }}
                className="flex-1 px-4 py-2.5 bg-[#F9FAFB] text-[#102059] rounded-lg font-semibold text-sm hover:bg-[#E5E7EB] transition-colors"
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineOrder}
                disabled={!declineReason.trim()}
                className="flex-1 px-4 py-2.5 bg-[#E20E28] text-white rounded-lg font-semibold text-sm hover:bg-[#C00C22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                Decline Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
