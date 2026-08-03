import { GptIcon } from '@/lib/featureVisuals';
import { setMentionLabels } from '@/lib/mentionCatalog';
import { cn } from '@/lib/utils';
import { Workflow as WorkflowIcon } from 'lucide-react';
import React, {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import { useRecoilValue } from 'recoil';

import {
  ChainlitContext,
  ICommand,
  commandsState
} from '@chainlit/react-client';

import AutoResizeTextarea from '@/components/AutoResizeTextarea';
import Icon from '@/components/Icon';
import {
  Command,
  CommandGroup,
  CommandItemAnimated,
  CommandListScrollable
} from '@/components/ui/command';

import { useCommandNavigation } from '@/hooks/useCommandNavigation';

interface MentionItem {
  id: string;
  label: string;
  description: string;
  kind: 'gpt' | 'workflow';
  icon?: string;
}

type HighlightSegment = { text: string; highlight: boolean };

const buildHighlightSegments = (
  text: string,
  labels: string[]
): HighlightSegment[] => {
  if (!text) {
    return [{ text: '', highlight: false }];
  }
  const sorted = [...labels].sort((a, b) => b.length - a.length);
  const segments: HighlightSegment[] = [];
  let buffer = '';
  let i = 0;
  const lower = text.toLowerCase();
  while (i < text.length) {
    if (text[i] === '@') {
      const rest = lower.slice(i + 1);
      const match = sorted.find(
        (label) => label && rest.startsWith(label.toLowerCase())
      );
      if (match) {
        if (buffer) {
          segments.push({ text: buffer, highlight: false });
          buffer = '';
        }
        segments.push({
          text: text.slice(i, i + 1 + match.length),
          highlight: true
        });
        i += 1 + match.length;
        continue;
      }
    }
    buffer += text[i];
    i += 1;
  }
  if (buffer) {
    segments.push({ text: buffer, highlight: false });
  }
  return segments;
};

const getActiveMention = (
  text: string,
  caret: number
): { query: string; start: number } | null => {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at === -1) {
    return null;
  }
  // Only trigger when @ starts a word and the token has no whitespace yet.
  const charBefore = at > 0 ? before[at - 1] : ' ';
  if (charBefore !== ' ' && charBefore !== '\n') {
    return null;
  }
  const token = before.slice(at + 1);
  if (/\s/.test(token)) {
    return null;
  }
  return { query: token.toLowerCase(), start: at };
};

interface Props {
  id?: string;
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
  selectedCommand?: ICommand;
  setSelectedCommand: (command: ICommand | undefined) => void;
  onChange: (value: string) => void;
  onPaste?: (event: any) => void;
  onEnter?: () => void;
}

export interface InputMethods {
  reset: () => void;
  setValueExtern: (value: string) => void;
}

const Input = forwardRef<InputMethods, Props>(
  (
    {
      placeholder,
      id,
      className,
      autoFocus,
      selectedCommand,
      setSelectedCommand,
      onChange,
      onEnter,
      onPaste
    },
    ref
  ) => {
    const apiClient = useContext(ChainlitContext) as any;
    const commands = useRecoilValue(commandsState);
    const [isComposing, setIsComposing] = useState(false);
    const [showCommands, setShowCommands] = useState(false);
    const [commandInput, setCommandInput] = useState('');
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    const [mentionItems, setMentionItems] = useState<MentionItem[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStart, setMentionStart] = useState(0);

    useEffect(() => {
      let active = true;
      const load = async () => {
        try {
          const [gpts, workflows] = await Promise.all([
            apiClient.listGpts?.() ?? Promise.resolve([]),
            apiClient.listWorkflows?.() ?? Promise.resolve([])
          ]);
          if (!active) return;
          const items: MentionItem[] = [
            ...(gpts || []).map((gpt: any) => ({
              id: gpt.id,
              label: gpt.name,
              description: gpt.description || 'Custom GPT',
              kind: 'gpt' as const,
              icon: gpt.icon
            })),
            ...(workflows || []).map((wf: any) => ({
              id: wf.id,
              label: wf.name,
              description: wf.description || 'Workflow',
              kind: 'workflow' as const
            }))
          ];
          setMentionItems(items);
          setMentionLabels(items.map((item) => item.label));
        } catch {
          // Mentions are an optional enhancement; ignore load failures.
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [apiClient]);

    const filteredMentions = mentionItems
      .filter((item) => item.label.toLowerCase().includes(mentionQuery))
      .slice(0, 8);

    const highlightSegments = buildHighlightSegments(
      value,
      mentionItems.map((item) => item.label)
    );
    const hasMentionHighlight = highlightSegments.some(
      (segment) => segment.highlight
    );

    const syncBackdropScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
      if (backdropRef.current) {
        backdropRef.current.scrollTop = event.currentTarget.scrollTop;
        backdropRef.current.scrollLeft = event.currentTarget.scrollLeft;
      }
    };

    const normalizedInput = commandInput.toLowerCase().slice(1);

    const filteredCommands = commands
      .filter((command) => command.id.toLowerCase().includes(normalizedInput))
      .sort((a, b) => {
        const indexA = a.id.toLowerCase().indexOf(normalizedInput);
        const indexB = b.id.toLowerCase().indexOf(normalizedInput);
        return indexA - indexB;
      });

    const {
      selectedIndex,
      handleMouseMove,
      handleMouseLeave,
      handleKeyDown: navigationKeyDown
    } = useCommandNavigation({
      items: filteredCommands,
      isOpen: showCommands,
      onSelect: (command) => {
        handleCommandSelect(command);
      },
      onClose: () => {
        setShowCommands(false);
        setCommandInput('');
      }
    });

    const handleMentionSelect = (item: MentionItem) => {
      const caret = textareaRef.current?.selectionStart ?? value.length;
      const newValue =
        value.slice(0, mentionStart) +
        '@' +
        item.label +
        ' ' +
        value.slice(caret);
      setShowMentions(false);
      setMentionQuery('');
      setValue(newValue);
      onChange(newValue);
      const nextCaret = mentionStart + item.label.length + 2;
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
      }, 0);
    };

    const {
      selectedIndex: mentionIndex,
      handleMouseMove: handleMentionMouseMove,
      handleMouseLeave: handleMentionMouseLeave,
      handleKeyDown: mentionNavigationKeyDown
    } = useCommandNavigation({
      items: filteredMentions,
      isOpen: showMentions,
      onSelect: (item) => handleMentionSelect(item as MentionItem),
      onClose: () => {
        setShowMentions(false);
        setMentionQuery('');
      }
    });

    const reset = () => {
      setValue('');
      if (!selectedCommand?.persistent) {
        setSelectedCommand(undefined);
      }
      setCommandInput('');
      setShowCommands(false);
      setShowMentions(false);
      setMentionQuery('');
      onChange('');
    };

    useImperativeHandle(ref, () => ({
      reset,
      setValueExtern: (value: string) => {
        setValue(value);
        onChange(value);
      }
    }));

    useEffect(() => {
      if (textareaRef.current && autoFocus) {
        textareaRef.current.focus();
      }
    }, [autoFocus]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onChange(newValue);

      // Command detection for dropdown
      const words = newValue.split(' ');
      if (words.length === 1 && words[0].startsWith('/')) {
        setShowCommands(true);
        setCommandInput(words[0]);
      } else {
        setShowCommands(false);
        setCommandInput('');
      }

      // @-mention detection (GPTs + workflows)
      const caret = e.target.selectionStart ?? newValue.length;
      const mention = getActiveMention(newValue, caret);
      if (mention) {
        setShowMentions(true);
        setMentionQuery(mention.query);
        setMentionStart(mention.start);
      } else {
        setShowMentions(false);
        setMentionQuery('');
      }
    };

    const handleCommandSelect = (command: ICommand) => {
      setShowCommands(false);
      setSelectedCommand(command);

      // Remove the command text from the input
      const newValue = value.replace(commandInput, '').trimStart();
      setValue(newValue);
      onChange(newValue);

      setCommandInput('');

      // Focus back on textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle @-mention selection first when its dropdown is open.
      if (showMentions && filteredMentions.length > 0) {
        mentionNavigationKeyDown(e);
        if (e.defaultPrevented) {
          return;
        }
      }

      // Handle command selection - check this FIRST before other key handling
      if (showCommands && filteredCommands.length > 0) {
        navigationKeyDown(e);
        // If the navigation handled the key, don't process further
        if (e.defaultPrevented) {
          return;
        }
      }

      // Handle regular enter only if no dropdown is actually visible
      if (
        e.key === 'Enter' &&
        !e.shiftKey &&
        onEnter &&
        !isComposing &&
        !(showCommands && filteredCommands.length > 0) &&
        !(showMentions && filteredMentions.length > 0)
      ) {
        e.preventDefault();
        onEnter();
      }
    };

    return (
      <div className="relative w-full">
        {hasMentionHighlight && (
          <div
            ref={backdropRef}
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 z-0 overflow-hidden whitespace-pre-wrap break-words text-transparent',
              className
            )}
            style={{ maxHeight: 250 }}
          >
            {highlightSegments.map((segment, index) =>
              segment.highlight ? (
                <span
                  key={index}
                  className="rounded bg-primary/15 text-primary ring-1 ring-primary/20"
                >
                  {segment.text}
                </span>
              ) : (
                <span key={index}>{segment.text}</span>
              )
            )}
            {'\u200b'}
          </div>
        )}
        <AutoResizeTextarea
          ref={textareaRef}
          id={id}
          autoFocus={autoFocus}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={syncBackdropScroll}
          onPaste={onPaste}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          className={cn(
            'relative z-10 w-full resize-none bg-transparent placeholder:text-muted-foreground focus:outline-none',
            className
          )}
          maxHeight={250}
        />

        {showMentions && filteredMentions.length > 0 && (
          <div
            className="absolute z-50 left-0 bottom-full mb-3 animate-slide-up"
            onMouseLeave={handleMentionMouseLeave}
          >
            <Command className="rounded-lg border shadow-md bg-background w-80">
              <CommandListScrollable maxItems={6} className="custom-scrollbar">
                <CommandGroup className="p-2" heading="GPTs & Workflows">
                  {filteredMentions.map((item, index) => (
                    <CommandItemAnimated
                      key={`${item.kind}-${item.id}`}
                      index={index}
                      isSelected={index === mentionIndex}
                      onMouseMove={() => handleMentionMouseMove(index)}
                      onSelect={() => handleMentionSelect(item)}
                      className="command-item space-x-2"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {item.kind === 'gpt' ? (
                          <GptIcon name={item.icon} className="h-4 w-4" />
                        ) : (
                          <WorkflowIcon className="h-4 w-4" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.label}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {item.kind === 'gpt' ? 'GPT' : 'Workflow'} ·{' '}
                          {item.description}
                        </div>
                      </div>
                    </CommandItemAnimated>
                  ))}
                </CommandGroup>
              </CommandListScrollable>
            </Command>
          </div>
        )}

        {showCommands && filteredCommands.length > 0 && (
          <div
            className="absolute z-50 left-0 bottom-full mb-3 animate-slide-up"
            onMouseLeave={handleMouseLeave}
          >
            <Command className="rounded-lg border shadow-md bg-background">
              <CommandListScrollable maxItems={5} className="custom-scrollbar">
                <CommandGroup className="p-2">
                  {filteredCommands.map((command, index) => (
                    <CommandItemAnimated
                      key={command.id}
                      index={index}
                      isSelected={index === selectedIndex}
                      onMouseMove={() => handleMouseMove(index)}
                      onSelect={() => handleCommandSelect(command)}
                      className="command-item space-x-2"
                    >
                      <Icon
                        name={command.icon}
                        className={cn(
                          '!size-5 text-muted-foreground transition-transform duration-150',
                          index === selectedIndex && 'scale-110'
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{command.id}</div>
                        <div className="text-sm text-muted-foreground">
                          {command.description}
                        </div>
                      </div>
                    </CommandItemAnimated>
                  ))}
                </CommandGroup>
              </CommandListScrollable>
            </Command>
          </div>
        )}
      </div>
    );
  }
);

export default Input;
