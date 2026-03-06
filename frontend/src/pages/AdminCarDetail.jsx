import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getImageUrl } from '../utils/imageUrl';

const FUEL = { petrol: 'Petrol', diesel: 'Diesel', electric: 'Electric', hybrid: 'Hybrid' };
const TRANS = { automatic: 'Automatic', manual: 'Manual' };
const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120"%3E%3Crect fill="%23e2e8f0" width="200" height="120"/%3E%3Ctext fill="%2394a3b8" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="14"%3ENo image%3C/text%3E%3C/svg%3E';

export function AdminCarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/cars/${id}`)
      .then(({ data }) => setCar(data))
      .catch(() => setCar(null))
      .finally(() => setLoading(false));
  }, [id]);

  const images = car?.images?.length ? car.images : (car?.image ? [car.image] : []);
  const resolvedImages = images.map((u) => getImageUrl(u)).filter(Boolean);
  const currentImage = getImageUrl(resolvedImages[galleryIndex] || car?.image) || FALLBACK_IMAGE;

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/cars/${id}/approve`);
      setCar((c) => (c ? { ...c, status: 'approved' } : null));
      navigate('/admin/dashboard');
    } catch (err) {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/cars/${id}/reject`);
      setCar((c) => (c ? { ...c, status: 'rejected' } : null));
      navigate('/admin/dashboard');
    } catch (err) {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-loading"><div className="spinner" /></div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="container">
        <p>Car not found.</p>
        <Link to="/admin/dashboard" className="btn btn-primary">Back to dashboard</Link>
      </div>
    );
  }

  const isPending = car.status === 'pending';

  return (
    <div className="container">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/admin/dashboard" className="btn btn-secondary">← Back to dashboard</Link>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem', color: 'var(--text-muted)' }}>Requested by</h2>
        <p style={{ margin: 0, fontSize: '1.125rem' }}>
          <strong>{car.owner?.name ?? 'Unknown'}</strong>
          {car.owner?.email && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({car.owner.email})</span>}
        </p>
        {car.owner?.id && <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>User ID: {car.owner.id}</p>}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden', padding: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
          {resolvedImages.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              {resolvedImages.map((src, i) => (
                <button key={i} type="button" onClick={() => setGalleryIndex(i)} style={{ width: 56, height: 42, border: galleryIndex === i ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer', padding: 0 }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = FALLBACK_IMAGE; }} />
                </button>
              ))}
            </div>
          )}
          <div style={{ width: '100%', maxWidth: 800, aspectRatio: '16/10', background: '#e2e8f0' }}>
            <img src={currentImage} alt={`${car.brand} ${car.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = FALLBACK_IMAGE; }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem' }}>{car.brand} {car.model}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {car.year} · {TRANS[car.transmission] || car.transmission} · {FUEL[car.fuel_type] || car.fuel_type} · {car.seats} seats
        </p>
        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
          ${Number(car.price_per_day).toFixed(2)} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ day</span>
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <span className={`badge ${car.status === 'approved' ? 'badge-approved' : car.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>{car.status}</span>
        </p>
      </div>

      {isPending && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Approve or reject</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button type="button" className="btn btn-primary" disabled={actionLoading} onClick={handleApprove}>Approve</button>
            <button type="button" className="btn btn-secondary" disabled={actionLoading} onClick={handleReject}>Reject</button>
          </div>
        </div>
      )}
    </div>
  );
}
