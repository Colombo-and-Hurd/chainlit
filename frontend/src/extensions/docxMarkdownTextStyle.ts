import { TextStyle } from '@tiptap/extension-text-style';

function extractPt(attrs: Record<string, unknown>): string | null {
  const raw = attrs.fontSize;
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return match[1];
  }
  if (/pt$/i.test(trimmed)) {
    return match[1];
  }
  if (/px$/i.test(trimmed)) {
    const pxVal = Number(match[1]);
    if (!Number.isFinite(pxVal)) {
      return null;
    }
    return String(Math.round((pxVal * 72) / 96));
  }
  return match[1];
}

export const DocxMarkdownTextStyle = TextStyle.extend({
  name: 'textStyle',
  parseHTML() {
    return [
      {
        tag: 'span[data-docx-font]',
        consuming: false,
        getAttrs: (element) => {
          if (typeof element === 'string' || !(element instanceof HTMLElement)) {
            return false;
          }
          const family = element.getAttribute('data-docx-font')?.trim();
          if (!family) {
            return false;
          }
          const sizeAttr = element.getAttribute('data-docx-font-size-pt')?.trim();
          const sizePt = sizeAttr && /^\d+$/.test(sizeAttr) ? sizeAttr : null;
          return {
            fontFamily: family,
            ...(sizePt ? { fontSize: `${sizePt}pt` } : {})
          };
        }
      },
      ...(this.parent?.() ?? [])
    ];
  },
  addMarkdown() {
    type MarkdownSerializeMark = { attrs?: Record<string, unknown>; content?: unknown };
    type MarkdownHelpers = {
      renderChildren: (node: MarkdownSerializeMark) => string;
    };
    return {
      renderMarkdown: (mark: MarkdownSerializeMark, helpers: MarkdownHelpers) => {
        const attrs = (mark.attrs || {}) as Record<string, unknown>;
        const ff = typeof attrs.fontFamily === 'string' ? attrs.fontFamily.trim() : '';
        const pt = extractPt(attrs);
        const inner = helpers.renderChildren(mark);
        if (!ff) {
          return inner;
        }
        const escaped = ff.replace(/\\/g, '\\\\').replace(/"/g, '&quot;');
        const sizeChunk = pt
          ? ` data-docx-font-size-pt="${pt.replace(/\\/g, '\\\\').replace(/"/g, '&quot;')}"`
          : '';
        return `<span data-docx-font="${escaped}"${sizeChunk}>${inner}</span>`;
      }
    };
  }
});
