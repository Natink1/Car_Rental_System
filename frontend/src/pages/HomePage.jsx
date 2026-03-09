import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as carsApi from '../api/cars';
import { getImageUrl } from '../utils/imageUrl';
import { formatBirr } from '../utils/currency';

import car1 from '../assets/car1.jpeg';
import car2 from '../assets/car2.jpg';

export function HomePage() {
  const [featured, setFeatured] = useState([]);
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    q: '', brand: '', min_price: '', max_price: '', transmission: '', fuel_type: '', seats: '',
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && String(value).trim()) params.set(key, String(value).trim());
    });
    navigate(`/cars?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setFilters({
      q: '', brand: '', min_price: '', max_price: '', transmission: '', fuel_type: '', seats: '',
    });
  };

  useEffect(() => {
    carsApi.list({ featured: 1 }).then((data) => setFeatured(Array.isArray(data) ? data : data?.data || []));
  }, []);

  const featuredForShow = featured.slice(0, 6);

  const heroBgStyle = {
    backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 58, 138, 0.75) 50%, rgba(30, 64, 175, 0.9) 100%), url(${car1})`,
  };

  return (
    <div>
      {/* Hero with background from assets (car1.jpeg) */}
      <section
        className="min-h-[420px] flex items-center bg-cover bg-center text-white py-16 pb-20 text-center"
        style={heroBgStyle}
      >
        <div className="w-full max-w-3xl mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-3">
            Drive Your Journey with NHK Car-Rental
          </h1>
          <p className="text-lg opacity-95 mb-6">
            Find the perfect car for your next trip. Simple, fast, and reliable.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/cars" className="btn btn-primary min-w-[140px]">Browse Cars</Link>
          </div>
        </div>
      </section>

      {/* Search card - overlaps hero */}
      <section className="-mt-10 mb-8 relative z-10">
        <div className="w-full max-w-[1200px] mx-auto px-4">
          <div className="bg-white rounded-xl shadow-xl py-7 px-7">
            <h2 className="text-xl font-semibold text-slate-800 mb-5">Find your car</h2>
            <form onSubmit={handleSearch}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div className="form-group mb-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Keyword</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota Camry"
                    value={filters.q}
                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                    className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota"
                    value={filters.brand}
                    onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))}
                    className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Min price (Birr/day)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={filters.min_price}
                    onChange={(e) => setFilters((f) => ({ ...f, min_price: e.target.value }))}
                    className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Max price (Birr/day)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="500"
                    value={filters.max_price}
                    onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))}
                    className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Transmission</label>
                  <select
                    value={filters.transmission}
                    onChange={(e) => setFilters((f) => ({ ...f, transmission: e.target.value }))}
                    className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                  >
                    <option value="">Any</option>
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Fuel type</label>
                  <select
                    value={filters.fuel_type}
                    onChange={(e) => setFilters((f) => ({ ...f, fuel_type: e.target.value }))}
                    className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                  >
                    <option value="">Any</option>
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Electric</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Min seats</label>
                  <select
                    value={filters.seats}
                    onChange={(e) => setFilters((f) => ({ ...f, seats: e.target.value }))}
                    className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                  >
                    <option value="">Any</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{n}+</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn btn-primary min-w-[120px]">Search</button>
                <button type="button" className="btn btn-secondary min-w-[120px]" onClick={handleClearFilters}>Clear</button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Featured cars - from API */}
      <section className="py-12 bg-slate-50">
        <div className="w-full max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Featured cars</h2>
            <p className="text-slate-500">Handpicked vehicles for your next adventure</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredForShow.map((car) => (
              <Link
                to={`/cars/${car.id}`}
                key={car.id}
                className="block bg-white rounded-xl overflow-hidden shadow hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-inherit no-underline"
              >
                <div className="relative aspect-[16/10] bg-slate-200 overflow-hidden">
                  {getImageUrl(car.image) ? (
                    <img
                      src={getImageUrl(car.image)}
                      alt={`${car.brand} ${car.model}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">No image</div>
                  )}
                  <span className="absolute bottom-3 right-3 bg-black/75 text-white px-2.5 py-1.5 rounded text-sm font-semibold">
                    {formatBirr(car.price_per_day)}<small className="font-normal text-xs opacity-90">/day</small>
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">{car.brand} {car.model}</h3>
                  <span className="text-sm font-medium text-[var(--primary)] hover:underline">View details →</span>
                </div>
              </Link>
            ))}
          </div>
          {featured.length === 0 && (
            <p className="text-slate-500 text-center">
              No featured cars yet. <Link to="/cars" className="text-[var(--primary)]">Browse all cars</Link>
            </p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 bg-white">
        <div className="w-full max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">How it works</h2>
            <p className="text-slate-500">Rent a car in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Choose your car</h3>
              <p className="text-sm text-slate-500">Browse our fleet and pick the perfect vehicle for your trip.</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Book & pay</h3>
              <p className="text-sm text-slate-500">Select your dates and complete the booking securely online.</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Hit the road</h3>
              <p className="text-sm text-slate-500">Collect your car and enjoy the journey.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us - car2.jpg from assets */}
      <section className="py-12 bg-slate-50">
        <div className="w-full max-w-[1200px] mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4 text-left">Why choose NHK Car-Rental</h2>
              <ul className="list-none p-0 m-0 mb-6 space-y-3">
                {[
                  'Wide selection of well-maintained vehicles',
                  'Transparent pricing with no hidden fees',
                  'Flexible booking and cancellation',
                  '24/7 support for your peace of mind',
                ].map((item, i) => (
                  <li key={i} className="relative pl-6 text-slate-800">
                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/cars" className="btn btn-primary">Explore fleet</Link>
            </div>
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-slate-200">
              <img src={car2} alt="Car rental" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 bg-white">
        <div className="w-full max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">What our customers say</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <p className="italic text-slate-800 mb-3 text-[0.9375rem]">&ldquo;Smooth booking and great cars. Will use again!&rdquo;</p>
              <p className="text-sm font-medium text-slate-500">— Alex</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <p className="italic text-slate-800 mb-3 text-[0.9375rem]">&ldquo;Best rates in town. Highly recommend NHK.&rdquo;</p>
              <p className="text-sm font-medium text-slate-500">— Sam</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <p className="italic text-slate-800 mb-3 text-[0.9375rem]">&ldquo;Professional service from start to finish.&rdquo;</p>
              <p className="text-sm font-medium text-slate-500">— Jordan</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
