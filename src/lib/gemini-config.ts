// Runtime Gemini Configuration Store
export interface GeminiConfig {
  apiKey: string;
  model: string;
}

let geminiConfig: GeminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.MODEL || 'gemini-3.8-flash',
};

export function getGeminiConfig(): GeminiConfig {
  return { ...geminiConfig };
}

export function updateGeminiConfig(update: Partial<GeminiConfig>): void {
  geminiConfig = {
    ...geminiConfig,
    ...update,
  };
}

export function formatGeminiModelName(model: string): string {
  if (!model) return 'Gemini 3.8 Flash';
  const parts = model.split('-');
  if (parts.length >= 3) {
    const brand = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const ver = parts[1];
    const tier = parts.slice(2).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    return `${brand} ${ver} ${tier}`;
  }
  return model;
}
