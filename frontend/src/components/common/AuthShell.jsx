import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AuthShell({ title, description, footer, children, className }) {
  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-12">
      <Card className={cn('w-full max-w-md shadow-lg', className)}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold sm:text-3xl">{title}</CardTitle>
          {description && <CardDescription className="text-base">{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && <CardFooter className="flex-col gap-3 text-center text-sm text-muted-foreground">{footer}</CardFooter>}
      </Card>
    </div>
  );
}
