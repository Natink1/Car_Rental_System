import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as bookingsApi from '../api/bookings';
import * as paymentsApi from '../api/payments';
import { formatDisplayDate } from '../utils/dateFormat';
import { formatBirr } from '../utils/currency';
import { getImageUrl } from '../utils/imageUrl';
import { ChapaPaymentModal } from '../components/ChapaPaymentModal';
import { PaymentReceiptActions } from '../components/PaymentReceiptActions';
import { useAuth } from '../contexts/AuthContext';

function hasCompletedPayment(booking) {
  const payments = booking.payments || [];
  return payments.some((p) => p.payment_status === 'completed');
}

export function BookingList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    customerId: 'all',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const refresh = () => {
    bookingsApi
      .list()
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]));
  };

  const verifyPendingChapaPayment = async () => {
    const txRef = localStorage.getItem('pendingChapaTxRef');
    const refId = searchParams.get('ref_id');
    if (!txRef) return;
    try {
      await paymentsApi.verifyChapa(txRef, refId);
      localStorage.removeItem('pendingChapaTxRef');
      refresh();
    } catch (_) {
      // Keep pending tx_ref so we can retry on next focus/return.
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    bookingsApi
      .list()
      .then((data) => {
        if (!cancelled) setBookings(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setBookings([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // After Chapa redirect (in other tab), refresh and clear ?chapa=success
  useEffect(() => {
    if (searchParams.get('chapa') === 'success') {
      verifyPendingChapaPayment();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  // When user returns from Chapa tab, refetch so "Paid" status updates
  useEffect(() => {
    const onFocus = () => {
      verifyPendingChapaPayment();
      refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const statusClass = (s) => {
    if (s === 'pending') return 'badge-pending';
    if (s === 'approved') return 'badge-approved';
    if (s === 'rejected') return 'badge-rejected';
    return 'badge-cancelled';
  };

  const canPay = (b) => b && b.status === 'approved' && !hasCompletedPayment(b);
  const list = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();

    return (Array.isArray(bookings) ? bookings : []).filter((booking) => {
      const carLabel = `${booking?.car?.brand ?? ''} ${booking?.car?.model ?? ''}`.toLowerCase();
      const ownerLabel = `${booking?.car?.owner?.name ?? ''} ${booking?.car?.owner?.email ?? ''}`.toLowerCase();
      const customerLabel = `${booking?.user?.name ?? ''} ${booking?.user?.email ?? ''}`.toLowerCase();
      const matchesSearch = !normalizedSearch
        || carLabel.includes(normalizedSearch)
        || ownerLabel.includes(normalizedSearch)
        || customerLabel.includes(normalizedSearch);
      const matchesStatus = filters.status === 'all' || booking?.status === filters.status;
      const matchesCustomer = filters.customerId === 'all' || booking?.user?.id === filters.customerId;
      const matchesStartDate = !filters.startDate || booking?.start_date >= filters.startDate;
      const matchesEndDate = !filters.endDate || booking?.end_date <= filters.endDate;

      return matchesSearch && matchesStatus && matchesCustomer && matchesStartDate && matchesEndDate;
    });
  }, [bookings, filters]);
  const customerOptions = useMemo(() => (
    Array.from(
      new Map(
        (Array.isArray(bookings) ? bookings : [])
          .map((booking) => booking?.user)
          .filter(Boolean)
          .map((customer) => [customer.id, customer]),
      ).values(),
    ).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  ), [bookings]);
  const ownerBookingsByCar = useMemo(() => (
    Array.from(
      list.reduce((groups, booking) => {
        const car = booking?.car;
        const key = booking?.car_id ?? car?.id ?? 'unknown-car';
        if (!groups.has(key)) {
          groups.set(key, {
            car: car ?? { brand: 'Car', model: '' },
            bookings: [],
          });
        }
        groups.get(key).bookings.push(booking);
        return groups;
      }, new Map()).values(),
    ).sort((a, b) => `${a.car?.brand ?? ''} ${a.car?.model ?? ''}`.localeCompare(`${b.car?.brand ?? ''} ${b.car?.model ?? ''}`))
  ), [list]);
  const ownerTotalPages = Math.max(1, Math.ceil(ownerBookingsByCar.length / pageSize));
  const ownerPagedBookingsByCar = ownerBookingsByCar.slice((page - 1) * pageSize, page * pageSize);
  const title = user?.role === 'owner' ? 'Booking history' : 'My bookings';

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.customerId, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (page > ownerTotalPages) setPage(ownerTotalPages);
  }, [page, ownerTotalPages]);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="container">
      <h1 className="section-title">{title}</h1>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Search</label>
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder={user?.role === 'owner' ? 'Customer or car' : 'Car or owner'}
            />
          </div>
          {user?.role === 'owner' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label>Customer</label>
              <select
                value={filters.customerId}
                onChange={(e) => setFilters((f) => ({ ...f, customerId: e.target.value }))}
              >
                <option value="all">All customers</option>
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group" style={{ margin: 0 }}>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilters({ search: '', status: 'all', customerId: 'all', startDate: '', endDate: '' })}
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="grid">
        {list.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No bookings match these filters.</p>}
        {user?.role === 'owner' && ownerPagedBookingsByCar.map(({ car, bookings: carBookings }) => (
          <div key={car?.id ?? `${car?.brand}-${car?.model}`} className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div style={{ width: 110, height: 74, flexShrink: 0, background: '#e2e8f0', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {car?.image && getImageUrl(car.image) ? (
                  <img src={getImageUrl(car.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>No image</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{car?.brand ?? 'Car'} {car?.model ?? ''}</h2>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {carBookings.length} booking{carBookings.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="grid" style={{ gap: '0.75rem' }}>
              {carBookings.map((b, i) => (
                <div key={b?.id ?? `booking-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.85rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <strong>{b?.user?.name || 'N/A'}</strong>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {formatDisplayDate(b?.start_date)} – {formatDisplayDate(b?.end_date)}
                    </p>
                    {b?.user?.email && (
                      <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{b.user.email}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    <div style={{ padding: '0.45rem 0.75rem', borderRadius: '999px', background: 'rgba(29, 78, 216, 0.12)', color: '#1d4ed8', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {formatBirr(b?.total_price ?? 0)}
                    </div>
                    <span className={`badge ${statusClass(b?.status)}`}>{b?.status ?? '—'}</span>
                    {hasCompletedPayment(b) && <PaymentReceiptActions booking={b} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {user?.role !== 'owner' && list.map((b, i) => (
          <div key={b?.id ?? `booking-${i}`} className="card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
            <Link to={`/cars/${b?.car_id ?? ''}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
              <div style={{ width: 120, height: 80, flexShrink: 0, background: '#e2e8f0', borderRadius: 'var(--radius)' }}>
                {b?.car?.image && getImageUrl(b.car.image) ? (
                  <img src={getImageUrl(b.car.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>No image</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{b?.car?.brand} {b?.car?.model}</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {formatDisplayDate(b?.start_date)} – {formatDisplayDate(b?.end_date)}
                </p>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {user?.role === 'owner' ? `Customer: ${b?.user?.name || 'N/A'}` : `Owner: ${b?.car?.owner?.name || 'N/A'}`}
                </p>
              </div>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
              <div style={{ padding: '0.45rem 0.75rem', borderRadius: '999px', background: 'rgba(29, 78, 216, 0.12)', color: '#1d4ed8', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {formatBirr(b?.total_price ?? 0)}
              </div>
              <span className={`badge ${statusClass(b?.status)}`}>{b?.status ?? '—'}</span>
              {canPay(b) && (
                <button type="button" className="btn btn-primary" onClick={(e) => { e.preventDefault(); setPaymentBooking(b); }}>
                  Pay now
                </button>
              )}
              {hasCompletedPayment(b) && <PaymentReceiptActions booking={b} />}
            </div>
          </div>
        ))}
      </div>

      {user?.role === 'owner' && ownerBookingsByCar.length > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Page {page} of {ownerTotalPages}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page >= ownerTotalPages}
              onClick={() => setPage((p) => Math.min(ownerTotalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {paymentBooking && (
        <ChapaPaymentModal
          open={!!paymentBooking}
          onClose={() => setPaymentBooking(null)}
          booking={paymentBooking}
          amount={paymentBooking?.total_price ?? 0}
          onSuccess={() => { setPaymentBooking(null); refresh(); }}
        />
      )}
    </div>
  );
}
