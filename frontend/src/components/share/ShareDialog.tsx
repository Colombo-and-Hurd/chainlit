import { copyToClipboard } from '@/lib/copyToClipboard';
import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { toast } from 'sonner';

import {
  ChainlitContext,
  ClientError,
  threadHistoryState
} from '@chainlit/react-client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

import { Translator } from '../i18n';

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId?: string | null;
};

const SHARE_I18N = 'threadHistory.thread.actions.share';

const showError = (err: unknown, fallbackPath: string) => {
  if (err instanceof ClientError) {
    toast.error(err.toString());
  } else {
    toast.error(<Translator path={fallbackPath} />);
  }
};

export function ShareDialog({
  open,
  onOpenChange,
  threadId
}: ShareDialogProps) {
  const apiClient = useContext(ChainlitContext);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [needsManualCopy, setNeedsManualCopy] = useState(false);
  const threadHistory = useRecoilValue(threadHistoryState);
  const setThreadHistory = useSetRecoilState(threadHistoryState);
  const contentRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const isAlreadyShared = useMemo(() => {
    if (!threadId) return false;
    const allThreads = threadHistory?.threads;
    if (!allThreads) return false;
    const t = allThreads.find((th) => th.id === threadId);
    return Boolean(t?.metadata?.is_shared);
  }, [threadHistory?.threads, threadId]);

  const shareLink = useMemo(
    () => `${window.location.origin}/share/${threadId || ''}`,
    [threadId]
  );

  const setSharedInHistory = useCallback(
    (isShared: boolean) => {
      setThreadHistory((prev) => {
        if (!prev?.threads) return prev;
        const next = { ...prev, threads: [...prev.threads] };
        const idx = next.threads.findIndex((t) => t.id === threadId);
        if (idx !== -1) {
          const md = { ...(next.threads[idx].metadata || {}) };
          md.is_shared = isShared;
          if (!isShared && 'shared_at' in md) delete (md as any).shared_at;
          next.threads[idx] = { ...next.threads[idx], metadata: md } as any;
        }
        return next;
      });
    },
    [setThreadHistory, threadId]
  );

  const requestShareState = useCallback(
    async (isShared: boolean) => {
      if (typeof (apiClient as any)?.shareThread === 'function') {
        await (apiClient as any).shareThread(threadId, isShared);
        return;
      }
      const putRes = await (apiClient as any).put?.(`/project/thread/share`, {
        threadId,
        isShared
      });
      await putRes?.json?.();
    },
    [apiClient, threadId]
  );

  const shareIfNeeded = async (): Promise<boolean> => {
    if (isAlreadyShared) return true;
    setIsSharing(true);
    try {
      await requestShareState(true);
      setSharedInHistory(true);
      return true;
    } catch (err) {
      showError(err, `${SHARE_I18N}.error.create`);
      return false;
    } finally {
      setIsSharing(false);
    }
  };

  const selectLinkForManualCopy = () => {
    setNeedsManualCopy(true);
    requestAnimationFrame(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    });
  };

  const handleCopy = async () => {
    if (!threadId) return;
    const wasShared = isAlreadyShared;
    if (!(await shareIfNeeded())) return;
    const copied = await copyToClipboard(
      shareLink,
      contentRef.current ?? document.body
    );
    if (!copied) {
      selectLinkForManualCopy();
      return;
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success(
      <Translator
        path={`${SHARE_I18N}.status.${wasShared ? 'copied' : 'created'}`}
      />
    );
  };

  const handleUnshare = useCallback(async () => {
    if (!threadId) return;
    setIsSharing(true);
    try {
      await requestShareState(false);
      setSharedInHistory(false);
      toast.success(<Translator path={`${SHARE_I18N}.status.unshared`} />);
      onOpenChange(false);
    } catch (err) {
      showError(err, `${SHARE_I18N}.error.unshare`);
    } finally {
      setIsSharing(false);
    }
  }, [onOpenChange, requestShareState, setSharedInHistory, threadId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setIsSharing(false);
          setIsCopied(false);
          setNeedsManualCopy(false);
        }
      }}
    >
      <DialogContent className="flex flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Translator path={`${SHARE_I18N}.title`} />
          </DialogTitle>
        </DialogHeader>
        <div ref={contentRef} className="flex flex-col gap-3 w-full">
          <input
            ref={linkInputRef}
            readOnly
            value={shareLink}
            title={shareLink}
            onFocus={(event) => event.currentTarget.select()}
            className="rounded-md border px-3 py-2 w-full text-sm text-muted-foreground bg-transparent text-ellipsis"
          />
          {needsManualCopy ? (
            <p className="text-sm text-muted-foreground" role="status">
              <Translator
                path={[
                  `${SHARE_I18N}.status.copyManually`,
                  `${SHARE_I18N}.status.created`
                ]}
              />
            </p>
          ) : null}
          <div className="flex gap-2 justify-center">
            <Button
              onClick={handleCopy}
              disabled={!threadId || isSharing || isCopied}
            >
              <Translator path={`${SHARE_I18N}.button`} />
            </Button>
            {isAlreadyShared ? (
              <Button
                onClick={handleUnshare}
                disabled={!threadId || isSharing}
                variant="outline"
              >
                Unshare
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
