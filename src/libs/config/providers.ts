const PROVIDER_API_KEY_ENV_NAMES: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  gemini: 'GOOGLE_API_KEY',
};

export function providerIdFromModelId(modelId: string): string {
  return modelId.split(':', 1)[0] ?? '';
}

export function providerApiKeyEnvName(providerId: string): string {
  return (
    PROVIDER_API_KEY_ENV_NAMES[providerId] ??
    `${providerId.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`
  );
}
