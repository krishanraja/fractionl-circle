import { cn } from '@/lib/utils';

interface CircleBrandProps {
  className?: string;
  signature?: 'icon' | 'wordmark' | 'none';
}

export function CircleBrand({ className, signature = 'icon' }: CircleBrandProps) {
  const label = signature === 'none' ? 'Circle' : 'Circle by Fractionl';

  return (
    <div
      className={cn('circle-brand', `circle-brand--${signature}`, className)}
      role="img"
      aria-label={label}
    >
      <span className="circle-brand-product" aria-hidden="true">
        <span className="circle-brand-mark" />
        <span className="circle-brand-name">Circle</span>
      </span>
      {signature === 'wordmark' && (
        <span className="circle-brand-parent circle-brand-parent--wordmark" aria-hidden="true">
          <span>by</span>
          <span className="circle-brand-wordmark" />
        </span>
      )}
      {signature === 'icon' && (
        <span className="circle-brand-parent circle-brand-parent--icon" aria-hidden="true">
          <span className="circle-brand-parent-icon" />
        </span>
      )}
    </div>
  );
}
