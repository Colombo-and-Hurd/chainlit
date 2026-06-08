import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

import type { WorkflowRecord } from '@/types/workflows';

export default function WorkflowsPage() {
  const apiClient = useContext(ChainlitContext) as any;
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const items = await apiClient.listWorkflows();
      setWorkflows(items);
    } finally {
      setIsLoading(false);
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
              Runs Inbox
            </Button>
            <Button onClick={() => navigate('/workflows/new')}>
              Create Workflow
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">
            Loading workflows...
          </div>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-medium">My Workflows</h2>
          {privateWorkflows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No workflows yet. Create one to start automating.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {privateWorkflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <CardDescription>
                      {workflow.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div>Nodes: {workflow.nodes.length}</div>
                    <div>Edges: {workflow.edges.length}</div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/workflows/${workflow.id}`)}
                    >
                      Open Builder
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/workflows/runs?workflow_id=${workflow.id}`)
                      }
                    >
                      View Runs
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Examples</h2>
          {exampleWorkflows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No example workflows yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {exampleWorkflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <CardDescription>
                      {workflow.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div>Nodes: {workflow.nodes.length}</div>
                    <div>Edges: {workflow.edges.length}</div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/workflows/${workflow.id}`)}
                    >
                      Open Builder
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
