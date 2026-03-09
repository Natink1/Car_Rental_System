import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import * as carsApi from '../api/cars';
import * as bookingsApi from '../api/bookings';
import * as conversationsApi from '../api/conversations';
import * as adminsApi from '../api/admins';
import { useAuth } from '../contexts/AuthContext';
import { formatDisplayDate } from '../utils/dateFormat';
import { formatBirr } from '../utils/currency';
import { getImageUrl } from '../utils/imageUrl';
import { ConfirmModal } from '../components/ConfirmModal';

const FUEL = { petrol: 'Petrol', diesel: 'Diesel', electric: 'Electric', hybrid: 'Hybrid' };
const TRANS = { automatic: 'Automatic', manual: 'Manual' };

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120"%3E%3Crect fill="%23e2e8f0" width="200" height="120"/%3E%3Ctext fill="%2394a3b8" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="14"%3ENo image%3C/text%3E%3C/svg%3E';

export function CarDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    carsApi.getById(id)
      .then((data) => setCar(data))
      .catch(() => setCar(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    carsApi.getReviews(id).then((data) => setReviews(Array.isArray(data) ? data : [])).catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    if (isAuthenticated) {
      adminsApi.list().then((data) => setAdmins(Array.isArray(data) ? data : [])).catch(() => setAdmins([]));
    }
  }, [isAuthenticated]);

  const images = car?.images?.length ? car.images : (car?.image ? [car.image] : []);
  const resolvedImages = images.map((u) => getImageUrl(u)).filter(Boolean);
  const currentImage = getImageUrl(resolvedImages[galleryIndex] || car?.image) || FALLBACK_IMAGE;

  const days = startDate && endDate
    ? Math.max(0, Math.ceil((new Date(endDate) - new Date(startDate)) / (24 * 60 * 60 * 1000)) + 1)
    : 0;
  const totalPrice = car ? days * car.price_per_day : 0;

  const canBook = isAuthenticated && user?.role !== 'admin' && car?.status === 'approved';
  const ownerId = car?.user_id || car?.owner?.id;
  const firstAdmin = admins[0];

  const handleBook = async (e) => {
    e.preventDefault();
    setError('');
    if (!startDate || !endDate) {
      setError('Please select start and end dates.');
      return;
    }
    try {
      await bookingsApi.create({ car_id: id, start_date: startDate, end_date: endDate });
      setBookingSuccess(true);
      navigate('/customer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.dates?.[0] || 'Booking failed.');
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await carsApi.createReview(id, { rating: reviewRating, comment: reviewComment });
      setReviewComment('');
      const data = await carsApi.getReviews(id);
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    }
  };

  const startChatWith = async (userId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const data = await conversationsApi.create({ user_id: userId });
      navigate(`/chat?conversation=${data.id}`);
    } catch (_) {
      setError('Could not start conversation.');
    }
  };

  const handleDeleteCar = async () => {
    setDeleteLoading(true);
    setError('');
    try {
      await carsApi.deleteCar(id);
      navigate('/owner/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete car.');
      throw err;
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-loading">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="container">
        <div className="page-loading">
          <p>Car not found or not available.</p>
          <Link to="/cars" className="btn btn-primary">Back to cars</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="car-detail">
        <div className="car-gallery card car-gallery-wrap" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div className="car-gallery-layout">
            {resolvedImages.length > 1 && (
              <div className="car-gallery-thumbnails">
                {resolvedImages.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setGalleryIndex(i); }}
                    className={`car-gallery-thumb ${i === galleryIndex ? 'car-gallery-thumb-active' : ''}`}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={src} alt="" onError={(e) => { e.target.src = FALLBACK_IMAGE; }} />
                  </button>
                ))}
              </div>
            )}
            <div className="car-gallery-main">
              <img src={currentImage} alt={`${car.brand} ${car.model}`} onError={(e) => { e.target.src = FALLBACK_IMAGE; }} />
              {resolvedImages.length > 1 && (
                <>
                  <button type="button" className="gallery-btn prev" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setGalleryIndex((i) => (i - 1 + resolvedImages.length) % resolvedImages.length); }} aria-label="Previous">‹</button>
                  <button type="button" className="gallery-btn next" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setGalleryIndex((i) => (i + 1) % resolvedImages.length); }} aria-label="Next">›</button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="car-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem' }}>{car.brand} {car.model}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {car.year} · {TRANS[car.transmission] || car.transmission} · {FUEL[car.fuel_type] || car.fuel_type} · {car.seats} seats
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{formatBirr(car.price_per_day)} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ day</span></p>

            {isAuthenticated && user?.role === 'owner' && ownerId === user?.id && (
              <>
                {car.can_owner_edit ? (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <Link to={`/owner/cars/${id}/edit`} className="btn btn-secondary">Edit car</Link>
                    <button type="button" className="btn btn-secondary" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => setShowDeleteConfirm(true)}>Delete car</button>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>This car cannot be edited or deleted while it is rented or has upcoming bookings.</p>
                )}
              </>
            )}

            {car.owner && (
              <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
                <strong>Owner</strong> {car.owner.name} ({car.owner.email})
                {isAuthenticated && ownerId && ownerId !== user?.id && (
                  <button type="button" className="btn btn-primary" style={{ marginLeft: '0.75rem' }} onClick={() => startChatWith(ownerId)}>Chat with Owner</button>
                )}
              </div>
            )}

            {isAuthenticated && firstAdmin && (
              <div style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => startChatWith(firstAdmin.id)}>Chat with Admin</button>
              </div>
            )}

            <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Reviews</h2>
              {reviews.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No reviews yet.</p>}
              {reviews.map((r) => (
                <div key={r.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                  <strong>{r.user?.name}</strong> · {r.rating}/5
                  {r.created_at && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>{formatDisplayDate(r.created_at)}</span>}
                  {r.comment && <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>{r.comment}</p>}
                </div>
              ))}
              {isAuthenticated && user?.role !== 'admin' && (
                <form onSubmit={handleReview} style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label>Your rating</label>
                    <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                      {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Comment (optional)</label>
                    <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} />
                  </div>
                  <button type="submit" className="btn btn-secondary">Submit review</button>
                </form>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '6rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Book this car</h2>
            {car.status !== 'approved' && <p style={{ color: 'var(--text-muted)' }}>This car is not available for booking.</p>}
            {car.status === 'approved' && car.current_rental && (
              <p style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius)', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <strong>This car is on rent</strong> from {formatDisplayDate(car.current_rental.start_date)} to {formatDisplayDate(car.current_rental.end_date)}.
              </p>
            )}
            {car.status === 'approved' && car.booked_ranges && car.booked_ranges.length > 0 && (
              <p style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius)', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <strong>Already booked:</strong>{' '}
                {car.booked_ranges.map((range, i) => (
                  <span key={i}>
                    {i > 0 && '; '}
                    {formatDisplayDate(range.start_date)} – {formatDisplayDate(range.end_date)}
                  </span>
                ))}
              </p>
            )}
            {canBook && (
              <>
                {error && <p className="error-msg">{error}</p>}
                {bookingSuccess && <p style={{ color: 'green' }}>Booking created! Check your dashboard.</p>}
                <form onSubmit={handleBook}>
                  <div className="form-group">
                    <label>Start date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
                  </div>
                  <div className="form-group">
                    <label>End date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || new Date().toISOString().slice(0, 10)} />
                  </div>
                  {days > 0 && (
                    <p style={{ marginBottom: '1rem' }}>
                      <strong>Total: {formatBirr(totalPrice)}</strong> ({days} days)
                    </p>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Book Now</button>
                </form>
              </>
            )}
            {isAuthenticated && user?.role === 'admin' && <p style={{ color: 'var(--text-muted)' }}>Admins cannot book cars.</p>}
            {!isAuthenticated && <p><Link to="/login" className="btn btn-primary">Login to book</Link></p>}
          </div>
        </div>
      </div>

      <style>{`
        .car-gallery-wrap { padding: 0; }
        .car-gallery-layout { display: flex; width: 100%; height: 400px; max-width: 900px; }
        .car-gallery-thumbnails { display: flex; flex-direction: column; width: 88px; flex-shrink: 0; height: 400px; padding: 0.5rem; gap: 0.5rem; background: var(--bg); border-right: 1px solid var(--border); overflow-y: auto; }
        .car-gallery-thumb { display: block; width: 72px; height: 54px; flex-shrink: 0; border: 2px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; padding: 0; background: #e2e8f0; transition: border-color 0.2s, box-shadow 0.2s; }
        .car-gallery-thumb:hover { border-color: var(--primary-light); }
        .car-gallery-thumb-active { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(30, 64, 175, 0.3); }
        .car-gallery-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .car-gallery-main { flex: 1; position: relative; width: 0; height: 400px; background: #e2e8f0; overflow: hidden; }
        .car-gallery-main img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .gallery-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(0,0,0,0.4); color: white; cursor: pointer; font-size: 1.25rem; }
        .gallery-btn:hover { background: rgba(0,0,0,0.6); }
        .gallery-btn.prev { left: 0.5rem; }
        .gallery-btn.next { right: 0.5rem; }
        @media (max-width: 900px) {
          .car-detail-grid { grid-template-columns: 1fr !important; }
          .car-gallery-layout { flex-direction: column-reverse; height: 340px; max-width: none; }
          .car-gallery-thumbnails { flex-direction: row; width: 100%; height: auto; padding: 0.5rem; border-right: none; border-top: 1px solid var(--border); overflow-x: auto; flex-shrink: 0; }
          .car-gallery-thumb { width: 64px; height: 48px; flex-shrink: 0; }
          .car-gallery-main { height: 280px; width: 100%; }
        }
      `}</style>

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCar}
        title="Delete car"
        message="Delete this car? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
      />

    </div>
  );
}
