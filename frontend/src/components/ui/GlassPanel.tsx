import { forwardRef } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ children, className = '', ...props }, ref) => {
  return (
    <div ref={ref} className={`glass-panel ${className}`} {...props}>
      {children}
    </div>
  );
});
