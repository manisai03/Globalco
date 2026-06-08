import { useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import api, { unwrap } from '../services/api';

import toast from 'react-hot-toast';
import { validateRegister } from '../utils/validation';

import { Briefcase, Building2 } from 'lucide-react';



export default function Register() {

  const navigate = useNavigate();

  const [accountType, setAccountType] = useState('CANDIDATE');

  const [form, setForm] = useState({

    email: '', password: '', fullName: '', phone: '', location: '',

    currentTitle: '', skills: '',

    companyName: '', companyWebsite: '', companyDescription: '', recruiterTitle: '',

  });

  const [loading, setLoading] = useState(false);



  const isRecruiter = accountType === 'RECRUITER';



  const handleSubmit = async (e) => {

    e.preventDefault();

    const errors = validateRegister(form, isRecruiter);

    if (Object.keys(errors).length > 0) {

      toast.error(Object.values(errors)[0]);

      return;

    }

    setLoading(true);

    try {

      const data = unwrap(await api.post('/api/auth/register', { ...form, accountType }));

      toast.success(data.message || 'Account created! Please sign in.');

      navigate(`/login?registered=true&email=${encodeURIComponent(data.email)}`);

    } catch (err) {

      toast.error(err.response?.data?.message || 'Registration failed');

    } finally {

      setLoading(false);

    }

  };



  const field = (name, label, opts = {}) => (

    <div key={name}>

      <label className="block text-sm font-medium">{label}{opts.required && ' *'}</label>

      {opts.textarea ? (

        <textarea

          value={form[name]}

          onChange={(e) => setForm({ ...form, [name]: e.target.value })}

          rows={opts.rows || 3}

          required={opts.required}

          placeholder={opts.placeholder}

          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"

        />

      ) : (

        <input

          type={opts.type || 'text'}

          value={form[name]}

          onChange={(e) => setForm({ ...form, [name]: e.target.value })}

          required={opts.required}

          placeholder={opts.placeholder}

          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"

        />

      )}

    </div>

  );



  return (

    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">

      <h1 className="text-3xl font-bold">Create account</h1>

      <p className="mt-2 text-slate-500">Create a candidate or recruiter account</p>



      <div className="mt-6 grid grid-cols-2 gap-3">

        <button

          type="button"

          onClick={() => setAccountType('CANDIDATE')}

          className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition ${

            !isRecruiter ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700'

          }`}

        >

          <Briefcase className="h-5 w-5" /> I'm a Candidate

        </button>

        <button

          type="button"

          onClick={() => setAccountType('RECRUITER')}

          className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition ${

            isRecruiter ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700'

          }`}

        >

          <Building2 className="h-5 w-5" /> I'm a Recruiter

        </button>

      </div>



      <form onSubmit={handleSubmit} className="mt-8 space-y-4">

        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account Details</h2>

        {field('fullName', 'Full Name', { required: true })}

        {field('email', 'Email', { type: 'email', required: true })}

        {field('password', 'Password', { type: 'password', required: true })}

        {field('phone', 'Phone')}

        {field('location', 'Location', { placeholder: 'Hyderabad' })}



        {isRecruiter ? (

          <>

            <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Company Information</h2>

            {field('companyName', 'Company Name', { required: true, placeholder: 'e.g. XPO, Xceed Technologies' })}

            {field('recruiterTitle', 'Your Role / Title', { required: true, placeholder: 'HR Manager, Talent Lead' })}

            {field('companyWebsite', 'Company Website', { placeholder: 'https://company.com' })}

            {field('companyDescription', 'About Company', { textarea: true, placeholder: 'Brief description of your company...' })}

          </>

        ) : (

          <>

            <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Professional Info</h2>

            {field('currentTitle', 'Current / Desired Job Title', { placeholder: 'Software Engineer' })}

            {field('skills', 'Key Skills', { textarea: true, placeholder: 'Java, React, MySQL (comma separated)' })}

          </>

        )}



        <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-50">

          {loading ? 'Creating...' : isRecruiter ? 'Register as Recruiter' : 'Register as Candidate'}

        </button>

      </form>



      <p className="mt-6 text-center text-sm text-slate-500">

        Have an account? <Link to="/login" className="font-medium text-primary-600">Sign in</Link>

      </p>

    </div>

  );

}


