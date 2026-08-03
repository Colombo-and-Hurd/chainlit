import { blockVisual } from '@/lib/featureVisuals';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';

import type {
  WorkflowEdgeRecord,
  WorkflowNodeRecord,
  WorkflowRunRecord
} from '@/types/workflows';

type StepStatus = 'done' | 'running' | 'pending' | 'skipped';

function orderWorkflowNodes(
  nodes: WorkflowNodeRecord[],
  edges: WorkflowEdgeRecord[]
): WorkflowNodeRecord[] {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  nodes.forEach((node) => {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });
  edges.forEach((edge) => {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) {
      return;
    }
    adjacency.get(edge.source)!.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
  });

  const queue = nodes.filter((node) => (indegree.get(node.id) || 0) === 0);
  const ordered: WorkflowNodeRecord[] = [];
  const seen = new Set<string>();
  while (queue.length) {
    const node = queue.shift()!;
    if (seen.has(node.id)) {
      continue;
    }
    seen.add(node.id);
    ordered.push(node);
    (adjacency.get(node.id) || []).forEach((targetId) => {
      const next = indegree.get(targetId);
      if (next !== undefined) {
        indegree.set(targetId, next - 1);
        if (next - 1 <= 0) {
          const targetNode = nodes.find(
            (candidate) => candidate.id === targetId
          );
          if (targetNode && !seen.has(targetId)) {
            queue.push(targetNode);
          }
        }
      }
    });
  }
  // Append any nodes left out by cycles so nothing silently disappears.
  nodes.forEach((node) => {
    if (!seen.has(node.id)) {
      ordered.push(node);
    }
  });
  return ordered;
}

function previewText(output: Record<string, unknown> | undefined): string {
  if (!output) {
    return '';
  }
  const candidate =
    (output.text as string) ||
    (output.document as string) ||
    (typeof output.result === 'string' ? (output.result as string) : '');
  if (candidate) {
    return candidate;
  }
  try {
    return JSON.stringify(output.result ?? output, null, 2);
  } catch {
    return '';
  }
}

export default function RunStepTimeline({
  run,
  nodes,
  edges
}: {
  run: WorkflowRunRecord;
  nodes: WorkflowNodeRecord[];
  edges: WorkflowEdgeRecord[];
}) {
  const ordered = orderWorkflowNodes(nodes, edges);
  const outputsById = new Map<string, Record<string, unknown>>();
  (run.node_outputs || []).forEach((entry) => {
    const id = String((entry as any).node_id || '');
    if (id) {
      outputsById.set(id, (entry as any).output || entry);
    }
  });

  const isActive = run.status === 'queued' || run.status === 'running';
  const firstPendingIndex = ordered.findIndex(
    (node) => !outputsById.has(node.id)
  );

  const statusFor = (node: WorkflowNodeRecord, index: number): StepStatus => {
    if (outputsById.has(node.id)) {
      return 'done';
    }
    if (isActive && index === firstPendingIndex) {
      return 'running';
    }
    if (!isActive) {
      return 'skipped';
    }
    return 'pending';
  };

  if (!ordered.length) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {ordered.map((node, index) => (
        <StepRow
          key={node.id}
          node={node}
          status={statusFor(node, index)}
          output={outputsById.get(node.id)}
          isLast={index === ordered.length - 1}
        />
      ))}
    </div>
  );
}

function StepRow({
  node,
  status,
  output,
  isLast
}: {
  node: WorkflowNodeRecord;
  status: StepStatus;
  output?: Record<string, unknown>;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visual = blockVisual(node.type);
  const Icon = visual.icon;
  const label = String((node.data as any)?.label || visual.label);
  const preview = previewText(output);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
            status === 'done'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
              : status === 'running'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-muted-foreground/20 bg-muted text-muted-foreground'
          }`}
        >
          {status === 'done' ? (
            <Check className="h-3.5 w-3.5" />
          ) : status === 'running' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
        </span>
        {!isLast && <span className="my-0.5 w-px flex-1 bg-border" />}
      </div>

      <div className="flex-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{visual.label}</span>
          {status === 'running' && (
            <span className="text-xs text-primary">working…</span>
          )}
        </div>
        {status === 'done' && preview ? (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
              {expanded ? 'Hide output' : 'Show output'}
            </button>
            {expanded ? (
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                {preview}
              </pre>
            ) : (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {preview}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
