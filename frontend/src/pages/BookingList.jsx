import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as bookingsApi from '../api/bookings';
import { formatDisplayDate } from '../utils/dateFormat';
import { getImageUrl } from '../utils/imageUrl';

export function BookingList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsApi.list().then((data) => setBookings(Array.isArray(data) ? data : [])).catch(() => setBookings([])).finally(() => setLoading(false));
  }, []);

  const statusClass = (s) => {
    if (s === 'pending') return 'badge-pending';
    if (s === 'approved') return 'badge-approved';
    if (s === 'rejected') return 'badge-rejected';
    return 'badge-cancelled';
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="container">
      <h1 className="section-title">My bookings</h1>
      <div className="grid">
        {bookings.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No bookings yet.</p>}
        {bookings.map((b) => (
          <Link to={`/cars/${b.car_id}`} key={b.id} className="card card-link" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <div style={{ width: 120, height: 80, flexShrink: 0, background: '#e2e8f0', borderRadius: 'var(--radius)' }}>
              {getImageUrl(b.car?.image) ? (
                <img src={getImageUrl(b.car.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>No image</div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{b.car?.brand} {b.car?.model}</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {formatDisplayDate(b.start_date)} – {formatDisplayDate(b.end_date)} · ${b.total_price}
              </p>
            </div>
            <span className={`badge ${statusClass(b.status)}`}>{b.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
