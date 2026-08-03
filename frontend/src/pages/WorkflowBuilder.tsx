import { WorkflowCanvasNode, blockVisual } from '@/lib/featureVisuals';
import {
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState
} from '@xyflow/react';
import { Paperclip, X } from 'lucide-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import Page from 'pages/Page';

import { ChainlitContext } from '@chainlit/react-client';

import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import NodeConfigPanel from '@/components/workflow/NodeConfigPanel';

import type { GptToolDescriptor } from '@/types/gpts';
import type {
  WorkflowBlockDescriptor,
  WorkflowRecord,
  WorkflowWritePayload
} from '@/types/workflows';

import '@xyflow/react/dist/style.css';

const nodeTypes = { workflow: WorkflowCanvasNode };

const randomPosition = (index: number) => ({
  x: 80 + (index % 4) * 180,
  y: 80 + Math.floor(index / 4) * 120
});

export default function WorkflowBuilderPage() {
  const apiClient = useContext(ChainlitContext) as any;
  const location = useLocation();
  const navigate = useNavigate();
  const { variant } = useTheme();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const preloadedWorkflow = useMemo(() => {
    const state = (location.state || null) as {
      workflow?: WorkflowRecord;
    } | null;
    const candidate = state?.workflow || null;
    if (!candidate) {
      return null;
    }
    if (id && candidate.id !== id) {
      return null;
    }
    return candidate;
  }, [id, location.state]);

  const [isLoading, setIsLoading] = useState(isEdit && !preloadedWorkflow);
  const [isBlocksLoading, setIsBlocksLoading] = useState(true);
  const [isToolsLoading, setIsToolsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null);
  const [blocks, setBlocks] = useState<WorkflowBlockDescriptor[]>([]);
  const [tools, setTools] = useState<GptToolDescriptor[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [runInput, setRunInput] = useState('');
  const [runFile, setRunFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const selectedBlock = useMemo(
    () =>
      selectedNode
        ? blocks.find(
            (block) =>
              block.id === String((selectedNode.data as any)?.block_id || '')
          )
        : undefined,
    [blocks, selectedNode]
  );

  const upstreamLabels = useMemo(() => {
    if (!selectedNode) {
      return [] as string[];
    }
    const labelById = new Map(
      nodes.map((node) => [
        node.id,
        String((node.data as any)?.label || node.id)
      ])
    );
    return edges
      .filter((edge) => edge.target === selectedNode.id)
      .map((edge) => labelById.get(edge.source) || edge.source);
  }, [edges, nodes, selectedNode]);

  const applyWorkflowData = (workflowData: WorkflowRecord) => {
    setWorkflow(workflowData);
    setName(workflowData.name || '');
    setDescription(workflowData.description || '');
    setNodes(
      (workflowData.nodes || []).map((node: any) => ({
        id: node.id,
        type: 'workflow',
        position: node.position || { x: 0, y: 0 },
        data: {
          ...(node.data || {}),
          block_id: node.type,
          label: String((node.data || {}).label || node.type)
        }
      }))
    );
    setEdges(
      (workflowData.edges || []).map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      }))
    );
  };

  useEffect(() => {
    let cancelled = false;
    const loadBlocks = async () => {
      setIsBlocksLoading(true);
      try {
        const blockData = await apiClient.listWorkflowBlocks();
        if (!cancelled) {
          setBlocks(blockData);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(String(error));
        }
      } finally {
        if (!cancelled) {
          setIsBlocksLoading(false);
        }
      }
    };
    loadBlocks();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadTools = async () => {
      setIsToolsLoading(true);
      try {
        const toolData = await apiClient.listGptTools();
        if (!cancelled) {
          setTools(toolData);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(String(error));
        }
      } finally {
        if (!cancelled) {
          setIsToolsLoading(false);
        }
      }
    };
    loadTools();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadWorkflow = async () => {
      if (!isEdit || !id) {
        setWorkflow(null);
        setName('');
        setDescription('');
        setNodes([]);
        setEdges([]);
        setIsLoading(false);
        return;
      }

      if (preloadedWorkflow) {
        applyWorkflowData(preloadedWorkflow);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      try {
        const workflowData = await apiClient.getWorkflow(id);
        if (!cancelled) {
          applyWorkflowData(workflowData);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(String(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    loadWorkflow();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, preloadedWorkflow]);

  const onConnect = (params: Connection) =>
    setEdges((existing) =>
      addEdge({ ...params, id: crypto.randomUUID() }, existing)
    );

  const addBlockNode = (block: WorkflowBlockDescriptor) => {
    const index = nodes.length;
    const nodeId = crypto.randomUUID();
    const nextNode: Node = {
      id: nodeId,
      type: 'workflow',
      position: randomPosition(index),
      data: {
        block_id: block.id,
        label: block.label,
        prompt_template: '',
        tool_id: 'web_search',
        intent: 'lor',
        input_mode: 'both',
        description: '',
        output_format: 'markdown',
        output_fields: []
      }
    };
    setNodes((prev) => [...prev, nextNode]);
  };

  const deleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setEdges((prev) =>
      prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    );
    setSelectedNodeId((current) => (current === nodeId ? null : current));
  };

  const updateSelectedNodeData = (key: string, value: unknown) => {
    if (!selectedNodeId) {
      return;
    }
    setNodes((prev) =>
      prev.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...(node.data || {}),
                [key]: value
              }
            }
          : node
      )
    );
  };

  const toPayload = (): WorkflowWritePayload => ({
    name: name.trim(),
    description: description.trim(),
    visibility: 'private',
    nodes: nodes.map((node) => ({
      id: node.id,
      type: String((node.data as any)?.block_id || 'agent'),
      position: {
        x: node.position.x,
        y: node.position.y
      },
      data: { ...(node.data || {}) }
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined
    }))
  });

  const onSave = async () => {
    if (!name.trim()) {
      toast.error('Workflow name is required.');
      return;
    }
    setIsSaving(true);
    try {
      if (isEdit && id) {
        const updated = await apiClient.updateWorkflow(id, toPayload());
        setWorkflow(updated);
        toast.success('Workflow updated.');
      } else {
        const created = await apiClient.createWorkflow(toPayload());
        toast.success('Workflow created.');
        navigate(`/workflows/${created.id}`, {
          state: { workflow: created }
        });
      }
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const onRun = async () => {
    if (!id) {
      toast.error('Save the workflow before running it.');
      return;
    }
    if (!runInput.trim() && !runFile) {
      toast.error('Add input text or attach a document to run.');
      return;
    }
    setIsRunning(true);
    try {
      const run = await apiClient.enqueueWorkflowRunWithUpload(
        id,
        runInput,
        runFile
      );
      toast.success(`Run queued: ${run.id}`);
      navigate('/workflows/runs');
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Page>
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {isEdit ? 'Workflow Builder' : 'Create Workflow'}
            </h1>
            <p className="text-xs text-muted-foreground">
              Drag nodes on canvas, connect edges, save, then run
              asynchronously.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/workflows')}>
              Back
            </Button>
            <Button variant="outline" disabled>
              Cron - Coming soon
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">
            Loading builder...
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <aside className="w-72 border-r p-4 space-y-4 overflow-auto">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">Name</Label>
                <Input
                  id="workflow-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-medium">Palette</h2>
                <p className="text-xs text-muted-foreground">
                  Click a block to add it, then drag to connect nodes.
                </p>
                <div className="space-y-2">
                  {isBlocksLoading ? (
                    <div className="space-y-2">
                      <div className="h-14 rounded-lg border bg-muted/40" />
                      <div className="h-14 rounded-lg border bg-muted/40" />
                      <div className="h-14 rounded-lg border bg-muted/40" />
                    </div>
                  ) : (
                    blocks.map((block) => {
                      const visual = blockVisual(block.id);
                      const Icon = visual.icon;
                      return (
                        <button
                          key={block.id}
                          type="button"
                          className={`flex w-full items-start gap-3 rounded-lg border bg-background p-2.5 text-left transition hover:bg-accent ${visual.border}`}
                          onClick={() => addBlockNode(block)}
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${visual.badge}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">
                              {block.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {block.description || visual.description}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-medium">Run Once</h2>
                <Textarea
                  value={runInput}
                  onChange={(event) => setRunInput(event.target.value)}
                  rows={4}
                  placeholder="Input text for this run (optional if you attach a document)..."
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) =>
                    setRunFile(event.target.files?.[0] || null)
                  }
                />
                {runFile ? (
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                    <span className="flex items-center gap-1.5 truncate">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{runFile.name}</span>
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setRunFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Attach a document
                  </Button>
                )}
                <Button
                  className="w-full"
                  onClick={onRun}
                  disabled={isRunning || !workflow?.id}
                >
                  {isRunning ? 'Queueing...' : 'Run Async'}
                </Button>
              </div>
            </aside>

            <div className="flex-1 min-h-0">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                colorMode={variant}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onNodesDelete={(deleted) =>
                  deleted.forEach((node) => deleteNode(node.id))
                }
                deleteKeyCode={['Backspace', 'Delete']}
                defaultEdgeOptions={{ animated: true }}
                fitView
              >
                <MiniMap />
                <Controls />
                <Background />
              </ReactFlow>
            </div>

            <aside className="w-80 border-l p-4 space-y-3 overflow-auto">
              <h2 className="text-sm font-medium">Node Config</h2>
              {!selectedNode ? (
                <p className="text-xs text-muted-foreground">
                  Select a node to edit its configuration.
                </p>
              ) : (
                <NodeConfigPanel
                  node={selectedNode}
                  block={selectedBlock}
                  tools={isToolsLoading ? [] : tools}
                  upstreamLabels={upstreamLabels}
                  onChange={updateSelectedNodeData}
                  onDelete={() => deleteNode(selectedNode.id)}
                />
              )}
            </aside>
          </div>
        )}
      </div>
    </Page>
  );
}
