import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/admin', label: 'กระดานคะแนน', icon: 'fas fa-chart-line', end: true },
  { path: '/admin/competitions', label: 'ประเภทการแข่งขัน', icon: 'fas fa-trophy' },
  { path: '/admin/contestants', label: 'ผู้เข้าแข่งขัน', icon: 'fas fa-users' },
  { path: '/admin/judges', label: 'กรรมการ', icon: 'fas fa-gavel' },
  { path: '/admin/rounds', label: 'จัดการรอบการประกวด', icon: 'fas fa-sync-alt' },
  { path: '/admin/backup', label: 'สำรองและกู้คืนข้อมูล', icon: 'fas fa-database' },
];

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { appUser, logout } = useAuth();
  const navigate = useNavigate();

  // Set the standard body classes for AdminLTE
  useEffect(() => {
    document.body.className = 'hold-transition sidebar-mini layout-fixed';
    return () => {
      document.body.className = '';
    };
  }, []);

  // Sync collapsed state with document.body class list
  useEffect(() => {
    if (sidebarCollapsed) {
      document.body.classList.add('sidebar-collapse');
    } else {
      document.body.classList.remove('sidebar-collapse');
    }
  }, [sidebarCollapsed]);

  const handleLogout = () => {
    logout();
    toast.success('ออกจากระบบสำเร็จ');
    navigate('/login');
  };

  return (
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light border-bottom shadow-sm">
        {/* Left navbar links */}
        <ul className="navbar-nav">
          <li className="nav-item">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="nav-link border-0 bg-transparent"
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-bars"></i>
            </button>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <span className="nav-link font-weight-bold text-dark mb-0">
              S-TECH FRESHMEN AND BRAND AMBRASSADOR
            </span>
          </li>
        </ul>


      </nav>

      {/* Main Sidebar Container */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
        {/* Brand Logo */}
        <a href="#" className="brand-link d-flex align-items-center" onClick={e => e.preventDefault()} style={{ height: 'auto', minHeight: '56px', padding: '10px 15px' }}>
          <img
            src="/LOGO_SERIRACHA_COLOR_TRANERENT (1).png"
            alt="College Logo"
            className="brand-image img-circle elevation-3 mr-2"
            style={{ width: '33px', height: '33px', objectFit: 'contain', backgroundColor: 'white', padding: '2px', marginLeft: '12px' }}
          />
          <span className="brand-text font-weight-bold text-white tracking-wide" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: '1.2' }}>
            S-TECH FRESHMEN AND<br />BRAND AMBRASSADOR
          </span>
        </a>

        {/* Sidebar */}
        <div className="sidebar">
          {/* Sidebar user panel */}
          <div className="user-panel mt-3 pb-3 mb-3 d-flex align-items-center">
            <div className="image">
              <div
                className="img-circle elevation-2 bg-primary text-white d-flex align-items-center justify-content-center font-weight-bold"
                style={{ width: '34px', height: '34px', fontSize: '14px' }}
              >
                {appUser?.displayName?.charAt(0) || 'A'}
              </div>
            </div>
            <div className="info ml-2">
              <a href="#" className="d-block font-weight-bold text-white" onClick={e => e.preventDefault()}>
                {appUser?.displayName || 'Admin'}
              </a>
              <span className="text-muted text-xs font-semibold">Administrator</span>
            </div>
          </div>

          {/* Sidebar Menu */}
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
              {navItems.map((item) => (
                <li className="nav-item" key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <i className={`nav-icon ${item.icon}`}></i>
                    <p className="mb-0 ml-1">{item.label}</p>
                  </NavLink>
                </li>
              ))}

              <li className="nav-header text-uppercase mt-3" style={{ fontSize: '10px', color: '#6c757d' }}>Account</li>
              <li className="nav-item">
                <button
                  onClick={handleLogout}
                  className="nav-link text-left border-0 bg-transparent text-danger w-100 d-flex align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <i className="nav-icon fas fa-sign-out-alt"></i>
                  <p className="mb-0 ml-2">ออกจากระบบ</p>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content Wrapper */}
      <div className="content-wrapper bg-light py-4" style={{ minHeight: 'calc(100vh - 112px)' }}>
        {/* Main content */}
        <section className="content">
          <div className="container-fluid">
            <Outlet />
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="main-footer text-xs py-3 px-4 border-top bg-white">
        <strong>Copyright &copy; 2026 S-TECH FRESHMEN AND BRAND AMBRASSADOR.</strong> All rights reserved.
        <div className="float-right d-none d-sm-inline-block">
          <b>AdminLTE Theme</b> v3.2.0
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
