import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const JudgeLayout = () => {
  const { appUser, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Set the standard body classes for AdminLTE Top Nav layout
  useEffect(() => {
    document.body.className = 'hold-transition layout-top-nav';
    return () => {
      document.body.className = '';
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('ออกจากระบบสำเร็จ');
    navigate('/login');
  };

  return (
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand-md navbar-light navbar-white border-bottom shadow-sm">
        <div className="container">
          <NavLink to="/judge" className="navbar-brand d-flex align-items-center gap-2 text-decoration-none">
            <img
              src="/LOGO_SERIRACHA_COLOR_TRANERENT (1).png"
              alt="College Logo"
              className="brand-image img-circle elevation-3"
              style={{ width: '33px', height: '33px', objectFit: 'contain', backgroundColor: 'white', padding: '1px' }}
            />
            <span className="brand-text font-weight-bold text-dark ml-2">Freshy Scoring</span>
          </NavLink>

          {/* Right navbar links */}
          <ul className="navbar-nav ml-auto">
            <li className="nav-item dropdown">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="btn btn-default btn-sm font-weight-bold d-flex align-items-center border-gray-300 shadow-xxs"
                style={{ gap: '8px', cursor: 'pointer' }}
              >
                <div className="img-circle bg-primary text-white d-flex align-items-center justify-content-center text-xs font-bold" style={{ width: '26px', height: '26px' }}>
                  {appUser?.displayName?.charAt(0) || 'J'}
                </div>
                <span className="d-none d-sm-inline-block text-dark ml-1">{appUser?.displayName}</span>
              </button>

              {menuOpen && (
                <>
                  <div className="position-fixed" style={{ inset: 0, zIndex: 1040 }} onClick={() => setMenuOpen(false)} />
                  <div className="dropdown-menu dropdown-menu-right show shadow-md border-gray-200 mt-2 p-0" style={{ zIndex: 1050, position: 'absolute', right: 0 }}>
                    <div className="p-3 border-bottom bg-light">
                      <p className="font-weight-bold text-dark mb-0 text-sm">{appUser?.displayName}</p>
                      <p className="text-muted text-xs mb-0">@{appUser?.username}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="dropdown-item text-danger font-weight-bold text-xs py-2.5 d-flex align-items-center gap-2 border-0 bg-transparent text-left"
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="fas fa-sign-out-alt mr-1"></i> ออกจากระบบ
                    </button>
                  </div>
                </>
              )}
            </li>
          </ul>
        </div>
      </nav>

      {/* Content Wrapper */}
      <div className="content-wrapper bg-light py-4" style={{ minHeight: 'calc(100vh - 112px)' }}>
        {/* Main content */}
        <section className="content">
          <div className="container">
            <Outlet />
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="main-footer text-center text-xs py-3 px-4 border-top bg-white">
        <strong>Copyright &copy; 2026 Freshy Scoring.</strong> All rights reserved.
        <div className="float-right d-none d-sm-inline-block">
          <b>AdminLTE TopNav</b> v3.2.0
        </div>
      </footer>
    </div>
  );
};

export default JudgeLayout;
