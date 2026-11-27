async function writeWithClipboardApi(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function copyWithSelection(text: string, container: HTMLElement): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  container.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    container.removeChild(textarea);
  }
}

// The container must sit inside any open modal: focus traps block selection elsewhere.
export async function copyToClipboard(
  text: string,
  container: HTMLElement = document.body
): Promise<boolean> {
  if (await writeWithClipboardApi(text)) return true;
  return copyWithSelection(text, container);
}
