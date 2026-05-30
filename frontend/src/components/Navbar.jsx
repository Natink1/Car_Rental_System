import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import * as conversationsApi from "../api/conversations";
import * as dashboardApi from "../api/dashboard";
import { ChangePasswordModal } from "./ChangePasswordModal";

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [ownerPendingApprovals, setOwnerPendingApprovals] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [customerPendingCount, setCustomerPendingCount] = useState(0);
  const [customerUnpaidCount, setCustomerUnpaidCount] = useState(0);
  const [ownerUnpaidCount, setOwnerUnpaidCount] = useState(0);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setPendingApprovals(0);
      setOwnerPendingApprovals(0);
      setRejectedCount(0);
      setCustomerPendingCount(0);
      setCustomerUnpaidCount(0);
      setOwnerUnpaidCount(0);
      return;
    }
    const fetchUnread = () => {
      conversationsApi
        .list()
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          const total = list.reduce((sum, c) => sum + (c.unread_count || 0), 0);
          setUnreadCount(total);
        })
        .catch(() => setUnreadCount(0));
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    const onUnreadChanged = () => fetchUnread();
    window.addEventListener("chat-unread-changed", onUnreadChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener("chat-unread-changed", onUnreadChanged);
    };
  }, [isAuthenticated]);

  const fetchAdminPending = () => {
    if (user?.role !== "admin") return;
    dashboardApi
      .getAdmin()
      .then((data) => setPendingApprovals(data?.pending_approvals ?? 0))
      .catch(() => setPendingApprovals(0));
  };
  const isPaid = (b) =>
    (b?.payments || []).some((p) => p?.payment_status === "completed");

  const fetchOwnerIndicators = () => {
    if (user?.role !== "owner") return;
    dashboardApi
      .getOwner()
      .then((data) => {
        const bookings = Array.isArray(data?.active_bookings)
          ? data.active_bookings
          : [];
        const pending = bookings.filter((b) => b?.status === "pending").length;
        const unpaid = bookings.filter(
          (b) => b?.status === "approved" && !isPaid(b)
        ).length;
        setOwnerPendingApprovals(pending);
        setRejectedCount(data?.rejected_count ?? 0);
        setOwnerUnpaidCount(unpaid);
      })
      .catch(() => {
        setOwnerPendingApprovals(0);
        setRejectedCount(0);
        setOwnerUnpaidCount(0);
      });
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") return;
    fetchAdminPending();
    const onChanged = () => fetchAdminPending();
    window.addEventListener("admin-pending-changed", onChanged);
    return () => window.removeEventListener("admin-pending-changed", onChanged);
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "owner") return;
    fetchOwnerIndicators();
    const interval = setInterval(fetchOwnerIndicators, 15000);
    const onChanged = () => fetchOwnerIndicators();
    window.addEventListener("owner-pending-changed", onChanged);
    window.addEventListener("owner-rejected-changed", onChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener("owner-pending-changed", onChanged);
      window.removeEventListener("owner-rejected-changed", onChanged);
    };
  }, [isAuthenticated, user?.role]);

  const fetchCustomerPending = () => {
    if (user?.role !== "customer") return;
    dashboardApi
      .getCustomer()
      .then((data) => {
        const bookings = Array.isArray(data?.active_bookings) ? data.active_bookings : [];
        const pending = bookings.filter((b) => b?.status === "pending").length;
        const unpaid = bookings.filter(
          (b) => b?.status === "approved" && !isPaid(b)
        ).length;
        setCustomerPendingCount(pending);
        setCustomerUnpaidCount(unpaid);
      })
      .catch(() => {
        setCustomerPendingCount(0);
        setCustomerUnpaidCount(0);
      });
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "customer") return;
    fetchCustomerPending();
    const interval = setInterval(fetchCustomerPending, 15000);
    const onChanged = () => fetchCustomerPending();
    window.addEventListener("customer-pending-changed", onChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener("customer-pending-changed", onChanged);
    };
  }, [isAuthenticated, user?.role]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const formatRole = (role) => {
    if (!role) return "User";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <>
      <header className={`navbar${isHomePage ? " navbar--overlay" : ""}`}>
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
                    <span
                      className="navbar-chat-badge"
                      aria-label={`${unreadCount} unread messages`}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
                {user?.role === "customer" && (
                  <>
                    <Link to="/customer/dashboard">
                      Dashboard
                      {customerPendingCount > 0 && (
                        <span className="navbar-dashboard-badge navbar-badge-pending" aria-label={`${customerPendingCount} pending order${customerPendingCount > 1 ? "s" : ""}`}>
                          {customerPendingCount}
                        </span>
                      )}
                      {customerUnpaidCount > 0 && (
                        <span className="navbar-dashboard-badge navbar-badge-unpaid" aria-label={`${customerUnpaidCount} unpaid`}>
                          {customerUnpaidCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}
                {user?.role === "owner" && (
                  <>
                    <Link to="/owner/dashboard">
                      Dashboard
                      {ownerPendingApprovals > 0 && (
                        <span className="navbar-dashboard-badge navbar-badge-pending">
                          {ownerPendingApprovals}
                        </span>
                      )}
                      {ownerPendingApprovals === 0 && rejectedCount > 0 && (
                        <span className="navbar-dashboard-badge navbar-badge-rejected">
                          {rejectedCount}
                        </span>
                      )}
                      {ownerUnpaidCount > 0 && (
                        <span className="navbar-dashboard-badge navbar-badge-unpaid" aria-label={`${ownerUnpaidCount} unpaid`}>
                          {ownerUnpaidCount}
                        </span>
                      )}
                    </Link>
                    {/* booking history moved to sidebar; keep navbar cleaner */}
                  </>
                )}
                {user?.role === "admin" && (
                  <Link to="/admin/dashboard">
                    Dashboard
                    {pendingApprovals > 0 && (
                      <span className="navbar-dashboard-badge navbar-badge-pending">
                        {pendingApprovals}
                      </span>
                    )}
                  </Link>
                )}
                <span className="navbar-divider" aria-hidden="true" />
                <div className="navbar-profile-wrap" ref={profileRef}>
                  <button
                    type="button"
                    className="navbar-profile-trigger"
                    onClick={() => setProfileOpen((o) => !o)}
                    aria-expanded={profileOpen}
                    title="Profile info"
                  >
                    <span className="navbar-profile-avatar" aria-hidden="true">
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </span>
                    <span className="navbar-profile-name">
                      {user?.name || "User"}
                    </span>
                  </button>
                  {profileOpen && (
                    <div
                      className="navbar-profile-dropdown"
                      role="menu"
                      style={{ minWidth: 260, padding: "0.75rem" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          marginBottom: "0.85rem",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "999px",
                            background: "rgba(29, 78, 216, 0.12)",
                            color: "#1d4ed8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {(user?.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }}>
                            {user?.name || "N/A"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {formatRole(user?.role)}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginBottom: "0.85rem",
                          paddingBottom: "0.85rem",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.76rem",
                            color: "var(--text-muted)",
                            marginBottom: "0.2rem",
                          }}
                        >
                          Email
                        </div>
                        <div
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: 500,
                            wordBreak: "break-word",
                          }}
                        >
                          {user?.email || "N/A"}
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: "0.35rem" }}>
                        <button
                          type="button"
                          className="navbar-profile-item"
                          role="menuitem"
                          onClick={() => {
                            setProfileOpen(false);
                            setShowChangePasswordModal(true);
                          }}
                        >
                          Change password
                        </button>
                        <button
                          type="button"
                          className="navbar-profile-item"
                          role="menuitem"
                          onClick={() => {
                            setProfileOpen(false);
                            handleLogout();
                          }}
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <ChangePasswordModal
                  open={showChangePasswordModal}
                  onClose={() => setShowChangePasswordModal(false)}
                />
              </>
            )}
            {!isAuthenticated && (
              <>
                <span className="navbar-divider" aria-hidden="true" />
                <Link to="/login">Login</Link>
                <Link to="/register" className="btn btn-primary">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
