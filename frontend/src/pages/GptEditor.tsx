import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import Page from 'pages/Page';

import { ChainlitContext } from '@chainlit/react-client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type {
  GptRecord,
  GptToolDescriptor,
  GptWritePayload
} from '@/types/gpts';

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const marker = 'base64,';
      const idx = result.indexOf(marker);
      if (idx === -1) {
        reject(new Error('Unable to encode file.'));
        return;
      }
      resolve(result.slice(idx + marker.length));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const startersToText = (gpt?: GptRecord) =>
  (gpt?.conversation_starters || [])
    .map((item) => `${item.label} | ${item.message}`)
    .join('\n');

const startersFromText = (raw: string) =>
  raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split('|');
      return {
        label: (label || 'Starter').trim(),
        message: rest.join('|').trim() || line
      };
    });

export default function GptEditorPage() {
  const apiClient = useContext(ChainlitContext) as any;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [gpt, setGpt] = useState<GptRecord | null>(null);
  const [tools, setTools] = useState<GptToolDescriptor[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Bot');
  const [instructions, setInstructions] = useState('');
  const [model, setModel] = useState('');
  const [starterText, setStarterText] = useState('');
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);

  const pageTitle = useMemo(
    () => (isEdit ? 'Edit GPT' : 'Create GPT'),
    [isEdit]
  );

  const populateForm = (item: GptRecord) => {
    setName(item.name || '');
    setDescription(item.description || '');
    setIcon(item.icon || 'Bot');
    setInstructions(item.instructions || '');
    setModel(item.model || '');
    setStarterText(startersToText(item));
    setSelectedToolIds(item.tool_ids || []);
  };

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [toolList, gptData] = await Promise.all([
        apiClient.listGptTools(),
        isEdit && id ? apiClient.getGpt(id) : Promise.resolve(null)
      ]);
      setTools(toolList);
      if (gptData) {
        setGpt(gptData);
        populateForm(gptData);
      }
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [id]);

  const toggleTool = (toolId: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(toolId)
        ? prev.filter((item) => item !== toolId)
        : [...prev, toolId]
    );
  };

  const buildPayload = (): GptWritePayload => ({
    name: name.trim(),
    description: description.trim(),
    icon: icon.trim() || 'Bot',
    instructions: instructions.trim(),
    model: model.trim(),
    tool_ids: selectedToolIds,
    conversation_starters: startersFromText(starterText),
    visibility: 'private'
  });

  const onSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required.');
      return;
    }
    setIsSaving(true);
    try {
      if (isEdit && id) {
        const updated = await apiClient.updateGpt(id, buildPayload());
        setGpt(updated);
        populateForm(updated);
        toast.success('GPT updated.');
      } else {
        const created = await apiClient.createGpt(buildPayload());
        toast.success('GPT created.');
        navigate(`/gpts/${created.id}/edit`);
      }
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id) {
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.deleteGpt(id);
      toast.success('GPT deleted.');
      navigate('/gpts');
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const onUploadKnowledge = async () => {
    if (!id || !knowledgeFile) {
      return;
    }
    setIsUploading(true);
    try {
      const content_base64 = await toBase64(knowledgeFile);
      await apiClient.uploadGptKnowledge(id, {
        file_name: knowledgeFile.name,
        mime_type: knowledgeFile.type || 'application/octet-stream',
        content_base64
      });
      setKnowledgeFile(null);
      await refresh();
      toast.success('Knowledge file uploaded.');
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsUploading(false);
    }
  };

  const onDeleteKnowledge = async (knowledgeId: string) => {
    if (!id) {
      return;
    }
    try {
      const updated = await apiClient.deleteGptKnowledge(id, knowledgeId);
      setGpt(updated);
      toast.success('Knowledge file removed.');
    } catch (error) {
      toast.error(String(error));
    }
  };

  return (
    <Page>
      <div className="w-full p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground">
              Configure instructions, tools, model, starters, and knowledge.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/gpts')}>
              Back
            </Button>
            {isEdit ? (
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={isSaving}
              >
                Delete
              </Button>
            ) : null}
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gpt-name">Name</Label>
                <Input
                  id="gpt-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-description">Description</Label>
                <Textarea
                  id="gpt-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-icon">Icon</Label>
                <Input
                  id="gpt-icon"
                  value={icon}
                  onChange={(event) => setIcon(event.target.value)}
                  placeholder="Bot"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-model">Model</Label>
                <Input
                  id="gpt-model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder="gpt-5.4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-instructions">
                  Instructions (system prompt)
                </Label>
                <Textarea
                  id="gpt-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  rows={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-starters">Conversation starters</Label>
                <Textarea
                  id="gpt-starters"
                  value={starterText}
                  onChange={(event) => setStarterText(event.target.value)}
                  rows={6}
                  placeholder="Summarize this thread | Summarize the latest updates"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-lg font-medium">Enabled tools</h2>
                <div className="space-y-3">
                  {tools.map((tool) => (
                    <div key={tool.id} className="flex items-start gap-3">
                      <Checkbox
                        id={`tool-${tool.id}`}
                        checked={selectedToolIds.includes(tool.id)}
                        onCheckedChange={() => toggleTool(tool.id)}
                      />
                      <div>
                        <Label htmlFor={`tool-${tool.id}`}>{tool.label}</Label>
                        <p className="text-xs text-muted-foreground">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-medium">Knowledge files</h2>
                {!isEdit ? (
                  <p className="text-sm text-muted-foreground">
                    Save the GPT first to upload knowledge.
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        onChange={(event) =>
                          setKnowledgeFile(event.target.files?.[0] || null)
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={onUploadKnowledge}
                        disabled={!knowledgeFile || isUploading}
                      >
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(gpt?.knowledge || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No knowledge files uploaded.
                        </p>
                      ) : (
                        gpt?.knowledge.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          >
                            <div>
                              <div>{item.file_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.mime_type}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              onClick={() => onDeleteKnowledge(item.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
