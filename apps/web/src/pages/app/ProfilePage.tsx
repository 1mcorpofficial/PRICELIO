import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/authStore';

export function ProfilePage() {
  const user = useAuthStore((state) => state.session.user);

  return (
    <Card>
      <h2>Profile</h2>
      <p>Email: {user?.email || '-'}</p>
      <p>Use this panel to manage your account and loyalty setup.</p>
    </Card>
  );
}
