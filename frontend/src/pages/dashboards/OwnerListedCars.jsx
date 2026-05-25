import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as dashboardApi from '../../api/dashboard';
import * as carsApi from '../../api/cars';
import { getImageUrl } from '../../utils/imageUrl';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function OwnerListedCars() {
  const [data, setData] = useState({ cars_approved: [], cars_pending: [] });
  const [loading, setLoading] = useState(true);
  const [deleteConfirmCarId, setDeleteConfirmCarId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const refreshData = () => {
    setLoading(true);
    dashboardApi.getOwner()
      .then((d) => setData(d || { cars_approved: [], cars_pending: [] }))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshData();
  }, []);

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
          <span className={`badge ${car.status === 'pending' ? 'badge-pending' : car.status === 'approved' ? 'badge-approved' : 'badge-rejected'}`} style={{ marginLeft: '0.5rem' }}>{car.status === 'approved' ? 'Listed' : car.status}</span>
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

  const carsApproved = data.cars_approved || [];
  const carsPending = data.cars_pending || [];

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div>
      <h1 className="section-title">My Listed Cars</h1>

      {deleteError && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: 'rgba(220, 38, 38, 0.1)', borderColor: '#dc2626' }}>
          {deleteError}
          <button type="button" className="btn btn-secondary" style={{ marginLeft: '0.75rem' }} onClick={() => setDeleteError('')}>Dismiss</button>
        </div>
      )}

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Listed cars</h2>
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        {carsApproved.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No listed cars.</p>}
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
