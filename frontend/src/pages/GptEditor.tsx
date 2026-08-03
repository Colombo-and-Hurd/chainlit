import { writePendingGptProfile } from '@/lib/pendingGptProfile';
import { ArrowLeft, Check, MessageSquare, Trash2 } from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import Page from 'pages/Page';

import {
  ChainlitContext,
  useChatInteract,
  useChatSession
} from '@chainlit/react-client';

import { EditorSection } from '@/components/gpts/EditorSection';
import { IconPicker } from '@/components/gpts/IconPicker';
import { InstructionsPlayground } from '@/components/gpts/InstructionsPlayground';
import {
  KnowledgeUploader,
  StarterList
} from '@/components/gpts/KnowledgeUploader';
import {
  LivePreviewPanel,
  PreviewChatMessage
} from '@/components/gpts/LivePreviewPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import type {
  GptConversationStarter,
  GptKnowledgeFileCreate,
  GptRecord,
  GptUpdatePayload,
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

const emptyStarter = (): GptConversationStarter => ({
  label: '',
  message: ''
});

const defaultStartersFromGoal = (goal: string): GptConversationStarter[] => {
  const clean = goal.trim();
  if (!clean) {
    return [
      {
        label: 'Get started',
        message: 'What can you help me with?'
      }
    ];
  }
  return [
    {
      label: 'Summarize the document',
      message: 'Give me a plain-English summary of the key points.'
    },
    {
      label: 'Answer a question',
      message: 'I have a question about this. Please answer from the documents.'
    },
    {
      label: 'What should I watch for?',
      message: 'Flag anything unusual, risky, or easy to miss.'
    }
  ];
};

const ingestionLabel = (item: GptRecord['knowledge'][number]) => {
  const status = String(item.metadata?.ingestion_status || 'ready');
  if (status === 'ready') {
    const chunks = item.metadata?.chunk_count;
    return chunks != null ? `Ready · ${chunks} chunks` : 'Ready';
  }
  if (status === 'empty') {
    return 'No text extracted';
  }
  if (status === 'failed') {
    return 'Ingestion failed';
  }
  return status;
};

export default function GptEditorPage() {
  const apiClient = useContext(ChainlitContext) as any;
  const location = useLocation();
  const navigate = useNavigate();
  const { setChatProfile } = useChatSession();
  const { clear } = useChatInteract();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const preloadedGpt = useMemo(() => {
    const state = (location.state || null) as { gpt?: GptRecord } | null;
    const candidate = state?.gpt || null;
    if (!candidate) {
      return null;
    }
    if (id && candidate.id !== id) {
      return null;
    }
    return candidate;
  }, [id, location.state]);

  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [gpt, setGpt] = useState<GptRecord | null>(preloadedGpt);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Bot');
  const [instructions, setInstructions] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [refineRequest, setRefineRequest] = useState('');
  const [instructionSummary, setInstructionSummary] = useState('');
  const [previewDraft, setPreviewDraft] = useState('');
  const [previewMessages, setPreviewMessages] = useState<PreviewChatMessage[]>(
    []
  );
  const [model] = useState('gpt-5.4');
  const [starters, setStarters] = useState<GptConversationStarter[]>([
    emptyStarter()
  ]);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [pendingKnowledgeFiles, setPendingKnowledgeFiles] = useState<
    GptKnowledgeFileCreate[]
  >([]);

  const isExample = gpt?.visibility === 'example';
  const pageTitle = isEdit ? 'Edit agent' : 'Create an agent';
  const canSave = Boolean(name.trim() && instructions.trim());
  const hasInstructions = Boolean(instructions.trim());
  const knowledgeCount =
    (gpt?.knowledge?.length || 0) + pendingKnowledgeFiles.length;
  const starterCount = starters.filter((item) => item.label.trim()).length;
  const completionHints = [
    name.trim() ? null : 'Add a name',
    instructions.trim() ? null : 'Generate instructions',
    knowledgeCount ? null : 'Add a document (optional)'
  ].filter(Boolean);
  const suggestedQuestions = useMemo(
    () =>
      starters
        .map((item) => item.message.trim() || item.label.trim())
        .filter(Boolean)
        .slice(0, 3),
    [starters]
  );

  const populateForm = (item: GptRecord) => {
    setName(item.name || '');
    setDescription(item.description || '');
    setIcon(item.icon || 'Bot');
    setInstructions(item.instructions || '');
    setStarters(
      item.conversation_starters?.length
        ? item.conversation_starters
        : [emptyStarter()]
    );
    if (!goalDescription && (item.description || item.instructions)) {
      setGoalDescription(item.description || '');
    }
    if (item.instructions) {
      setInstructionSummary(item.description || 'Custom instructions loaded.');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon('Bot');
    setInstructions('');
    setGoalDescription('');
    setRefineRequest('');
    setInstructionSummary('');
    setPreviewDraft('');
    setPreviewMessages([]);
    setStarters([emptyStarter()]);
    setPendingKnowledgeFiles([]);
  };

  useEffect(() => {
    let cancelled = false;
    const loadGpt = async () => {
      if (!isEdit || !id) {
        setGpt(null);
        setIsLoading(false);
        return;
      }

      if (preloadedGpt) {
        setGpt(preloadedGpt);
        populateForm(preloadedGpt);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      try {
        const latest = await apiClient.getGpt(id);
        if (!cancelled) {
          setGpt(latest);
          populateForm(latest);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(String(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    loadGpt();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, preloadedGpt]);

  useEffect(() => {
    if (isEdit) {
      return;
    }
    resetForm();
  }, [isEdit]);

  useEffect(() => {
    setPreviewMessages([]);
  }, [instructions]);

  const buildConversationStarters = (): GptConversationStarter[] =>
    starters
      .map((item) => ({
        label: item.label.trim(),
        message: item.message.trim() || item.label.trim()
      }))
      .filter((item) => item.label);

  const buildUpdatePayload = (): GptUpdatePayload => ({
    name: name.trim(),
    description: description.trim() || instructionSummary.trim(),
    icon: icon.trim() || 'Bot',
    instructions: instructions.trim(),
    model: model.trim() || 'gpt-5.4',
    tool_ids: [],
    conversation_starters: buildConversationStarters(),
    visibility: 'private'
  });

  const buildCreatePayload = (
    knowledgeFiles: GptKnowledgeFileCreate[] = []
  ): GptWritePayload => ({
    ...buildUpdatePayload(),
    knowledge_files: knowledgeFiles,
    visibility: 'private'
  });

  const onGenerateInstructions = async () => {
    if (!goalDescription.trim()) {
      toast.error('Describe what this assistant should do first.');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await apiClient.generateGptInstructions({
        mode: 'generate',
        description: goalDescription.trim(),
        name: name.trim(),
        audience: 'Colombo & Hurd employees'
      });
      setInstructions(result.instructions || '');
      setInstructionSummary(result.summary || '');
      if (!description.trim() && result.summary) {
        setDescription(result.summary);
      }
      if (!name.trim()) {
        const guessed = goalDescription
          .trim()
          .split(/[.!?]/)[0]
          .slice(0, 48)
          .trim();
        if (guessed) {
          setName(guessed);
        }
      }
      const hasMeaningfulStarters = starters.some(
        (item) => item.label.trim() && item.message.trim()
      );
      if (!hasMeaningfulStarters) {
        setStarters(defaultStartersFromGoal(goalDescription));
      }
      toast.success(
        'Instructions ready. Try a sample on the right, then save.'
      );
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const onRefineInstructions = async () => {
    if (!instructions.trim() || !refineRequest.trim()) {
      toast.error('Open the details and add a refine request.');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await apiClient.generateGptInstructions({
        mode: 'refine',
        current_instructions: instructions.trim(),
        change_request: refineRequest.trim(),
        name: name.trim()
      });
      setInstructions(result.instructions || '');
      setInstructionSummary(result.summary || '');
      setRefineRequest('');
      toast.success('Instructions updated.');
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const onSendPreview = async () => {
    const message = previewDraft.trim();
    if (!instructions.trim()) {
      toast.error('Generate instructions first.');
      return;
    }
    if (!message) {
      toast.error('Type a sample question.');
      return;
    }
    setIsPreviewing(true);
    setPreviewMessages((prev) => [...prev, { role: 'user', content: message }]);
    setPreviewDraft('');
    try {
      const knowledgeFiles = [
        ...(gpt?.knowledge || []).map((item) => ({
          file_name: item.file_name,
          metadata: item.metadata || {}
        })),
        ...pendingKnowledgeFiles.map((item) => ({
          file_name: item.file_name,
          metadata: { ingestion_status: 'pending' }
        }))
      ];
      const result = await apiClient.previewGpt({
        instructions: instructions.trim(),
        message,
        name: name.trim(),
        gpt_id: id || '',
        knowledge_files: knowledgeFiles
      });
      setPreviewMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.reply || 'No reply returned.'
        }
      ]);
    } catch (error) {
      setPreviewMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Preview failed: ${String(error)}`
        }
      ]);
    } finally {
      setIsPreviewing(false);
    }
  };

  const persistAndMaybeChat = async (startChatAfter: boolean) => {
    if (!name.trim()) {
      toast.error('Give your agent a name.');
      return;
    }
    if (!instructions.trim()) {
      toast.error('Generate instructions before saving.');
      return;
    }
    setIsSaving(true);
    try {
      let saved: GptRecord;
      if (isEdit && id && isExample) {
        const copy = await apiClient.cloneGpt(id);
        saved = await apiClient.updateGpt(copy.id, buildUpdatePayload());
        toast.success('Saved your own copy.');
      } else if (isEdit && id) {
        saved = await apiClient.updateGpt(id, buildUpdatePayload());
        setGpt(saved);
        populateForm(saved);
        toast.success('Agent updated.');
      } else {
        saved = await apiClient.createGpt(
          buildCreatePayload(pendingKnowledgeFiles)
        );
        setPendingKnowledgeFiles([]);
        toast.success('Agent created.');
      }
      writePendingGptProfile(saved);
      if (startChatAfter) {
        setChatProfile(`gpt:${saved.id}`);
        clear();
        navigate('/');
        return;
      }
      navigate(`/gpts/${saved.id}/edit`, {
        state: { gpt: saved }
      });
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
      toast.success('Agent deleted.');
      navigate('/gpts');
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const queueOrUploadKnowledge = async () => {
    if (!knowledgeFile) {
      return;
    }
    setIsUploading(true);
    try {
      const content_base64 = await toBase64(knowledgeFile);
      const payload = {
        file_name: knowledgeFile.name,
        mime_type: knowledgeFile.type || 'application/octet-stream',
        content_base64
      };
      if (!id) {
        setPendingKnowledgeFiles((prev) => [...prev, payload]);
        setKnowledgeFile(null);
        toast.success('File queued. It will upload when you save.');
        return;
      }
      await apiClient.uploadGptKnowledge(id, payload);
      setKnowledgeFile(null);
      const updated = await apiClient.getGpt(id);
      setGpt(updated);
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

  const previewPanel = (
    <LivePreviewPanel
      agentName={name}
      agentDescription={description}
      icon={icon}
      instructionSummary={instructionSummary}
      hasInstructions={hasInstructions}
      knowledgeCount={knowledgeCount}
      starterCount={starterCount}
      messages={previewMessages}
      draft={previewDraft}
      onDraftChange={setPreviewDraft}
      onSend={onSendPreview}
      isSending={isPreviewing}
      suggestedQuestions={suggestedQuestions}
    />
  );

  const editorForm = (
    <div className="mx-auto max-w-3xl space-y-5 pb-16">
      {isExample ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          This is a shared example. Saving creates your own editable copy — the
          original stays untouched.
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <EditorSection
            step={1}
            title="Name your agent"
            description="Give it a clear name people will recognize in the sidebar."
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gpt-name">Name</Label>
                <Input
                  id="gpt-name"
                  name="gpt-agent-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onInput={(event) =>
                    setName((event.target as HTMLInputElement).value)
                  }
                  placeholder="e.g. Lease Q&A helper"
                  className="h-11 text-base"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-description">One-line description</Label>
                <Textarea
                  id="gpt-description"
                  name="gpt-agent-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onInput={(event) =>
                    setDescription((event.target as HTMLTextAreaElement).value)
                  }
                  rows={2}
                  placeholder="e.g. Answers lease questions in plain English"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                />
              </div>
            </div>
          </EditorSection>

          <EditorSection
            step={2}
            title="Teach it what to do"
            description="Describe the job in everyday language. Merlin writes the detailed instructions."
          >
            <InstructionsPlayground
              goalDescription={goalDescription}
              onGoalChange={setGoalDescription}
              instructions={instructions}
              onInstructionsChange={setInstructions}
              instructionSummary={instructionSummary}
              refineRequest={refineRequest}
              onRefineRequestChange={setRefineRequest}
              isGenerating={isGenerating}
              onGenerate={onGenerateInstructions}
              onRefine={onRefineInstructions}
            />
          </EditorSection>

          <EditorSection
            step={3}
            title="Add knowledge"
            description="Upload the documents this agent should know — contracts, policies, playbooks."
            optional
          >
            <KnowledgeUploader
              isEdit={isEdit}
              isUploading={isUploading}
              knowledgeFile={knowledgeFile}
              onFileChange={setKnowledgeFile}
              onUpload={queueOrUploadKnowledge}
              pendingFiles={pendingKnowledgeFiles}
              onRemovePending={(index) =>
                setPendingKnowledgeFiles((prev) =>
                  prev.filter((_, itemIndex) => itemIndex !== index)
                )
              }
              uploadedFiles={(gpt?.knowledge || []).map((item) => ({
                id: item.id,
                file_name: item.file_name,
                mime_type: item.mime_type,
                statusLabel: ingestionLabel(item)
              }))}
              onRemoveUploaded={onDeleteKnowledge}
            />
          </EditorSection>

          <EditorSection
            step={4}
            title="Quick-start buttons"
            description="These appear when someone opens a new chat with this agent."
            optional
          >
            <StarterList starters={starters} onChange={setStarters} />
          </EditorSection>

          <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Tools like search, email, files, and memory are included
            automatically. You do not need to configure them.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
            <div className="text-sm">
              {canSave ? (
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  Ready to save
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Still needed: {completionHints.join(' · ')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => persistAndMaybeChat(false)}
                disabled={isSaving || !canSave}
              >
                Save
              </Button>
              <Button
                onClick={() => persistAndMaybeChat(true)}
                disabled={isSaving || !canSave}
              >
                Save & chat
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Page>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate('/gpts')}
                className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                All agents
              </button>
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {pageTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                Built for writers, sales, and legal teams — no prompt
                engineering needed.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {isEdit && !isExample ? (
                <Button
                  variant="ghost"
                  onClick={onDelete}
                  disabled={isSaving}
                  className="text-destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => persistAndMaybeChat(false)}
                disabled={isSaving || !canSave}
              >
                {isSaving ? 'Saving...' : isExample ? 'Save a copy' : 'Save'}
              </Button>
              <Button
                onClick={() => persistAndMaybeChat(true)}
                disabled={isSaving || !canSave}
              >
                <MessageSquare className="mr-1 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save & chat'}
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <div className="hidden h-full min-h-0 xl:block">
            <ResizablePanelGroup
              direction="horizontal"
              autoSaveId="gpt-editor-preview-width"
              className="h-full min-h-0"
            >
              <ResizablePanel minSize={32} defaultSize={58} className="min-h-0">
                <div className="h-full overflow-auto px-4 py-6 md:px-6">
                  {editorForm}
                </div>
              </ResizablePanel>
              <ResizableHandle
                withHandle
                className="w-1.5 bg-border transition-colors hover:bg-primary/30"
              />
              <ResizablePanel minSize={24} defaultSize={42} className="min-h-0">
                {previewPanel}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          <div className="flex h-full min-h-0 flex-col xl:hidden">
            <div className="min-h-0 flex-1 overflow-auto px-4 py-6 md:px-6">
              {editorForm}
            </div>
            <div className="h-[28rem] shrink-0 border-t">{previewPanel}</div>
          </div>
        </div>
      </div>
    </Page>
  );
}
