import { Head, Link, useForm } from '@inertiajs/react'
import { useState } from 'react'

export default function AdminLayout({ children, auth, title = 'Dashboard' }) {
  const { post } = useForm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = (e) => {
    e.preventDefault();
    post('/logout');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <>
      <Head title={title} />
      <div className="wrapper">
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
                <a href="#" className="dropdown-item">
                  <i className="fas fa-user mr-2"></i> Profile
                </a>
                <a href="#" className="dropdown-item">
                  <i className="fas fa-cog mr-2"></i> Settings
                </a>
                <div className="dropdown-divider"></div>
                <a href="#" className="dropdown-item" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt mr-2"></i> Logout
                </a>
              </div>
            </li>
          </ul>
        </nav>

        {/* Main Sidebar */}
        <aside className={`main-sidebar sidebar-dark-primary elevation-4 ${sidebarCollapsed ? 'sidebar-collapse' : ''}`}>
          {/* Brand Logo */}
          <Link href="/dashboard" className="brand-link">
            <img src="/vendor/adminlte/dist/img/AdminLTELogo.png" alt="AdminLTE Logo" className="brand-image img-circle elevation-3" style={{opacity: '.8'}} />
            <span className="brand-text font-weight-light">Agrify Connect</span>
          </Link>

          {/* Sidebar */}
          <div className="sidebar">
            {/* Sidebar user panel (optional) */}
            <div className="user-panel mt-3 pb-3 mb-3 d-flex">
              <div className="image">
                <img src="/vendor/adminlte/dist/img/user2-160x160.jpg" className="img-circle elevation-2" alt="User Image" />
              </div>
              <div className="info">
                <a href="#" className="d-block">{auth.user.name}</a>
              </div>
            </div>

            {/* Sidebar Menu */}
            <nav className="mt-2">
              <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
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
