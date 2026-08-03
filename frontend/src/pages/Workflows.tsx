import { blockVisual } from '@/lib/featureVisuals';
import {
  Inbox,
  Paperclip,
  Pencil,
  Play,
  Plus,
  Trash2,
  Workflow as WorkflowIcon,
  X
} from 'lucide-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import Page from 'pages/Page';

import { ChainlitContext } from '@chainlit/react-client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import type { WorkflowRecord } from '@/types/workflows';

function WorkflowCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
      <CardFooter className="gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </CardFooter>
    </Card>
  );
}

function WorkflowCardHeader({ workflow }: { workflow: WorkflowRecord }) {
  const types = Array.from(
    new Set((workflow.nodes || []).map((node) => node.type))
  );
  return (
    <CardHeader>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <WorkflowIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <CardTitle className="text-lg">{workflow.name}</CardTitle>
          <CardDescription>
            {workflow.description || 'No description'}
          </CardDescription>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-2">
        {types.map((type) => {
          const visual = blockVisual(type);
          const Icon = visual.icon;
          return (
            <span
              key={type}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${visual.badge}`}
            >
              <Icon className="h-3 w-3" />
              {visual.label}
            </span>
          );
        })}
      </div>
    </CardHeader>
  );
}

export default function WorkflowsPage() {
  const apiClient = useContext(ChainlitContext) as any;
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runTarget, setRunTarget] = useState<WorkflowRecord | null>(null);
  const [runInput, setRunInput] = useState('');
  const [runFiles, setRunFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(
    null
  );

  const refresh = async () => {
    setIsLoading(true);
    try {
      const items = await apiClient.listWorkflows();
      setWorkflows(items);
    } finally {
      setIsLoading(false);
    }
  };

  const openRun = (workflow: WorkflowRecord) => {
    setRunTarget(workflow);
    setRunInput('');
    setRunFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const submitRun = async () => {
    if (!runTarget) {
      return;
    }
    if (!runInput.trim() && runFiles.length === 0) {
      toast.error('Add input text or attach a document to run.');
      return;
    }
    setIsRunning(true);
    try {
      await apiClient.enqueueWorkflowRunWithUpload(
        runTarget.id,
        runInput,
        runFiles
      );
      toast.success('Run queued. Track it in the Runs Inbox.');
      const targetId = runTarget.id;
      setRunTarget(null);
      navigate(`/workflows/runs?workflow_id=${targetId}`);
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsRunning(false);
    }
  };

  const deleteWorkflow = async (workflow: WorkflowRecord) => {
    const confirmed = window.confirm(
      `Delete workflow "${workflow.name}"? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }
    setDeletingWorkflowId(workflow.id);
    try {
      await apiClient.deleteWorkflow(workflow.id);
      setWorkflows((previous) =>
        previous.filter((item) => item.id !== workflow.id)
      );
      toast.success('Workflow deleted.');
    } catch (error) {
      toast.error(String(error));
    } finally {
      setDeletingWorkflowId(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const privateWorkflows = useMemo(
    () => workflows.filter((item) => item.visibility !== 'example'),
    [workflows]
  );
  const exampleWorkflows = useMemo(
    () => workflows.filter((item) => item.visibility === 'example'),
    [workflows]
  );

  return (
    <Page>
      <div className="w-full p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Workflows</h1>
            <p className="text-sm text-muted-foreground">
              Build async automations, run them in the background, and chat on
              outputs.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/workflows/runs')}
            >
              <Inbox className="mr-2 h-4 w-4" />
              Runs Inbox
            </Button>
            <Button onClick={() => navigate('/workflows/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WorkflowCardSkeleton />
            <WorkflowCardSkeleton />
          </div>
        ) : null}

        <section className={`space-y-3 ${isLoading ? 'hidden' : ''}`}>
          <h2 className="text-lg font-medium">My Workflows</h2>
          {privateWorkflows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No workflows yet. Create one to start automating.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {privateWorkflows.map((workflow) => (
                <Card key={workflow.id}>
                  <WorkflowCardHeader workflow={workflow} />
                  <CardContent className="text-sm text-muted-foreground">
                    {workflow.nodes.length} steps · {workflow.edges.length}{' '}
                    connections
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button onClick={() => openRun(workflow)}>
                      <Play className="mr-2 h-4 w-4" />
                      Run
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/workflows/${workflow.id}`, {
                          state: { workflow }
                        })
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Open Builder
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/workflows/runs?workflow_id=${workflow.id}`)
                      }
                    >
                      <Inbox className="mr-2 h-4 w-4" />
                      View Runs
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => deleteWorkflow(workflow)}
                      disabled={deletingWorkflowId === workflow.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deletingWorkflowId === workflow.id
                        ? 'Deleting...'
                        : 'Delete'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className={`space-y-3 ${isLoading ? 'hidden' : ''}`}>
          <h2 className="text-lg font-medium">Examples</h2>
          {exampleWorkflows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No example workflows yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {exampleWorkflows.map((workflow) => (
                <Card key={workflow.id}>
                  <WorkflowCardHeader workflow={workflow} />
                  <CardContent className="text-sm text-muted-foreground">
                    {workflow.nodes.length} steps · {workflow.edges.length}{' '}
                    connections
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button onClick={() => openRun(workflow)}>
                      <Play className="mr-2 h-4 w-4" />
                      Run
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/workflows/${workflow.id}`, {
                          state: { workflow }
                        })
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Open Builder
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Dialog
          open={Boolean(runTarget)}
          onOpenChange={(open) => !open && setRunTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Run “{runTarget?.name}”</DialogTitle>
              <DialogDescription>
                This runs asynchronously in the background. Track progress and
                chat on the output from the Runs Inbox.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Textarea
                rows={5}
                value={runInput}
                onChange={(event) => setRunInput(event.target.value)}
                placeholder="Input for this run (campaign notes, intake details, a question...)"
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={(event) =>
                  setRunFiles(Array.from(event.target.files || []))
                }
              />
              {runFiles.length > 0 ? (
                <div className="space-y-2">
                  {runFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between rounded-md border bg-muted/40 px-2 py-1.5 text-sm"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Paperclip className="h-4 w-4 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const remaining = runFiles.filter(
                            (_, fileIndex) => fileIndex !== index
                          );
                          setRunFiles(remaining);
                          if (remaining.length === 0 && fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Attach document(s) (optional)
                </Button>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setRunTarget(null)}>
                Cancel
              </Button>
              <Button onClick={submitRun} disabled={isRunning}>
                {isRunning ? 'Queueing...' : 'Run async'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Page>
  );
}
