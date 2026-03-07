import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as carsApi from '../api/cars';
import { getImageUrl } from '../utils/imageUrl';

const FILTER_KEYS = ['q', 'brand', 'min_price', 'max_price', 'transmission', 'fuel_type', 'seats'];
const DEBOUNCE_MS = 350;

export function CarList() {
  const [cars, setCars] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const isInitialMount = useRef(true);

  const [filters, setFilters] = useState({
    q: '', brand: '', min_price: '', max_price: '', transmission: '', fuel_type: '', seats: '',
  });

  useEffect(() => {
    const fromParams = { q: '', brand: '', min_price: '', max_price: '', transmission: '', fuel_type: '', seats: '' };
    FILTER_KEYS.forEach((key) => {
      const v = searchParams.get(key);
      if (v != null && v !== '') fromParams[key] = v;
    });
    setFilters(fromParams);
  }, [searchParams]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const t = setTimeout(() => {
      const nextParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        const v = value != null ? String(value).trim() : '';
        if (v !== '') nextParams.set(key, v);
      });
      const same = FILTER_KEYS.every((key) => {
        const current = searchParams.get(key) ?? '';
        const next = (filters[key] != null ? String(filters[key]).trim() : '') || '';
        return current === next;
      });
      if (!same) setSearchParams(nextParams, { replace: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filters, searchParams]);

  useEffect(() => {
    const params = { page: searchParams.get('page') || 1 };
    FILTER_KEYS.forEach((key) => {
      const v = searchParams.get(key);
      if (v != null && v !== '') params[key] = v;
    });
    carsApi.list(params)
      .then((data) => {
        if (data && typeof data.current_page === 'number') {
          setCars(data.data || []);
          setPagination({
            current_page: data.current_page,
            last_page: data.last_page,
            total: data.total,
            per_page: data.per_page,
          });
        } else {
          setCars(Array.isArray(data) ? data : data?.data || []);
          setPagination(null);
        }
      })
      .catch(() => { setCars([]); setPagination(null); })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value != null && String(value).trim() !== '') params.set(key, String(value).trim());
    });
    setSearchParams(params, { replace: true });
  };

  const goToPage = (page) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete('page');
    else next.set('page', String(page));
    setSearchParams(next);
  };

  const handleClearFilters = () => {
    setFilters({
      q: '', brand: '', min_price: '', max_price: '', transmission: '', fuel_type: '', seats: '',
    });
    setSearchParams({});
  };

  const list = Array.isArray(cars) ? cars : [];
  const hasActiveFilters = FILTER_KEYS.some((key) => {
    const v = searchParams.get(key);
    return v != null && v !== '';
  });

  return (
    <div className="container">
      <h1 className="section-title">Available cars</h1>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Search & filter</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Results update as you type or change filters.</p>
        <form onSubmit={handleSearch}>
          <div className="car-list-search-grid">
            <div className="form-group">
              <label>Keyword (brand or model)</label>
              <input
                type="text"
                placeholder="e.g. Toyota Camry"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Brand</label>
              <input
                type="text"
                placeholder="e.g. Toyota"
                value={filters.brand}
                onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Min price/day ($)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={filters.min_price}
                onChange={(e) => setFilters((f) => ({ ...f, min_price: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Max price/day ($)</label>
              <input
                type="number"
                min="0"
                placeholder="500"
                value={filters.max_price}
                onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Transmission</label>
              <select
                value={filters.transmission}
                onChange={(e) => setFilters((f) => ({ ...f, transmission: e.target.value }))}
              >
                <option value="">Any</option>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fuel type</label>
              <select
                value={filters.fuel_type}
                onChange={(e) => setFilters((f) => ({ ...f, fuel_type: e.target.value }))}
              >
                <option value="">Any</option>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className="form-group">
              <label>Min seats</label>
              <select
                value={filters.seats}
                onChange={(e) => setFilters((f) => ({ ...f, seats: e.target.value }))}
              >
                <option value="">Any</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n}+</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary">Search now</button>
            {hasActiveFilters && (
              <button type="button" className="btn btn-secondary" onClick={handleClearFilters}>Clear filters</button>
            )}
          </div>
        </form>
      </div>

      {loading && <div className="page-loading"><div className="spinner" /></div>}
      {!loading && (
        <>
          <div className="grid grid-3">
            {list.map((car) => (
              <Link to={`/cars/${car.id}`} key={car.id} className="card card-link car-list-card">
                <div className="car-card-img" style={{ aspectRatio: '16/10', background: '#e2e8f0' }}>
                  {getImageUrl(car.image) ? (
                    <img src={getImageUrl(car.image)} alt={`${car.brand} ${car.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No image</div>
                  )}
                </div>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>{car.brand} {car.model}</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>${car.price_per_day}/day</p>
                  <span className="car-card-cta">View details</span>
                </div>
              </Link>
            ))}
          </div>
          {pagination && pagination.last_page > 1 && (
            <nav className="car-list-pagination" style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span style={{ marginRight: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Showing {(pagination.current_page - 1) * pagination.per_page + 1}–{Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pagination.current_page <= 1}
                onClick={() => goToPage(pagination.current_page - 1)}
              >
                Previous
              </button>
              <span style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.last_page || Math.abs(p - pagination.current_page) <= 2)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '…' ? (
                      <span key={`ellip-${idx}`} style={{ padding: '0 0.25rem' }}>…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={p === pagination.current_page ? 'btn btn-primary' : 'btn btn-secondary'}
                        onClick={() => goToPage(p)}
                      >
                        {p}
                      </button>
                    )
                  )}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => goToPage(pagination.current_page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
      {!loading && list.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No cars found.</p>}
    </div>
  );
}
