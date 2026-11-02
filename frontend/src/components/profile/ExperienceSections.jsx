import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import YearMonthPicker from '../YearMonthPicker';
import { emptyEmployment, emptyInternship } from '../../utils/profileDefaults';
import { EDUCATION_LEVELS, formatMonthYear } from './profileModel';
import { EditDialog, EntryRow, Field, SectionCard } from './ProfileParts';

/** Dialog draft for one section; `save(changes)` closes the dialog only if the profile save succeeded. */
function useEditor(onSave) {
  const [draft, setDraft] = useState(null);
  const close = () => setDraft(null);
  const save = async (changes) => {
    if (await onSave(changes)) close();
  };
  return { draft, setDraft, open: setDraft, close, save };
}

export function EducationSection({ education, onSave }) {
  const { draft, setDraft, open, close, save } = useEditor(onSave);
  const hasAny = EDUCATION_LEVELS.some(({ key }) => education[key]?.collegeName);

  return (
    <>
      <SectionCard id="education" title="Education" onAdd={() => open({ ...education })}>
        {EDUCATION_LEVELS.map(({ key, label }) => {
          const e = education[key];
          if (!e?.collegeName && !e?.course) return null;
          return (
            <EntryRow
              key={key}
              title={<>{e.course || label} {e.collegeName && `from ${e.collegeName}`}</>}
              subtitle={[e.specialization, e.grades && `Scored ${e.grades}`, e.endYear && `Passed out in ${e.endYear}`].filter(Boolean).join(' · ')}
              onEdit={() => open({ ...education })}
              editLabel={`Edit ${label}`}
            />
          );
        })}
        {!hasAny && <p className="text-sm text-muted-foreground">Add your school, intermediate, and college details.</p>}
      </SectionCard>

      {draft && (
        <EditDialog title="Education" subtitle="Add your academic details" wide onClose={close} onSave={() => save({ education: draft })}>
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
    </>
  );
}

export function SkillsSection({ skills, onSave }) {
  const { draft, setDraft, open, close, save } = useEditor(onSave);
  const tags = (skills || '').split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <>
      <SectionCard id="skills" title="Key skills" onAdd={() => open({ skills: skills || '' })} addLabel="Edit">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((s) => (
              <Badge key={s} variant="outline" className="bg-muted/50 px-3 py-1.5 text-sm">{s}</Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Add skills like Java, React, Spring Boot...</p>
        )}
      </SectionCard>

      {draft && (
        <EditDialog title="Key skills" subtitle="Comma separated, up to 30 skills" onClose={close} onSave={() => save({ profile: { skills: draft.skills } })}>
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
    </>
  );
}

export function InternshipsSection({ internships, onSave }) {
  const { draft, setDraft, open, close, save } = useEditor(onSave);

  const saveDraft = () => {
    const { _idx, ...item } = draft;
    const next = _idx >= 0 ? internships.map((x, i) => (i === _idx ? item : x)) : [...internships, item];
    return save({ internships: next });
  };

  return (
    <>
      <SectionCard id="internships" title="Internships" onAdd={() => open({ ...emptyInternship(), _idx: -1 })}>
        {internships.length === 0 ? (
          <p className="text-sm text-muted-foreground">Show your professional learnings — add internship experience.</p>
        ) : internships.map((item, idx) => (
          <EntryRow
            key={idx}
            title={item.companyName}
            subtitle={item.projectName}
            meta={`${formatMonthYear(item.startMonth, item.startYear)} – ${formatMonthYear(item.endMonth, item.endYear)}`}
            onEdit={() => open({ ...item, _idx: idx })}
            editLabel={`Edit internship at ${item.companyName}`}
          />
        ))}
      </SectionCard>

      {draft && (
        <EditDialog
          title="Internships"
          subtitle="Show your professional learnings"
          wide
          onClose={close}
          deleteLabel="Delete this internship?"
          onDelete={draft._idx >= 0 ? () => save({ internships: internships.filter((_, i) => i !== draft._idx) }) : undefined}
          onSave={saveDraft}
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
    </>
  );
}

export function EmploymentSection({ employment, onSave }) {
  const { draft, setDraft, open, close, save } = useEditor(onSave);

  const saveDraft = () => {
    const { _idx, ...item } = draft;
    const next = _idx >= 0 ? employment.map((x, i) => (i === _idx ? item : x)) : [...employment, item];
    return save({ employment: next });
  };

  return (
    <>
      <SectionCard id="employment" title="Employment" onAdd={() => open({ ...emptyEmployment(), _idx: -1 })}>
        {employment.length === 0 ? (
          <p className="text-sm text-muted-foreground">Talk about the company you worked at, your designation and what you did.</p>
        ) : employment.map((item, idx) => (
          <EntryRow
            key={idx}
            title={`${item.designation || 'Role'} at ${item.companyName}`}
            subtitle={item.experienceYears || item.experienceMonths
              ? `${item.experienceYears || 0} yr ${item.experienceMonths || 0} mo`
              : formatMonthYear(item.startMonth, item.startYear) + (item.isCurrent || !item.endYear ? ' – Present' : ` – ${formatMonthYear(item.endMonth, item.endYear)}`)}
            onEdit={() => open({ ...item, _idx: idx })}
            editLabel={`Edit employment at ${item.companyName}`}
          />
        ))}
      </SectionCard>

      {draft && (
        <EditDialog
          title="Employment"
          subtitle="Add your work experience"
          wide
          onClose={close}
          deleteLabel="Delete this employment entry?"
          onDelete={draft._idx >= 0 ? () => save({ employment: employment.filter((_, i) => i !== draft._idx) }) : undefined}
          onSave={saveDraft}
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
    </>
  );
}
