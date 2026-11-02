import { memo, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import api, { unwrap } from '../../services/api';
import { useAuth } from '../../context/auth';
import { getApiErrorMessage } from '../../utils/apiError';
import { validatePassword } from '../../utils/validation';
import PasswordInput from '../common/PasswordInput';
import { Field, SectionCard } from './ProfileParts';

export const ChangePasswordCard = memo(function ChangePasswordCard() {
  const { updateToken } = useAuth();
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
      const res = await api.put('/api/users/me/password', passwords);
      updateToken(unwrap(res)?.token);
      toast.success('Password changed. Other devices have been signed out.');
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to change password'));
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
});

export const DeleteAccountCard = memo(function DeleteAccountCard() {
  const { isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const close = (next) => {
    setOpen(next);
    if (!next) setPassword('');
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await api.delete('/api/users/me', { data: { password } });
      toast.success('Your account has been deleted');
      logout();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete account'));
      setDeleting(false);
    }
  };

  return (
    <SectionCard id="delete-account" title="Delete Account">
      <p className="max-w-xl text-sm text-muted-foreground">
        {isAdmin
          ? 'Permanently deletes your recruiter account, your job postings, messages and notifications. Applicants are told the jobs were removed.'
          : 'Permanently deletes your profile, resume, applications, saved jobs, messages and notifications.'}
      </p>
      <Button type="button" variant="destructive" className="mt-4" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <form onSubmit={confirmDelete} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>This cannot be undone. Enter your password to confirm.</DialogDescription>
            </DialogHeader>
            <Field id="delete-password" label="Password">
              <PasswordInput
                id="delete-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)} disabled={deleting}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={deleting || !password}>
                {deleting && <Loader2 className="animate-spin" />}
                Delete permanently
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
});
