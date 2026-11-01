import { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function ResumeUploadBox({
  resumeUrl,
  onUpload,
  fileName,
  compact = false,
  label = 'Resume',
  hint,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const displayName = fileName || (resumeUrl ? resumeUrl.split('/').pop() : null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer?.files;
    if (files?.length) onUpload?.({ target: { files, value: '' } });
  };

  const box = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'group cursor-pointer rounded-2xl border-2 border-dashed border-primary/30 bg-accent/40 px-6 py-10 text-center transition outline-none hover:border-primary hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
        dragging && 'border-primary bg-accent'
      )}
    >
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border bg-card shadow-sm transition group-hover:scale-105">
        {displayName ? (
          <CheckCircle2 className="size-7 text-emerald-500" />
        ) : (
          <Upload className="size-7 text-primary" />
        )}
      </div>
      <p className="mt-4 break-all text-base font-semibold text-primary">
        {displayName || 'Click to choose resume file'}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {displayName ? 'Click or drop a file to replace it' : 'or drag and drop your resume here'}
      </p>
      <Badge variant="outline" className="mt-3 bg-card px-4 py-1.5 font-medium text-muted-foreground">
        PDF, DOC, DOCX · Max 10MB
      </Badge>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={onUpload}
        className="hidden"
      />
    </div>
  );

  if (compact) {
    return (
      <div>
        {label && <p className="mb-2 text-sm font-semibold">{label}</p>}
        {box}
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>{box}</CardContent>
    </Card>
  );
}
