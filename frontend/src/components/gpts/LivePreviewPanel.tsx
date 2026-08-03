import { GptBadge } from '@/lib/featureVisuals';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PreviewChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LivePreviewPanelProps {
  agentName: string;
  agentDescription: string;
  icon: string;
  instructionSummary: string;
  hasInstructions: boolean;
  knowledgeCount: number;
  starterCount: number;
  messages: PreviewChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  suggestedQuestions: string[];
}

export function LivePreviewPanel({
  agentName,
  agentDescription,
  icon,
  instructionSummary,
  hasInstructions,
  knowledgeCount,
  starterCount,
  messages,
  draft,
  onDraftChange,
  onSend,
  isSending,
  suggestedQuestions
}: LivePreviewPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const displayName = agentName.trim() || 'Untitled agent';
  const displayDescription =
    agentDescription.trim() ||
    instructionSummary.trim() ||
    'Type a name and description on the left — this card updates as you type.';

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [messages, isSending]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSend();
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-muted/10">
      <div className="border-b px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Live preview
        </p>
        <div className="mt-3 flex items-start gap-3">
          <GptBadge
            name={icon}
            className="h-11 w-11 shrink-0"
            iconClassName="h-5 w-5"
          />
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-base font-semibold">{displayName}</h2>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {displayDescription}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border bg-background px-2.5 py-1">
            {hasInstructions ? 'Instructions ready' : 'Needs instructions'}
          </span>
          <span className="rounded-full border bg-background px-2.5 py-1">
            {knowledgeCount
              ? `${knowledgeCount} knowledge file${knowledgeCount === 1 ? '' : 's'}`
              : 'No documents yet'}
          </span>
          <span className="rounded-full border bg-background px-2.5 py-1">
            {starterCount
              ? `${starterCount} starter${starterCount === 1 ? '' : 's'}`
              : 'No starters'}
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-4"
      >
        {!hasInstructions ? (
          <div className="rounded-2xl border border-dashed px-4 py-8 text-center">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Try it here after generating</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The card above follows your name and description. After you
              generate instructions, ask a sample question here.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-3">
            <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
              Ask a sample question to see how {displayName} would respond with
              the current draft.
            </div>
            {suggestedQuestions.length ? (
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onDraftChange(question)}
                    className="rounded-full border bg-background px-3 py-1.5 text-left text-xs hover:bg-accent"
                  >
                    {question}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === 'user'
                  ? 'ml-6 rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground'
                  : 'mr-6 rounded-2xl border bg-background px-3 py-2 text-sm leading-relaxed'
              }
            >
              {message.content}
            </div>
          ))
        )}
        {isSending ? (
          <div className="mr-6 inline-flex items-center gap-2 rounded-2xl border bg-background px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking...
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="border-t bg-background p-4">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={
              hasInstructions
                ? 'Ask a sample question...'
                : 'Generate instructions first'
            }
            disabled={!hasInstructions || isSending}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!hasInstructions || isSending || !draft.trim()}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Preview uses draft instructions. Knowledge search works after files
          are saved and indexed.
        </p>
      </form>
    </aside>
  );
}
