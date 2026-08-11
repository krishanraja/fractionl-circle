import { cn } from '@/lib/utils';

interface CircleBrandProps {
  className?: string;
}

export function CircleBrand({ className }: CircleBrandProps) {
  return (
    <div className={cn('circle-brand', className)} aria-label="Circle">
      <span className="circle-brand-mark" aria-hidden="true" />
      <span>Circle</span>
    </div>
  );
}
