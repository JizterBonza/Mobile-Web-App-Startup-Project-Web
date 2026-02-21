import { Head, Link, useForm } from '@inertiajs/react'
import { useState, useRef, useEffect } from 'react'

export default function AdminLayout({ children, auth, title = 'Dashboard' }) {
  const { post } = useForm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize AdminLTE treeview after component mounts
  useEffect(() => {
    // Wait for AdminLTE to be available
    const initTreeview = () => {
      if (window.$ && window.$.fn.treeview) {
        // Initialize treeview on all elements with data-widget="treeview"
        window.$('[data-widget="treeview"]').each(function() {
          const $treeview = window.$(this);
          // Destroy existing treeview instance if any
          if ($treeview.data('lte.treeview')) {
            $treeview.treeview('destroy');
          }
          // Initialize treeview
          $treeview.treeview();
        });
      }
    };

    // Use a small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      // Initialize immediately if jQuery is available
      if (window.$ && window.$.fn.treeview) {
        initTreeview();
      } else {
        // Wait for jQuery to load
        const checkJQuery = setInterval(() => {
          if (window.$ && window.$.fn.treeview) {
            clearInterval(checkJQuery);
            initTreeview();
          }
        }, 100);
        
        // Cleanup interval after 5 seconds
        setTimeout(() => clearInterval(checkJQuery), 5000);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [sidebarCollapsed]);

  const handleLogout = (e) => {
    e.preventDefault();
    post('/logout');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMenuToggle = (e) => {
    e.preventDefault();
    const link = e.currentTarget;
    const parent = link.closest('.nav-item');
    
    if (parent) {
      // Find the direct child ul.nav-treeview
      const children = Array.from(parent.children);
      const treeview = children.find(child => 
        child.tagName === 'UL' && child.classList.contains('nav-treeview')
      );
      
      if (treeview) {
        // Toggle the menu-open class on parent
        parent.classList.toggle('menu-open');
        
        // Toggle visibility of submenu
        if (treeview.style.display === 'none' || !treeview.style.display) {
          treeview.style.display = 'block';
        } else {
          treeview.style.display = 'none';
        }
        
        // Also toggle the angle icon
        const angleIcon = link.querySelector('.right.fas');
        if (angleIcon) {
          angleIcon.classList.toggle('fa-angle-left');
          angleIcon.classList.toggle('fa-angle-down');
        }
      }
    }
  };

  return (
    <>
      <Head title={title} />
      <div className={`wrapper ${sidebarCollapsed ? 'sidebar-collapse' : ''}`}>
        {/* Navbar */}
        <nav className="main-header navbar navbar-expand navbar-white navbar-light">
          {/* Left navbar links */}
          <ul className="navbar-nav">
            <li className="nav-item">
              <a className="nav-link" data-widget="pushmenu" href="#" role="button" onClick={(e) => { e.preventDefault(); toggleSidebar(); }}>
                <i className="fas fa-bars"></i>
              </a>
            </li>
            <li className="nav-item d-none d-sm-inline-block">
              <Link href="/dashboard" className="nav-link">Home</Link>
            </li>
          </ul>

          {/* Right navbar links */}
          <ul className="navbar-nav ml-auto">
            {/* User Dropdown Menu */}
            <li className="nav-item dropdown">
              <a className="nav-link" data-toggle="dropdown" href="#">
                <i className="far fa-user"></i>
                <span className="ml-2">{auth.user.name}</span>
              </a>
              <div className="dropdown-menu dropdown-menu-lg dropdown-menu-right">
                <span className="dropdown-item dropdown-header">{auth.user.email}</span>
                <div className="dropdown-divider"></div>
                <Link href="/profile" className="dropdown-item">
                  <i className="fas fa-user mr-2"></i> Profile
                </Link>
                <Link href="/settings" className="dropdown-item">
                  <i className="fas fa-cog mr-2"></i> Settings
                </Link>
                <div className="dropdown-divider"></div>
                <a href="#" className="dropdown-item" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt mr-2"></i> Logout
                </a>
              </div>
            </li>
          </ul>
        </nav>

        {/* Main Sidebar */}
        <aside className="main-sidebar sidebar-dark-primary elevation-4">
          {/* Brand Logo */}
          <Link href="/dashboard" className="brand-link">
            <img src="/vendor/adminlte/dist/img/AdminLTELogo.png" alt="AdminLTE Logo" className="brand-image img-circle elevation-3" style={{opacity: '.8'}} />
            <span className="brand-text font-weight-light">Agrify Connect</span>
          </Link>

          {/* Sidebar */}
          <div className="sidebar">
            {/* Sidebar user panel with dropdown */}
            <div className="user-panel mt-3 pb-3 mb-3" ref={profileDropdownRef} style={{ position: 'relative' }}>
              <div 
                className="d-flex align-items-center" 
                style={{ cursor: 'pointer' }}
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="image">
                  <img src="/vendor/adminlte/dist/img/user2-160x160.jpg" className="img-circle elevation-2" alt="User Image" />
                </div>
                <div className="info user-panel-info">
                  <span className="d-block text-white">{auth.user.name}</span>
                </div>
                <i className={`fas fa-chevron-${profileDropdownOpen ? 'up' : 'down'} ml-auto text-white user-panel-chevron`} style={{ fontSize: '12px' }}></i>
              </div>
              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="profile-dropdown-menu" style={{
                  position: 'absolute',
                  top: '100%',
                  left: sidebarCollapsed ? '50%' : '10px',
                  transform: sidebarCollapsed ? 'translateX(-50%)' : 'none',
                  minWidth: sidebarCollapsed ? '200px' : 'calc(100% - 20px)',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  zIndex: 1100,
                  marginTop: '5px',
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '10px 15px', borderBottom: '1px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
                    <strong style={{ color: '#343a40', fontSize: '14px' }}>{auth.user.name}</strong>
                    <small style={{ display: 'block', color: '#6c757d', fontSize: '12px' }}>{auth.user.email}</small>
                  </div>
                  <Link href="/profile" style={{ display: 'block', padding: '10px 15px', color: '#343a40', textDecoration: 'none', fontSize: '14px' }} 
                     onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                     onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                    <i className="fas fa-user mr-2" style={{ width: '20px' }}></i> Profile
                  </Link>
                  <Link href="/settings" style={{ display: 'block', padding: '10px 15px', color: '#343a40', textDecoration: 'none', fontSize: '14px' }}
                     onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                     onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                    <i className="fas fa-cog mr-2" style={{ width: '20px' }}></i> Settings
                  </Link>
                  <div style={{ borderTop: '1px solid #e9ecef' }}></div>
                  <a href="#" onClick={handleLogout} style={{ display: 'block', padding: '10px 15px', color: '#dc3545', textDecoration: 'none', fontSize: '14px' }}
                     onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                     onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                    <i className="fas fa-sign-out-alt mr-2" style={{ width: '20px' }}></i> Logout
                  </a>
                </div>
              )}
            </div>

            {/* Sidebar Menu */}
            <nav className="mt-2">
              <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
                {auth.user.user_type === 'super_admin' ? (
                  <>
                    <li className="nav-item">
                      <Link href="/dashboard/super-admin" className="nav-link">
                        <i className="nav-icon fas fa-tachometer-alt"></i>
                        <p>Dashboard</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/super-admin/users" className="nav-link">
                        <i className="nav-icon fas fa-users"></i>
                        <p>User Management</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/super-admin/agrivets" className="nav-link">
                        <i className="nav-icon fas fa-clinic-medical"></i>
                        <p>Agrivet Management</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <a href="#" className="nav-link" onClick={handleMenuToggle}>
                        <i className="nav-icon fas fa-box"></i>
                        <p>
                          Product Management
                          <i className="right fas fa-angle-left"></i>
                        </p>
                      </a>
                      <ul className="nav nav-treeview">
                        <li className="nav-item">
                          <Link href="/dashboard/super-admin/categories" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>Categories</p>
                          </Link>
                        </li>
                        <li className="nav-item">
                          <Link href="/dashboard/super-admin/sub-categories" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>Sub-Categories</p>
                          </Link>
                        </li>
                      </ul>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/super-admin/activity-logs" className="nav-link">
                        <i className="nav-icon fas fa-history"></i>
                        <p>Activity Logs</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/super-admin/payment-methods" className="nav-link">
                        <i className="nav-icon fas fa-credit-card"></i>
                        <p>Payment Methods</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/super-admin/delivery-methods" className="nav-link">
                        <i className="nav-icon fas fa-truck"></i>
                        <p>Delivery Methods</p>
                      </Link>
                    </li>
                  </>
                ) : auth.user.user_type === 'admin' ? (
                  <>
                    <li className="nav-item">
                      <Link href="/dashboard/admin" className="nav-link">
                        <i className="nav-icon fas fa-tachometer-alt"></i>
                        <p>Dashboard</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/admin/users" className="nav-link">
                        <i className="nav-icon fas fa-users"></i>
                        <p>User Management</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/admin/agrivets" className="nav-link">
                        <i className="nav-icon fas fa-clinic-medical"></i>
                        <p>Agrivet Management</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <a href="#" className="nav-link" onClick={handleMenuToggle}>
                        <i className="nav-icon fas fa-box"></i>
                        <p>
                          Product Management
                          <i className="right fas fa-angle-left"></i>
                        </p>
                      </a>
                      <ul className="nav nav-treeview">
                        <li className="nav-item">
                          <Link href="/dashboard/admin/categories" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>Categories</p>
                          </Link>
                        </li>
                        <li className="nav-item">
                          <Link href="/dashboard/admin/sub-categories" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>Sub-Categories</p>
                          </Link>
                        </li>
                      </ul>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/admin/activity-logs" className="nav-link">
                        <i className="nav-icon fas fa-history"></i>
                        <p>Activity Logs</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/admin/payment-methods" className="nav-link">
                        <i className="nav-icon fas fa-credit-card"></i>
                        <p>Payment Methods</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/admin/delivery-methods" className="nav-link">
                        <i className="nav-icon fas fa-truck"></i>
                        <p>Delivery Methods</p>
                      </Link>
                    </li>
                  </>
                ) : auth.user.user_type === 'vendor' ? (
                  <>
                    <li className="nav-item">
                      <Link href="/dashboard/vendor" className="nav-link">
                        <i className="nav-icon fas fa-tachometer-alt"></i>
                        <p>Dashboard</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/vendor/store" className="nav-link">
                        <i className="nav-icon fas fa-store"></i>
                        <p>Store Management</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/vendor/products" className="nav-link">
                        <i className="nav-icon fas fa-box"></i>
                        <p>Products</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/vendor/product-images" className="nav-link">
                        <i className="nav-icon fas fa-images"></i>
                        <p>Product Images</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/vendor/inventory" className="nav-link">
                        <i className="nav-icon fas fa-warehouse"></i>
                        <p>Inventory</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/vendor/orders" className="nav-link">
                        <i className="nav-icon fas fa-shopping-bag"></i>
                        <p>Orders</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/vendor/payouts" className="nav-link">
                        <i className="nav-icon fas fa-money-bill-wave"></i>
                        <p>Payouts</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/dashboard/vendor/promotions" className="nav-link">
                        <i className="nav-icon fas fa-tags"></i>
                        <p>Promotions</p>
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="nav-item">
                      <Link href="/dashboard" className="nav-link">
                        <i className="nav-icon fas fa-tachometer-alt"></i>
                        <p>Dashboard</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <a href="#" className="nav-link">
                        <i className="nav-icon fas fa-chart-pie"></i>
                        <p>
                          Charts
                          <i className="right fas fa-angle-left"></i>
                        </p>
                      </a>
                      <ul className="nav nav-treeview">
                        <li className="nav-item">
                          <a href="#" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>ChartJS</p>
                          </a>
                        </li>
                        <li className="nav-item">
                          <a href="#" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>Flot</p>
                          </a>
                        </li>
                      </ul>
                    </li>
                    <li className="nav-item">
                      <a href="#" className="nav-link">
                        <i className="nav-icon fas fa-tree"></i>
                        <p>
                          UI Elements
                          <i className="fas fa-angle-left right"></i>
                        </p>
                      </a>
                      <ul className="nav nav-treeview">
                        <li className="nav-item">
                          <a href="#" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>General</p>
                          </a>
                        </li>
                        <li className="nav-item">
                          <a href="#" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>Icons</p>
                          </a>
                        </li>
                      </ul>
                    </li>
                    <li className="nav-item">
                      <a href="#" className="nav-link">
                        <i className="nav-icon fas fa-edit"></i>
                        <p>
                          Forms
                          <i className="fas fa-angle-left right"></i>
                        </p>
                      </a>
                      <ul className="nav nav-treeview">
                        <li className="nav-item">
                          <a href="#" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>General Elements</p>
                          </a>
                        </li>
                        <li className="nav-item">
                          <a href="#" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>Advanced Elements</p>
                          </a>
                        </li>
                      </ul>
                    </li>
                    <li className="nav-item">
                      <a href="#" className="nav-link">
                        <i className="nav-icon fas fa-table"></i>
                        <p>
                          Tables
                          <i className="fas fa-angle-left right"></i>
                        </p>
                      </a>
                      <ul className="nav nav-treeview">
                        <li className="nav-item">
                          <a href="#" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>Simple Tables</p>
                          </a>
                        </li>
                        <li className="nav-item">
                          <a href="#" className="nav-link">
                            <i className="far fa-circle nav-icon"></i>
                            <p>DataTables</p>
                          </a>
                        </li>
                      </ul>
                    </li>
                  </>
                )}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Content Wrapper */}
        <div className="content-wrapper">
          {/* Content Header */}
          <div className="content-header">
            <div className="container-fluid">
              <div className="row mb-2">
                <div className="col-sm-6">
                  <h1 className="m-0">{title}</h1>
                </div>
                <div className="col-sm-6">
                  <ol className="breadcrumb float-sm-right">
                    <li className="breadcrumb-item"><Link href="/dashboard">Home</Link></li>
                    <li className="breadcrumb-item active">{title}</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="content">
            <div className="container-fluid">
              {children}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="main-footer">
          <strong>Copyright &copy; 2024 <a href="#">Agrify Connect</a>.</strong>
          All rights reserved.
          <div className="float-right d-none d-sm-inline-block">
            <b>Version</b> 1.0.0
          </div>
        </footer>
      </div>
    </>
  )
}
