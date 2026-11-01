import { useRef } from 'react';
import { Camera, User, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = {
  md: 'size-16',
  lg: 'size-20',
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
        aria-label="Change profile picture"
        title="Change profile picture"
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-full border-2 border-card bg-accent shadow-sm ring-2 ring-primary/20 transition hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-primary disabled:opacity-60',
          SIZES[size]
        )}
      >
        {url ? (
          <img src={url} alt="Profile" className="size-full object-cover" />
        ) : (
          <Icon className="size-8 text-primary" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-white" />
          ) : (
            <Camera className="size-5 text-white opacity-0 transition group-hover:opacity-100" />
          )}
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
