import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Download, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/auth';
import api from '../services/api';

export default function ResumeViewerPage() {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const subfolder = searchParams.get('subfolder');
  const filename = searchParams.get('filename');
  const fileKey = `${subfolder}/${filename}`;
  const precheckError = authLoading ? null
    : !user ? 'login'
      : !subfolder || !filename ? 'Invalid resume link.'
        : null;
  const [result, setResult] = useState({ key: null, blobUrl: null, error: null });

  const isPdf = filename?.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    if (authLoading || precheckError) return undefined;
    let objectUrl;
    let cancelled = false;
    api
      .get(`/api/files/${subfolder}/${encodeURIComponent(filename)}`, { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        if (!cancelled) setResult({ key: `${subfolder}/${filename}`, blobUrl: objectUrl, error: null });
      })
      .catch((err) => {
        const message = err.response?.status === 404
          ? 'This resume is not available. It may have been replaced, or you may not have access to it.'
          : 'Unable to load the resume right now. Check your connection and try again.';
        if (!cancelled) setResult({ key: `${subfolder}/${filename}`, blobUrl: null, error: message });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [subfolder, filename, authLoading, precheckError]);

  const current = result.key === fileKey ? result : { blobUrl: null, error: null };
  const error = precheckError || current.error;
  const blobUrl = current.blobUrl;
  const loading = !error && !blobUrl;

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
  };

  return (
    <div className="dark fixed inset-0 z-[100] flex flex-col bg-slate-900 text-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-5 shrink-0 text-primary-400" />
          <p className="truncate text-sm font-medium">{filename || 'Resume'}</p>
        </div>
        <div className="flex items-center gap-2">
          {blobUrl && (
            <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
              <Download /> Download
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" onClick={() => window.close()} aria-label="Close tab">
            <X className="size-5" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 bg-slate-800">
        {loading && (
          <div className="flex h-full items-center justify-center gap-2 text-slate-300">
            <Loader2 className="size-8 animate-spin text-primary-400" />
            <span>Loading resume…</span>
          </div>
        )}
        {error === 'login' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-slate-300">
            <p>Your session is not available in this tab.</p>
            <p className="text-sm text-slate-400">Close this tab, go back, and click View Resume again — or log in below.</p>
            <Button asChild>
              <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}>Log in</Link>
            </Button>
          </div>
        )}
        {error && error !== 'login' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-slate-300">
            <p>{error}</p>
            <Button asChild variant="link" className="text-primary-400">
              <Link to="/">Go back</Link>
            </Button>
          </div>
        )}
        {!error && blobUrl && (
          isPdf ? (
            <iframe src={blobUrl} title={filename} className="h-full w-full border-0 bg-white" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-300">
              <FileText className="size-16 text-slate-500" />
              <p>Preview not available for this file type.</p>
              <Button type="button" onClick={handleDownload}>
                <Download /> Download to view
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
