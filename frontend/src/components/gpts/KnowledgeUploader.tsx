import { FileUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { GptConversationStarter } from '@/types/gpts';

interface StarterListProps {
  starters: GptConversationStarter[];
  onChange: (starters: GptConversationStarter[]) => void;
}

export function StarterList({ starters, onChange }: StarterListProps) {
  const update = (
    index: number,
    field: keyof GptConversationStarter,
    value: string
  ) => {
    onChange(
      starters.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const remove = (index: number) => {
    if (starters.length <= 1) {
      onChange([{ label: '', message: '' }]);
      return;
    }
    onChange(starters.filter((_, itemIndex) => itemIndex !== index));
  };

  const add = () => {
    onChange([...starters, { label: '', message: '' }]);
  };

  return (
    <div className="space-y-3">
      {starters.map((starter, index) => (
        <div
          key={`starter-${index}`}
          className="rounded-xl border bg-background/50 p-3 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Button {index + 1}
            </p>
            <Button variant="ghost" size="sm" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            value={starter.label}
            onChange={(event) => {
              const label = event.target.value;
              const nextMessage =
                starter.message.trim() &&
                starter.message.trim() !== starter.label.trim()
                  ? starter.message
                  : label;
              onChange(
                starters.map((item, itemIndex) =>
                  itemIndex === index ? { label, message: nextMessage } : item
                )
              );
            }}
            placeholder="Summarize key terms"
          />
          <Input
            value={starter.message}
            onChange={(event) => update(index, 'message', event.target.value)}
            placeholder="Message sent when clicked"
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 h-4 w-4" />
        Add another button
      </Button>
    </div>
  );
}

interface KnowledgeUploaderProps {
  isEdit: boolean;
  isUploading: boolean;
  knowledgeFile: File | null;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  pendingFiles: { file_name: string }[];
  onRemovePending: (index: number) => void;
  uploadedFiles: {
    id: string;
    file_name: string;
    mime_type: string;
    statusLabel: string;
  }[];
  onRemoveUploaded: (id: string) => void;
}

export function KnowledgeUploader({
  isEdit,
  isUploading,
  knowledgeFile,
  onFileChange,
  onUpload,
  pendingFiles,
  onRemovePending,
  uploadedFiles,
  onRemoveUploaded
}: KnowledgeUploaderProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-6 text-center">
        <FileUp className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">
          Upload a PDF, Word doc, or text file
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This agent will answer from these files first.
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Input
            type="file"
            className="max-w-xs"
            onChange={(event) => onFileChange(event.target.files?.[0] || null)}
          />
          <Button
            variant="outline"
            onClick={onUpload}
            disabled={!knowledgeFile || isUploading}
          >
            {isUploading ? 'Uploading...' : isEdit ? 'Upload' : 'Add file'}
          </Button>
        </div>
        {knowledgeFile ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Selected: {knowledgeFile.name}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        {pendingFiles.map((item, index) => (
          <div
            key={`${item.file_name}-${index}`}
            className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
          >
            <div>
              <div className="font-medium">{item.file_name}</div>
              <div className="text-xs text-muted-foreground">
                Queued — uploads when you save
              </div>
            </div>
            <Button variant="ghost" onClick={() => onRemovePending(index)}>
              Remove
            </Button>
          </div>
        ))}

        {uploadedFiles.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
          >
            <div>
              <div className="font-medium">{item.file_name}</div>
              <div className="text-xs text-muted-foreground">
                {item.mime_type} · {item.statusLabel}
              </div>
            </div>
            <Button variant="ghost" onClick={() => onRemoveUploaded(item.id)}>
              Remove
            </Button>
          </div>
        ))}

        {pendingFiles.length === 0 && uploadedFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents yet. You can still save and add files later.
          </p>
        ) : null}
      </div>
    </div>
  );
}
