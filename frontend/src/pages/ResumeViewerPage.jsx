import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Download, FileText, Loader2, X } from 'lucide-react';
import api from '../services/api';
import { authStorage, migrateFromLocalStorage } from '../services/authStorage';

export default function ResumeViewerPage() {
  const [searchParams] = useSearchParams();
  const subfolder = searchParams.get('subfolder');
  const filename = searchParams.get('filename');
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isPdf = filename?.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    migrateFromLocalStorage();
    const hasToken = !!authStorage.getToken();

    if (!hasToken) {
      setError('login');
      setLoading(false);
      return;
    }
    if (!subfolder || !filename) {
      setError('Invalid resume link.');
      setLoading(false);
      return;
    }

    let objectUrl;
    api
      .get(`/api/files/${subfolder}/${encodeURIComponent(filename)}`, { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
      })
      .catch(() => setError('Unable to load resume. The file may have been removed.'))
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [subfolder, filename]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700 bg-slate-900 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-5 w-5 shrink-0 text-primary-400" />
          <p className="truncate text-sm font-medium">{filename || 'Resume'}</p>
        </div>
        <div className="flex items-center gap-2">
          {blobUrl && (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          )}
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-lg p-2 hover:bg-slate-800"
            aria-label="Close tab"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 bg-slate-700">
        {loading && (
          <div className="flex h-full items-center justify-center gap-2 text-slate-300">
            <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            <span>Loading resume…</span>
          </div>
        )}
        {error === 'login' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-slate-300">
            <p>Your session is not available in this tab.</p>
            <p className="text-sm text-slate-400">Close this tab, go back to the admin panel, and click View Resume again — or log in below.</p>
            <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              Log in
            </Link>
          </div>
        )}
        {error && error !== 'login' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-slate-300">
            <p>{error}</p>
            <Link to="/admin" className="text-primary-400 hover:underline">Go back</Link>
          </div>
        )}
        {!loading && !error && blobUrl && (
          isPdf ? (
            <iframe src={blobUrl} title={filename} className="h-full w-full border-0 bg-white" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-100 text-slate-700">
              <FileText className="h-16 w-16 text-slate-400" />
              <p>Preview not available for this file type.</p>
              <button type="button" onClick={handleDownload} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                <Download className="h-4 w-4" /> Download to view
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
