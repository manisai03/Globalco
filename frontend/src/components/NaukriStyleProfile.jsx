import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Phone, Mail, Pencil, FileText, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api, { unwrap } from '../services/api';
import { useAuth } from '../context/AuthContext';
import YearMonthPicker from './YearMonthPicker';
import ProfileAvatar from './ProfileAvatar';
import ResumeUploadBox from './ResumeUploadBox';
import PasswordInput from './common/PasswordInput';
import ConfirmDialog from './common/ConfirmDialog';
import LoadingSpinner from './LoadingSpinner';
import {
  defaultEducation, emptyInternship, emptyEmployment, parseJsonField,
} from '../utils/profileDefaults';
import {
  validateProfile, validateYear, validateYearRange, validateUrl, validatePassword,
} from '../utils/validation';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const QUICK_LINKS = [
  { id: 'personal', label: 'Personal info' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Key skills' },
  { id: 'internships', label: 'Internships' },
  { id: 'employment', label: 'Employment' },
  { id: 'resume', label: 'Resume' },
  { id: 'password', label: 'Password' },
];

const EDUCATION_LEVELS = [
  { key: 'college', label: 'College' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'school', label: 'School' },
];

const PERSONAL_FIELDS = [
  ['fullName', 'Full Name'], ['phone', 'Phone'], ['location', 'Location'],
  ['currentTitle', 'Current / Desired Title'], ['headline', 'Professional headline'], ['email', 'Email'],
];

const RECRUITER_FIELDS = [
  ['fullName', 'Full Name'], ['email', 'Email'], ['phone', 'Phone'], ['location', 'Location'],
  ['recruiterTitle', 'Your Role / Title'], ['companyName', 'Company Name'],
  ['companyWebsite', 'Company Website'],
];

function formatMonthYear(month, year) {
  if (!month && !year) return '';
  const m = month ? MONTH_NAMES[Number(month)] || month : '';
  return [m, year].filter(Boolean).join(' ');
}

function calcCompletion(profile, education, internships, employment) {
  const checks = [
    profile.fullName, profile.phone, profile.location, profile.email,
    profile.currentTitle, profile.skills,
    education.college?.collegeName, education.college?.course,
    internships.some((i) => i.companyName),
    employment.some((e) => e.companyName),
    profile.resumeUrl,
    profile.profilePictureUrl,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function validateState({ profile, education, internships }, isAdmin) {
  const errors = validateProfile(profile, isAdmin);
  if (!isAdmin) {
    EDUCATION_LEVELS.forEach(({ key }) => {
      const e = education[key];
      if (!e) return;
      const err = validateYear(e.startYear, `${key} start year`)
        || validateYear(e.endYear, `${key} end year`)
        || validateYearRange(e.startYear, e.endYear);
      if (err) errors[`edu_${key}`] = err;
    });
    internships.forEach((item, i) => {
      const urlErr = validateUrl(item.projectUrl);
      if (urlErr) errors[`intern_${i}`] = urlErr;
      if (item.description?.length > 1000) errors[`intern_${i}`] = 'Internship description max 1000 characters';
    });
  }
  return errors;
}

function Field({ id, label, className, children }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SectionCard({ id, title, description, onAdd, addLabel = 'Add', children }) {
  return (
    <Card id={id} className="scroll-mt-36">
      <CardHeader className="border-b [.border-b]:pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {onAdd && (
          <CardAction>
            <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={onAdd}>{addLabel}</Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EntryRow({ title, subtitle, meta, onEdit, editLabel }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        {meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>}
      </div>
      <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={onEdit} aria-label={editLabel}>
        <Pencil />
      </Button>
    </div>
  );
}

function EditDialog({ title, subtitle, wide, onClose, onSave, onDelete, deleteLabel, children }) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className={cn('flex max-h-[90vh] flex-col gap-0 p-0', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className={subtitle ? undefined : 'sr-only'}>{subtitle || title}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-6 py-5">{children}</div>
        <DialogFooter className="border-t px-6 py-4 sm:justify-between">
          {onDelete ? (
            <ConfirmDialog
              trigger={<Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={saving}>Delete</Button>}
              title={deleteLabel || 'Delete this entry?'}
              description="This can't be undone."
              confirmLabel="Delete"
              destructive
              onConfirm={onDelete}
            />
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordCard() {
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const passErr = validatePassword(passwords.newPassword);
    if (passErr) {
      toast.error(passErr);
      return;
    }
    if (passwords.newPassword === passwords.currentPassword) {
      toast.error('New password must be different from your current password');
      return;
    }
    setSubmitting(true);
    try {
      await api.put('/api/users/me/password', passwords);
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard id="password" title="Change Password">
      <form onSubmit={submit} className="max-w-md space-y-4">
        <Field id="current-password" label="Current password">
          <PasswordInput
            id="current-password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field id="new-password" label="New password">
          <PasswordInput
            id="new-password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            autoComplete="new-password"
            required
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <KeyRound />}
          Update Password
        </Button>
      </form>
    </SectionCard>
  );
}

function CompletionRing({ value, children }) {
  return (
    <div className="relative flex size-24 shrink-0 items-center justify-center">
      <svg className="absolute inset-0 size-24 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--muted)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="42" fill="none" stroke="#16a34a" strokeWidth="8"
          strokeDasharray={`${value * 2.64} 264`} strokeLinecap="round"
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      <span className="absolute -bottom-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
        {value}%
      </span>
    </div>
  );
}

function ContactLine({ profile }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
      {profile.location && <span className="flex items-center gap-1"><MapPin className="size-4" />{profile.location}</span>}
      {profile.phone && <span className="flex items-center gap-1"><Phone className="size-4" />{profile.phone}</span>}
      {profile.email && <span className="flex items-center gap-1 break-all"><Mail className="size-4 shrink-0" />{profile.email}</span>}
    </div>
  );
}

export default function NaukriStyleProfile() {
  const { isAdmin, refreshUser } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState({});
  const [education, setEducation] = useState(defaultEducation());
  const [internships, setInternships] = useState([]);
  const [employment, setEmployment] = useState([]);
  const [activeSection, setActiveSection] = useState('personal');
  const [editModal, setEditModal] = useState(null);
  const [draft, setDraft] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [savingSection, setSavingSection] = useState(false);

  const completion = useMemo(
    () => calcCompletion(profile, education, internships, employment),
    [profile, education, internships, employment]
  );

  const applyProfile = useCallback((data) => {
    setProfile(data);
    setEducation(parseJsonField(data.educationProfile, defaultEducation()));
    setInternships(parseJsonField(data.internshipsProfile, []));
    setEmployment(parseJsonField(data.employmentProfile, []).map((item) => ({
      ...item,
      isCurrent: item.isCurrent ?? !item.endYear,
    })));
    setLoaded(true);
  }, []);

  const load = useCallback(async () => {
    applyProfile(unwrap(await api.get('/api/users/me')));
  }, [applyProfile]);

  useEffect(() => {
    api.get('/api/users/me')
      .then((res) => applyProfile(unwrap(res)))
      .catch(() => {
        toast.error('Failed to load profile');
        setLoaded(true);
      });
  }, [applyProfile]);

  /** Persists the full profile, with `next` overriding any slice being edited. Returns true on success. */
  const saveAll = async (next = {}) => {
    const state = {
      profile: next.profile ?? profile,
      education: next.education ?? education,
      internships: next.internships ?? internships,
      employment: next.employment ?? employment,
    };
    const errors = validateState(state, isAdmin);
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0]);
      return false;
    }
    const p = state.profile;
    try {
      await api.put('/api/users/me', {
        fullName: p.fullName,
        phone: p.phone,
        location: p.location,
        bio: p.bio,
        skills: p.skills,
        currentTitle: p.currentTitle,
        headline: p.headline,
        openToWork: p.openToWork,
        companyName: p.companyName,
        companyWebsite: p.companyWebsite,
        companyDescription: p.companyDescription,
        recruiterTitle: p.recruiterTitle,
        educationProfile: JSON.stringify(state.education),
        internshipsProfile: JSON.stringify(state.internships),
        employmentProfile: JSON.stringify(state.employment),
      });
      await Promise.allSettled([refreshUser(), load()]);
      toast.success('Profile saved');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
      return false;
    }
  };

  const saveSection = async () => {
    setSavingSection(true);
    try {
      await saveAll();
    } finally {
      setSavingSection(false);
    }
  };

  const openEditor = (type, value) => {
    setDraft(value);
    setEditModal(type);
  };

  const closeEditor = () => {
    setEditModal(null);
    setDraft(null);
  };

  const saveAndClose = async (next) => {
    if (await saveAll(next)) closeEditor();
  };

  const uploadAvatar = async (file, validationError) => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setAvatarUploading(true);
    try {
      const res = await api.post('/api/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const data = unwrap(res);
      setProfile((prev) => ({
        ...prev,
        profilePictureUrl: data.profilePictureUrl,
        profilePictureUploadedAt: data.profilePictureUploadedAt,
      }));
      await refreshUser();
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const uploadResume = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      toast.error('Only PDF, DOC, or DOCX files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Resume must be under 10MB');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setResumeUploading(true);
    try {
      const res = await api.post('/api/users/me/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const data = unwrap(res);
      setProfile((prev) => ({ ...prev, resumeUrl: data.resumeUrl, resumeUploadedAt: data.resumeUploadedAt }));
      await refreshUser();
      toast.success('Resume uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setResumeUploading(false);
    }
  };

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!loaded) return <LoadingSpinner fullScreen />;

  if (isAdmin) {
    return (
      <RecruiterProfile
        profile={profile}
        setProfile={setProfile}
        onSave={saveSection}
        saving={savingSection}
        onUploadAvatar={uploadAvatar}
        avatarUploading={avatarUploading}
      />
    );
  }

  const skillTags = (profile.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  const collegeLine = education.college?.course && education.college?.collegeName
    ? `${education.college.course} from ${education.college.collegeName}`
    : profile.currentTitle || 'Add your education';

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-start gap-6">
          <CompletionRing value={completion}>
            <ProfileAvatar
              url={profile.profilePictureUrl}
              onUpload={uploadAvatar}
              uploading={avatarUploading}
              size="md"
              variant="user"
            />
          </CompletionRing>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{profile.fullName || 'Your Name'}</h1>
              <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => scrollTo('personal')} aria-label="Edit personal info">
                <Pencil />
              </Button>
              {profile.openToWork && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Open to work</Badge>
              )}
            </div>
            <p className="mt-1 text-muted-foreground">{collegeLine}</p>
            <ContactLine profile={profile} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Profile sections" className="lg:sticky lg:top-36 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick links</p>
          <ul className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-2 lg:flex-col">
            {QUICK_LINKS.map((link) => (
              <li key={link.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => scrollTo(link.id)}
                  aria-current={activeSection === link.id ? 'true' : undefined}
                  className={cn(
                    'block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    activeSection === link.id
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          <SectionCard id="personal" title="Personal information">
            <div className="grid gap-4 sm:grid-cols-2">
              {PERSONAL_FIELDS.map(([key, label]) => (
                <Field key={key} id={`profile-${key}`} label={label}>
                  <Input
                    id={`profile-${key}`}
                    value={profile[key] || ''}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                    disabled={key === 'email'}
                  />
                </Field>
              ))}
              <Field id="profile-bio" label="Profile summary" className="sm:col-span-2">
                <Textarea
                  id="profile-bio"
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                  placeholder="Brief summary about yourself..."
                />
              </Field>
              <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/40 px-4 py-3 sm:col-span-2">
                <div>
                  <Label htmlFor="profile-open-to-work" className="text-sm font-medium">Open to work</Label>
                  <p className="text-xs text-muted-foreground">Let recruiters know you&apos;re actively looking</p>
                </div>
                <Switch
                  id="profile-open-to-work"
                  checked={!!profile.openToWork}
                  onCheckedChange={(checked) => setProfile({ ...profile, openToWork: checked })}
                />
              </div>
            </div>
            <Button type="button" className="mt-4" onClick={saveSection} disabled={savingSection}>
              {savingSection && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </SectionCard>

          <SectionCard id="education" title="Education" onAdd={() => openEditor('education', { ...education })}>
            {EDUCATION_LEVELS.map(({ key, label }) => {
              const e = education[key];
              if (!e?.collegeName && !e?.course) return null;
              return (
                <EntryRow
                  key={key}
                  title={<>{e.course || label} {e.collegeName && `from ${e.collegeName}`}</>}
                  subtitle={[e.specialization, e.grades && `Scored ${e.grades}`, e.endYear && `Passed out in ${e.endYear}`].filter(Boolean).join(' · ')}
                  onEdit={() => openEditor('education', { ...education })}
                  editLabel={`Edit ${label}`}
                />
              );
            })}
            {!education.college?.collegeName && !education.intermediate?.collegeName && !education.school?.collegeName && (
              <p className="text-sm text-muted-foreground">Add your school, intermediate, and college details.</p>
            )}
          </SectionCard>

          <SectionCard id="skills" title="Key skills" onAdd={() => openEditor('skills', { skills: profile.skills || '' })} addLabel="Edit">
            {skillTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skillTags.map((s) => (
                  <Badge key={s} variant="outline" className="bg-muted/50 px-3 py-1.5 text-sm">{s}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Add skills like Java, React, Spring Boot...</p>
            )}
          </SectionCard>

          <SectionCard id="internships" title="Internships" onAdd={() => openEditor('internship', { ...emptyInternship(), _idx: -1 })}>
            {internships.length === 0 ? (
              <p className="text-sm text-muted-foreground">Show your professional learnings — add internship experience.</p>
            ) : internships.map((item, idx) => (
              <EntryRow
                key={idx}
                title={item.companyName}
                subtitle={item.projectName}
                meta={`${formatMonthYear(item.startMonth, item.startYear)} – ${formatMonthYear(item.endMonth, item.endYear)}`}
                onEdit={() => openEditor('internship', { ...item, _idx: idx })}
                editLabel={`Edit internship at ${item.companyName}`}
              />
            ))}
          </SectionCard>

          <SectionCard id="employment" title="Employment" onAdd={() => openEditor('employment', { ...emptyEmployment(), _idx: -1 })}>
            {employment.length === 0 ? (
              <p className="text-sm text-muted-foreground">Talk about the company you worked at, your designation and what you did.</p>
            ) : employment.map((item, idx) => (
              <EntryRow
                key={idx}
                title={`${item.designation || 'Role'} at ${item.companyName}`}
                subtitle={item.experienceYears || item.experienceMonths
                  ? `${item.experienceYears || 0} yr ${item.experienceMonths || 0} mo`
                  : formatMonthYear(item.startMonth, item.startYear) + (item.isCurrent || !item.endYear ? ' – Present' : ` – ${formatMonthYear(item.endMonth, item.endYear)}`)}
                onEdit={() => openEditor('employment', { ...item, _idx: idx })}
                editLabel={`Edit employment at ${item.companyName}`}
              />
            ))}
          </SectionCard>

          <SectionCard
            id="resume"
            title="Resume"
            description="Your resume is the first impression you make on potential employers. Craft it carefully."
          >
            {profile.resumeUrl && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border p-4">
                <FileText className="size-8 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{profile.resumeUrl.split('/').pop()}</p>
                  {profile.resumeUploadedAt && (
                    <p className="text-xs text-muted-foreground">
                      Uploaded on {new Date(profile.resumeUploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className={cn('relative', resumeUploading && 'pointer-events-none opacity-60')}>
              <ResumeUploadBox compact label={null} onUpload={uploadResume} />
              {resumeUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          </SectionCard>

          <ChangePasswordCard />
        </div>
      </div>

      {editModal === 'education' && draft && (
        <EditDialog
          title="Education"
          subtitle="Add your academic details"
          wide
          onClose={closeEditor}
          onSave={() => saveAndClose({ education: draft })}
        >
          <div className="space-y-6">
            {EDUCATION_LEVELS.map(({ key, label }) => {
              const d = draft[key] || {};
              const setLevel = (field, val) => setDraft({ ...draft, [key]: { ...d, [field]: val } });
              const fid = (f) => `edu-${key}-${f}`;
              return (
                <fieldset key={key} className="space-y-3 rounded-xl border p-4">
                  <legend className="px-1 font-semibold text-primary">{label}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field id={fid('course')} label="Course"><Input id={fid('course')} value={d.course || ''} onChange={(e) => setLevel('course', e.target.value)} /></Field>
                    <Field id={fid('name')} label="College / School Name"><Input id={fid('name')} value={d.collegeName || ''} onChange={(e) => setLevel('collegeName', e.target.value)} /></Field>
                    <Field id={fid('spec')} label="Specialization"><Input id={fid('spec')} value={d.specialization || ''} onChange={(e) => setLevel('specialization', e.target.value)} /></Field>
                    <Field id={fid('grades')} label="Grades"><Input id={fid('grades')} value={d.grades || ''} onChange={(e) => setLevel('grades', e.target.value)} /></Field>
                    <Field id={fid('start')} label="Start Year"><Input id={fid('start')} type="number" inputMode="numeric" value={d.startYear || ''} onChange={(e) => setLevel('startYear', e.target.value)} /></Field>
                    <Field id={fid('end')} label="End Year"><Input id={fid('end')} type="number" inputMode="numeric" value={d.endYear || ''} onChange={(e) => setLevel('endYear', e.target.value)} /></Field>
                  </div>
                </fieldset>
              );
            })}
          </div>
        </EditDialog>
      )}

      {editModal === 'skills' && draft && (
        <EditDialog
          title="Key skills"
          subtitle="Comma separated, up to 30 skills"
          onClose={closeEditor}
          onSave={() => saveAndClose({ profile: { ...profile, skills: draft.skills } })}
        >
          <Label htmlFor="skills-editor" className="sr-only">Key skills</Label>
          <Textarea
            id="skills-editor"
            value={draft.skills}
            onChange={(e) => setDraft({ skills: e.target.value })}
            rows={4}
            placeholder="Java, React, Spring Boot (comma separated)"
          />
        </EditDialog>
      )}

      {editModal === 'internship' && draft && (
        <EditDialog
          title="Internships"
          subtitle="Show your professional learnings"
          wide
          onClose={closeEditor}
          deleteLabel="Delete this internship?"
          onDelete={draft._idx >= 0 ? () => saveAndClose({ internships: internships.filter((_, i) => i !== draft._idx) }) : undefined}
          onSave={() => {
            const { _idx, ...item } = draft;
            const next = _idx >= 0 ? internships.map((x, i) => (i === _idx ? item : x)) : [...internships, item];
            return saveAndClose({ internships: next });
          }}
        >
          <div className="space-y-4">
            <Field id="intern-company" label="Company name">
              <Input id="intern-company" value={draft.companyName || ''} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} />
            </Field>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Internship duration</p>
              <div className="grid items-end gap-2 sm:grid-cols-[1fr_auto_1fr]">
                <YearMonthPicker label="Start" month={draft.startMonth} year={draft.startYear} onMonthChange={(v) => setDraft({ ...draft, startMonth: v })} onYearChange={(v) => setDraft({ ...draft, startYear: v })} />
                <span className="hidden pb-2 text-muted-foreground sm:block">to</span>
                <YearMonthPicker label="End" month={draft.endMonth} year={draft.endYear} onMonthChange={(v) => setDraft({ ...draft, endMonth: v })} onYearChange={(v) => setDraft({ ...draft, endYear: v })} />
              </div>
            </div>
            <Field id="intern-project" label="Project name">
              <Input id="intern-project" value={draft.projectName || ''} onChange={(e) => setDraft({ ...draft, projectName: e.target.value })} />
            </Field>
            <Field id="intern-description" label="Describe what you did at internship">
              <Textarea
                id="intern-description"
                value={draft.description || ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value.slice(0, 1000) })}
                rows={6}
                maxLength={1000}
              />
              <p className="text-right text-xs text-muted-foreground">{(draft.description || '').length}/1000</p>
            </Field>
            <Field id="intern-skills" label="Key Skills (optional)">
              <Input id="intern-skills" value={draft.keySkills || ''} onChange={(e) => setDraft({ ...draft, keySkills: e.target.value })} />
            </Field>
            <Field id="intern-url" label="Project URL (optional)">
              <Input id="intern-url" type="url" value={draft.projectUrl || ''} onChange={(e) => setDraft({ ...draft, projectUrl: e.target.value })} placeholder="https://" />
            </Field>
          </div>
        </EditDialog>
      )}

      {editModal === 'employment' && draft && (
        <EditDialog
          title="Employment"
          subtitle="Add your work experience"
          wide
          onClose={closeEditor}
          deleteLabel="Delete this employment entry?"
          onDelete={draft._idx >= 0 ? () => saveAndClose({ employment: employment.filter((_, i) => i !== draft._idx) }) : undefined}
          onSave={() => {
            const { _idx, ...item } = draft;
            const next = _idx >= 0 ? employment.map((x, i) => (i === _idx ? item : x)) : [...employment, item];
            return saveAndClose({ employment: next });
          }}
        >
          <div className="space-y-4">
            <Field id="emp-company" label="Company name">
              <Input id="emp-company" value={draft.companyName || ''} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="emp-years" label="Total experience (Years)">
                <Input id="emp-years" type="number" min="0" value={draft.experienceYears || ''} onChange={(e) => setDraft({ ...draft, experienceYears: e.target.value })} />
              </Field>
              <Field id="emp-months" label="Total experience (Months)">
                <Input id="emp-months" type="number" min="0" max="11" value={draft.experienceMonths || ''} onChange={(e) => setDraft({ ...draft, experienceMonths: e.target.value })} />
              </Field>
            </div>
            <Field id="emp-designation" label="Designation">
              <Input id="emp-designation" value={draft.designation || ''} onChange={(e) => setDraft({ ...draft, designation: e.target.value })} />
            </Field>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Work duration</p>
              <div className="grid items-end gap-2 sm:grid-cols-[1fr_auto_1fr]">
                <YearMonthPicker label="Start" month={draft.startMonth} year={draft.startYear} onMonthChange={(v) => setDraft({ ...draft, startMonth: v })} onYearChange={(v) => setDraft({ ...draft, startYear: v })} />
                <span className="hidden pb-2 text-muted-foreground sm:block">to</span>
                {draft.isCurrent ? (
                  <div className="flex h-9 items-center rounded-md border border-primary/30 bg-accent px-4 text-sm font-medium text-accent-foreground">Present</div>
                ) : (
                  <YearMonthPicker label="End" month={draft.endMonth} year={draft.endYear} onMonthChange={(v) => setDraft({ ...draft, endMonth: v })} onYearChange={(v) => setDraft({ ...draft, endYear: v })} />
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="emp-current"
                  checked={!!draft.isCurrent}
                  onCheckedChange={(checked) => {
                    const isCurrent = checked === true;
                    const now = new Date();
                    setDraft({
                      ...draft,
                      isCurrent,
                      endMonth: isCurrent ? String(now.getMonth() + 1) : '',
                      endYear: isCurrent ? String(now.getFullYear()) : '',
                    });
                  }}
                />
                <Label htmlFor="emp-current" className="font-normal text-muted-foreground">I currently work here</Label>
              </div>
            </div>
            <Field id="emp-description" label="Describe the work you did">
              <Textarea id="emp-description" value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={5} />
            </Field>
          </div>
        </EditDialog>
      )}
    </div>
  );
}

function RecruiterProfile({ profile, setProfile, onSave, saving, onUploadAvatar, avatarUploading }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4">
          <ProfileAvatar
            url={profile.profilePictureUrl}
            onUpload={onUploadAvatar}
            uploading={avatarUploading}
            size="md"
            variant="admin"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{profile.fullName}</h1>
            <p className="text-muted-foreground">{[profile.recruiterTitle, profile.companyName].filter(Boolean).join(' · ')}</p>
            <ContactLine profile={profile} />
          </div>
        </CardContent>
      </Card>

      <SectionCard id="personal" title="Recruiter & Company Information">
        <div className="grid gap-4 sm:grid-cols-2">
          {RECRUITER_FIELDS.map(([key, label]) => (
            <Field key={key} id={`recruiter-${key}`} label={label} className={key === 'companyWebsite' ? 'sm:col-span-2' : undefined}>
              <Input
                id={`recruiter-${key}`}
                type={key === 'companyWebsite' ? 'url' : 'text'}
                value={profile[key] || ''}
                onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                disabled={key === 'email'}
              />
            </Field>
          ))}
          <Field id="recruiter-company-description" label="About Company" className="sm:col-span-2">
            <Textarea
              id="recruiter-company-description"
              value={profile.companyDescription || ''}
              onChange={(e) => setProfile({ ...profile, companyDescription: e.target.value })}
              rows={4}
            />
          </Field>
        </div>
        <Button type="button" className="mt-4" onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </SectionCard>

      <ChangePasswordCard />
    </div>
  );
}
