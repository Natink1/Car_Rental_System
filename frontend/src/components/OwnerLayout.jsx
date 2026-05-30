import DashboardNav from './DashboardNav';

export default function OwnerLayout({ children }) {
  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'active', label: 'Active bookings', to: '/owner/active' },
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
