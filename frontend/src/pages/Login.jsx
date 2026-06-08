import { useState, useEffect } from 'react';

import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import toast from 'react-hot-toast';



export default function Login() {

  const { login } = useAuth();

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });

  const [loading, setLoading] = useState(false);



  useEffect(() => {

    const email = searchParams.get('email');

    if (email) setForm((f) => ({ ...f, email }));

    if (searchParams.get('registered') === 'true') {

      toast.success('Account created! Please sign in to continue.');

    }

    if (searchParams.get('reset') === 'true') {

      toast.success('Password reset successful. Please sign in.');

    }

  }, [searchParams]);



  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);

    try {

      const user = await login(form.email, form.password);

      toast.success('Welcome back!');

      navigate(user.role === 'ROLE_ADMIN' ? '/admin' : '/dashboard');

    } catch (err) {

      toast.error(err.response?.data?.message || 'Login failed');

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">

      <h1 className="text-3xl font-bold">Sign in</h1>

      <p className="mt-2 text-slate-500">Access your Globalco Jobs account</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">

        <div>

          <label className="block text-sm font-medium">Email</label>

          <input

            type="email"

            required

            value={form.email}

            onChange={(e) => setForm({ ...form, email: e.target.value })}

            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"

            placeholder="you@email.com"

          />

        </div>

        <div>

          <div className="flex items-center justify-between">

            <label className="block text-sm font-medium">Password</label>

            <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:underline">Forgot password?</Link>

          </div>

          <input

            type="password"

            required

            value={form.password}

            onChange={(e) => setForm({ ...form, password: e.target.value })}

            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"

          />

        </div>

        <button

          type="submit"

          disabled={loading}

          className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-50"

        >

          {loading ? 'Signing in...' : 'Sign in'}

        </button>

      </form>

      <p className="mt-6 text-center text-sm text-slate-500">

        No account? <Link to="/register" className="font-medium text-primary-600">Register</Link>

      </p>

    </div>

  );

}


