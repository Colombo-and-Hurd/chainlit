import { Handle, NodeProps, Position } from '@xyflow/react';
import {
  AlertTriangle,
  Ban,
  BarChart3,
  Bot,
  Brain,
  Briefcase,
  Calculator,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  FileOutput,
  FileText,
  Gavel,
  Globe,
  GraduationCap,
  Inbox,
  Loader2,
  type LucideIcon,
  Mail,
  MessageCircle,
  PenTool,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Wrench,
  XCircle
} from 'lucide-react';

/**
 * Curated icon set shared by the GPT gallery/editor. Keeping an explicit map
 * (instead of `import * as Icons`) keeps the bundle small and the picker
 * predictable.
 */
export const GPT_ICON_LIBRARY: Record<string, LucideIcon> = {
  Bot,
  Scale,
  Gavel,
  MessageCircle,
  Mail,
  BarChart3,
  FileText,
  Brain,
  Briefcase,
  Search,
  Globe,
  Code2,
  Calculator,
  Sparkles,
  GraduationCap,
  Stethoscope,
  PenTool,
  Database,
  ShieldCheck
};

export const GPT_ICON_NAMES = Object.keys(GPT_ICON_LIBRARY);

export function GptIcon({
  name,
  className
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && GPT_ICON_LIBRARY[name]) || Bot;
  return <Icon className={className} />;
}

/** True when `name` maps to a known lucide icon (a GPT icon, not an image URL). */
export function isLucideIconName(name?: string | null): boolean {
  return Boolean(name && GPT_ICON_LIBRARY[name]);
}

/** Rounded gradient badge wrapping a GPT's lucide icon, used across the app. */
export function GptBadge({
  name,
  className,
  iconClassName
}: {
  name?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={
        'inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/20 ' +
        (className || 'h-10 w-10')
      }
    >
      <GptIcon name={name} className={iconClassName || 'h-5 w-5'} />
    </span>
  );
}

type BlockVisual = {
  label: string;
  description: string;
  icon: LucideIcon;
  badge: string;
  border: string;
};

export const BLOCK_VISUALS: Record<string, BlockVisual> = {
  input: {
    label: 'Input',
    description: 'Captures the text or payload that starts the run.',
    icon: Inbox,
    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/40'
  },
  agent: {
    label: 'Agent',
    description: 'Runs an assistant prompt over the previous step.',
    icon: Sparkles,
    badge: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/40'
  },
  tool: {
    label: 'Tool',
    description: 'Executes a tool such as web search.',
    icon: Wrench,
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/40'
  },
  docgen: {
    label: 'Doc Generation',
    description: 'Generates an LOR / PSL / BP draft.',
    icon: FileText,
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/40'
  },
  output: {
    label: 'Output',
    description: 'Final result shown on the run output card.',
    icon: FileOutput,
    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/40'
  }
};

export function blockVisual(blockId?: string | null): BlockVisual {
  return (blockId && BLOCK_VISUALS[blockId]) || BLOCK_VISUALS.agent;
}

/** Custom React Flow node rendered with an icon, type label, and handles. */
export function WorkflowCanvasNode({ data, selected }: NodeProps) {
  const blockId = String((data as any)?.block_id || 'agent');
  const visual = blockVisual(blockId);
  const Icon = visual.icon;
  const isInput = blockId === 'input';
  const isOutput = blockId === 'output';
  const label = String((data as any)?.label || visual.label);

  return (
    <div
      className={`min-w-[190px] rounded-xl border bg-background shadow-sm transition ${
        visual.border
      } ${selected ? 'ring-2 ring-primary' : ''}`}
    >
      {!isInput ? (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-background !bg-muted-foreground"
        />
      ) : null}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${visual.badge}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {visual.label}
          </div>
          <div className="truncate text-sm font-medium">{label}</div>
        </div>
      </div>
      {!isOutput ? (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-background !bg-muted-foreground"
        />
      ) : null}
    </div>
  );
}

type RunStatusVisual = {
  label: string;
  icon: LucideIcon;
  className: string;
  spin?: boolean;
};

const RUN_STATUS_VISUALS: Record<string, RunStatusVisual> = {
  queued: {
    label: 'Queued',
    icon: Clock,
    className: 'text-amber-600 dark:text-amber-400'
  },
  running: {
    label: 'Running',
    icon: Loader2,
    className: 'text-sky-600 dark:text-sky-400',
    spin: true
  },
  succeeded: {
    label: 'Succeeded',
    icon: CheckCircle2,
    className: 'text-emerald-600 dark:text-emerald-400'
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'text-rose-600 dark:text-rose-400'
  },
  failed_retryable: {
    label: 'Retrying',
    icon: AlertTriangle,
    className: 'text-amber-600 dark:text-amber-400'
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    className: 'text-muted-foreground'
  }
};

export function RunStatusBadge({ status }: { status: string }) {
  const visual = RUN_STATUS_VISUALS[status] || RUN_STATUS_VISUALS.queued;
  const Icon = visual.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${visual.className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${visual.spin ? 'animate-spin' : ''}`} />
      {visual.label}
    </span>
  );
}
