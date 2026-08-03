import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface EditorSectionProps {
  step: number;
  title: string;
  description: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function EditorSection({
  step,
  title,
  description,
  optional = false,
  children,
  className
}: EditorSectionProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border/70 bg-card/40 p-5 md:p-6 space-y-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {step}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {optional ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Optional
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className="pl-0 md:pl-11 space-y-4">{children}</div>
    </section>
  );
}
