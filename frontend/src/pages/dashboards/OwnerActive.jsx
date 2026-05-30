import { useEffect, useState } from 'react';
import * as bookingsApi from '../../api/bookings';
import { formatDisplayDate } from '../../utils/dateFormat';
import { getImageUrl } from '../../utils/imageUrl';
import { PaymentReceiptActions } from '../../components/PaymentReceiptActions';

export default function OwnerActive() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsApi.list().then((d) => setBookings(Array.isArray(d) ? d : [])).catch(() => setBookings([])).finally(() => setLoading(false));
  }, []);

  const isPaid = (booking) => (booking.payments || []).some((p) => p.payment_status === 'completed');

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const pending = bookings.filter((b) => b.status === 'pending');
  const unpaid = bookings.filter((b) => b.status === 'approved' && !isPaid(b));
  const paid = bookings.filter((b) => b.status === 'approved' && isPaid(b));

  return (
    <div className="container">
      <h1 className="section-title">Active bookings</h1>

      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#c2410c' }}>Needs approval</h3>
      <div className="grid" style={{ marginBottom: '1.5rem' }}>
        {pending.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>No bookings waiting for approval.</p>}
        {pending.map((b) => (
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
            <span className="badge badge-pending">pending</span>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#1d4ed8' }}>Unpaid</h3>
      <div className="grid" style={{ marginBottom: '1.5rem' }}>
        {unpaid.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>No unpaid bookings.</p>}
        {unpaid.map((b) => (
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
            <span className="badge badge-unpaid">Unpaid</span>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#065f46' }}>Paid</h3>
      <div className="grid" style={{ marginBottom: '2rem' }}>
        {paid.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>No paid bookings.</p>}
        {paid.map((b) => (
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
            <span className="badge badge-approved">Paid</span>
            <PaymentReceiptActions booking={b} />
          </div>
        ))}
      </div>
    </div>
  );
}
