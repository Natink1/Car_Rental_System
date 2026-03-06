import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { getImageUrl } from '../../utils/imageUrl';
import { AdminUsersModal } from '../../components/AdminUsersModal';

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingCars, setPendingCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersModalOpen, setUsersModalOpen] = useState(false);

  useEffect(() => {
    api.get('/dashboard/admin').then(({ data }) => setStats(data)).catch(() => {});
    api.get('/admin/cars/pending').then(({ data }) => setPendingCars(Array.isArray(data) ? data : [])).catch(() => setPendingCars([]));
  }, []);

  useEffect(() => {
    if (!stats) return;
    setLoading(false);
  }, [stats]);

  const handleApprove = async (id) => {
    await api.patch(`/admin/cars/${id}/approve`);
    setPendingCars((prev) => prev.filter((c) => c.id !== id));
    if (stats) setStats((s) => ({ ...s, pending_approvals: Math.max(0, (s.pending_approvals || 0) - 1) }));
  };

  const handleReject = async (id) => {
    await api.patch(`/admin/cars/${id}/reject`);
    setPendingCars((prev) => prev.filter((c) => c.id !== id));
    if (stats) setStats((s) => ({ ...s, pending_approvals: Math.max(0, (s.pending_approvals || 0) - 1) }));
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="container">
      <h1 className="section-title">Admin Dashboard</h1>
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Link to="/chat" className="btn btn-primary">Open Chat</Link>
        <button type="button" className="btn btn-secondary" onClick={() => setUsersModalOpen(true)}>Users</button>
      </div>

      <AdminUsersModal open={usersModalOpen} onClose={() => setUsersModalOpen(false)} />

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
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>${Number(stats?.total_revenue ?? 0).toFixed(2)}</div>
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
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{car.year} · ${car.price_per_day}/day</p>
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
