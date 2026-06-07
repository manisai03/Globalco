import { useRef } from 'react';
import { Camera, User, Building2 } from 'lucide-react';

const SIZES = {
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
};

export default function ProfileAvatar({
  url,
  onUpload,
  size = 'md',
  variant = 'user',
  uploading = false,
}) {
  const inputRef = useRef(null);
  const Icon = variant === 'admin' ? Building2 : User;

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      onUpload?.(null, 'Only JPG, PNG, or WEBP images are allowed');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onUpload?.(null, 'Image must be under 5MB');
      e.target.value = '';
      return;
    }
    onUpload?.(file);
    e.target.value = '';
  };

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`relative flex ${SIZES[size]} items-center justify-center overflow-hidden rounded-full border-2 border-white bg-primary-100 shadow-sm ring-2 ring-primary-200 transition hover:ring-primary-400 disabled:opacity-60 dark:border-slate-800 dark:bg-primary-900/30 dark:ring-primary-800 dark:hover:ring-primary-600`}
        title="Change profile picture"
      >
        {url ? (
          <img src={url} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-8 w-8 text-primary-600" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
          <Camera className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
