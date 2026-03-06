import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { formatDisplayDate } from '../../utils/dateFormat';
import { getImageUrl } from '../../utils/imageUrl';

export function CustomerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({ active_bookings: [], booking_history: [] });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/customer').then(({ data: d }) => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get('/admins').then(({ data: list }) => setAdmins(Array.isArray(list) ? list : [])).catch(() => setAdmins([]));
  }, []);

  const startChatWithAdmin = async () => {
    const admin = admins[0];
    if (!admin) return;
    try {
      const { data: conv } = await api.post('/conversations', { user_id: admin.id });
      navigate(`/chat?conversation=${conv.id}`);
    } catch (_) {}
  };

  const statusClass = (s) => {
    if (s === 'pending') return 'badge-pending';
    if (s === 'approved') return 'badge-approved';
    if (s === 'rejected') return 'badge-rejected';
    return 'badge-cancelled';
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const active = data.active_bookings || [];
  const history = data.booking_history || [];

  return (
    <div className="container">
      <h1 className="section-title">Customer Dashboard</h1>
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Link to="/chat" className="btn btn-primary">Open Chat</Link>
        {admins[0] && (
          <button type="button" className="btn btn-secondary" onClick={startChatWithAdmin}>Chat with Admin</button>
        )}
        <Link to="/bookings" className="btn btn-secondary">My Bookings</Link>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Active bookings</h2>
      <div className="grid" style={{ marginBottom: '2rem' }}>
        {active.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No active bookings.</p>}
        {active.map((b) => (
          <Link to={`/cars/${b.car_id}`} key={b.id} className="card card-link" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: 80, height: 56, background: '#e2e8f0', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {getImageUrl(b.car?.image) && <img src={getImageUrl(b.car.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <strong>{b.car?.brand} {b.car?.model}</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {formatDisplayDate(b.start_date)} – {formatDisplayDate(b.end_date)}
              </p>
            </div>
            <span className={`badge ${statusClass(b.status)}`}>{b.status}</span>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Booking history</h2>
      <div className="grid">
        {history.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No past bookings.</p>}
        {history.map((b) => (
          <Link to={`/cars/${b.car_id}`} key={b.id} className="card card-link" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: 80, height: 56, background: '#e2e8f0', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {getImageUrl(b.car?.image) && <img src={getImageUrl(b.car.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <strong>{b.car?.brand} {b.car?.model}</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
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
