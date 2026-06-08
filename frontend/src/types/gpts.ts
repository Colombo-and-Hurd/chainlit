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
  tool_ids: string[];
  conversation_starters: GptConversationStarter[];
  visibility: GptVisibility;
}
