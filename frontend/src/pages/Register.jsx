import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import api, { unwrap } from '../services/api';
import AuthShell from '../components/common/AuthShell';
import PasswordInput from '../components/common/PasswordInput';
import { PASSWORD_MAX, PASSWORD_MIN, validateRegister } from '../utils/validation';
import { getApiErrorMessage } from '../utils/apiError';
import { normalizeEmail, normalizePhone, trimFormFields } from '../utils/normalize';

const ACCOUNT_TYPES = [
  { value: 'CANDIDATE', label: "I'm a Candidate", icon: Briefcase },
  { value: 'RECRUITER', label: "I'm a Recruiter", icon: Building2 },
];

function SectionHeading({ children }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <h2 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>
      <Separator className="flex-1" />
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accountType, setAccountType] = useState(() => (
    searchParams.get('type')?.toLowerCase() === 'recruiter' ? 'RECRUITER' : 'CANDIDATE'
  ));
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', phone: '', location: '',
    currentTitle: '', skills: '',
    companyName: '', companyWebsite: '', companyDescription: '', recruiterTitle: '',
  });
  const [loading, setLoading] = useState(false);

  const isRecruiter = accountType === 'RECRUITER';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = trimFormFields({
      ...form,
      email: normalizeEmail(form.email),
      phone: normalizePhone(form.phone),
    });
    const errors = validateRegister(payload, isRecruiter);
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0]);
      return;
    }
    setLoading(true);
    try {
      const data = unwrap(await api.post('/api/auth/register', { ...payload, accountType }));
      toast.success(data.message || 'Account created! Please sign in.');
      navigate(`/login?registered=true&email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, opts = {}) => {
    const id = `register-${name}`;
    const common = {
      id,
      value: form[name],
      onChange: (e) => setForm({ ...form, [name]: e.target.value }),
      required: opts.required,
      placeholder: opts.placeholder,
    };
    return (
      <div key={name} className="space-y-2">
        <Label htmlFor={id}>{label}{opts.required && <span className="text-destructive">*</span>}</Label>
        {opts.textarea ? (
          <Textarea {...common} rows={opts.rows || 3} />
        ) : (
          <Input
            {...common}
            type={opts.type || 'text'}
            autoComplete={opts.autoComplete}
            autoCapitalize={opts.autoCapitalize}
            inputMode={opts.inputMode}
            className="h-11"
          />
        )}
      </div>
    );
  };

  return (
    <AuthShell
      title="Create account"
      description="Create a candidate or recruiter account"
      className="max-w-lg"
      footer={
        <p>
          Have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      }
    >
      <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-3">
        {ACCOUNT_TYPES.map(({ value, label, icon: Icon }) => {
          const selected = accountType === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setAccountType(value)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:bg-muted'
              )}
            >
              <Icon className="size-5" /> {label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <SectionHeading>Account Details</SectionHeading>
        {field('fullName', 'Full Name', { required: true, autoComplete: 'name' })}
        {field('email', 'Email', { type: 'email', required: true, autoComplete: 'email', autoCapitalize: 'none', inputMode: 'email' })}
        <div className="space-y-2">
          <Label htmlFor="register-password">Password<span className="text-destructive">*</span></Label>
          <PasswordInput
            id="register-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-11"
            required
            minLength={PASSWORD_MIN}
            maxLength={PASSWORD_MAX}
            autoComplete="new-password"
            aria-describedby="register-password-hint"
          />
          <p id="register-password-hint" className="text-xs text-muted-foreground">
            {PASSWORD_MIN}–{PASSWORD_MAX} characters
          </p>
        </div>
        {field('phone', 'Phone', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
        {field('location', 'Location', { placeholder: 'Hyderabad' })}

        {isRecruiter ? (
          <>
            <SectionHeading>Company Information</SectionHeading>
            {field('companyName', 'Company Name', { required: true, placeholder: 'e.g. XPO, Xceed Technologies' })}
            {field('recruiterTitle', 'Your Role / Title', { required: true, placeholder: 'HR Manager, Talent Lead' })}
            {field('companyWebsite', 'Company Website', { placeholder: 'https://company.com' })}
            {field('companyDescription', 'About Company', { textarea: true, placeholder: 'Brief description of your company...' })}
          </>
        ) : (
          <>
            <SectionHeading>Professional Info</SectionHeading>
            {field('currentTitle', 'Current / Desired Job Title', { placeholder: 'Software Engineer' })}
            {field('skills', 'Key Skills', { textarea: true, placeholder: 'Java, React, MySQL (comma separated)' })}
          </>
        )}

        <Button type="submit" disabled={loading} className="h-11 w-full text-base">
          {loading && <Loader2 className="animate-spin" />}
          {loading ? 'Creating...' : isRecruiter ? 'Register as Recruiter' : 'Register as Candidate'}
        </Button>
      </form>
    </AuthShell>
  );
}
