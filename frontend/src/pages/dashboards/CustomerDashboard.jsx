import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as dashboardApi from "../../api/dashboard";
import * as paymentsApi from "../../api/payments";
import { formatDisplayDate } from "../../utils/dateFormat";
import { formatBirr } from "../../utils/currency";
import { getImageUrl } from "../../utils/imageUrl";
import { ChapaPaymentModal } from "../../components/ChapaPaymentModal";
import { PaymentReceiptActions } from "../../components/PaymentReceiptActions";

function hasCompletedPayment(booking) {
  const payments = booking.payments || [];
  return payments.some((p) => p.payment_status === "completed");
}

export function CustomerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({
    active_bookings: [],
    booking_history: [],
  });
  const [loading, setLoading] = useState(true);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    startDate: "",
    endDate: "",
  });

  const refresh = () => {
    dashboardApi
      .getCustomer()
      .then((d) =>
        setData({
          active_bookings: Array.isArray(d?.active_bookings)
            ? d.active_bookings
            : [],
          booking_history: Array.isArray(d?.booking_history)
            ? d.booking_history
            : [],
        }),
      )
      .catch(() => setData({ active_bookings: [], booking_history: [] }));
  };

  const verifyPendingChapaPayment = async () => {
    const txRef = localStorage.getItem("pendingChapaTxRef");
    const refId = searchParams.get("ref_id");
    if (!txRef) return;
    try {
      await paymentsApi.verifyChapa(txRef, refId);
      localStorage.removeItem("pendingChapaTxRef");
      refresh();
    } catch (_) {
      // Keep pending tx_ref so we can retry on next focus/return.
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dashboardApi
      .getCustomer()
      .then((d) => {
        if (!cancelled) {
          setData({
            active_bookings: Array.isArray(d?.active_bookings)
              ? d.active_bookings
              : [],
            booking_history: Array.isArray(d?.booking_history)
              ? d.booking_history
              : [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) setData({ active_bookings: [], booking_history: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // After Chapa redirect (in other tab), refresh and clear ?chapa=success
  useEffect(() => {
    if (searchParams.get("chapa") === "success") {
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
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const statusClass = (s) => {
    if (s === "pending") return "badge-pending";
    if (s === "approved") return "badge-approved";
    if (s === "rejected") return "badge-rejected";
    return "badge-cancelled";
  };

  const active = data.active_bookings || [];
  const history = data.booking_history || [];

  const hasCompletedPayment = (booking) => {
    const payments = booking.payments || [];
    return payments.some((p) => p.payment_status === "completed");
  };

  const bookings = useMemo(() => {
    const combined = [...active, ...history];

    return combined.filter((booking) => {
      if (filters.status !== "all" && booking.status !== filters.status) {
        return false;
      }

      if (filters.search) {
        const search = filters.search.toLowerCase();
        const car = `${booking.car?.brand || ""} ${booking.car?.model || ""}`.toLowerCase();
        const owner = (booking.car?.owner?.name || "").toLowerCase();
        if (!car.includes(search) && !owner.includes(search)) {
          return false;
        }
      }

      if (
        filters.startDate &&
        new Date(booking.start_date) < new Date(filters.startDate)
      ) {
        return false;
      }

      if (
        filters.endDate &&
        new Date(booking.end_date) > new Date(filters.endDate)
      ) {
        return false;
      }

      return true;
    });
  }, [active, history, filters]);

  if (loading)
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    );

  return (
    <div className="container">
      <h1 className="section-title">Customer Dashboard</h1>
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}>
        <Link to="/chat" className="btn btn-primary">
          Open Chat
        </Link>
      </div>

      <div
        className="card"
        style={{ padding: "1rem", marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            alignItems: "end",
          }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Search</label>
            <input
              type="search"
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              placeholder="Car or owner"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }>
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
              onChange={(e) =>
                setFilters((f) => ({ ...f, startDate: e.target.value }))
              }
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((f) => ({ ...f, endDate: e.target.value }))
              }
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setFilters({
                search: "",
                status: "all",
                startDate: "",
                endDate: "",
              })
            }>
            Reset filters
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
        My bookings
      </h2>
      <div className="grid">
        {bookings.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>
            No bookings match these filters.
          </p>
        )}
        {bookings.map((b) => (
          <div
            key={b.id}
            className="card"
            style={{
              padding: "1rem",
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}>
            <Link
              to={`/cars/${b.car_id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flex: 1,
                minWidth: 0,
                color: "inherit",
                textDecoration: "none",
              }}>
              <div
                style={{
                  width: 80,
                  height: 56,
                  background: "#e2e8f0",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                }}>
                {b.car?.image && getImageUrl(b.car.image) && (
                  <img
                    src={getImageUrl(b.car.image)}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <strong>
                  {b.car?.brand} {b.car?.model}
                </strong>
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                  }}>
                  {formatDisplayDate(b.start_date)} – {formatDisplayDate(b.end_date)}
                </p>
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                  }}>
                  Owner: {b.car?.owner?.name || "N/A"}
                </p>
              </div>
            </Link>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                marginLeft: "auto",
              }}>
              <div
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "999px",
                  background: "rgba(29, 78, 216, 0.12)",
                  color: "#1d4ed8",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}>
                {formatBirr(b.total_price)}
              </div>
              <span className={`badge ${statusClass(b.status)}`}>
                {b.status}
              </span>
              {b.status === "approved" && !hasCompletedPayment(b) && (
                <>
                  <span className="badge badge-unpaid">Unpaid</span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setPaymentBooking(b)}>
                    Pay now
                  </button>
                </>
              )}
              {hasCompletedPayment(b) && <PaymentReceiptActions booking={b} />}
            </div>
          </div>
        ))}
      </div>

      <ChapaPaymentModal
        open={!!paymentBooking}
        onClose={() => setPaymentBooking(null)}
        booking={paymentBooking}
        amount={paymentBooking ? paymentBooking.total_price : 0}
        onSuccess={() => {
          setPaymentBooking(null);
          refresh();
          window.dispatchEvent(new Event("customer-pending-changed"));
        }}
      />
    </div>
  );
}
