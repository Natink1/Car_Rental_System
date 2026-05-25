import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as carsApi from "../api/cars";
import { getImageUrl } from "../utils/imageUrl";
import { formatBirr } from "../utils/currency";
import { StarRating } from "../components/StarRating";

import car1 from "../assets/car1.jpeg";
import car2 from "../assets/car2.jpg";

export function HomePage() {
  const [featured, setFeatured] = useState([]);
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    q: "",
    brand: "",
    min_price: "",
    max_price: "",
    transmission: "",
    fuel_type: "",
    seats: "",
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
      q: "",
      brand: "",
      min_price: "",
      max_price: "",
      transmission: "",
      fuel_type: "",
      seats: "",
    });
  };

  useEffect(() => {
    carsApi
      .list({ featured: 1 })
      .then((data) =>
        setFeatured(Array.isArray(data) ? data : data?.data || []),
      );
  }, []);

  const featuredForShow = featured.slice(0, 6);

  const heroBgStyle = {
    backgroundImage: `url(${car1})`,
  };

  return (
    <div>
      {/* Hero with background from assets (car1.jpeg) */}
      <section
        className="relative flex min-h-[100svh] items-center bg-cover bg-center bg-no-repeat text-white py-28 sm:py-32"
        style={heroBgStyle}>
        <div className="absolute inset-0 bg-slate-950/42" aria-hidden />
        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:gap-10">
            <div className="rounded-[2rem] bg-black/24 px-6 py-8 text-center backdrop-blur-[3px] sm:px-8 sm:py-10 lg:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-3">
                Drive Your Journey with NHK Car-Rental
              </h1>
              <p className="text-lg opacity-95 mb-6">
                Find the perfect car for your next trip. Simple, fast, and
                reliable.
              </p>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link to="/cars" className="btn btn-primary min-w-[140px]">
                  Browse Cars
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/35 bg-white/50 px-7 py-7 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:px-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-5">
                Find your car
              </h2>
              <form onSubmit={handleSearch}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div className="form-group mb-0">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Keyword
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Toyota Camry"
                      value={filters.q}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, q: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Brand
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Toyota"
                      value={filters.brand}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, brand: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Min price (Birr/day)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={filters.min_price}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          min_price: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Max price (Birr/day)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="500"
                      value={filters.max_price}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          max_price: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md"
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Transmission
                    </label>
                    <select
                      value={filters.transmission}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          transmission: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md">
                      <option value="">Any</option>
                      <option value="automatic">Automatic</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Fuel type
                    </label>
                    <select
                      value={filters.fuel_type}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          fuel_type: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md">
                      <option value="">Any</option>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="form-group mb-0 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Min seats
                    </label>
                    <select
                      value={filters.seats}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, seats: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-[0.9375rem] border border-slate-200 rounded-md">
                      <option value="">Any</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n}+
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="btn btn-primary min-w-[120px]">
                    Search
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary min-w-[120px]"
                    onClick={handleClearFilters}>
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Featured cars - from API */}
      <section className="py-12 bg-slate-50">
        <div className="w-full max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Featured cars
            </h2>
            <p className="text-slate-500">
              Handpicked vehicles for your next adventure
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredForShow.map((car) => (
              <Link
                to={`/cars/${car.id}`}
                key={car.id}
                className="block bg-white rounded-xl overflow-hidden shadow hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-inherit no-underline">
                <div className="relative aspect-[16/10] bg-slate-200 overflow-hidden">
                  {getImageUrl(car.image) ? (
                    <img
                      src={getImageUrl(car.image)}
                      alt={`${car.brand} ${car.model}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                      No image
                    </div>
                  )}
                  <span className="absolute bottom-3 right-3 bg-black/75 text-white px-2.5 py-1.5 rounded text-sm font-semibold">
                    {formatBirr(car.price_per_day)}
                    <small className="font-normal text-xs opacity-90">
                      /day
                    </small>
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">
                    {car.brand} {car.model}
                  </h3>
                  <div className="mb-2">
                    <StarRating
                      rating={car.average_rating}
                      reviewCount={car.reviews_count}
                    />
                  </div>
                  <span className="text-sm font-medium text-[var(--primary)] hover:underline">
                    View details →
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {featured.length === 0 && (
            <p className="text-slate-500 text-center">
              No featured cars yet.{" "}
              <Link to="/cars" className="text-[var(--primary)]">
                Browse all cars
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 bg-white">
        <div className="w-full max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              How it works
            </h2>
            <p className="text-slate-500">Rent a car in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Choose your car
              </h3>
              <p className="text-sm text-slate-500">
                Browse our fleet and pick the perfect vehicle for your trip.
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Book & pay
              </h3>
              <p className="text-sm text-slate-500">
                Select your dates and complete the booking securely online.
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Hit the road
              </h3>
              <p className="text-sm text-slate-500">
                Collect your car and enjoy the journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us - car2.jpg from assets */}
      <section className="py-12 bg-slate-50">
        <div className="w-full max-w-[1200px] mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4 text-left">
                Why choose NHK Car-Rental
              </h2>
              <ul className="list-none p-0 m-0 mb-6 space-y-3">
                {[
                  "Wide selection of well-maintained vehicles",
                  "Transparent pricing with no hidden fees",
                  "Flexible booking and cancellation",
                  "24/7 support for your peace of mind",
                ].map((item, i) => (
                  <li key={i} className="relative pl-6 text-slate-800">
                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/cars" className="btn btn-primary">
                Explore fleet
              </Link>
            </div>
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-slate-200">
              <img
                src={car2}
                alt="Car rental"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="w-full max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-black">
              Reviews from our customers
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                quote:
                  "NHK Car-Rental made my trip so easy. The car was clean, the booking process was quick, and the team was very helpful. I will definitely use them again.",
                company: "AAU 5 Kilo",
                author: "Natnael Deribe",
                initials: "ND",
              },
              {
                quote:
                  "Great experience from start to finish. Fair prices, easy booking, and the car was in excellent condition. Highly recommend NHK Car-Rental for anyone in Addis.",
                company: "AAU 4 Kilo",
                author: "Habtamu Girma",
                initials: "HG",
              },
              {
                quote:
                  "Best car rental service I have used. Professional staff, transparent pricing, and a smooth pickup and return. Five stars from me.",
                company: "AAU 6 Kilo",
                author: "Kaleab Mulugeta",
                initials: "KM",
              },
            ].map(({ quote, company, author, initials }) => (
              <div
                key={author}
                className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                <div className="flex-1 px-6 pt-6 pb-10 bg-white rounded-t-2xl">
                  <div className="text-5xl sm:text-6xl leading-none text-[var(--primary)] mb-3 font-serif">
                    &ldquo;
                  </div>
                  <p className="text-sm sm:text-[0.9375rem] text-black leading-relaxed">
                    {quote}
                  </p>
                </div>
                <div className="relative px-6 pt-10 pb-6 bg-[var(--primary)] text-white text-center rounded-b-2xl">
                  <div
                    className="absolute left-1/2 top-0 w-14 h-14 rounded-full border-2 border-white overflow-hidden -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-white font-bold text-lg bg-slate-500"
                    aria-hidden>
                    {initials}
                  </div>
                  <p className="text-xs text-white/80 font-medium">{company}</p>
                  <p className="text-base font-bold text-white mt-0.5">
                    {author}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
