import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  PERSONAL_DRAFT_KEYS, PERSONAL_FIELDS, RECRUITER_DRAFT_KEYS, RECRUITER_FIELDS, pick,
} from './profileModel';
import { Field, SaveButton, SectionCard } from './ProfileParts';

/**
 * Local draft of one form's fields. Typing re-renders only this form, other sections' saves don't touch it,
 * and after its own save the draft is reset to what the server stored (which may be normalised).
 */
function useDraft(saved, keys, onSave) {
  const [draft, setDraft] = useState(() => pick(saved, keys));
  const [saving, setSaving] = useState(false);
  const current = pick(saved, keys);
  const dirty = keys.some((k) => (draft[k] ?? '') !== (current[k] ?? ''));

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const stored = await onSave({ profile: draft });
      if (stored) setDraft(pick(stored.profile, keys));
    } finally {
      setSaving(false);
    }
  };

  return { draft, setField, dirty, saving, save };
}

export function PersonalInfoSection({ profile, onSave }) {
  const { draft, setField, dirty, saving, save } = useDraft(profile, PERSONAL_DRAFT_KEYS, onSave);

  return (
    <SectionCard id="personal" title="Personal information">
      <div className="grid gap-4 sm:grid-cols-2">
        {PERSONAL_FIELDS.map(([key, label]) => (
          <Field key={key} id={`profile-${key}`} label={label}>
            <Input
              id={`profile-${key}`}
              value={key === 'email' ? profile.email || '' : draft[key] || ''}
              onChange={(e) => setField(key, e.target.value)}
              disabled={key === 'email'}
            />
          </Field>
        ))}
        <Field id="profile-bio" label="Profile summary" className="sm:col-span-2">
          <Textarea
            id="profile-bio"
            value={draft.bio || ''}
            onChange={(e) => setField('bio', e.target.value)}
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
            checked={!!draft.openToWork}
            onCheckedChange={(checked) => setField('openToWork', checked)}
          />
        </div>
      </div>
      <SaveButton saving={saving} dirty={dirty} onClick={save} />
    </SectionCard>
  );
}

export function RecruiterInfoSection({ profile, onSave }) {
  const { draft, setField, dirty, saving, save } = useDraft(profile, RECRUITER_DRAFT_KEYS, onSave);

  return (
    <SectionCard id="personal" title="Recruiter & Company Information">
      <div className="grid gap-4 sm:grid-cols-2">
        {RECRUITER_FIELDS.map(([key, label]) => (
          <Field key={key} id={`recruiter-${key}`} label={label} className={key === 'companyWebsite' ? 'sm:col-span-2' : undefined}>
            <Input
              id={`recruiter-${key}`}
              type={key === 'companyWebsite' ? 'url' : 'text'}
              value={key === 'email' ? profile.email || '' : draft[key] || ''}
              onChange={(e) => setField(key, e.target.value)}
              disabled={key === 'email'}
            />
          </Field>
        ))}
        <Field id="recruiter-company-description" label="About Company" className="sm:col-span-2">
          <Textarea
            id="recruiter-company-description"
            value={draft.companyDescription || ''}
            onChange={(e) => setField('companyDescription', e.target.value)}
            rows={4}
          />
        </Field>
      </div>
      <SaveButton saving={saving} dirty={dirty} onClick={save} />
    </SectionCard>
  );
}
