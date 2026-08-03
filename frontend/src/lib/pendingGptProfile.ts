import type { ChatProfile, IStarter } from '@chainlit/react-client';

import type { GptRecord } from '@/types/gpts';

const STORAGE_KEY = 'merlin.pendingGptProfile';

export function gptRecordToChatProfile(gpt: GptRecord): ChatProfile {
  const starters: IStarter[] = (gpt.conversation_starters || [])
    .map((item) => ({
      label: String(item.label || '').trim() || 'Starter',
      message: String(item.message || '').trim()
    }))
    .filter((item) => item.message);

  return {
    name: `gpt:${gpt.id}`,
    display_name: gpt.name,
    markdown_description: gpt.description || 'Custom Agent',
    icon: gpt.icon || 'Bot',
    default: false,
    starters: starters.length ? starters : undefined
  };
}

export function writePendingGptProfile(gpt: GptRecord): void {
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(gptRecordToChatProfile(gpt))
    );
  } catch {
    // Ignore storage failures; chat profile refresh remains the primary path.
  }
}

export function readPendingGptProfile(): ChatProfile | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ChatProfile;
    if (!parsed?.name) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingGptProfile(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
