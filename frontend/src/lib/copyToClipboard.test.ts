import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyToClipboard } from './copyToClipboard';

const setClipboard = (writeText?: (text: string) => Promise<void>) => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined
  });
};

const setExecCommand = (result: boolean | Error) => {
  const execCommand = vi.fn(() => {
    if (result instanceof Error) throw result;
    return result;
  });
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: execCommand
  });
  return execCommand;
};

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('uses the Clipboard API when it is allowed', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    const execCommand = setExecCommand(true);

    await expect(copyToClipboard('https://merlin/share/1')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://merlin/share/1');
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('falls back to a selected textarea when the Clipboard API is refused', async () => {
    setClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
    const execCommand = setExecCommand(true);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await expect(
      copyToClipboard('https://merlin/share/2', container)
    ).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('reports failure when every copy method is blocked', async () => {
    setClipboard(undefined);
    setExecCommand(new Error('blocked'));

    await expect(copyToClipboard('https://merlin/share/3')).resolves.toBe(
      false
    );
  });
});
