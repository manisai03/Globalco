import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../context/auth';
import { safeRedirect } from '../services/api';
import AuthShell from '../components/common/AuthShell';
import PasswordInput from '../components/common/PasswordInput';
import { getApiErrorMessage } from '../utils/apiError';
import { normalizeEmail } from '../utils/normalize';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(() => ({ email: searchParams.get('email') || '', password: '' }));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      toast.success('Account created! Please sign in to continue.', { id: 'registered' });
    }
    if (searchParams.get('reset') === 'true') {
      toast.success('Password reset successful. Please sign in.', { id: 'reset' });
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(normalizeEmail(form.email), form.password);
      toast.success('Welcome back!');
      const home = user.role === 'ROLE_ADMIN' ? '/admin' : '/dashboard';
      navigate(safeRedirect(searchParams.get('redirect'), home), { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      description="Sign in to your account"
      footer={
        <p>
          No account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">Register</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-11"
            placeholder="you@email.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
          </div>
          <PasswordInput
            id="login-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-11"
            required
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full text-base">
          {loading && <Loader2 className="animate-spin" />}
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}
