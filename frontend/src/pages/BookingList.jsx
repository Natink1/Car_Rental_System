import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as bookingsApi from '../api/bookings';
import * as paymentsApi from '../api/payments';
import { formatDisplayDate } from '../utils/dateFormat';
import { formatBirr } from '../utils/currency';
import { getImageUrl } from '../utils/imageUrl';
import { ChapaPaymentModal } from '../components/ChapaPaymentModal';
import { PaymentReceiptActions } from '../components/PaymentReceiptActions';

function hasCompletedPayment(booking) {
  const payments = booking.payments || [];
  return payments.some((p) => p.payment_status === 'completed');
}

export function BookingList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentBooking, setPaymentBooking] = useState(null);

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
  const list = Array.isArray(bookings) ? bookings : [];

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="container">
      <h1 className="section-title">My bookings</h1>
      <div className="grid">
        {list.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No bookings yet.</p>}
        {list.map((b, i) => (
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
                  Owner: {b?.car?.owner?.name || 'N/A'}
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
