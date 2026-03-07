import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as dashboardApi from '../../api/dashboard';
import * as adminsApi from '../../api/admins';
import * as conversationsApi from '../../api/conversations';
import * as carsApi from '../../api/cars';
import * as bookingsApi from '../../api/bookings';
import { formatDisplayDate } from '../../utils/dateFormat';
import { getImageUrl } from '../../utils/imageUrl';
import { ConfirmModal } from '../../components/ConfirmModal';

export function OwnerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({ cars: [], active_bookings: [], earnings: 0 });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmCarId, setDeleteConfirmCarId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    dashboardApi.getOwner().then((d) => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    adminsApi.list().then((list) => setAdmins(Array.isArray(list) ? list : [])).catch(() => setAdmins([]));
  }, []);

  const startChatWithAdmin = async () => {
    const admin = admins[0];
    if (!admin) return;
    try {
      const conv = await conversationsApi.create({ user_id: admin.id });
      navigate(`/chat?conversation=${conv.id}`);
    } catch (_) {}
  };

  const statusClass = (s) => {
    if (s === 'pending') return 'badge-pending';
    if (s === 'approved') return 'badge-approved';
    return 'badge-rejected';
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const carsApproved = data.cars_approved || [];
  const carsPending = data.cars_pending || [];
  const bookings = data.active_bookings || [];
  const pendingApprovalCount = bookings.filter((b) => b.status === 'pending').length;
  const rejectedCarsCount = (data.cars_pending || []).filter((c) => c.status === 'rejected').length;

  const refreshData = () => {
    dashboardApi.getOwner().then((d) => setData(d)).catch(() => {});
  };

  const handleDeleteCarClick = (carId) => {
    setDeleteError('');
    setDeleteConfirmCarId(carId);
  };

  const handleDeleteCarConfirm = async () => {
    if (!deleteConfirmCarId) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await carsApi.deleteCar(deleteConfirmCarId);
      setDeleteConfirmCarId(null);
      refreshData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not delete car.');
      throw err;
    } finally {
      setDeleteLoading(false);
    }
  };

  const CarCard = ({ car }) => (
    <div key={car.id} className="card" style={{ position: 'relative' }}>
      <Link to={`/cars/${car.id}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
        <div style={{ aspectRatio: '16/10', background: '#e2e8f0' }}>
          {getImageUrl(car.image) ? <img src={getImageUrl(car.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No image</div>}
        </div>
        <div style={{ padding: '1rem' }}>
          <strong>{car.brand} {car.model}</strong>
          <span className={`badge ${statusClass(car.status)}`} style={{ marginLeft: '0.5rem' }}>{car.status}</span>
        </div>
      </Link>
      {car.can_owner_edit && (
        <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {car.status === 'rejected' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => { try { await carsApi.reapply(car.id); refreshData(); window.dispatchEvent(new Event('owner-rejected-changed')); } catch (_) {} }}
            >
              Reapply listing
            </button>
          )}
          <Link to={`/owner/cars/${car.id}/edit`} className="btn btn-secondary">Edit</Link>
          <button type="button" className="btn btn-secondary" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => handleDeleteCarClick(car.id)}>Delete</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="container">
      <h1 className="section-title">Owner Dashboard</h1>
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Link to="/chat" className="btn btn-primary">Open Chat</Link>
        {admins[0] && (
          <button type="button" className="btn btn-secondary" onClick={startChatWithAdmin}>Chat with Admin</button>
        )}
        <Link to="/owner/cars/new" className="btn btn-secondary">Add car</Link>
      </div>

      {deleteError && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: 'rgba(220, 38, 38, 0.1)', borderColor: '#dc2626' }}>
          {deleteError}
          <button type="button" className="btn btn-secondary" style={{ marginLeft: '0.75rem' }} onClick={() => setDeleteError('')}>Dismiss</button>
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Earnings summary</h2>
        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>${Number(data.earnings || 0).toFixed(2)}</p>
      </div>

      {rejectedCarsCount > 0 && (
        <div className="dashboard-alert dashboard-alert-rejected" style={{ marginBottom: '1.5rem' }}>
          <span className="dashboard-alert-text">
            <strong>{rejectedCarsCount}</strong> listing{rejectedCarsCount !== 1 ? 's' : ''} rejected — reapply below
          </span>
        </div>
      )}

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        Active bookings (your cars)
        {pendingApprovalCount > 0 && (
          <span className="badge badge-pending" style={{ fontSize: '0.8rem' }}>
            {pendingApprovalCount} need approval
          </span>
        )}
      </h2>
      <div className="grid" style={{ marginBottom: '2rem' }}>
        {bookings.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No active bookings.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 80, height: 56, background: '#e2e8f0', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {getImageUrl(b.car?.image) && <img src={getImageUrl(b.car.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <strong>{b.car?.brand} {b.car?.model}</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {formatDisplayDate(b.start_date)} – {formatDisplayDate(b.end_date)} · {b.user?.name}
              </p>
            </div>
            <span className={`badge ${b.status === 'pending' ? 'badge-pending' : 'badge-approved'}`}>{b.status}</span>
            {b.status === 'pending' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-primary" onClick={async () => { await bookingsApi.approve(b.id); window.location.reload(); }}>Approve</button>
                <button type="button" className="btn btn-secondary" onClick={async () => { await bookingsApi.reject(b.id); window.location.reload(); }}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Approved cars</h2>
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        {carsApproved.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No approved cars.</p>}
        {carsApproved.map((car) => <CarCard key={car.id} car={car} />)}
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Pending / Rejected</h2>
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        {carsPending.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No pending or rejected cars.</p>}
        {carsPending.map((car) => <CarCard key={car.id} car={car} />)}
      </div>

      <ConfirmModal
        open={!!deleteConfirmCarId}
        onClose={() => { setDeleteConfirmCarId(null); setDeleteError(''); }}
        onConfirm={handleDeleteCarConfirm}
        title="Delete car"
        message="Delete this car? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
