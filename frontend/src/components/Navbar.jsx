import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { ChangePasswordModal } from './ChangePasswordModal';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    const fetchUnread = () => {
      api.get('/conversations')
        .then(({ data }) => {
          const list = Array.isArray(data) ? data : [];
          const total = list.reduce((sum, c) => sum + (c.unread_count || 0), 0);
          setUnreadCount(total);
        })
        .catch(() => setUnreadCount(0));
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    const onUnreadChanged = () => fetchUnread();
    window.addEventListener('chat-unread-changed', onUnreadChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('chat-unread-changed', onUnreadChanged);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-text">NHK Car-Rental</span>
        </Link>
        <nav className="navbar-links">
          <Link to="/">Home</Link>
          <Link to="/cars">Cars</Link>
          {isAuthenticated && (
            <>
              <Link to="/chat" className="navbar-chat-link">
                Chat
                {unreadCount > 0 && (
                  <span className="navbar-chat-badge" aria-label={`${unreadCount} unread messages`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              {user?.role === 'customer' && <Link to="/customer/dashboard">Dashboard</Link>}
              {user?.role === 'owner' && (
                <>
                  <Link to="/owner/dashboard">Dashboard</Link>
                  <Link to="/owner/cars/new">Add car</Link>
                </>
              )}
              {user?.role === 'admin' && <Link to="/admin/dashboard">Dashboard</Link>}
              <span className="navbar-divider" aria-hidden="true" />
              <div className="navbar-profile-wrap" ref={profileRef}>
                <button
                  type="button"
                  className="navbar-profile-trigger"
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  title="Profile menu"
                >
                  <span className="navbar-profile-avatar" aria-hidden="true">
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span className="navbar-profile-name">{user?.name || 'User'}</span>
                </button>
                {profileOpen && (
                  <div className="navbar-profile-dropdown" role="menu">
                    <button
                      type="button"
                      className="navbar-profile-item"
                      role="menuitem"
                      onClick={() => { setProfileOpen(false); setShowChangePasswordModal(true); }}
                    >
                      Change password
                    </button>
                    <button
                      type="button"
                      className="navbar-profile-item"
                      role="menuitem"
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
              <ChangePasswordModal open={showChangePasswordModal} onClose={() => setShowChangePasswordModal(false)} />
            </>
          )}
          {!isAuthenticated && (
            <>
              <span className="navbar-divider" aria-hidden="true" />
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
