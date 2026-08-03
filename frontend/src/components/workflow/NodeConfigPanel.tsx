import { blockVisual } from '@/lib/featureVisuals';
import type { Node } from '@xyflow/react';
import { ArrowDownToLine, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { GptToolDescriptor } from '@/types/gpts';
import type { WorkflowBlockDescriptor } from '@/types/workflows';

interface FieldOption {
  value: string;
  label: string;
  enabled?: boolean;
}

interface FieldSchema {
  key: string;
  type: 'text' | 'textarea' | 'prompt' | 'select' | 'tool-select' | 'fields';
  label: string;
  placeholder?: string;
  options?: FieldOption[];
  visible_when?: Record<string, string>;
}

interface StructuredField {
  name: string;
  description: string;
}

interface Props {
  node: Node;
  block?: WorkflowBlockDescriptor;
  tools: GptToolDescriptor[];
  upstreamLabels: string[];
  onChange: (key: string, value: unknown) => void;
  onDelete: () => void;
}

const getData = (node: Node, key: string): unknown =>
  (node.data as Record<string, unknown> | undefined)?.[key];

export default function NodeConfigPanel({
  node,
  block,
  tools,
  upstreamLabels,
  onChange,
  onDelete
}: Props) {
  const blockId = String(getData(node, 'block_id') || 'agent');
  const visual = blockVisual(blockId);
  const NodeIcon = visual.icon;
  const fields = ((block?.config_schema as any)?.fields || []) as FieldSchema[];
  const isInput = blockId === 'input';

  const renderField = (field: FieldSchema) => {
    if (field.visible_when) {
      const matches = Object.entries(field.visible_when).every(
        ([key, expected]) => String(getData(node, key) || '') === expected
      );
      if (!matches) {
        return null;
      }
    }

    const value = String(getData(node, field.key) ?? '');

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <Textarea
              rows={3}
              placeholder={field.placeholder}
              value={value}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          </div>
        );
      case 'prompt':
        return (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <Textarea
              rows={4}
              placeholder={field.placeholder || 'Summarize: {input}'}
              value={value}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
            <VariableChips
              labels={upstreamLabels}
              onInsert={(token) =>
                onChange(field.key, `${value}${value ? ' ' : ''}${token}`)
              }
            />
          </div>
        );
      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <Select
              value={value}
              onValueChange={(next) => onChange(field.key, next)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={`Select ${field.label.toLowerCase()}`}
                />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.enabled === false}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'tool-select':
        return (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <Select
              value={value}
              onValueChange={(next) => onChange(field.key, next)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tool" />
              </SelectTrigger>
              <SelectContent>
                {tools.map((tool) => (
                  <SelectItem key={tool.id} value={tool.id}>
                    {tool.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tools.find((tool) => tool.id === value)?.description ||
                'Pick the tool this step should run.'}
            </p>
          </div>
        );
      case 'fields':
        return (
          <StructuredFieldsEditor
            key={field.key}
            label={field.label}
            fields={(getData(node, field.key) as StructuredField[]) || []}
            onChange={(next) => onChange(field.key, next)}
          />
        );
      case 'text':
      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <Input
              placeholder={field.placeholder}
              value={value}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <>
      <div
        className={`flex items-center gap-3 rounded-lg border p-2.5 ${visual.border}`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${visual.badge}`}
        >
          <NodeIcon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-sm font-medium">{visual.label}</div>
          <div className="text-xs text-muted-foreground">
            {visual.description}
          </div>
        </div>
      </div>

      {!isInput && (
        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          <ArrowDownToLine className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Receives:{' '}
            {upstreamLabels.length ? (
              upstreamLabels.map((labelText, index) => (
                <span key={labelText}>
                  <code className="rounded bg-primary/10 px-1 text-primary">
                    {`{${labelText}}`}
                  </code>
                  {index < upstreamLabels.length - 1 ? ', ' : ''}
                </span>
              ))
            ) : (
              <span>nothing yet — connect a node into this one.</span>
            )}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <Label>Label</Label>
        <Input
          value={String(getData(node, 'label') || '')}
          onChange={(event) => onChange('label', event.target.value)}
        />
        {!isInput && (
          <p className="text-xs text-muted-foreground">
            Other steps reference this step's output as{' '}
            <code className="rounded bg-primary/10 px-1 text-primary">
              {`{${String(getData(node, 'label') || 'Label')}}`}
            </code>
            .
          </p>
        )}
      </div>

      {fields.map(renderField)}

      <div className="border-t pt-3">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete node
        </Button>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Or press Delete / Backspace on a selected node.
        </p>
      </div>
    </>
  );
}

function VariableChips({
  labels,
  onInsert
}: {
  labels: string[];
  onInsert: (token: string) => void;
}) {
  const tokens = Array.from(new Set(['input', ...labels]));
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        Insert a variable (click to add):
      </p>
      <div className="flex flex-wrap gap-1">
        {tokens.map((token) => (
          <button
            key={token}
            type="button"
            className="rounded-full border bg-primary/5 px-2 py-0.5 text-xs text-primary transition hover:bg-primary/15"
            onClick={() => onInsert(`{${token}}`)}
          >
            {`{${token}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function StructuredFieldsEditor({
  label,
  fields,
  onChange
}: {
  label: string;
  fields: StructuredField[];
  onChange: (next: StructuredField[]) => void;
}) {
  const update = (index: number, key: keyof StructuredField, value: string) => {
    const next = fields.map((field, i) =>
      i === index ? { ...field, [key]: value } : field
    );
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={index} className="space-y-1 rounded-md border p-2">
            <div className="flex gap-2">
              <Input
                className="h-8"
                placeholder="field name (e.g. summary)"
                value={field.name || ''}
                onChange={(event) => update(index, 'name', event.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onChange(fields.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input
              className="h-8"
              placeholder="description (optional)"
              value={field.description || ''}
              onChange={(event) =>
                update(index, 'description', event.target.value)
              }
            />
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onChange([...fields, { name: '', description: '' }])}
      >
        Add field
      </Button>
    </div>
  );
}
