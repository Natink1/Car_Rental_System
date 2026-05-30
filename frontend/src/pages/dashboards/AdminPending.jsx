import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as adminApi from '../../api/admin';
import { getImageUrl } from '../../utils/imageUrl';
import { formatBirr } from '../../utils/currency';
import DashboardNav from '../../components/DashboardNav';
import { ConfirmModal } from '../../components/ConfirmModal';

export function AdminPending() {
  const [pendingCars, setPendingCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveCar, setApproveCar] = useState(null);
  const [rejectCar, setRejectCar] = useState(null);

  const fetch = () => {
    adminApi.getCarsPending()
      .then((data) => setPendingCars(Array.isArray(data) ? data : []))
      .catch(() => setPendingCars([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleApprove = async () => {
    if (!approveCar?.id) return;

    await adminApi.carApprove(approveCar.id);
    setPendingCars((prev) => prev.filter((c) => c.id !== approveCar.id));
    setApproveCar(null);
    window.dispatchEvent(new Event('admin-pending-changed'));
  };

  const handleReject = async () => {
    if (!rejectCar?.id) return;

    await adminApi.carReject(rejectCar.id);
    setPendingCars((prev) => prev.filter((c) => c.id !== rejectCar.id));
    setRejectCar(null);
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
                  <button type="button" className="btn btn-primary" onClick={() => setApproveCar(car)}>Approve</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setRejectCar(car)}>Reject</button>
                </div>
              </div>
            ))}
          </div>

          <ConfirmModal
            open={!!approveCar}
            onClose={() => setApproveCar(null)}
            onConfirm={handleApprove}
            title="Approve vehicle"
            message={`Approve ${approveCar?.brand ?? 'this car'} ${approveCar?.model ?? ''}? This will make it visible to customers.`}
            confirmLabel="Approve"
            cancelLabel="Cancel"
            variant="primary"
          />

          <ConfirmModal
            open={!!rejectCar}
            onClose={() => setRejectCar(null)}
            onConfirm={handleReject}
            title="Reject vehicle"
            message={`Reject ${rejectCar?.brand ?? 'this car'} ${rejectCar?.model ?? ''}? The owner will need to make changes before resubmitting.`}
            confirmLabel="Reject"
            cancelLabel="Keep"
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
}

export default AdminPending;
