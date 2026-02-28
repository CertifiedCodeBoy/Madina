import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Image, Upload, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { reportIssue, type Issue } from '../services/api';

const SEVERITY_CLASSES: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const CATEGORY_LABELS: Record<string, string> = {
  pothole: '🕳️ Pothole',
  broken_light: '💡 Broken Light',
  illegal_dumping: '🗑️ Illegal Dumping',
  graffiti: '🖌️ Graffiti',
  damaged_sign: '🪧 Damaged Sign',
  tree_hazard: '🌳 Tree Hazard',
  water_leak: '💧 Water Leak',
  other: '❓ Other',
};

export default function IssueReport() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Issue | null>(null);
  const [error, setError] = useState('');

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError('');
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const submit = async () => {
    if (!file) { setError('Please select an image first.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('image', file);
      if (description) form.append('description', description);
      if (address) form.append('address', address);
      const { data } = await reportIssue(form);
      setResult(data);
    } catch {
      setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-1">{t('report.title')}</h1>
      <p className="text-gray-500 mb-6">{t('report.subtitle')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload area */}
        <div>
          <div
            className={clsx(
              'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors h-64 flex flex-col items-center justify-center',
              preview ? 'border-primary-500' : 'border-gray-300 hover:border-primary-400',
            )}
            onClick={() => fileRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {preview ? (
              <img src={preview} alt="preview" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <>
                <Upload size={40} className="text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium">Drag & drop or click to upload</p>
                <p className="text-sm text-gray-400 mt-1">JPG, PNG, WEBP</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('report.description')}</label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('report.address')}</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address…"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting}
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : t('report.submit')}
          </button>
        </div>

        {/* AI result */}
        <div>
          {result ? (
            <div className="bg-white rounded-2xl shadow-md p-6 border border-green-200">
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <CheckCircle size={22} />
                <span className="font-bold">{t('report.ai_result')}</span>
              </div>
              <ResultRow label={t('report.category')} value={CATEGORY_LABELS[result.category] ?? result.category} />
              <ResultRow
                label={t('report.severity')}
                value={result.severity.toUpperCase()}
                badge={SEVERITY_CLASSES[result.severity]}
              />
              <ResultRow label={t('report.department')} value={result.department?.replace('_', ' ') ?? '—'} />
              <ResultRow
                label={t('report.estimated')}
                value={`${result.estimated_resolution_days} ${t('report.days')}`}
              />
              {result.ai_confidence != null && (
                <ResultRow
                  label={t('report.confidence')}
                  value={`${(result.ai_confidence * 100).toFixed(1)}%`}
                />
              )}
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-400">Issue ID: {result.id.slice(0, 8)}…</p>
                <p className="text-xs text-gray-400">Status: <span className="font-semibold capitalize">{result.status}</span></p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center">
              <Camera size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-400 font-medium">AI triage results will appear here</p>
              <p className="text-sm text-gray-400 mt-1">Upload a photo and submit to classify the issue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={clsx('text-sm font-semibold', badge ? `px-2 py-0.5 rounded-full ${badge}` : 'text-gray-800')}>
        {value}
      </span>
    </div>
  );
}
