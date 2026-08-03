import { GptBadge } from '@/lib/featureVisuals';
import { writePendingGptProfile } from '@/lib/pendingGptProfile';
import { Copy, MessageSquare, Pencil, Plus, Sparkles } from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import Page from 'pages/Page';

import {
  ChainlitContext,
  useChatInteract,
  useChatSession
} from '@chainlit/react-client';

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

import type { GptRecord } from '@/types/gpts';

function GptCardHeader({ gpt }: { gpt: GptRecord }) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-start gap-3">
        <GptBadge
          name={gpt.icon}
          className="h-11 w-11"
          iconClassName="h-5 w-5"
        />
        <div className="min-w-0">
          <CardTitle className="text-lg leading-tight">{gpt.name}</CardTitle>
          <CardDescription className="mt-1 line-clamp-2">
            {gpt.description || 'No description yet'}
          </CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

function GptCardSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
      <CardFooter className="gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </CardFooter>
    </Card>
  );
}

function GptMetaLine({ gpt }: { gpt: GptRecord }) {
  const files = gpt.knowledge.length;
  const starters = gpt.conversation_starters.length;
  return (
    <CardContent className="pt-0 text-sm text-muted-foreground">
      {files} document{files === 1 ? '' : 's'} · {starters} starter
      {starters === 1 ? '' : 's'}
    </CardContent>
  );
}

export default function GptsPage() {
  const apiClient = useContext(ChainlitContext) as any;
  const navigate = useNavigate();
  const { setChatProfile } = useChatSession();
  const { clear } = useChatInteract();
  const [gpts, setGpts] = useState<GptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const items = await apiClient.listGpts();
      setGpts(items);
    } catch (error) {
      toast.error(String(error));
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

  const startChat = (gpt: GptRecord) => {
    writePendingGptProfile(gpt);
    setChatProfile(`gpt:${gpt.id}`);
    clear();
    navigate('/');
  };

  const customize = async (gpt: GptRecord) => {
    setCloningId(gpt.id);
    try {
      const copy = await apiClient.cloneGpt(gpt.id);
      toast.success(`Added "${copy.name}" to your Agents.`);
      navigate(`/gpts/${copy.id}/edit`, {
        state: { gpt: copy }
      });
    } catch (error) {
      toast.error(String(error));
    } finally {
      setCloningId(null);
    }
  };

  return (
    <Page>
      <div className="w-full overflow-auto p-6 md:p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="flex flex-col gap-4 rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Create focused helpers for recurring work — client updates,
                lease questions, outreach drafts, and more. Describe the job in
                plain English; Merlin writes the rest.
              </p>
            </div>
            <Button size="lg" onClick={() => navigate('/gpts/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create agent
            </Button>
          </div>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">My agents</h2>
              <p className="text-sm text-muted-foreground">
                Your private assistants. Start a chat or keep editing.
              </p>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <GptCardSkeleton />
                <GptCardSkeleton />
              </div>
            ) : privateGpts.length === 0 ? (
              <div className="rounded-3xl border border-dashed px-6 py-12 text-center">
                <p className="text-base font-medium">No custom agents yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Create one from scratch, or customize an example below to make
                  it your own.
                </p>
                <Button className="mt-5" onClick={() => navigate('/gpts/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first agent
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {privateGpts.map((gpt) => (
                  <Card key={gpt.id} className="rounded-2xl">
                    <GptCardHeader gpt={gpt} />
                    <GptMetaLine gpt={gpt} />
                    <CardFooter className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(`/gpts/${gpt.id}/edit`, {
                            state: { gpt }
                          })
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button onClick={() => startChat(gpt)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Chat
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Starter examples</h2>
              <p className="text-sm text-muted-foreground">
                Built for Colombo &amp; Hurd writers, sales, paralegals, and
                attorneys. Try instantly, or customize a copy.
              </p>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <GptCardSkeleton />
                <GptCardSkeleton />
              </div>
            ) : exampleGpts.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No examples are available yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {exampleGpts.map((gpt) => (
                  <Card key={gpt.id} className="rounded-2xl">
                    <GptCardHeader gpt={gpt} />
                    <GptMetaLine gpt={gpt} />
                    <CardFooter className="flex gap-2">
                      <Button onClick={() => startChat(gpt)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Chat
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => customize(gpt)}
                        disabled={cloningId === gpt.id}
                      >
                        {cloningId === gpt.id ? (
                          <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        {cloningId === gpt.id ? 'Adding...' : 'Customize'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </Page>
  );
}
