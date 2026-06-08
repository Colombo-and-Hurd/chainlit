import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Page from 'pages/Page';

import { ChainlitContext, useChatSession } from '@chainlit/react-client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import type { GptRecord } from '@/types/gpts';

export default function GptsPage() {
  const apiClient = useContext(ChainlitContext) as any;
  const navigate = useNavigate();
  const { setChatProfile } = useChatSession();
  const [gpts, setGpts] = useState<GptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const items = await apiClient.listGpts();
      setGpts(items);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const privateGpts = useMemo(
    () => gpts.filter((item) => item.visibility !== 'example'),
    [gpts]
  );
  const exampleGpts = useMemo(
    () => gpts.filter((item) => item.visibility === 'example'),
    [gpts]
  );

  const startChat = async (gpt: GptRecord) => {
    setChatProfile(`gpt:${gpt.id}`);
    navigate('/');
  };

  return (
    <Page>
      <div className="w-full p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">GPTs</h1>
            <p className="text-sm text-muted-foreground">
              Create specialized assistants with custom instructions, tools, and
              knowledge.
            </p>
          </div>
          <Button onClick={() => navigate('/gpts/new')}>Create GPT</Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading GPTs...</div>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-medium">My GPTs</h2>
          {privateGpts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No custom GPTs yet. Create one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {privateGpts.map((gpt) => (
                <Card key={gpt.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{gpt.name}</CardTitle>
                    <CardDescription>
                      {gpt.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>Model: {gpt.model || 'default'}</div>
                    <div>Tools: {gpt.tool_ids.length}</div>
                    <div>Knowledge files: {gpt.knowledge.length}</div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/gpts/${gpt.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button onClick={() => startChat(gpt)}>Chat</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Examples</h2>
          {exampleGpts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No examples are available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {exampleGpts.map((gpt) => (
                <Card key={gpt.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{gpt.name}</CardTitle>
                    <CardDescription>
                      {gpt.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>Model: {gpt.model || 'default'}</div>
                    <div>Tools: {gpt.tool_ids.length}</div>
                    <div>Knowledge files: {gpt.knowledge.length}</div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button onClick={() => startChat(gpt)}>Chat</Button>
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
