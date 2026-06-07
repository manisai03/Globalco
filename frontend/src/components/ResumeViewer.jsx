import { useEffect, useState } from 'react';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import api from '../services/api';

function parseResumePath(url) {
  if (!url) return null;
  const match = url.match(/\/api\/files\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { subfolder: match[1], filename: match[2] };
}

export default function ResumeViewer({ resumePath, label = 'Resume' }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const parsed = parseResumePath(resumePath);
  const isPdf = parsed?.filename?.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const fetchResume = async () => {
    if (!parsed) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/files/${parsed.subfolder}/${parsed.filename}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      setBlobUrl(url);
      return url;
    } catch {
      setError('Unable to load resume. The file may have been removed.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleView = async () => {
    const url = blobUrl || await fetchResume();
    if (url) setShowPreview(true);
  };

  const handleDownload = async () => {
    const url = blobUrl || await fetchResume();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = parsed.filename;
    a.click();
  };

  if (!resumePath) {
    return <p className="text-sm text-slate-500">No resume submitted with this application.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleView}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          View Resume
        </button>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Download
        </button>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <FileText className="h-3.5 w-3.5" />
        {parsed?.filename || label}
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showPreview && blobUrl && (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {isPdf ? (
            <iframe src={blobUrl} title="Resume preview" className="h-[480px] w-full bg-white" />
          ) : (
            <div className="flex flex-col items-center gap-3 bg-slate-50 p-8 dark:bg-slate-800">
              <FileText className="h-12 w-12 text-slate-400" />
              <p className="text-sm text-slate-600">Preview not available for this file type.</p>
              <button onClick={handleDownload} className="text-sm font-medium text-primary-600 hover:underline">
                Download to view
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
