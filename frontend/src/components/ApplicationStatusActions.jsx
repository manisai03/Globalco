import { useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '../services/api';
import ConfirmDialog from './common/ConfirmDialog';
import { getApiErrorMessage } from '../utils/apiError';
import {
  CONFIRM_STATUSES, SCHEDULABLE_STATUSES, allowedNextStatuses, formatStatus, statusActionLabel,
} from '../utils/applicationStatus';

const CONFIRM_COPY = {
  REJECTED: {
    title: 'Reject this application?',
    description: 'The candidate is notified and any scheduled interview is cancelled. You can shortlist them again later.',
  },
  HIRED: {
    title: 'Mark this candidate as hired?',
    description: 'The candidate is notified and any scheduled interview is closed. This is a final status.',
  },
};

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultInterviewTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toLocalInputValue(d);
}

function ScheduleInterviewDialog({ applicationId, rescheduling, size, disabled, onScheduled }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ scheduledAt: defaultInterviewTime(), location: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const when = new Date(form.scheduledAt);
    if (Number.isNaN(when.getTime()) || when <= new Date()) {
      toast.error('Pick a date and time in the future');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/applications/interviews', {
        applicationId,
        // Backend expects local date-time without a zone, matching what the recruiter picked.
        scheduledAt: `${form.scheduledAt}:00`,
        location: form.location.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success(rescheduling ? 'Interview rescheduled' : 'Interview scheduled — the candidate has been notified');
      setOpen(false);
      onScheduled?.('INTERVIEW_SCHEDULED');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not schedule the interview'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size={size} disabled={disabled}>
          <CalendarClock /> {rescheduling ? 'Reschedule interview' : 'Schedule interview'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{rescheduling ? 'Reschedule interview' : 'Schedule interview'}</DialogTitle>
            <DialogDescription>
              The candidate gets a notification with these details.
              {rescheduling && ' The previous interview is cancelled.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`interview-at-${applicationId}`}>Date and time</Label>
            <Input
              id={`interview-at-${applicationId}`}
              type="datetime-local"
              required
              min={toLocalInputValue(new Date())}
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`interview-location-${applicationId}`}>Location or meeting link</Label>
            <Input
              id={`interview-location-${applicationId}`}
              maxLength={255}
              placeholder="Google Meet link or office address"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`interview-notes-${applicationId}`}>Notes for the candidate</Label>
            <Textarea
              id={`interview-notes-${applicationId}`}
              maxLength={2000}
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {rescheduling ? 'Reschedule' : 'Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Status buttons for a recruiter, limited to the transitions application-service accepts. */
export default function ApplicationStatusActions({ applicationId, status, onChanged, size = 'sm' }) {
  const [pending, setPending] = useState(null);
  const nextStatuses = allowedNextStatuses(status);
  const canSchedule = SCHEDULABLE_STATUSES.includes(status);

  const update = async (next) => {
    setPending(next);
    try {
      await api.patch(`/api/applications/${applicationId}/status`, { status: next });
      toast.success(`Status updated to ${formatStatus(next)}`);
      onChanged?.(next);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update status'));
    } finally {
      setPending(null);
    }
  };

  if (nextStatuses.length === 0 && !canSchedule) {
    return <p className="text-xs text-muted-foreground">No further actions — this application is {formatStatus(status).toLowerCase()}.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Update status">
      {nextStatuses.map((next) => {
        const button = (
          <Button
            key={next}
            type="button"
            size={size}
            variant={next === 'REJECTED' ? 'outline' : 'secondary'}
            className={next === 'REJECTED' ? 'text-destructive hover:text-destructive' : undefined}
            disabled={pending != null}
            onClick={CONFIRM_STATUSES.includes(next) ? undefined : () => update(next)}
          >
            {pending === next && <Loader2 className="animate-spin" />}
            {statusActionLabel(next)}
          </Button>
        );
        if (!CONFIRM_STATUSES.includes(next)) return button;
        return (
          <ConfirmDialog
            key={next}
            trigger={button}
            title={CONFIRM_COPY[next].title}
            description={CONFIRM_COPY[next].description}
            confirmLabel={statusActionLabel(next)}
            destructive={next === 'REJECTED'}
            onConfirm={() => update(next)}
          />
        );
      })}
      {canSchedule && (
        <ScheduleInterviewDialog
          applicationId={applicationId}
          rescheduling={status === 'INTERVIEW_SCHEDULED'}
          size={size}
          disabled={pending != null}
          onScheduled={onChanged}
        />
      )}
    </div>
  );
}
