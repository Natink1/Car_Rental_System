import { useAuth } from '../contexts/AuthContext';
import OwnerLayout from './OwnerLayout';
import { BookingList } from '../pages/BookingList';

export default function BookingWrapper() {
  const { user } = useAuth();
  if (user?.role === 'owner') {
    return (
      <OwnerLayout>
        <BookingList embedded />
      </OwnerLayout>
    );
  }
  return <BookingList />;
}
