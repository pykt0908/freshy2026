import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginUser } from '../services/authService';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  // Set body class for login page
  useEffect(() => {
    document.body.className = 'hold-transition login-page bg-light';
    return () => {
      document.body.className = '';
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setLoading(true);
    try {
      const user = await loginUser(username, password);
      setUser(user);
      toast.success(`ยินดีต้อนรับคุณ ${user.displayName}`);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/judge');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-box">
      {/* Login Logo */}
      <div className="login-logo text-center mb-3">
        <a href="#" className="d-flex justify-content-center" onClick={(e) => e.preventDefault()}>
          <img
            src="/LOGO_SERIRACHA_COLOR_TRANERENT (1).png"
            alt="College Logo"
            className="img-circle border shadow mx-auto"
            style={{ width: '95px', height: '95px', objectFit: 'contain', backgroundColor: 'white', padding: '4px' }}
          />
        </a>
      </div>

      {/* Login Card */}
      <div className="card card-outline card-primary shadow">
        <div className="card-body login-card-body">
          <p className="login-box-msg text-muted">กรอกข้อมูลบัญชีเพื่อลงชื่อเข้าสู่ระบบ</p>

          <form onSubmit={handleLogin}>
            {/* Username Input Group */}
            <div className="input-group mb-3">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-control"
                placeholder="ชื่อผู้ใช้ (Username)"
              />
              <div className="input-group-append">
                <div className="input-group-text bg-white">
                  <span className="fas fa-user text-muted"></span>
                </div>
              </div>
            </div>

            {/* Password Input Group */}
            <div className="input-group mb-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                placeholder="รหัสผ่าน (Password)"
              />
              <div className="input-group-append">
                <div className="input-group-text bg-white">
                  <span className="fas fa-lock text-muted"></span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="row mt-4">
              <div className="col-12">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-block font-weight-bold"
                >
                  {loading ? (
                    <span className="d-flex align-items-center justify-content-center" style={{ gap: '8px' }}>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      กำลังเข้าสู่ระบบ...
                    </span>
                  ) : (
                    <span><i className="fas fa-key mr-1"></i> เข้าสู่ระบบ</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
