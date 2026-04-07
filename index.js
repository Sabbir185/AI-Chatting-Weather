import {
  CHAT_OPTIONS,
  KEEP_ALIVE,
  MAX_TURNS,
  MODEL,
  OLLAMA_HOST,
  PREWARM_MODEL,
  USER_PROMPT,
} from "./src/config.js";
import { runChatSession } from "./src/chatLoop.js";

try {
  await runChatSession({
    host: OLLAMA_HOST,
    model: MODEL,
    prompt: USER_PROMPT,
    maxTurns: MAX_TURNS,
    keepAlive: KEEP_ALIVE,
    chatOptions: CHAT_OPTIONS,
    prewarm: PREWARM_MODEL,
  });
} catch (error) {
  console.error("Failed to run chat loop:", error.message);
  process.exitCode = 1;
}
