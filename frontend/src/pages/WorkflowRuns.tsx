import { RunStatusBadge } from '@/lib/featureVisuals';
import { ArrowLeft, MessageSquare, RefreshCw, XCircle } from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Skeleton } from '@/components/ui/skeleton';
import RunStepTimeline from '@/components/workflow/RunStepTimeline';

import type { WorkflowRecord, WorkflowRunRecord } from '@/types/workflows';

const isCompletedStatus = (status: string) =>
  ['succeeded', 'failed', 'cancelled', 'failed_retryable'].includes(status);

export default function WorkflowRunsPage() {
  const apiClient = useContext(ChainlitContext) as any;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workflowFilter = searchParams.get('workflow_id') || undefined;

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [runs, setRuns] = useState<WorkflowRunRecord[]>([]);
  const [workflowsById, setWorkflowsById] = useState<
    Record<string, WorkflowRecord>
  >({});

  const refresh = async ({ showInitialLoader = false } = {}) => {
    if (showInitialLoader) {
      setIsInitialLoading(true);
    }
    try {
      const items = await apiClient.listWorkflowRuns(workflowFilter);
      setRuns(items);
    } catch (error) {
      toast.error(String(error));
    } finally {
      if (showInitialLoader) {
        setIsInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    refresh({ showInitialLoader: true });
  }, [workflowFilter]);

  useEffect(() => {
    apiClient
      .listWorkflows()
      .then((items: WorkflowRecord[]) => {
        const map: Record<string, WorkflowRecord> = {};
        items.forEach((item) => {
          map[item.id] = item;
        });
        setWorkflowsById(map);
      })
      .catch(() => undefined);
  }, []);

  const runningCount = useMemo(
    () =>
      runs.filter((run) => run.status === 'running' || run.status === 'queued')
        .length,
    [runs]
  );

  useEffect(() => {
    if (runningCount === 0) {
      return;
    }
    const interval = setInterval(() => {
      refresh();
    }, 2500);
    return () => clearInterval(interval);
  }, [workflowFilter, runningCount]);

  const onCancel = async (runId: string) => {
    try {
      await apiClient.cancelWorkflowRun(runId);
      await refresh();
      toast.success('Run cancellation requested.');
    } catch (error) {
      toast.error(String(error));
    }
  };

  const onChat = async (runId: string) => {
    try {
      const payload = await apiClient.handoffWorkflowRunToChat(runId);
      navigate(`/thread/${payload.thread_id}`);
    } catch (error) {
      toast.error(String(error));
    }
  };

  return (
    <Page>
      <div className="w-full p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Workflow Runs</h1>
            <p className="text-sm text-muted-foreground">
              Track async runs and continue work in chat from completed outputs.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/workflows')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workflows
            </Button>
            <Button variant="outline" disabled>
              Cron - Coming soon
            </Button>
            <Button onClick={() => refresh()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Active runs: {runningCount}
        </div>

        {isInitialLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No runs yet.</div>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-mono">
                      Run {run.id.slice(0, 8)}
                    </CardTitle>
                    <RunStatusBadge status={run.status} />
                  </div>
                  <CardDescription>Workflow: {run.workflow_id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Started: {run.started_at || '-'} | Finished:{' '}
                    {run.finished_at || '-'}
                  </div>

                  {workflowsById[run.workflow_id] ? (
                    <RunStepTimeline
                      run={run}
                      nodes={workflowsById[run.workflow_id].nodes || []}
                      edges={workflowsById[run.workflow_id].edges || []}
                    />
                  ) : run.status === 'queued' || run.status === 'running' ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                      Running…
                    </div>
                  ) : null}

                  {run.status === 'succeeded' &&
                  (run.final_output as any)?.text ? (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        Final output
                      </div>
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                        {String((run.final_output as any).text)}
                      </pre>
                    </div>
                  ) : null}

                  {run.error ? (
                    <pre className="text-xs p-3 rounded-md bg-muted overflow-auto max-h-32">
                      {JSON.stringify(run.error, null, 2)}
                    </pre>
                  ) : null}
                </CardContent>
                <CardFooter className="flex gap-2">
                  {!isCompletedStatus(run.status) ? (
                    <Button variant="outline" onClick={() => onCancel(run.id)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => onChat(run.id)}
                    disabled={!isCompletedStatus(run.status)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat on output
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
