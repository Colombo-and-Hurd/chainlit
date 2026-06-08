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
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import Page from 'pages/Page';

import { ChainlitContext } from '@chainlit/react-client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type {
  WorkflowBlockDescriptor,
  WorkflowRecord,
  WorkflowWritePayload
} from '@/types/workflows';

import '@xyflow/react/dist/style.css';

const randomPosition = (index: number) => ({
  x: 80 + (index % 4) * 180,
  y: 80 + Math.floor(index / 4) * 120
});

export default function WorkflowBuilderPage() {
  const apiClient = useContext(ChainlitContext) as any;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null);
  const [blocks, setBlocks] = useState<WorkflowBlockDescriptor[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [runInput, setRunInput] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [blockData, workflowData] = await Promise.all([
        apiClient.listWorkflowBlocks(),
        isEdit && id ? apiClient.getWorkflow(id) : Promise.resolve(null)
      ]);
      setBlocks(blockData);
      if (workflowData) {
        setWorkflow(workflowData);
        setName(workflowData.name || '');
        setDescription(workflowData.description || '');
        setNodes(
          (workflowData.nodes || []).map((node: any) => ({
            id: node.id,
            type: 'default',
            position: node.position || { x: 0, y: 0 },
            data: {
              ...(node.data || {}),
              label: `${node.type}: ${String((node.data || {}).label || node.id)}`
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
      }
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [id]);

  const onConnect = (params: Connection) =>
    setEdges((existing) =>
      addEdge({ ...params, id: crypto.randomUUID() }, existing)
    );

  const addBlockNode = (block: WorkflowBlockDescriptor) => {
    const index = nodes.length;
    const nodeId = crypto.randomUUID();
    const nextNode: Node = {
      id: nodeId,
      type: 'default',
      position: randomPosition(index),
      data: {
        block_id: block.id,
        label: block.label,
        prompt_template: '',
        tool_id: 'web_search',
        intent: 'lor'
      }
    };
    setNodes((prev) => [...prev, nextNode]);
  };

  const updateSelectedNodeData = (key: string, value: string) => {
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
        navigate(`/workflows/${created.id}`);
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
    setIsRunning(true);
    try {
      const run = await apiClient.enqueueWorkflowRun(id, runInput);
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
                <div className="space-y-2">
                  {blocks.map((block) => (
                    <Button
                      key={block.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => addBlockNode(block)}
                    >
                      {block.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-medium">Run Once</h2>
                <Textarea
                  value={runInput}
                  onChange={(event) => setRunInput(event.target.value)}
                  rows={4}
                  placeholder="Input text for this run..."
                />
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
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
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
                <>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={String((selectedNode.data as any)?.label || '')}
                      onChange={(event) =>
                        updateSelectedNodeData('label', event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prompt Template</Label>
                    <Textarea
                      rows={4}
                      value={String(
                        (selectedNode.data as any)?.prompt_template || ''
                      )}
                      onChange={(event) =>
                        updateSelectedNodeData(
                          'prompt_template',
                          event.target.value
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tool Id</Label>
                    <Input
                      value={String((selectedNode.data as any)?.tool_id || '')}
                      onChange={(event) =>
                        updateSelectedNodeData('tool_id', event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Doc Intent</Label>
                    <Input
                      value={String((selectedNode.data as any)?.intent || '')}
                      onChange={(event) =>
                        updateSelectedNodeData('intent', event.target.value)
                      }
                    />
                  </div>
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </Page>
  );
}
