import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as dashboardApi from '../../api/dashboard';
import * as adminApi from '../../api/admin';
import * as bookingsApi from '../../api/bookings';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getImageUrl } from '../../utils/imageUrl';
import { formatBirr } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/dateFormat';

function bookingStatusClass(status) {
  if (status === 'pending') return 'badge-pending';
  if (status === 'approved') return 'badge-approved';
  if (status === 'rejected') return 'badge-rejected';
  return 'badge-cancelled';
}

function groupBookingsByOwner(bookings) {
  const grouped = new Map();

  bookings.forEach((booking) => {
    const owner = booking?.car?.owner;
    const ownerKey = owner?.id ?? 'unknown-owner';

    if (!grouped.has(ownerKey)) {
      grouped.set(ownerKey, {
        owner: owner ?? { name: 'Unknown owner', email: null },
        bookings: [],
      });
    }

    grouped.get(ownerKey).bookings.push(booking);
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const ownerA = a.owner?.name ?? '';
    const ownerB = b.owner?.name ?? '';
    return ownerA.localeCompare(ownerB);
  });
}

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingCars, setPendingCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshBookings = () => {
    bookingsApi
      .list()
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]));
  };

  useEffect(() => {
    dashboardApi.getAdmin().then((data) => setStats(data)).catch(() => {});
    adminApi.getCarsPending().then((data) => setPendingCars(Array.isArray(data) ? data : [])).catch(() => setPendingCars([]));
    refreshBookings();
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

  const handleConfirmCancelBooking = async () => {
    if (!cancelBooking?.id) return;

    setCancelLoading(true);
    try {
      const response = await bookingsApi.cancel(cancelBooking.id);
      setBookings((prev) => prev.map((booking) => (
        booking.id === cancelBooking.id ? { ...booking, ...(response?.booking ?? {}), status: 'cancelled' } : booking
      )));
    } finally {
      setCancelLoading(false);
    }
  };

  const bookingsByOwner = groupBookingsByOwner(bookings);

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

      <h2 style={{ fontSize: '1.25rem', margin: '2rem 0 1rem' }}>All bookings by owner</h2>
      <div className="grid" style={{ gap: '1rem' }}>
        {bookingsByOwner.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No bookings yet.</p>}
        {bookingsByOwner.map(({ owner, bookings: ownerBookings }) => (
          <div key={owner?.id ?? owner?.email ?? 'unknown-owner'} className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{owner?.name ?? 'Unknown owner'}</h3>
                {owner?.email && (
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{owner.email}</p>
                )}
              </div>
              <span className="badge badge-unpaid">{ownerBookings.length} booking{ownerBookings.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid" style={{ gap: '0.75rem' }}>
              {ownerBookings.map((booking) => (
                <div key={booking.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.85rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <Link to={`/cars/${booking.car_id}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 220, color: 'inherit', textDecoration: 'none' }}>
                    <div style={{ width: 92, height: 62, flexShrink: 0, background: '#e2e8f0', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                      {booking?.car?.image && getImageUrl(booking.car.image) ? (
                        <img src={getImageUrl(booking.car.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>No image</div>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong>{booking?.car?.brand ?? 'Car'} {booking?.car?.model ?? ''}</strong>
                      <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Customer: {booking?.user?.name ?? 'N/A'}{booking?.user?.email ? ` (${booking.user.email})` : ''}
                      </p>
                      <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {formatDisplayDate(booking?.start_date)} - {formatDisplayDate(booking?.end_date)}
                      </p>
                    </div>
                  </Link>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    <strong style={{ color: 'var(--primary)', whiteSpace: 'nowrap' }}>{formatBirr(booking?.total_price ?? 0)}</strong>
                    <span className={`badge ${bookingStatusClass(booking?.status)}`}>{booking?.status ?? '-'}</span>
                    {['pending', 'approved'].includes(booking?.status) && (
                      <button type="button" className="btn btn-secondary" onClick={() => setCancelBooking(booking)}>Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!cancelBooking}
        onClose={() => setCancelBooking(null)}
        onConfirm={handleConfirmCancelBooking}
        title="Cancel booking"
        message={`Cancel booking for ${cancelBooking?.car?.brand ?? 'this car'} ${cancelBooking?.car?.model ?? ''}? The customer will no longer have this reservation.`}
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        variant="danger"
        loading={cancelLoading}
      />
    </div>
  );
}
