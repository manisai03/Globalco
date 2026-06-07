import { useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import api from '../services/api';

import toast from 'react-hot-toast';
import { validateEmail, validatePassword } from '../utils/validation';

import { Mail, KeyRound, Lock } from 'lucide-react';



export default function ForgotPassword() {

  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');

  const [otp, setOtp] = useState('');

  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);



  const sendOtp = async (e) => {

    e.preventDefault();

    const emailErr = validateEmail(email);

    if (emailErr) {

      toast.error(emailErr);

      return;

    }

    setLoading(true);

    try {

      await api.post('/api/auth/forgot-password', { email });

      toast.success('OTP sent to your email');

      setStep(2);

    } catch (err) {

      toast.error(err.response?.data?.message || 'Failed to send OTP');

    } finally {

      setLoading(false);

    }

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

    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">

      <h1 className="text-3xl font-bold">Forgot password</h1>

      <p className="mt-2 text-slate-500">

        {step === 1 ? 'Enter your email to receive a one-time password (OTP)' : 'Enter the OTP and your new password'}

      </p>



      {step === 1 ? (

        <form onSubmit={sendOtp} className="mt-8 space-y-4">

          <div>

            <label className="block text-sm font-medium">Email</label>

            <div className="relative mt-1">

              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input

                type="email"

                required

                value={email}

                onChange={(e) => setEmail(e.target.value)}

                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 dark:border-slate-700 dark:bg-slate-900"

                placeholder="you@email.com"

              />

            </div>

          </div>

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-50">

            {loading ? 'Sending...' : 'Send OTP'}

          </button>

        </form>

      ) : (

        <form onSubmit={resetPassword} className="mt-8 space-y-4">

          <div>

            <label className="block text-sm font-medium">6-digit OTP</label>

            <div className="relative mt-1">

              <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input

                type="text"

                required

                maxLength={6}

                pattern="[0-9]{6}"

                value={otp}

                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}

                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 tracking-widest dark:border-slate-700 dark:bg-slate-900"

                placeholder="000000"

              />

            </div>

          </div>

          <div>

            <label className="block text-sm font-medium">New password</label>

            <div className="relative mt-1">

              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input

                type="password"

                required

                minLength={6}

                value={newPassword}

                onChange={(e) => setNewPassword(e.target.value)}

                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 dark:border-slate-700 dark:bg-slate-900"

              />

            </div>

          </div>

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-50">

            {loading ? 'Resetting...' : 'Reset Password'}

          </button>

          <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-primary-600 hover:underline">

            Resend OTP

          </button>

        </form>

      )}



      <p className="mt-6 text-center text-sm text-slate-500">

        <Link to="/login" className="font-medium text-primary-600">Back to sign in</Link>

      </p>



      <p className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        OTP is sent to your email. Backend email is configured via <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">backend/mail-local.yml</code> (Brevo or Gmail SMTP).
      </p>

    </div>

  );

}


