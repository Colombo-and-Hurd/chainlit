import { apiClient } from '@/api';
import { DocxMarkdownTextStyle } from '@/extensions/docxMarkdownTextStyle';
import { cn } from '@/lib/utils';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { FontFamily, FontSize } from '@tiptap/extension-text-style';
import UnderlineExtension from '@tiptap/extension-underline';
import { Markdown as TiptapMarkdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { renderAsync } from 'docx-preview';
import {
  Bold,
  Download,
  Grid3X3,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Underline as UnderlineIcon,
  Undo2
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { IStep, useChatInteract, useConfig } from '@chainlit/react-client';

import { Pencil } from '@/components/icons/Pencil';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const TAB_EQUIVALENT = '\u00A0\u00A0\u00A0\u00A0';
const TAB_INPUT_CHARACTER = '\t';
const PREVIEW_DEBOUNCE_MS = 450;
const DEFAULT_DOCX_FONT = 'Times New Roman';
const DEFAULT_DOCX_FONT_SIZE_PT = 12;
const DOCX_FONT_OPTIONS = [
  'Times New Roman',
  'Calibri',
  'Cambria',
  'Georgia',
  'Arial',
  'Helvetica',
  'Verdana',
  'Tahoma',
  'Garamond',
  'Century Gothic',
  'Book Antiqua',
  'Palatino Linotype',
  'Constantia',
  'Corbel',
  'Courier New',
  'Segoe UI',
  'Lucida Sans Unicode'
] as const;
const DOCX_FONT_SIZE_OPTIONS = [10, 11, 12, 13, 14] as const;

const toolbarButtonClass = (active: boolean) =>
  cn('h-8 w-8 p-0', active && 'bg-muted text-foreground');

const normalizeEditorMarkdown = (markdown: string) => {
  return markdown.replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ');
};

const preserveIndentationForChat = (markdown: string) => {
  return normalizeEditorMarkdown(markdown)
    .split('\n')
    .map((line) => {
      const lineWithTabs = line.replace(/\t/g, TAB_EQUIVALENT);
      const leadingSpacesMatch = lineWithTabs.match(/^ +/);

      if (!leadingSpacesMatch) {
        return lineWithTabs;
      }

      const leadingSpaces = leadingSpacesMatch[0];
      return (
        '\u00A0'.repeat(leadingSpaces.length) +
        lineWithTabs.slice(leadingSpaces.length)
      );
    })
    .join('\n');
};

interface Props {
  message: IStep;
}

export const EditAssistantResponseButton = ({ message }: Props) => {
  const { config } = useConfig();
  const { editAssistantMessage } = useChatInteract();

  const editorEnabled = !!config?.features?.assistant_message_edit;
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSplitPreview, setIsSplitPreview] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [draftMarkdown, setDraftMarkdown] = useState('');
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [docxFontName, setDocxFontName] = useState<string>(DEFAULT_DOCX_FONT);
  const [docxFontSizePt, setDocxFontSizePt] = useState<number>(
    DEFAULT_DOCX_FONT_SIZE_PT
  );
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewRequestVersionRef = useRef(0);
  const editor = useEditor({
    extensions: [
      StarterKit,
      DocxMarkdownTextStyle,
      FontFamily.configure({
        types: ['textStyle']
      }),
      FontSize.configure({
        types: ['textStyle']
      }),
      UnderlineExtension,
      Link.configure({
        openOnClick: false,
        autolink: true
      }),
      Table.configure({
        resizable: true,
        renderWrapper: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      TiptapMarkdown.configure({
        markedOptions: {
          gfm: true
        }
      })
    ],
    content: '',
    immediatelyRender: false,
    onUpdate({ editor }) {
      setDraftMarkdown(editor.getMarkdown());
    }
  });

  useEffect(() => {
    if (!editor || !isOpen) {
      return;
    }

    const initialMarkdown = normalizeEditorMarkdown(message.output || '');
    editor.commands.setContent(initialMarkdown, {
      contentType: 'markdown'
    });
    setDraftMarkdown(initialMarkdown);
  }, [editor, isOpen, message.output]);

  useEffect(() => {
    if (!isOpen || !isSplitPreview) {
      return;
    }

    const content = normalizeEditorMarkdown(draftMarkdown || ' ');
    const requestVersion = previewRequestVersionRef.current + 1;
    previewRequestVersionRef.current = requestVersion;
    const abortController = new AbortController();

    const timerId = window.setTimeout(async () => {
      try {
        setIsPreviewLoading(true);
        setPreviewError(null);
        const response = await fetch(
          apiClient.buildEndpoint('/api/documents/preview-docx'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              markdown: content,
              body_font_name: docxFontName,
              body_font_size_pt: docxFontSizePt
            }),
            signal: abortController.signal
          }
        );

        if (!response.ok) {
          throw new Error('Unable to render DOCX preview.');
        }

        const docxBuffer = await response.arrayBuffer();
        if (
          requestVersion !== previewRequestVersionRef.current ||
          !previewContainerRef.current
        ) {
          return;
        }

        const blob = new Blob([docxBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        setDocxBlob(blob);

        previewContainerRef.current.innerHTML = '';
        await renderAsync(docxBuffer, previewContainerRef.current, undefined, {
          className: 'docx',
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setPreviewError(
          error instanceof Error
            ? error.message
            : 'Unable to render DOCX preview.'
        );
      } finally {
        if (requestVersion === previewRequestVersionRef.current) {
          setIsPreviewLoading(false);
        }
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timerId);
      abortController.abort();
    };
  }, [draftMarkdown, docxFontName, docxFontSizePt, isOpen, isSplitPreview]);

  useEffect(() => {
    if (!editor || !isOpen) {
      return;
    }

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      event.preventDefault();

      if (editor.isActive('table')) {
        if (event.shiftKey) {
          editor.chain().focus().goToPreviousCell().run();
          return;
        }
        editor.chain().focus().goToNextCell().run();
        return;
      }

      if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
        if (event.shiftKey) {
          editor.chain().focus().liftListItem('listItem').run();
          return;
        }
        editor.chain().focus().sinkListItem('listItem').run();
        return;
      }

      editor.chain().focus().insertContent(TAB_INPUT_CHARACTER).run();
    };

    const editorDom = editor.view.dom;
    editorDom.addEventListener('keydown', handleTabKey);

    return () => {
      editorDom.removeEventListener('keydown', handleTabKey);
    };
  }, [editor, isOpen]);

  if (!editorEnabled || message.streaming) {
    return null;
  }

  const save = async () => {
    if (!editor || isSaving) {
      return;
    }

    const markdownValue = preserveIndentationForChat(
      editor.getMarkdown().trim()
    );

    if (!markdownValue) {
      toast.error('Edited response cannot be empty.');
      return;
    }

    setIsSaving(true);
    const success = await editAssistantMessage(message, markdownValue);
    setIsSaving(false);

    if (!success) {
      toast.error('Failed to save edited response.');
      return;
    }

    toast.success('Response updated.');
    setIsOpen(false);
  };

  const downloadPreviewDocx = () => {
    if (!docxBlob) {
      toast.error('DOCX preview is not ready yet.');
      return;
    }
    const objectUrl = URL.createObjectURL(docxBlob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `assistant-preview-${Date.now()}.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setIsFullscreen(false);
          setIsSplitPreview(true);
        }
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="edit-assistant-message-button"
        onClick={() => setIsOpen(true)}
        aria-label="Edit response"
        title="Edit response"
      >
        <Pencil />
      </Button>
      <DialogContent
        className={cn(
          'flex flex-col',
          isFullscreen
            ? '!inset-0 !m-0 !translate-x-0 !translate-y-0 rounded-none sm:rounded-none'
            : 'w-[92vw] h-[82vh] max-w-[1500px]'
        )}
        style={
          isFullscreen
            ? {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                maxWidth: '100vw',
                height: '100dvh',
                maxHeight: '100dvh',
                transform: 'none'
              }
            : undefined
        }
      >
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Editor</DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsSplitPreview((value) => !value)}
                aria-label={isSplitPreview ? 'Hide preview' : 'Show preview'}
                title={isSplitPreview ? 'Hide preview' : 'Show preview'}
              >
                {isSplitPreview ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsFullscreen((value) => !value)}
                aria-label={isFullscreen ? 'Restore size' : 'Maximize'}
                title={isFullscreen ? 'Restore size' : 'Maximize'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 p-1">
          <Select value={docxFontName} onValueChange={setDocxFontName}>
            <SelectTrigger
              className="h-8 w-[170px] text-xs"
              aria-label="Document font"
            >
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {DOCX_FONT_OPTIONS.map((fontName) => (
                <SelectItem key={fontName} value={fontName}>
                  {fontName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(docxFontSizePt)}
            onValueChange={(value) => setDocxFontSizePt(Number(value))}
          >
            <SelectTrigger
              className="h-8 w-[72px] text-xs"
              aria-label="Document font size"
            >
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {DOCX_FONT_SIZE_OPTIONS.map((fontSize) => (
                <SelectItem key={fontSize} value={String(fontSize)}>
                  {fontSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .setFontFamily(docxFontName)
                .setFontSize(`${docxFontSizePt}pt`)
                .run()
            }
            title="Apply font and size to selection (included in Markdown and DOCX)"
          >
            Apply font
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={toolbarButtonClass(!!editor?.isActive('bold'))}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            aria-label="Bold"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={toolbarButtonClass(!!editor?.isActive('italic'))}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            aria-label="Italic"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={toolbarButtonClass(!!editor?.isActive('underline'))}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            aria-label="Underline"
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={toolbarButtonClass(!!editor?.isActive('bulletList'))}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            aria-label="Bulleted list"
            title="Bulleted list"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={toolbarButtonClass(!!editor?.isActive('orderedList'))}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            aria-label="Numbered list"
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={toolbarButtonClass(
              !!editor?.isActive('heading', { level: 2 })
            )}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            aria-label="Heading 2"
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={toolbarButtonClass(!!editor?.isActive('link'))}
            onClick={() => {
              if (!editor) {
                return;
              }
              const previousUrl = editor.getAttributes('link').href as
                | string
                | undefined;
              const url = window.prompt('Enter URL', previousUrl || '');
              if (url === null) {
                return;
              }
              if (!url.trim()) {
                editor.chain().focus().unsetLink().run();
                return;
              }
              editor
                .chain()
                .focus()
                .extendMarkRange('link')
                .setLink({ href: url })
                .run();
            }}
            aria-label="Link"
            title="Link"
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={toolbarButtonClass(false)}
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            aria-label="Insert table"
            title="Insert table"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={toolbarButtonClass(false)}
            onClick={() => editor?.chain().focus().undo().run()}
            aria-label="Undo"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={toolbarButtonClass(false)}
            onClick={() => editor?.chain().focus().redo().run()}
            aria-label="Redo"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        <div
          className={cn(
            'grid gap-3',
            isSplitPreview
              ? isFullscreen
                ? 'lg:grid-cols-2'
                : 'xl:grid-cols-2'
              : 'grid-cols-1',
            isFullscreen ? 'flex-1 min-h-0' : 'min-h-[320px] max-h-[60vh]'
          )}
        >
          <div
            className={cn(
              'assistant-editable-surface min-w-0 overflow-auto border rounded-md p-4 min-h-[320px]',
              isFullscreen && 'h-full min-h-0'
            )}
          >
            <div
              className={cn(
                'assistant-editable-content prose prose-invert max-w-none min-h-[280px]',
                isFullscreen && 'h-full min-h-0'
              )}
              style={{
                fontFamily: docxFontName,
                fontSize: `${docxFontSizePt}pt`
              }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
          {isSplitPreview ? (
            <div
              className={cn(
                'assistant-docx-preview min-w-0 relative overflow-auto border rounded-md p-3 min-h-[320px] bg-muted/10',
                isFullscreen && 'h-full min-h-0'
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Generated DOCX
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={downloadPreviewDocx}
                  disabled={!docxBlob || isPreviewLoading}
                  aria-label="Download DOCX"
                  title="Download DOCX"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <div ref={previewContainerRef} className="assistant-docx-pages" />
              {isPreviewLoading ? (
                <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                  Rendering DOCX...
                </div>
              ) : null}
              {previewError ? (
                <div className="absolute bottom-2 left-2 text-xs text-destructive">
                  {previewError}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
