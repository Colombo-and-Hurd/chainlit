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

import type { WorkflowRunRecord } from '@/types/workflows';

const isCompletedStatus = (status: string) =>
  ['succeeded', 'failed', 'cancelled', 'failed_retryable'].includes(status);

export default function WorkflowRunsPage() {
  const apiClient = useContext(ChainlitContext) as any;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workflowFilter = searchParams.get('workflow_id') || undefined;

  const [isLoading, setIsLoading] = useState(true);
  const [runs, setRuns] = useState<WorkflowRunRecord[]>([]);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const items = await apiClient.listWorkflowRuns(workflowFilter);
      setRuns(items);
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [workflowFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [workflowFilter]);

  const runningCount = useMemo(
    () =>
      runs.filter((run) => run.status === 'running' || run.status === 'queued')
        .length,
    [runs]
  );

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
              Back to Workflows
            </Button>
            <Button variant="outline" disabled>
              Cron - Coming soon
            </Button>
            <Button onClick={refresh}>Refresh</Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Active runs: {runningCount}
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading runs...</div>
        ) : runs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No runs yet.</div>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <Card key={run.id}>
                <CardHeader>
                  <CardTitle className="text-lg">Run {run.id}</CardTitle>
                  <CardDescription>
                    Status: {run.status} | Workflow: {run.workflow_id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Started: {run.started_at || '-'} | Finished:{' '}
                    {run.finished_at || '-'}
                  </div>
                  <pre className="text-xs p-3 rounded-md bg-muted overflow-auto max-h-48">
                    {JSON.stringify(run.final_output || {}, null, 2)}
                  </pre>
                  {run.error ? (
                    <pre className="text-xs p-3 rounded-md bg-muted overflow-auto max-h-32">
                      {JSON.stringify(run.error, null, 2)}
                    </pre>
                  ) : null}
                </CardContent>
                <CardFooter className="flex gap-2">
                  {!isCompletedStatus(run.status) ? (
                    <Button variant="outline" onClick={() => onCancel(run.id)}>
                      Cancel
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => onChat(run.id)}
                    disabled={!isCompletedStatus(run.status)}
                  >
                    Chat
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
