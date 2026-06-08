import { useEffect, useState, useMemo } from 'react';

import api, { unwrap } from '../services/api';

import { useAuth } from '../context/AuthContext';

import toast from 'react-hot-toast';

import {

  User, MapPin, Phone, Mail, Pencil, Plus, X, GraduationCap,

  Briefcase, FileText, Building2, Upload, Trash2,

} from 'lucide-react';

import YearMonthPicker from './YearMonthPicker';
import ProfileAvatar from './ProfileAvatar';

import {

  defaultEducation, emptyInternship, emptyEmployment, parseJsonField,

} from '../utils/profileDefaults';

import { validateProfile, validateYear, validateYearRange, validateUrl } from '../utils/validation';



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



function SectionCard({ id, title, onAdd, addLabel = 'Add', children }) {

  return (

    <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">

        <h2 className="text-lg font-semibold">{title}</h2>

        {onAdd && (

          <button type="button" onClick={onAdd} className="text-sm font-semibold text-primary-600 hover:underline">

            {addLabel}

          </button>

        )}

      </div>

      <div className="mt-4">{children}</div>

    </section>

  );

}



function Modal({ title, subtitle, onClose, onSave, onDelete, children, wide }) {

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>

      <div

        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}

        onClick={(e) => e.stopPropagation()}

      >

        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">

          <div>

            <h3 className="text-xl font-bold">{title}</h3>

            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}

          </div>

          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">

            <X className="h-5 w-5" />

          </button>

        </div>

        <div className="px-6 py-5">{children}</div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">

          {onDelete ? (

            <button type="button" onClick={onDelete} className="text-sm font-medium text-red-600 hover:underline">Delete</button>

          ) : <span />}

          <div className="flex gap-3">

            <button type="button" onClick={onClose} className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>

            <button type="button" onClick={onSave} className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700">Save</button>

          </div>

        </div>

      </div>

    </div>

  );

}



export default function NaukriStyleProfile() {

  const { user, isAdmin, refreshUser } = useAuth();

  const [profile, setProfile] = useState({});

  const [education, setEducation] = useState(defaultEducation());

  const [internships, setInternships] = useState([]);

  const [employment, setEmployment] = useState([]);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  const [activeSection, setActiveSection] = useState('personal');

  const [editModal, setEditModal] = useState(null);

  const [draft, setDraft] = useState(null);

  const [avatarUploading, setAvatarUploading] = useState(false);



  const completion = useMemo(

    () => calcCompletion(profile, education, internships, employment),

    [profile, education, internships, employment]

  );



  const load = async () => {

    const data = unwrap(await api.get('/api/users/me'));

    setProfile(data);

    setEducation(parseJsonField(data.educationProfile, defaultEducation()));

    const ints = parseJsonField(data.internshipsProfile, []);

    setInternships(ints);

    const emps = parseJsonField(data.employmentProfile, []);

    setEmployment(emps);

  };



  useEffect(() => { load(); }, []);



  const validateBeforeSave = () => {
    const errors = validateProfile(profile, isAdmin);
    if (!isAdmin) {
      ['school', 'intermediate', 'college'].forEach((level) => {
        const e = education[level];
        if (e) {
          const sy = validateYear(e.startYear, `${level} start year`);
          const ey = validateYear(e.endYear, `${level} end year`);
          const yr = validateYearRange(e.startYear, e.endYear);
          if (sy) errors[`edu_${level}`] = sy;
          if (ey) errors[`edu_${level}`] = ey;
          if (yr) errors[`edu_${level}`] = yr;
        }
      });
      internships.forEach((item, i) => {
        const urlErr = validateUrl(item.projectUrl);
        if (urlErr) errors[`intern_${i}`] = urlErr;
        if (item.description?.length > 1000) errors[`intern_${i}`] = 'Internship description max 1000 characters';
      });
    }
    return errors;
  };

  const saveAll = async (extra = {}) => {
    const errors = validateBeforeSave();
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0]);
      return;
    }

    await api.put('/api/users/me', {

      fullName: profile.fullName,

      phone: profile.phone,

      location: profile.location,

      bio: profile.bio,

      skills: profile.skills,

      currentTitle: profile.currentTitle,
      headline: profile.headline,
      openToWork: profile.openToWork,

      companyName: profile.companyName,

      companyWebsite: profile.companyWebsite,

      companyDescription: profile.companyDescription,

      recruiterTitle: profile.recruiterTitle,

      educationProfile: JSON.stringify(education),

      internshipsProfile: JSON.stringify(internships),

      employmentProfile: JSON.stringify(employment),

      ...extra,

    });

    await refreshUser();

    await load();

    toast.success('Profile saved');

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

      setProfile((p) => ({

        ...p,

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

    if (!file) return;

    const fd = new FormData();

    fd.append('file', file);

    try {

      const res = await api.post('/api/users/me/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      const data = unwrap(res);

      setProfile((p) => ({ ...p, resumeUrl: data.resumeUrl, resumeUploadedAt: data.resumeUploadedAt }));

      await refreshUser();

      toast.success('Resume uploaded');

    } catch {

      toast.error('Upload failed');

    }

  };



  const scrollTo = (id) => {

    setActiveSection(id);

    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  };



  const skillTags = (profile.skills || '').split(',').map((s) => s.trim()).filter(Boolean);



  const collegeLine = education.college?.course && education.college?.collegeName

    ? `${education.college.course} from ${education.college.collegeName}`

    : profile.currentTitle || 'Add your education';



  if (isAdmin) {

    return (
      <RecruiterProfile
        profile={profile}
        setProfile={setProfile}
        saveAll={saveAll}
        passwords={passwords}
        setPasswords={setPasswords}
        onUploadAvatar={uploadAvatar}
        avatarUploading={avatarUploading}
      />
    );

  }



  return (

    <div className="space-y-6">

      {/* Profile header card */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="flex flex-wrap items-start gap-6">

          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">

            <svg className="absolute inset-0 h-24 w-24 -rotate-90" viewBox="0 0 100 100">

              <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />

              <circle cx="50" cy="50" r="42" fill="none" stroke="#16a34a" strokeWidth="8"

                strokeDasharray={`${completion * 2.64} 264`} strokeLinecap="round" />

            </svg>

            <div className="absolute inset-0 flex items-center justify-center">

              <ProfileAvatar
                url={profile.profilePictureUrl}
                onUpload={uploadAvatar}
                uploading={avatarUploading}
                size="md"
                variant="user"
              />

            </div>

            <span className="absolute -bottom-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">{completion}%</span>

          </div>

          <div className="min-w-0 flex-1">

            <div className="flex items-center gap-2">

              <h1 className="text-2xl font-bold">{profile.fullName || 'Your Name'}</h1>

              <button type="button" onClick={() => scrollTo('personal')} className="text-slate-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button>

            </div>

            <p className="mt-1 text-slate-600 dark:text-slate-300">{collegeLine}</p>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">

              {profile.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{profile.location}</span>}

              {profile.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{profile.phone}</span>}

              {profile.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{profile.email}</span>}

            </div>

          </div>

        </div>

      </div>



      {/* View & Edit tab bar */}

      <div className="border-b border-slate-200 dark:border-slate-800">

        <span className="inline-block border-b-2 border-primary-600 px-4 py-3 text-sm font-semibold text-primary-600">View &amp; Edit</span>

      </div>



      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">

        {/* Quick links sidebar */}

        <nav className="lg:sticky lg:top-24 lg:self-start">

          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick links</p>

          <ul className="space-y-1 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">

            {QUICK_LINKS.map((link) => (

              <li key={link.id}>

                <button

                  type="button"

                  onClick={() => scrollTo(link.id)}

                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${

                    activeSection === link.id

                      ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20'

                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'

                  }`}

                >

                  {link.label}

                </button>

              </li>

            ))}

          </ul>

        </nav>



        {/* Main sections */}

        <div className="space-y-6">

          <SectionCard id="personal" title="Personal information">

            <div className="grid gap-4 sm:grid-cols-2">

              {[

                ['fullName', 'Full Name'], ['phone', 'Phone'], ['location', 'Location'],

                ['currentTitle', 'Current / Desired Title'], ['headline', 'Professional headline'], ['email', 'Email'],

              ].map(([key, label]) => (

                <div key={key}>

                  <label className="text-xs font-medium text-slate-500">{label}</label>

                  <input

                    value={profile[key] || ''}

                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}

                    disabled={key === 'email'}

                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:disabled:bg-slate-900"

                  />

                </div>

              ))}

              <div className="sm:col-span-2">

                <label className="text-xs font-medium text-slate-500">Profile summary</label>

                <textarea value={profile.bio || ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Brief summary about yourself..." />

              </div>

              {!isAdmin && (
                <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <div>
                    <p className="text-sm font-medium">Open to work</p>
                    <p className="text-xs text-slate-500">Let recruiters know you&apos;re actively looking</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!profile.openToWork}
                    onClick={() => setProfile({ ...profile, openToWork: !profile.openToWork })}
                    className={`relative h-7 w-12 rounded-full transition ${profile.openToWork ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${profile.openToWork ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              )}

            </div>

            <button type="button" onClick={() => saveAll()} className="mt-4 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700">Save</button>

          </SectionCard>



          <SectionCard id="education" title="Education" onAdd={() => { setDraft({ ...education }); setEditModal('education'); }}>

            {['college', 'intermediate', 'school'].map((level) => {

              const e = education[level];

              if (!e?.collegeName && !e?.course) return null;

              const label = level === 'college' ? 'College' : level === 'intermediate' ? 'Intermediate' : 'School';

              return (

                <div key={level} className="flex items-start justify-between border-b border-slate-100 py-4 last:border-0 dark:border-slate-800">

                  <div>

                    <p className="font-semibold">{e.course || label} {e.collegeName && `from ${e.collegeName}`}</p>

                    <p className="mt-1 text-sm text-slate-500">

                      {[e.specialization, e.grades && `Scored ${e.grades}`, e.endYear && `Passed out in ${e.endYear}`].filter(Boolean).join(' · ')}

                    </p>

                  </div>

                  <button type="button" onClick={() => { setDraft({ ...education }); setEditModal('education'); }} className="text-slate-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button>

                </div>

              );

            })}

            {!education.college?.collegeName && !education.school?.collegeName && (

              <p className="text-sm text-slate-500">Add your school, intermediate, and college details.</p>

            )}

          </SectionCard>



          <SectionCard id="skills" title="Key skills" onAdd={() => { setDraft({ skills: profile.skills || '' }); setEditModal('skills'); }} addLabel="Edit">

            {skillTags.length > 0 ? (

              <div className="flex flex-wrap gap-2">

                {skillTags.map((s) => (

                  <span key={s} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-800">{s}</span>

                ))}

              </div>

            ) : (

              <p className="text-sm text-slate-500">Add skills like Java, React, Spring Boot...</p>

            )}

          </SectionCard>



          <SectionCard id="internships" title="Internships" onAdd={() => { setDraft({ ...emptyInternship(), _idx: -1 }); setEditModal('internship'); }}>

            {internships.length === 0 ? (

              <p className="text-sm text-slate-500">Show your professional learnings — add internship experience.</p>

            ) : internships.map((item, idx) => (

              <div key={idx} className="flex items-start justify-between border-b border-slate-100 py-4 last:border-0 dark:border-slate-800">

                <div>

                  <p className="font-semibold">{item.companyName}</p>

                  <p className="text-sm text-slate-500">{item.projectName}</p>

                  <p className="mt-1 text-xs text-slate-400">

                    {formatMonthYear(item.startMonth, item.startYear)} – {formatMonthYear(item.endMonth, item.endYear)}

                  </p>

                </div>

                <button type="button" onClick={() => { setDraft({ ...item, _idx: idx }); setEditModal('internship'); }} className="text-slate-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button>

              </div>

            ))}

          </SectionCard>



          <SectionCard id="employment" title="Employment" onAdd={() => { setDraft({ ...emptyEmployment(), _idx: -1 }); setEditModal('employment'); }}>

            {employment.length === 0 ? (

              <p className="text-sm text-slate-500">Talk about the company you worked at, your designation and what you did.</p>

            ) : employment.map((item, idx) => (

              <div key={idx} className="flex items-start justify-between border-b border-slate-100 py-4 last:border-0 dark:border-slate-800">

                <div>

                  <p className="font-semibold">{item.designation || 'Role'} at {item.companyName}</p>

                  <p className="mt-1 text-sm text-slate-500">

                    {item.experienceYears || item.experienceMonths

                      ? `${item.experienceYears || 0} yr ${item.experienceMonths || 0} mo`

                      : formatMonthYear(item.startMonth, item.startYear) + (item.endYear ? ` – ${formatMonthYear(item.endMonth, item.endYear)}` : '')}

                  </p>

                </div>

                <button type="button" onClick={() => { setDraft({ ...item, _idx: idx }); setEditModal('employment'); }} className="text-slate-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button>

              </div>

            ))}

          </SectionCard>



          <section id="resume" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <h2 className="text-lg font-semibold">Resume</h2>

            <p className="mt-1 text-sm text-slate-500">Your resume is the first impression you make on potential employers. Craft it carefully.</p>

            {profile.resumeUrl && (

              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">

                <div className="flex items-center gap-3">

                  <FileText className="h-8 w-8 text-primary-600" />

                  <div>

                    <p className="font-medium">{profile.resumeUrl.split('/').pop()}</p>

                    {profile.resumeUploadedAt && (

                      <p className="text-xs text-slate-500">Uploaded on {new Date(profile.resumeUploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>

                    )}

                  </div>

                </div>

              </div>

            )}

            <label className="group mt-4 block cursor-pointer rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/40 p-0 text-center shadow-inner transition hover:border-primary-500 hover:bg-primary-50 dark:border-primary-700 dark:bg-primary-950/20 dark:hover:border-primary-500">
              <div className="flex flex-col items-center px-6 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-200 bg-white shadow-sm group-hover:scale-105 transition dark:border-primary-800 dark:bg-slate-900">
                  <Upload className="h-8 w-8 text-primary-600" />
                </div>
                <p className="mt-4 text-base font-semibold text-primary-700 dark:text-primary-400">
                  {profile.resumeUrl ? 'Click to update resume' : 'Click to choose resume file'}
                </p>
                <p className="mt-2 text-sm text-slate-500">or drag and drop your file here</p>
                <p className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                  Supported: PDF, DOC, DOCX · Max 10MB
                </p>
              </div>
              <input type="file" accept=".pdf,.doc,.docx" onChange={uploadResume} className="hidden" />
            </label>

          </section>



          <section id="password" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <h2 className="text-lg font-semibold">Change Password</h2>

            <form onSubmit={async (e) => {

              e.preventDefault();

              try {

                await api.put('/api/users/me/password', passwords);

                toast.success('Password changed');

                setPasswords({ currentPassword: '', newPassword: '' });

              } catch (err) {

                toast.error(err.response?.data?.message || 'Failed');

              }

            }} className="mt-4 space-y-3">

              <input type="password" placeholder="Current password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} className="w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" required />

              <input type="password" placeholder="New password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" required />

              <button type="submit" className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white dark:bg-slate-700">Update Password</button>

            </form>

          </section>

        </div>

      </div>



      {/* Education modal */}

      {editModal === 'education' && draft && (

        <Modal title="Education" subtitle="Add your academic details" wide onClose={() => setEditModal(null)}

          onSave={async () => { setEducation(draft); setEditModal(null); await saveAll({ educationProfile: JSON.stringify(draft) }); }}>

          {['college', 'intermediate', 'school'].map((level) => {

            const label = level === 'college' ? 'College' : level === 'intermediate' ? 'Intermediate' : 'School';

            const d = draft[level] || {};

            const setLevel = (field, val) => setDraft({ ...draft, [level]: { ...d, [field]: val } });

            return (

              <div key={level} className="mb-6 space-y-3 rounded-xl border border-slate-100 p-4 dark:border-slate-700">

                <h4 className="font-semibold text-primary-700 dark:text-primary-400">{label}</h4>

                <div className="grid gap-3 sm:grid-cols-2">

                  <div><label className="text-xs text-slate-500">Course</label><input value={d.course || ''} onChange={(e) => setLevel('course', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>

                  <div><label className="text-xs text-slate-500">College / School Name</label><input value={d.collegeName || ''} onChange={(e) => setLevel('collegeName', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>

                  <div><label className="text-xs text-slate-500">Specialization</label><input value={d.specialization || ''} onChange={(e) => setLevel('specialization', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>

                  <div><label className="text-xs text-slate-500">Grades</label><input value={d.grades || ''} onChange={(e) => setLevel('grades', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>

                  <div><label className="text-xs text-slate-500">Start Year</label><input type="number" value={d.startYear || ''} onChange={(e) => setLevel('startYear', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>

                  <div><label className="text-xs text-slate-500">End Year</label><input type="number" value={d.endYear || ''} onChange={(e) => setLevel('endYear', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>

                </div>

              </div>

            );

          })}

        </Modal>

      )}



      {/* Skills modal */}

      {editModal === 'skills' && draft && (

        <Modal title="Key skills" onClose={() => setEditModal(null)}

          onSave={async () => { setProfile({ ...profile, skills: draft.skills }); setEditModal(null); await saveAll({ skills: draft.skills }); }}>

          <textarea value={draft.skills} onChange={(e) => setDraft({ skills: e.target.value })} rows={4} placeholder="Java, React, Spring Boot (comma separated)" className="w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />

        </Modal>

      )}



      {/* Internship modal */}

      {editModal === 'internship' && draft && (

        <Modal title="Internships" subtitle="Show your professional learnings" wide onClose={() => setEditModal(null)}

          onDelete={draft._idx >= 0 ? async () => {

            const next = internships.filter((_, i) => i !== draft._idx);

            setInternships(next); setEditModal(null);

            await saveAll({ internshipsProfile: JSON.stringify(next) });

          } : undefined}

          onSave={async () => {

            const { _idx, ...item } = draft;

            const next = _idx >= 0 ? internships.map((x, i) => (i === _idx ? item : x)) : [...internships, item];

            setInternships(next); setEditModal(null);

            await saveAll({ internshipsProfile: JSON.stringify(next) });

          }}>

          <div className="space-y-4">

            <div><label className="text-sm font-medium">Company name</label><input value={draft.companyName || ''} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></div>

            <div>

              <label className="text-sm font-medium">Internship duration</label>

              <div className="mt-2 flex flex-wrap items-center gap-2">

                <YearMonthPicker month={draft.startMonth} year={draft.startYear} onMonthChange={(v) => setDraft({ ...draft, startMonth: v })} onYearChange={(v) => setDraft({ ...draft, startYear: v })} />

                <span className="text-slate-400">to</span>

                <YearMonthPicker month={draft.endMonth} year={draft.endYear} onMonthChange={(v) => setDraft({ ...draft, endMonth: v })} onYearChange={(v) => setDraft({ ...draft, endYear: v })} />

              </div>

            </div>

            <div><label className="text-sm font-medium">Project name</label><input value={draft.projectName || ''} onChange={(e) => setDraft({ ...draft, projectName: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></div>

            <div>

              <label className="text-sm font-medium">Describe what you did at internship</label>

              <textarea value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value.slice(0, 1000) })} rows={6} maxLength={1000} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />

              <p className="mt-1 text-right text-xs text-slate-400">{(draft.description || '').length}/1000</p>

            </div>

            <div><label className="text-sm font-medium">Key Skills <span className="text-slate-400">(optional)</span></label><input value={draft.keySkills || ''} onChange={(e) => setDraft({ ...draft, keySkills: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></div>

            <div><label className="text-sm font-medium">Project URL <span className="text-slate-400">(optional)</span></label><input value={draft.projectUrl || ''} onChange={(e) => setDraft({ ...draft, projectUrl: e.target.value })} placeholder="https://" className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></div>

          </div>

        </Modal>

      )}



      {/* Employment modal */}

      {editModal === 'employment' && draft && (

        <Modal title="Employment" subtitle="Add your work experience" wide onClose={() => setEditModal(null)}

          onDelete={draft._idx >= 0 ? async () => {

            const next = employment.filter((_, i) => i !== draft._idx);

            setEmployment(next); setEditModal(null);

            await saveAll({ employmentProfile: JSON.stringify(next) });

          } : undefined}

          onSave={async () => {

            const { _idx, ...item } = draft;

            const next = _idx >= 0 ? employment.map((x, i) => (i === _idx ? item : x)) : [...employment, item];

            setEmployment(next); setEditModal(null);

            await saveAll({ employmentProfile: JSON.stringify(next) });

          }}>

          <div className="space-y-4">

            <div><label className="text-sm font-medium">Company name</label><input value={draft.companyName || ''} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></div>

            <div className="grid gap-3 sm:grid-cols-2">

              <div><label className="text-sm font-medium">Total experience (Years)</label><input type="number" min="0" value={draft.experienceYears || ''} onChange={(e) => setDraft({ ...draft, experienceYears: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></div>

              <div><label className="text-sm font-medium">Total experience (Months)</label><input type="number" min="0" max="11" value={draft.experienceMonths || ''} onChange={(e) => setDraft({ ...draft, experienceMonths: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></div>

            </div>

            <div><label className="text-sm font-medium">Designation</label><input value={draft.designation || ''} onChange={(e) => setDraft({ ...draft, designation: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></div>

            <div>

              <label className="text-sm font-medium">Work duration</label>

              <div className="mt-2 flex flex-wrap items-center gap-2">

                <YearMonthPicker label="Start" month={draft.startMonth} year={draft.startYear} onMonthChange={(v) => setDraft({ ...draft, startMonth: v })} onYearChange={(v) => setDraft({ ...draft, startYear: v })} />

                <span className="text-slate-400">to</span>

                <YearMonthPicker label="End" month={draft.endMonth} year={draft.endYear} onMonthChange={(v) => setDraft({ ...draft, endMonth: v })} onYearChange={(v) => setDraft({ ...draft, endYear: v })} />

              </div>

            </div>

            <div>

              <label className="text-sm font-medium">Describe the work you did</label>

              <textarea value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={5} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />

            </div>

          </div>

        </Modal>

      )}

    </div>

  );

}



function RecruiterProfile({ profile, setProfile, saveAll, passwords, setPasswords, onUploadAvatar, avatarUploading }) {

  const fields = [

    ['fullName', 'Full Name'], ['phone', 'Phone'], ['location', 'Location'],

    ['recruiterTitle', 'Your Role / Title'], ['companyName', 'Company Name'],

    ['companyWebsite', 'Company Website'],

  ];

  return (

    <div className="space-y-6">

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="flex items-center gap-4">

          <ProfileAvatar
            url={profile.profilePictureUrl}
            onUpload={onUploadAvatar}
            uploading={avatarUploading}
            size="md"
            variant="admin"
          />

          <div>

            <h1 className="text-2xl font-bold">{profile.fullName}</h1>

            <p className="text-slate-500">{profile.recruiterTitle} · {profile.companyName}</p>

          </div>

        </div>

      </div>

      <SectionCard id="personal" title="Recruiter & Company Information">

        <div className="grid gap-4 sm:grid-cols-2">

          {fields.map(([key, label]) => (

            <div key={key} className={key === 'companyWebsite' ? 'sm:col-span-2' : ''}>

              <label className="text-xs font-medium text-slate-500">{label}</label>

              <input value={profile[key] || ''} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />

            </div>

          ))}

          <div className="sm:col-span-2">

            <label className="text-xs font-medium text-slate-500">About Company</label>

            <textarea value={profile.companyDescription || ''} onChange={(e) => setProfile({ ...profile, companyDescription: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />

          </div>

        </div>

        <button type="button" onClick={() => saveAll()} className="mt-4 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700">Save</button>

      </SectionCard>

      <section id="password" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <h2 className="text-lg font-semibold">Change Password</h2>

        <form onSubmit={async (e) => {

          e.preventDefault();

          try {

            await api.put('/api/users/me/password', passwords);

            toast.success('Password changed');

            setPasswords({ currentPassword: '', newPassword: '' });

          } catch (err) {

            toast.error(err.response?.data?.message || 'Failed');

          }

        }} className="mt-4 space-y-3">

          <input type="password" placeholder="Current password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} className="w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" required />

          <input type="password" placeholder="New password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-800" required />

          <button type="submit" className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white dark:bg-slate-700">Update Password</button>

        </form>

      </section>

    </div>

  );

}


