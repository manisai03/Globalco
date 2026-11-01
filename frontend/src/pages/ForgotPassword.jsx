import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '../services/api';
import AuthShell from '../components/common/AuthShell';
import PasswordInput from '../components/common/PasswordInput';
import { validateEmail, validatePassword } from '../utils/validation';

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestOtp = async () => {
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      toast.success('If an account exists for this email, an OTP has been sent');
      setStep(2);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = (e) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }
    requestOtp();
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (!otp?.trim()) {
      toast.error('OTP is required');
      return;
    }
    const passErr = validatePassword(newPassword);
    if (passErr) {
      toast.error(passErr);
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset! Please sign in.');
      navigate('/login?reset=true');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      description={step === 1 ? 'Enter your email to receive a one-time password (OTP)' : `Enter the OTP sent to ${email} and your new password`}
      footer={
        <>
          <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
          <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-left text-xs">
            <Info className="mt-0.5 size-4 shrink-0" />
            Check your inbox and spam folder for the 6-digit OTP. The code expires in 10 minutes.
          </p>
        </>
      }
    >
      {step === 1 ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 pl-10"
                placeholder="you@email.com"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full text-base">
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Sending...' : 'Send OTP'}
          </Button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-otp">6-digit OTP</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="forgot-otp"
                type="text"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="h-11 pl-10 tracking-[0.4em]"
                placeholder="000000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="forgot-new-password">New password</Label>
            <PasswordInput
              id="forgot-new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11"
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full text-base">
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <Button type="button" variant="link" className="h-auto px-0" onClick={() => setStep(1)}>
              Change email
            </Button>
            <Button
              type="button"
              variant="link"
              className="h-auto px-0"
              disabled={loading || cooldown > 0}
              onClick={requestOtp}
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </Button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
