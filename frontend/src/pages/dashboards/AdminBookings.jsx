import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as bookingsApi from '../../api/bookings';
import DashboardNav from '../../components/DashboardNav';
import { getImageUrl } from '../../utils/imageUrl';
import { formatBirr } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/dateFormat';
import { ConfirmModal } from '../../components/ConfirmModal';

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

export function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [bookingFilters, setBookingFilters] = useState({ search: '', status: 'all', ownerId: 'all' });
  const [bookingPage, setBookingPage] = useState(1);
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
    refreshBookings();
    setLoading(false);
  }, []);

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

  const ownerOptions = Array.from(
    new Map(
      bookings
        .map((booking) => booking?.car?.owner)
        .filter(Boolean)
        .map((owner) => [owner.id, owner]),
    ).values(),
  ).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  const normalizedSearch = bookingFilters.search.trim().toLowerCase();
  const filteredBookings = bookings.filter((booking) => {
    const owner = booking?.car?.owner;
    const customer = booking?.user;
    const carLabel = `${booking?.car?.brand ?? ''} ${booking?.car?.model ?? ''}`.toLowerCase();
    const ownerLabel = `${owner?.name ?? ''} ${owner?.email ?? ''}`.toLowerCase();
    const customerLabel = `${customer?.name ?? ''} ${customer?.email ?? ''}`.toLowerCase();
    const matchesOwner = bookingFilters.ownerId === 'all' || owner?.id === bookingFilters.ownerId;
    const matchesStatus = bookingFilters.status === 'all' || booking?.status === bookingFilters.status;
    const matchesSearch = !normalizedSearch
      || carLabel.includes(normalizedSearch)
      || ownerLabel.includes(normalizedSearch)
      || customerLabel.includes(normalizedSearch);

    return matchesOwner && matchesStatus && matchesSearch;
  });
  const bookingsByOwner = groupBookingsByOwner(filteredBookings);
  const bookingPageSize = 5;
  const bookingTotalPages = Math.max(1, Math.ceil(bookingsByOwner.length / bookingPageSize));
  const pagedBookingsByOwner = bookingsByOwner.slice((bookingPage - 1) * bookingPageSize, bookingPage * bookingPageSize);

  useEffect(() => {
    setBookingPage(1);
  }, [bookingFilters.search, bookingFilters.status, bookingFilters.ownerId]);

  useEffect(() => {
    if (bookingPage > bookingTotalPages) setBookingPage(bookingTotalPages);
  }, [bookingPage, bookingTotalPages]);

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
          <h1 className="section-title">All bookings</h1>

          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Search</label>
                <input
                  type="search"
                  value={bookingFilters.search}
                  onChange={(e) => setBookingFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Owner, customer, or car"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Owner</label>
                <select
                  value={bookingFilters.ownerId}
                  onChange={(e) => setBookingFilters((f) => ({ ...f, ownerId: e.target.value }))}
                >
                  <option value="all">All owners</option>
                  {ownerOptions.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Status</label>
                <select
                  value={bookingFilters.status}
                  onChange={(e) => setBookingFilters((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBookingFilters({ search: '', status: 'all', ownerId: 'all' })}
              >
                Reset filters
              </button>
            </div>
          </div>

          <div className="grid" style={{ gap: '1rem' }}>
            {bookingsByOwner.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No bookings match these filters.</p>}
            {pagedBookingsByOwner.map(({ owner, bookings: ownerBookings }) => (
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

          {bookingsByOwner.length > bookingPageSize && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Page {bookingPage} of {bookingTotalPages}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={bookingPage <= 1}
                  onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={bookingPage >= bookingTotalPages}
                  onClick={() => setBookingPage((p) => Math.min(bookingTotalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}

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
      </div>
    </div>
  );
}

export default AdminBookings;
