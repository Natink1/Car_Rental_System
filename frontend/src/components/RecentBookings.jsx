import React from 'react';
import { getImageUrl } from '../utils/imageUrl';
import { formatDisplayDate } from '../utils/dateFormat';
import { formatBirr } from '../utils/currency';

export function RecentBookings({ title = 'Recent bookings', bookings = [], limit = 5 }) {
  const list = (bookings || []).slice(0, limit);

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{title}</div>
      {list.length === 0 ? (
        <div style={{ color: 'var(--text-muted)' }}>No recent bookings</div>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {list.map((b) => (
            <div key={b.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ width: 56, height: 40, background: '#e2e8f0', borderRadius: 'var(--radius)', overflow: 'hidden', flexShrink: 0 }}>
                {b.car?.image ? <img src={getImageUrl(b.car.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{b.car?.brand} {b.car?.model}</div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{b.user?.name ?? b.user?.email ?? 'Customer'} · {formatDisplayDate(b.start_date)} – {formatDisplayDate(b.end_date)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{formatBirr(b.total_price ?? 0)}</div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{b.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentBookings;
