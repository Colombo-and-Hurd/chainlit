export type GptVisibility = 'private' | 'example';

export interface GptConversationStarter {
  label: string;
  message: string;
}

export interface GptKnowledgeItem {
  id: string;
  file_name: string;
  mime_type: string;
  created_at: string;
  size_bytes?: number;
  metadata?: Record<string, unknown>;
}

export interface GptKnowledgeFileCreate {
  file_name: string;
  mime_type: string;
  content_base64: string;
}

export interface GptRecord {
  id: string;
  owner: string;
  name: string;
  description: string;
  icon: string;
  instructions: string;
  model: string;
  tool_ids: string[];
  conversation_starters: GptConversationStarter[];
  knowledge: GptKnowledgeItem[];
  visibility: GptVisibility;
  created_at: string;
  updated_at: string;
}

export interface GptToolDescriptor {
  id: string;
  label: string;
  description: string;
}

export interface GptWritePayload {
  name: string;
  description: string;
  icon: string;
  instructions: string;
  model: string;
  tool_ids?: string[];
  conversation_starters: GptConversationStarter[];
  knowledge_files?: GptKnowledgeFileCreate[];
  visibility: GptVisibility;
}

export interface GptUpdatePayload {
  name: string;
  description: string;
  icon: string;
  instructions: string;
  model: string;
  tool_ids?: string[];
  conversation_starters: GptConversationStarter[];
  visibility?: GptVisibility;
}

export interface GptGenerateInstructionsPayload {
  mode?: 'generate' | 'refine';
  description?: string;
  name?: string;
  audience?: string;
  tone?: string;
  current_instructions?: string;
  change_request?: string;
}

export interface GptGenerateInstructionsResult {
  instructions: string;
  summary: string;
}

export interface GptPreviewPayload {
  instructions: string;
  message: string;
  name?: string;
  gpt_id?: string;
  knowledge_files?: Array<{
    file_name: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface GptPreviewResult {
  reply: string;
}
