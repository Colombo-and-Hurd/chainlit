/**
 * Shared, in-memory catalog of the user's @mentionable assistants (GPTs +
 * workflows). The composer populates it after fetching; the Markdown renderer
 * reads it to highlight mentions consistently in the transcript.
 */
let mentionLabels: string[] = [];

export const setMentionLabels = (labels: string[]): void => {
  mentionLabels = Array.from(new Set(labels.filter(Boolean)));
};

export const getMentionLabels = (): string[] => mentionLabels;
