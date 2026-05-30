import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as dashboardApi from '../../api/dashboard';
import * as bookingsApi from '../../api/bookings';
import { formatBirr } from '../../utils/currency';
import { MultiLineChart, SimpleBarChart } from '../../components/Charts';
import DashboardNav from '../../components/DashboardNav';
import { formatDateOnly } from '../../utils/dateFormat';

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
  const [bookings, setBookings] = useState([]);
  const [bookingFilters, setBookingFilters] = useState({ search: '', status: 'all', ownerId: 'all' });
  const [bookingPage, setBookingPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const refreshBookings = () => {
    bookingsApi
      .list()
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]));
  };

  useEffect(() => {
    dashboardApi.getAdmin().then((data) => setStats(data)).catch(() => {});
    refreshBookings();
  }, []);

  useEffect(() => {
    if (!stats) return;
    setLoading(false);
  }, [stats]);

  

  // simplified: Admin dashboard shows overview only; bookings list and pending vehicle
  // management have been moved to dedicated admin pages.

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const totalsData = [
    { name: 'Owners', value: stats?.total_owners ?? 0 },
    { name: 'Customers', value: stats?.total_customers ?? 0 },
    { name: 'Cars', value: stats?.total_cars ?? 0 },
    { name: 'Bookings', value: stats?.total_bookings ?? 0 },
  ];

  const approvalsData = [
    { name: 'Approved', value: Math.max(0, (stats?.total_cars ?? 0) - (stats?.pending_approvals ?? 0)) },
    { name: 'Pending', value: stats?.pending_approvals ?? 0 },
  ];

  // Revenue sparkline (last 14 days)
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

  (bookings || []).forEach((b) => {
    const payments = Array.isArray(b.payments) ? b.payments : [];
    payments.forEach((p) => {
      if (p.payment_status !== 'completed') return;
      const dateKey = p.created_at ? formatDateOnly(p.created_at) : formatDateOnly(b.created_at);
      if (dateKey in revenueMap) revenueMap[dateKey] += (p.amount || 0);
    });
  });

  const revenueSeries = revenueDates.map((d) => ({ name: d, value: Math.round((revenueMap[d] || 0) * 100) / 100 }));

  // Top cars by bookings
  const carCounts = {};
  (bookings || []).forEach((b) => {
    const car = b.car;
    if (!car) return;
    const label = `${car.brand} ${car.model}`;
    carCounts[label] = (carCounts[label] || 0) + 1;
  });
  const topCarsData = Object.entries(carCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Monthly counts and revenue (last 12 months)
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

  (bookings || []).forEach((b) => {
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

  return (
    <div className="container">
      <div className="dashboard-shell">
        <DashboardNav sections={[
          { id: 'overview', label: 'Overview', to: '/admin/dashboard' },
          { id: 'pending', label: 'Pending vehicles', to: '/admin/pending' },
          { id: 'bookings', label: 'Bookings', to: '/admin/bookings' },
        ]} />
        <div className="dashboard-content">
          <h1 id="overview" className="section-title">Admin Dashboard</h1>
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <Link to="/chat" className="btn btn-primary">Open Chat</Link>
            <Link to="/admin/users" className="btn btn-secondary">Users</Link>
          </div>

          <div className="grid" style={{ marginBottom: '1.5rem', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            <div className="card" style={{ padding: '1rem', background: 'rgba(29,78,216,0.06)', color: '#1d4ed8' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total owners</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats?.total_owners ?? 0}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: 'rgba(6,95,70,0.06)', color: '#065f46' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total customers</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats?.total_customers ?? 0}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: 'rgba(245,158,11,0.06)', color: '#f59e0b' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pending approvals</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats?.pending_approvals ?? 0}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: 'rgba(124,58,237,0.06)', color: '#7c3aed' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total bookings</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats?.total_bookings ?? 0}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: 'rgba(59,130,246,0.06)', color: 'var(--primary)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total revenue</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatBirr(stats?.total_revenue ?? 0)}</div>
            </div>
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
            <SimpleBarChart title="Top cars (by bookings)" data={topCarsData} />
          </div>

          {(stats?.pending_approvals ?? 0) > 0 && (
            <div className="dashboard-alert dashboard-alert-pending" style={{ marginBottom: '1.5rem' }}>
              <span className="dashboard-alert-text">
                <strong>{stats.pending_approvals}</strong> vehicle{stats.pending_approvals !== 1 ? 's' : ''} pending approval
              </span>
            </div>
          )}

          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Use the sidebar to open Pending vehicles and Bookings pages.</p>
        </div>
      </div>
    </div>
  );
}
