export type WorkflowVisibility = 'private' | 'example';
export type WorkflowRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'failed_retryable';

export interface WorkflowNodeRecord {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: Record<string, unknown>;
}

export interface WorkflowEdgeRecord {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, unknown>;
}

export interface WorkflowRecord {
  id: string;
  owner: string;
  name: string;
  description: string;
  nodes: WorkflowNodeRecord[];
  edges: WorkflowEdgeRecord[];
  visibility: WorkflowVisibility;
  created_at: string;
  updated_at: string;
}

export interface WorkflowBlockDescriptor {
  id: string;
  label: string;
  category: string;
  description: string;
  config_schema: Record<string, unknown>;
}

export interface WorkflowRunRecord {
  id: string;
  owner: string;
  workflow_id: string;
  status: WorkflowRunStatus;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  input_snapshot: Record<string, unknown>;
  node_outputs: Record<string, unknown>[];
  final_output: Record<string, unknown>;
  error?: Record<string, unknown> | null;
  chat_thread_id?: string | null;
}

export interface WorkflowWritePayload {
  name: string;
  description: string;
  nodes: WorkflowNodeRecord[];
  edges: WorkflowEdgeRecord[];
  visibility: WorkflowVisibility;
}
