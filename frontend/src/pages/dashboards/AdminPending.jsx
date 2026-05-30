import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as adminApi from '../../api/admin';
import { getImageUrl } from '../../utils/imageUrl';
import { formatBirr } from '../../utils/currency';
import DashboardNav from '../../components/DashboardNav';

export function AdminPending() {
  const [pendingCars, setPendingCars] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    adminApi.getCarsPending()
      .then((data) => setPendingCars(Array.isArray(data) ? data : []))
      .catch(() => setPendingCars([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleApprove = async (id) => {
    await adminApi.carApprove(id);
    setPendingCars((prev) => prev.filter((c) => c.id !== id));
    window.dispatchEvent(new Event('admin-pending-changed'));
  };

  const handleReject = async (id) => {
    await adminApi.carReject(id);
    setPendingCars((prev) => prev.filter((c) => c.id !== id));
    window.dispatchEvent(new Event('admin-pending-changed'));
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="container">
      <div className="dashboard-shell">
        <DashboardNav sections={[
          { id: 'overview', label: 'Overview', to: '/admin/dashboard' },
          { id: 'pending', label: 'Pending vehicles', to: '/admin/pending' },
          { id: 'bookings', label: 'Bookings', to: '/admin/bookings' },
        ]} />
        <div className="dashboard-content">
          <h1 className="section-title">Pending vehicles</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Cars waiting for approval. Click "View details" to see full info and the owner who requested.</p>

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
      </div>
    </div>
  );
}

export default AdminPending;
