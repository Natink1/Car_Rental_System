import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as dashboardApi from '../../api/dashboard';
import * as adminApi from '../../api/admin';
import { getImageUrl } from '../../utils/imageUrl';
import { formatBirr } from '../../utils/currency';

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingCars, setPendingCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getAdmin().then((data) => setStats(data)).catch(() => {});
    adminApi.getCarsPending().then((data) => setPendingCars(Array.isArray(data) ? data : [])).catch(() => setPendingCars([]));
  }, []);

  useEffect(() => {
    if (!stats) return;
    setLoading(false);
  }, [stats]);

  const handleApprove = async (id) => {
    await adminApi.carApprove(id);
    setPendingCars((prev) => prev.filter((c) => c.id !== id));
    if (stats) setStats((s) => ({ ...s, pending_approvals: Math.max(0, (s.pending_approvals || 0) - 1) }));
    window.dispatchEvent(new Event('admin-pending-changed'));
  };

  const handleReject = async (id) => {
    await adminApi.carReject(id);
    setPendingCars((prev) => prev.filter((c) => c.id !== id));
    if (stats) setStats((s) => ({ ...s, pending_approvals: Math.max(0, (s.pending_approvals || 0) - 1) }));
    window.dispatchEvent(new Event('admin-pending-changed'));
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="container">
      <h1 className="section-title">Admin Dashboard</h1>
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Link to="/chat" className="btn btn-primary">Open Chat</Link>
        <Link to="/admin/users" className="btn btn-secondary">Users</Link>
      </div>

      {(stats?.pending_approvals ?? 0) > 0 && (
        <div className="dashboard-alert dashboard-alert-pending" style={{ marginBottom: '1.5rem' }}>
          <span className="dashboard-alert-text">
            <strong>{stats.pending_approvals}</strong> vehicle{stats.pending_approvals !== 1 ? 's' : ''} pending approval
          </span>
        </div>
      )}

      <div className="grid grid-2 grid-4" style={{ marginBottom: '2rem', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total users</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.total_users ?? 0}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total cars</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.total_cars ?? 0}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pending approvals</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.pending_approvals ?? 0}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total bookings</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.total_bookings ?? 0}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{formatBirr(stats?.total_revenue ?? 0)}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Pending vehicles</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Cars waiting for approval. Click &quot;View details&quot; to see full info and the owner who requested.</p>
      <div className="grid">
        {pendingCars.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No pending vehicles.</p>}
        {pendingCars.map((car) => (
          <div key={car.id} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 100, height: 70, background: '#e2e8f0', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {getImageUrl(car.image) ? <img src={getImageUrl(car.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>No image</div>}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <strong>{car.brand} {car.model}</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{car.year} · {formatBirr(car.price_per_day)}/day</p>
              {car.owner && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 500 }}>
                  Requested by: {car.owner.name} ({car.owner.email})
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link to={`/admin/cars/${car.id}`} className="btn btn-secondary">View details</Link>
              <button type="button" className="btn btn-primary" onClick={() => handleApprove(car.id)}>Approve</button>
              <button type="button" className="btn btn-secondary" onClick={() => handleReject(car.id)}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
