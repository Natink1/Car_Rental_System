import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as dashboardApi from '../../api/dashboard';
import * as adminsApi from '../../api/admins';
import * as conversationsApi from '../../api/conversations';
import * as carsApi from '../../api/cars';
import * as bookingsApi from '../../api/bookings';
import { formatDisplayDate } from '../../utils/dateFormat';
import { formatBirr } from '../../utils/currency';
import { getImageUrl } from '../../utils/imageUrl';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PaymentReceiptActions } from '../../components/PaymentReceiptActions';
import DashboardNav from '../../components/DashboardNav';
import { MultiLineChart, SimpleBarChart } from '../../components/Charts';
import RecentBookings from '../../components/RecentBookings';
import { formatDateOnly } from '../../utils/dateFormat';

export function OwnerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({ cars: [], active_bookings: [], earnings: 0 });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmCarId, setDeleteConfirmCarId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [ownerBookings, setOwnerBookings] = useState([]);

  useEffect(() => {
    dashboardApi.getOwner().then((d) => setData(d)).catch(() => {}).finally(() => setLoading(false));
    // fetch owner bookings history for widgets
    bookingsApi.list().then((list) => setOwnerBookings(Array.isArray(list) ? list : [])).catch(() => setOwnerBookings([]));
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

  const carStatusLabel = (status) => {
    if (status === 'approved') return 'Listed';
    return status;
  };

  const isPaid = (booking) => {
    const payments = booking.payments || [];
    return payments.some((p) => p.payment_status === 'completed');
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const carsApproved = data.cars_approved || [];
  const carsPending = data.cars_pending || [];
  const bookings = data.active_bookings || [];
  const pendingApprovalCount = bookings.filter((b) => b.status === 'pending').length;
  const paidBookings = bookings.filter((b) => b.status === 'approved' && isPaid(b));
  const unpaidBookings = bookings.filter((b) => b.status === 'approved' && !isPaid(b));
  const pendingCarsCount = carsPending.filter((c) => c.status === 'pending').length;
  const rejectedCarsCount = (data.cars_pending || []).filter((c) => c.status === 'rejected').length;

  const carStatusData = [
    { name: 'Listed', value: carsApproved.length },
    { name: 'Pending', value: pendingCarsCount },
    { name: 'Rejected', value: rejectedCarsCount },
  ];

  const bookingStatusData = [
    { name: 'Pending', value: pendingApprovalCount },
    { name: 'Approved', value: bookings.filter((b) => b.status === 'approved').length },
  ];

  // prepare owner widgets data
  const makeDateRange = (days = 14) => {
    const arr = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      arr.push(`${yyyy}-${mm}-${dd}`);
    }
    return arr;
  };

  const revenueDates = makeDateRange(14);
  const revenueMap = revenueDates.reduce((acc, date) => ({ ...acc, [date]: 0 }), {});
  (ownerBookings || []).forEach((b) => {
    const payments = Array.isArray(b.payments) ? b.payments : [];
    payments.forEach((p) => {
      if (p.payment_status !== 'completed') return;
      const dateKey = p.created_at ? formatDateOnly(p.created_at) : formatDateOnly(b.created_at);
      if (dateKey in revenueMap) revenueMap[dateKey] += (p.amount || 0);
    });
  });
  const revenueSeries = revenueDates.map((d) => ({ name: d, value: Math.round((revenueMap[d] || 0) * 100) / 100 }));

  const carCounts = {};
  (ownerBookings || []).forEach((b) => {
    const car = b.car;
    if (!car) return;
    const label = `${car.brand} ${car.model}`;
    carCounts[label] = (carCounts[label] || 0) + 1;
  });
  const topCarsData = Object.entries(carCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Monthly counts and revenue (last 12 months) for owner
  const makeMonthRange = (months = 12) => {
    const arr = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
      arr.push({ key, label });
    }
    return arr;
  };

  const months = makeMonthRange(12);
  const countsMap = months.reduce((acc, m) => ({ ...acc, [m.key]: 0 }), {});
  const revMap = months.reduce((acc, m) => ({ ...acc, [m.key]: 0 }), {});

  (ownerBookings || []).forEach((b) => {
    const created = b.created_at ? new Date(b.created_at) : null;
    if (created) {
      const mkey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      if (mkey in countsMap) countsMap[mkey] += 1;
    }
    const payments = Array.isArray(b.payments) ? b.payments : [];
    payments.forEach((p) => {
      if (p.payment_status !== 'completed') return;
      const d = p.created_at ? new Date(p.created_at) : (b.created_at ? new Date(b.created_at) : null);
      if (!d) return;
      const mkey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (mkey in revMap) revMap[mkey] += (p.amount || 0);
    });
  });

  const monthlyData = months.map((m) => ({
    label: m.label,
    bookings: countsMap[m.key] || 0,
    revenue: Math.round((revMap[m.key] || 0) * 100) / 100,
  }));

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
          <span className={`badge ${statusClass(car.status)}`} style={{ marginLeft: '0.5rem' }}>{carStatusLabel(car.status)}</span>
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
      <div className="dashboard-shell">
        <DashboardNav sections={[
          { id: 'overview', label: 'Overview' },
          { id: 'active', label: 'Active bookings', to: '/owner/active' },
          { id: 'listed', label: 'Listed cars', to: '/owner/listed' },
          { id: 'add-car', label: 'Add car', to: '/owner/cars/new' },
          { id: 'booking-history', label: 'Booking history', to: '/bookings' },
        ]} dashboardPath="/owner/dashboard" />
        <div className="dashboard-content">
          <h1 id="overview" className="section-title">Owner Dashboard</h1>
          <div className="grid" style={{ marginBottom: '1.5rem', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            <div className="card" style={{ padding: '1rem', background: 'rgba(29,78,216,0.06)', color: '#1d4ed8' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Listed cars</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{carsApproved.length}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: 'rgba(220,38,38,0.06)', color: '#b91c1c' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rejected listings</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{rejectedCarsCount}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: 'rgba(124,58,237,0.06)', color: '#7c3aed' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total bookings</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{ownerBookings.length}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: 'rgba(6,95,70,0.06)', color: '#065f46' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Current bookings</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{bookings.length}</div>
            </div>
          </div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <Link to="/chat" className="btn btn-primary">Open Chat</Link>
            {admins[0] && (
              <button type="button" className="btn btn-secondary" onClick={startChatWithAdmin}>Chat with Admin</button>
            )}
            <Link to="/bookings" className="btn btn-secondary">Booking history</Link>
          </div>

          {deleteError && (
            <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: 'rgba(220, 38, 38, 0.1)', borderColor: '#dc2626' }}>
              {deleteError}
              <button type="button" className="btn btn-secondary" style={{ marginLeft: '0.75rem' }} onClick={() => setDeleteError('')}>Dismiss</button>
            </div>
          )}

          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Earnings summary</h2>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{formatBirr(data.earnings || 0)}</p>
          </div>

          <div className="grid" style={{ marginBottom: '2rem', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <MultiLineChart
              title="Bookings (12 months)"
              data={monthlyData}
              series={[
                { key: 'bookings', name: 'Bookings', color: '#1d4ed8', yAxisId: 'left' },
              ]}
              height={360}
            />
            <SimpleBarChart title="Top cars" data={topCarsData} />
          </div>

          {/* Active bookings moved to their own page */}

          <div className="grid" style={{ marginBottom: '2rem', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pending listings</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c2410c' }}>{pendingCarsCount}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rejected listings</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b91c1c' }}>{rejectedCarsCount}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Needs approval</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c2410c' }}>{pendingApprovalCount}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Paid</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#065f46' }}>{paidBookings.length}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Unpaid</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8' }}>{unpaidBookings.length}</div>
            </div>
          </div>

          {rejectedCarsCount > 0 && (
            <div className="dashboard-alert dashboard-alert-rejected" style={{ marginBottom: '1.5rem' }}>
              <span className="dashboard-alert-text">
                <strong>{rejectedCarsCount}</strong> listing{rejectedCarsCount !== 1 ? 's' : ''} rejected — reapply below
              </span>
            </div>
          )}

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
      </div>
    </div>
  );
}
