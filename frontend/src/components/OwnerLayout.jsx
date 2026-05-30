import { useEffect, useState } from 'react';
import DashboardNav from './DashboardNav';
import * as dashboardApi from '../api/dashboard';

export default function OwnerLayout({ children }) {
  const [activeBookingCount, setActiveBookingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchOwnerSidebarCount = () => {
      dashboardApi
        .getOwner()
        .then((data) => {
          if (cancelled) return;
          const bookings = Array.isArray(data?.active_bookings) ? data.active_bookings : [];
          setActiveBookingCount(bookings.filter((booking) => booking?.status === 'pending').length);
        })
        .catch(() => {
          if (!cancelled) setActiveBookingCount(0);
        });
    };

    fetchOwnerSidebarCount();

    const onChanged = () => fetchOwnerSidebarCount();
    window.addEventListener('owner-pending-changed', onChanged);
    window.addEventListener('owner-rejected-changed', onChanged);
    const interval = setInterval(fetchOwnerSidebarCount, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('owner-pending-changed', onChanged);
      window.removeEventListener('owner-rejected-changed', onChanged);
    };
  }, []);

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'active', label: 'Active bookings', to: '/owner/active', badge: activeBookingCount },
    { id: 'listed', label: 'Listed cars', to: '/owner/listed' },
    { id: 'add-car', label: 'Add car', to: '/owner/cars/new' },
    { id: 'booking-history', label: 'Booking history', to: '/bookings' },
  ];

  return (
    <div className="container">
      <div className="dashboard-shell">
        <DashboardNav sections={sections} dashboardPath="/owner/dashboard" />
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}
