import { act, fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { MutableSnapshot, RecoilRoot, useRecoilValue } from 'recoil';
import { toast } from 'sonner';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainlitContext, threadHistoryState } from '@chainlit/react-client';

import { ShareDialog } from './ShareDialog';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const shareStrings = {
  title: 'Share thread link',
  button: 'Copy',
  status: {
    copied: 'Link copied',
    created: 'Share link created!',
    copyManually: 'Press Ctrl+C to copy it.',
    unshared: 'Sharing disabled for this thread'
  },
  error: { create: 'Failed to create share link', unshare: 'Failed' }
};

const THREAD_ID = 'thread-1';

let sharedFlags: boolean[] = [];

const HistoryProbe = () => {
  const history = useRecoilValue(threadHistoryState);
  sharedFlags = (history?.threads || []).map((t: any) =>
    Boolean(t.metadata?.is_shared)
  );
  return null;
};

const renderDialog = (shareThread: ReturnType<typeof vi.fn>) => {
  const seed = ({ set }: MutableSnapshot) =>
    set(threadHistoryState, {
      threads: [{ id: THREAD_ID, metadata: {} }]
    } as any);
  return render(
    <RecoilRoot initializeState={seed}>
      <ChainlitContext.Provider value={{ shareThread } as any}>
        <ShareDialog open onOpenChange={() => undefined} threadId={THREAD_ID} />
        <HistoryProbe />
      </ChainlitContext.Provider>
    </RecoilRoot>
  );
};

const setClipboard = (writeText: () => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText }
  });

const setExecCommand = (result: boolean) =>
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: vi.fn(() => result)
  });

const clickCopy = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
  });
};

describe('ShareDialog', () => {
  beforeAll(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en-US',
      resources: {
        'en-US': {
          translation: {
            threadHistory: { thread: { actions: { share: shareStrings } } }
          }
        }
      }
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    sharedFlags = [];
  });

  it('keeps the share and shows the link to copy by hand when the browser blocks copying', async () => {
    const shareThread = vi.fn().mockResolvedValue(undefined);
    setClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
    setExecCommand(false);
    renderDialog(shareThread);

    await clickCopy();

    expect(shareThread).toHaveBeenCalledWith(THREAD_ID, true);
    expect(sharedFlags).toEqual([true]);
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain(
      'Press Ctrl+C to copy it.'
    );
    const linkInput = screen.getByDisplayValue(
      /\/share\/thread-1$/
    ) as HTMLInputElement;
    await act(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    );
    expect(document.activeElement).toBe(linkInput);
    expect(linkInput.selectionEnd).toBe(linkInput.value.length);
  });

  it('shares, copies and confirms when the clipboard works', async () => {
    const shareThread = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    renderDialog(shareThread);

    await clickCopy();

    expect(writeText).toHaveBeenCalledWith(
      expect.stringMatching(/\/share\/thread-1$/)
    );
    expect(sharedFlags).toEqual([true]);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('reports a share failure and does not copy a link that would not work', async () => {
    const shareThread = vi.fn().mockRejectedValue(new Error('network down'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    renderDialog(shareThread);

    await clickCopy();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(sharedFlags).toEqual([false]);
  });
});
