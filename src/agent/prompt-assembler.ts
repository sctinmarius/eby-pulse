import type {
  ContentMix,
  KnowledgeKind,
  KnowledgeSectionInput,
  LearningInput,
  ProductSettingsInput,
} from './types.js';

export interface PromptAssemblerInput {
  knowledgeSections: KnowledgeSectionInput[];
  activeLearnings: LearningInput[];
  recentPostTopics: string[];
  settings: ProductSettingsInput;
}

const KNOWLEDGE_ORDER: KnowledgeKind[] = ['PRODUCT', 'AUDIENCE', 'TONE', 'EXAMPLES'];

function formatContentMix(mix: ContentMix): string {
  return `educational ${mix.educational}%, feature ${mix.feature}%, social proof ${mix.socialProof}%, offer ${mix.offer}%`;
}

export function assembleSystemPrompt(input: PromptAssemblerInput): string {
  const sections: string[] = [];

  for (const kind of KNOWLEDGE_ORDER) {
    const section = input.knowledgeSections.find((s) => s.kind === kind);
    if (section) {
      sections.push(`## ${section.title}\n\n${section.content}`);
    }
  }

  sections.push(
    input.activeLearnings.length > 0
      ? `## Learnings from past performance\n\n${input.activeLearnings
          .map((learning) => `- [${learning.category}] ${learning.content}`)
          .join('\n')}`
      : '## Learnings from past performance\n\nNone yet.',
  );

  sections.push(
    input.recentPostTopics.length > 0
      ? `## Recently posted topics — do not repeat these\n\n${input.recentPostTopics
          .map((topic) => `- ${topic}`)
          .join('\n')}`
      : '## Recently posted topics — do not repeat these\n\nNone yet.',
  );

  sections.push(
    [
      '## Platform and language rules',
      `- Write in: ${input.settings.language}`,
      `- Platforms: ${input.settings.platforms.join(', ')}`,
      `- Target content mix over time: ${formatContentMix(input.settings.contentMix)}`,
      '- Output must be ready to copy-paste — no placeholders, no brackets, no meta-commentary.',
    ].join('\n'),
  );

  return sections.join('\n\n');
}
