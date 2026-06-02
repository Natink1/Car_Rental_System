import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as bookingsApi from "../api/bookings";
import { useAuth } from "../contexts/AuthContext";
import { formatDisplayDate } from "../utils/dateFormat";
import { formatBirr } from "../utils/currency";
import { getImageUrl } from "../utils/imageUrl";
import { ChapaPaymentModal } from "../components/ChapaPaymentModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { PaymentReceiptActions } from "../components/PaymentReceiptActions";

export function BookingList({ embedded = false }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    customerId: "all",
    startDate: "",
    endDate: "",
  });
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await bookingsApi.list();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const hasCompletedPayment = (booking) => {
    const payments = booking?.payments || [];
    return payments.some((p) => p.payment_status === "completed");
  };

  const canPay = (booking) =>
    booking?.status === "approved" && !hasCompletedPayment(booking);

  const statusClass = (s) => {
    if (s === "pending") return "badge-pending";
    if (s === "approved") return "badge-approved";
    if (s === "rejected") return "badge-rejected";
    return "badge-cancelled";
  };

  const filtered = useMemo(() => {
    return list.filter((b) => {
      if (filters.status !== "all" && b.status !== filters.status) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const car = `${b.car?.brand || ""} ${b.car?.model || ""}`.toLowerCase();
        const userName = (b.user?.name || "").toLowerCase();
        if (!car.includes(s) && !userName.includes(s)) return false;
      }
      if (
        filters.startDate &&
        new Date(b.start_date) < new Date(filters.startDate)
      )
        return false;
      if (filters.endDate && new Date(b.end_date) > new Date(filters.endDate))
        return false;
      if (
        filters.customerId !== "all" &&
        String(b.user?.id) !== String(filters.customerId)
      )
        return false;
      return true;
    });
  }, [list, filters]);

  const ownerGrouped = useMemo(() => {
    if (user?.role !== "owner") return [];
    const map = {};
    filtered.forEach((b) => {
      const key = b.car?.id || "unknown";
      if (!map[key]) map[key] = { car: b.car, bookings: [] };
      map[key].bookings.push(b);
    });
    return Object.values(map);
  }, [filtered, user]);

  const title = embedded ? "Booking history" : "My bookings";

  const inner = (
    <>
      <h1 className="section-title">{title}</h1>

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
              placeholder={
                user?.role === "owner" ? "Customer or car" : "Car or owner"
              }
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
                customerId: "all",
                startDate: "",
                endDate: "",
              })
            }>
            Reset filters
          </button>
        </div>
      </div>

      <div className="grid">
        {filtered.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>
            No bookings match these filters.
          </p>
        )}

        {user?.role === "owner"
          ? ownerGrouped.map(({ car, bookings }) => (
              <div
                key={car?.id ?? `${car?.brand}-${car?.model}`}
                className="card"
                style={{ padding: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                    marginBottom: "1rem",
                  }}>
                  <div
                    style={{
                      width: 110,
                      height: 74,
                      flexShrink: 0,
                      background: "#e2e8f0",
                      borderRadius: "var(--radius)",
                      overflow: "hidden",
                    }}>
                    {car?.image && getImageUrl(car.image) ? (
                      <img
                        src={getImageUrl(car.image)}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94a3b8",
                          fontSize: "0.75rem",
                        }}>
                        No image
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
                      {car?.brand ?? "Car"} {car?.model ?? ""}
                    </h2>
                    <p
                      style={{
                        margin: "0.25rem 0 0",
                        color: "var(--text-muted)",
                        fontSize: "0.875rem",
                      }}>
                      {bookings.length} booking
                      {bookings.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="grid" style={{ gap: "0.75rem" }}>
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        flexWrap: "wrap",
                        padding: "0.85rem",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                      }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <strong>{b.user?.name || "N/A"}</strong>
                        <p
                          style={{
                            margin: "0.25rem 0 0",
                            color: "var(--text-muted)",
                            fontSize: "0.875rem",
                          }}>
                          {formatDisplayDate(b.start_date)} –{" "}
                          {formatDisplayDate(b.end_date)}
                        </p>
                        {b.user?.email && (
                          <p
                            style={{
                              margin: "0.25rem 0 0",
                              color: "var(--text-muted)",
                              fontSize: "0.875rem",
                            }}>
                            {b.user.email}
                          </p>
                        )}
                      </div>
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
                          {formatBirr(b.total_price ?? 0)}
                        </div>
                        <span className={`badge ${statusClass(b.status)}`}>
                          {b.status ?? "—"}
                        </span>
                        {hasCompletedPayment(b) && (
                          <PaymentReceiptActions booking={b} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          : filtered.map((b) => (
              <div
                key={b.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem",
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
                      width: 120,
                      height: 80,
                      flexShrink: 0,
                      background: "#e2e8f0",
                      borderRadius: "var(--radius)",
                      overflow: "hidden",
                    }}>
                    {b.car?.image && getImageUrl(b.car.image) ? (
                      <img
                        src={getImageUrl(b.car.image)}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "var(--radius)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94a3b8",
                          fontSize: "0.75rem",
                        }}>
                        No image
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>
                      {b.car?.brand} {b.car?.model}
                    </strong>
                    <p
                      style={{
                        margin: "0.25rem 0 0",
                        color: "var(--text-muted)",
                        fontSize: "0.875rem",
                      }}>
                      {formatDisplayDate(b.start_date)} –{" "}
                      {formatDisplayDate(b.end_date)}
                    </p>
                    <p
                      style={{
                        margin: "0.25rem 0 0",
                        color: "var(--text-muted)",
                        fontSize: "0.875rem",
                      }}>
                      {user?.role === "owner"
                        ? `Customer: ${b.user?.name || "N/A"}`
                        : `Owner: ${b.car?.owner?.name || "N/A"}`}
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
                    {formatBirr(b.total_price ?? 0)}
                  </div>
                  <span className={`badge ${statusClass(b.status)}`}>
                    {b.status ?? "—"}
                  </span>
                  {canPay(b) && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setPaymentBooking(b)}>
                      Pay now
                    </button>
                  )}
                  {!hasCompletedPayment(b) &&
                    (b.status === "pending" || b.status === "approved") && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setCancelBooking(b)}>
                        Cancel booking
                      </button>
                    )}
                  {hasCompletedPayment(b) && (
                    <PaymentReceiptActions booking={b} />
                  )}
                </div>
              </div>
            ))}
      </div>

      <ChapaPaymentModal
        open={!!paymentBooking}
        onClose={() => setPaymentBooking(null)}
        booking={paymentBooking}
        amount={paymentBooking?.total_price ?? 0}
        onSuccess={() => {
          setPaymentBooking(null);
          refresh();
        }}
      />
      <ConfirmModal
        open={!!cancelBooking}
        onClose={() => setCancelBooking(null)}
        title="Cancel booking"
        message="Are you sure you want to cancel this booking?"
        confirmLabel="Cancel booking"
        variant="danger"
        loading={cancelLoading}
        onConfirm={async () => {
          if (!cancelBooking) return;
          try {
            setCancelLoading(true);
            await bookingsApi.cancel(cancelBooking.id);
            await refresh();
            setCancelBooking(null);
          } catch (err) {
            // minimal feedback
            window.alert(
              err?.response?.data?.message || "Could not cancel booking.",
            );
          } finally {
            setCancelLoading(false);
          }
        }}
      />
    </>
  );

  return embedded ? inner : <div className="container">{inner}</div>;
}

export default BookingList;
