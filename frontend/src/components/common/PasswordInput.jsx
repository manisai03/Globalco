import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PasswordInput({ className, wrapperClassName, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn('relative', wrapperClassName)}>
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-10', className)} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
        aria-label="Show password"
        aria-pressed={visible}
        aria-controls={props.id}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}
