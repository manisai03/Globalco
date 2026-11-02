import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api, { unwrap } from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';
import { validateResumeFile } from '../utils/files';
import { useAuth } from '../context/auth';
import ProfileAvatar from './ProfileAvatar';
import ResumeUploadBox from './ResumeUploadBox';
import LoadingSpinner from './LoadingSpinner';
import { ChangePasswordCard, DeleteAccountCard } from './profile/AccountCards';
import {
  EducationSection, EmploymentSection, InternshipsSection, SkillsSection,
} from './profile/ExperienceSections';
import { PersonalInfoSection, RecruiterInfoSection } from './profile/ProfileForms';
import { CompletionRing, ContactLine, SectionCard } from './profile/ProfileParts';
import {
  applyChanges, calcCompletion, parseProfile, toUpdatePayload, validateState,
} from './profile/profileModel';

const QUICK_LINKS = [
  { id: 'personal', label: 'Personal info' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Key skills' },
  { id: 'internships', label: 'Internships' },
  { id: 'employment', label: 'Employment' },
  { id: 'resume', label: 'Resume' },
  { id: 'password', label: 'Password' },
];

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

/**
 * Holds only what the server has stored. Each section keeps its own draft, so typing re-renders just that section
 * and saving one section never sends (or discards) another section's unsaved edits.
 */
export default function NaukriStyleProfile() {
  const { isAdmin, updateUser } = useAuth();
  const [saved, setSaved] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeSection, setActiveSection] = useState('personal');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/users/me')
      .then((res) => {
        if (!cancelled) setSaved(parseProfile(unwrap(res)));
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(getApiErrorMessage(err, 'Failed to load profile'));
        setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const applyUser = useCallback((data) => {
    const next = parseProfile(data);
    setSaved(next);
    updateUser(data);
    return next;
  }, [updateUser]);

  /** Saves the stored profile with one section's changes. Resolves to the new stored state, or null on failure. */
  const save = useCallback(async (changes) => {
    const next = applyChanges(saved, changes);
    const error = validateState(next, isAdmin);
    if (error) {
      toast.error(error);
      return null;
    }
    try {
      const stored = applyUser(unwrap(await api.put('/api/users/me', toUpdatePayload(next))));
      toast.success('Profile saved');
      return stored;
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save profile'));
      return null;
    }
  }, [saved, isAdmin, applyUser]);

  const uploadAvatar = useCallback(async (file, validationError) => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setAvatarUploading(true);
    try {
      applyUser(unwrap(await api.post('/api/users/me/avatar', fd, MULTIPART)));
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Upload failed'));
    } finally {
      setAvatarUploading(false);
    }
  }, [applyUser]);

  const uploadResume = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    const fileError = validateResumeFile(file);
    if (fileError) {
      toast.error(fileError);
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setResumeUploading(true);
    try {
      applyUser(unwrap(await api.post('/api/users/me/resume', fd, MULTIPART)));
      toast.success('Resume uploaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Upload failed'));
    } finally {
      setResumeUploading(false);
    }
  };

  const completion = useMemo(() => (saved ? calcCompletion(saved) : 0), [saved]);

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!saved) {
    if (!loadFailed) return <LoadingSpinner fullScreen />;
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-muted-foreground">We couldn&apos;t load your profile.</p>
        <Button type="button" variant="outline" onClick={() => { setLoadFailed(false); setReloadKey((k) => k + 1); }}>
          Try again
        </Button>
      </div>
    );
  }

  const { profile, education, internships, employment } = saved;

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center gap-4">
            <ProfileAvatar url={profile.profilePictureUrl} onUpload={uploadAvatar} uploading={avatarUploading} size="md" variant="admin" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold">{profile.fullName}</h1>
              <p className="text-muted-foreground">{[profile.recruiterTitle, profile.companyName].filter(Boolean).join(' · ')}</p>
              <ContactLine profile={profile} />
            </div>
          </CardContent>
        </Card>
        <RecruiterInfoSection profile={profile} onSave={save} />
        <ChangePasswordCard />
        <DeleteAccountCard />
      </div>
    );
  }

  const collegeLine = education.college?.course && education.college?.collegeName
    ? `${education.college.course} from ${education.college.collegeName}`
    : profile.currentTitle || 'Add your education';

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-start gap-6">
          <CompletionRing value={completion}>
            <ProfileAvatar url={profile.profilePictureUrl} onUpload={uploadAvatar} uploading={avatarUploading} size="md" variant="user" />
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
          <PersonalInfoSection profile={profile} onSave={save} />
          <EducationSection education={education} onSave={save} />
          <SkillsSection skills={profile.skills} onSave={save} />
          <InternshipsSection internships={internships} onSave={save} />
          <EmploymentSection employment={employment} onSave={save} />

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
          <DeleteAccountCard />
        </div>
      </div>
    </div>
  );
}
