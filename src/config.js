export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
export const MODEL = process.env.OLLAMA_MODEL || "qwen3.5:2b";
export const USER_PROMPT = process.argv.slice(2).join(" ") || "বাংলাদেশের তাপমাত্রা কত?";
export const MAX_TURNS = 4;

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "30m";
export const PREWARM_MODEL = process.env.OLLAMA_PREWARM !== "0";
export const CHAT_OPTIONS = {
  temperature: toNumber(process.env.OLLAMA_TEMPERATURE, 0.2),
  num_predict: toNumber(process.env.OLLAMA_NUM_PREDICT, 160),
};
