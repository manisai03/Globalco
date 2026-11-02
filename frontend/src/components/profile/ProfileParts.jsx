import { useState } from 'react';
import { Loader2, Mail, MapPin, Pencil, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import ConfirmDialog from '../common/ConfirmDialog';

export function Field({ id, label, className, children }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function SectionCard({ id, title, description, onAdd, addLabel = 'Add', children }) {
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

export function EntryRow({ title, subtitle, meta, onEdit, editLabel }) {
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

export function EditDialog({ title, subtitle, wide, onClose, onSave, onDelete, deleteLabel, children }) {
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

export function SaveButton({ saving, dirty, onClick }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <Button type="button" onClick={onClick} disabled={saving || !dirty}>
        {saving && <Loader2 className="animate-spin" />}
        Save
      </Button>
      {dirty && !saving && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
    </div>
  );
}

export function CompletionRing({ value, children }) {
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

export function ContactLine({ profile }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
      {profile.location && <span className="flex items-center gap-1"><MapPin className="size-4" />{profile.location}</span>}
      {profile.phone && <span className="flex items-center gap-1"><Phone className="size-4" />{profile.phone}</span>}
      {profile.email && <span className="flex items-center gap-1 break-all"><Mail className="size-4 shrink-0" />{profile.email}</span>}
    </div>
  );
}
