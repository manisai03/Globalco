import { useEffect, useState } from 'react';
import { Download, Eye, FileText, Loader2, X } from 'lucide-react';
import api from '../services/api';
import { migrateFromLocalStorage } from '../services/authStorage';

function parseResumePath(url) {
  if (!url) return null;
  const match = url.match(/\/api\/files\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { subfolder: match[1], filename: match[2] };
}

export default function ResumeViewer({ resumePath, label = 'Resume', autoPreview = false, compact = false, showInlinePreview = true }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(autoPreview);

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

  useEffect(() => {
    if (autoPreview && showInlinePreview && resumePath && !blobUrl && !loading) {
      fetchResume().then((url) => {
        if (url) setShowPreview(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPreview, showInlinePreview, resumePath]);

  const handleDownload = async () => {
    const url = blobUrl || await fetchResume();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = parsed.filename;
    a.click();
  };

  const handleViewInNewTab = () => {
    if (!parsed) return;
    migrateFromLocalStorage();
    const q = new URLSearchParams({
      subfolder: parsed.subfolder,
      filename: parsed.filename,
    });
    window.open(`${window.location.origin}/resume-viewer?${q}`, '_blank', 'noopener,noreferrer');
  };

  if (!resumePath) {
    return <p className="text-sm text-slate-500">No resume submitted with this application.</p>;
  }

  if (loading && autoPreview && showInlinePreview) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <span className="text-sm">Loading resume…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            {parsed?.filename || label}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleViewInNewTab}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              View Resume
            </button>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showInlinePreview && showPreview && blobUrl && (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {isPdf ? (
            <iframe src={blobUrl} title="Resume preview" className="h-[70vh] min-h-[480px] w-full bg-white" />
          ) : (
            <div className="flex flex-col items-center gap-3 bg-slate-50 p-8 dark:bg-slate-800">
              <FileText className="h-12 w-12 text-slate-400" />
              <p className="text-sm text-slate-600 dark:text-slate-300">Preview not available for this file type.</p>
              <button onClick={handleDownload} className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline">
                <Download className="h-4 w-4" /> Download to view
              </button>
            </div>
          )}
        </div>
      )}

      {compact && (
        <button
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Download
        </button>
      )}
    </div>
  );
}

export function ResumePreviewModal({ resumePath, title, subtitle, onClose }) {
  if (!resumePath) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[95vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          <ResumeViewer resumePath={resumePath} showInlinePreview={false} />
        </div>
      </div>
    </div>
  );
}
