import { GPT_ICON_LIBRARY, GptBadge } from '@/lib/featureVisuals';
import { cn } from '@/lib/utils';

const ICON_OPTIONS = [
  { name: 'Bot', label: 'Assistant' },
  { name: 'Scale', label: 'Legal' },
  { name: 'Gavel', label: 'Counsel' },
  { name: 'MessageCircle', label: 'Messaging' },
  { name: 'Mail', label: 'Email' },
  { name: 'BarChart3', label: 'Analytics' },
  { name: 'FileText', label: 'Documents' },
  { name: 'Brain', label: 'Research' },
  { name: 'Briefcase', label: 'Business' },
  { name: 'Search', label: 'Search' },
  { name: 'Globe', label: 'Web' },
  { name: 'Code2', label: 'Technical' },
  { name: 'Calculator', label: 'Numbers' },
  { name: 'Sparkles', label: 'Creative' },
  { name: 'GraduationCap', label: 'Training' },
  { name: 'Stethoscope', label: 'Healthcare' },
  { name: 'PenTool', label: 'Writing' },
  { name: 'Database', label: 'Knowledge' },
  { name: 'ShieldCheck', label: 'Compliance' }
] as const;

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const activeLabel =
    ICON_OPTIONS.find((option) => option.name === value)?.label ||
    value ||
    'Assistant';

  return (
    <div className="relative isolate space-y-3">
      <div className="flex items-center gap-3 rounded-xl border bg-muted/20 px-3 py-2">
        <GptBadge name={value} className="h-10 w-10" iconClassName="h-5 w-5" />
        <div>
          <p className="text-sm font-medium">{activeLabel}</p>
          <p className="text-xs text-muted-foreground">
            Shown next to this agent in the sidebar and chat
          </p>
        </div>
      </div>
      <div
        className="grid grid-cols-4 gap-2 sm:grid-cols-5"
        role="listbox"
        aria-label="Agent icon"
      >
        {ICON_OPTIONS.map((option) => {
          const Icon = GPT_ICON_LIBRARY[option.name];
          if (!Icon) {
            return null;
          }
          const isActive = value === option.name;
          return (
            <button
              key={option.name}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => onChange(option.name)}
              className={cn(
                'flex min-h-[4.25rem] flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-1.5 py-2 text-[11px] leading-tight transition',
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="line-clamp-2 text-center">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
