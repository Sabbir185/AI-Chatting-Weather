import { getCurrentWeather, weatherToolDefinition } from "./weather.js";

export const tools = [weatherToolDefinition];

function parseArgs(rawArgs) {
  if (!rawArgs) return {};

  if (typeof rawArgs === "string") {
    try {
      return JSON.parse(rawArgs);
    } catch {
      return {};
    }
  }

  return rawArgs;
}

export async function runTool(toolCall) {
  if (!toolCall?.function?.name) {
    return { error: "Tool call missing function name" };
  }

  if (toolCall.function.name !== "get_current_weather") {
    return { error: `Unknown tool: ${toolCall.function.name}` };
  }

  const args = parseArgs(toolCall.function.arguments);
  if (!args.location || !args.format) {
    return {
      error: "Missing required arguments. Expected location and format.",
      received: args,
    };
  }

  return getCurrentWeather(args);
}
