import { useEffect, useState } from 'react';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '../services/api';

function parseResumePath(url) {
  if (!url) return null;
  const match = url.match(/\/api\/files\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { subfolder: match[1], filename: decodeURIComponent(match[2]) };
}

export default function ResumeViewer({ resumePath, label = 'Resume' }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parsed = parseResumePath(resumePath);
  const externalUrl = !parsed && /^https?:\/\//i.test(resumePath || '') ? resumePath : null;

  useEffect(() => () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  const fetchResume = async () => {
    if (!parsed) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/files/${parsed.subfolder}/${encodeURIComponent(parsed.filename)}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      setBlobUrl(url);
      return url;
    } catch (err) {
      const status = err.response?.status;
      setError(
        status === 404 ? 'This resume is no longer available. The candidate may have replaced or deleted it.'
          : status === 403 ? 'You do not have access to this resume.'
            : 'Unable to load the resume right now. Check your connection and try again.'
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const url = blobUrl || await fetchResume();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = parsed.filename;
    a.click();
  };

  const handleView = () => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!parsed) return;
    const q = new URLSearchParams({ subfolder: parsed.subfolder, filename: parsed.filename });
    window.open(`${window.location.origin}/resume-viewer?${q}`, '_blank', 'noopener,noreferrer');
  };

  if (!resumePath) {
    return <p className="text-sm text-muted-foreground">No resume submitted with this application.</p>;
  }

  const displayName = parsed?.filename || externalUrl?.split('/').pop() || label;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{displayName}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleView} disabled={loading || (!parsed && !externalUrl)}>
            {loading ? <Loader2 className="animate-spin" /> : <Eye />}
            View Resume
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleDownload} disabled={loading || (!parsed && !externalUrl)}>
            <Download />
            Download
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
