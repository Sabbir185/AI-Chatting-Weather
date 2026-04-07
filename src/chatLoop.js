import { prewarmModel, streamChat } from "./ollamaClient.js";
import { createThinkingIndicator } from "./utils/status.js";
import { runTool, tools } from "./tools/index.js";

function extractLocationFromPrompt(prompt) {
  const match = String(prompt).match(/\bin\s+([^?.!]+)\??/i);
  return match?.[1]?.trim() || "Bangladesh";
}

function looksLikeWeatherQuestion(prompt) {
  return /weather|temperature|forecast|rain|wind/i.test(String(prompt));
}

export async function runChatSession({
  host,
  model,
  prompt,
  maxTurns = 4,
  keepAlive = "30m",
  chatOptions = {},
  prewarm = true,
}) {
  const messages = [{ role: "user", content: prompt }];

  process.stdout.write(`Model: ${model}\n`);
  process.stdout.write(`Prompt: ${prompt}\n\n`);

  if (prewarm) {
    process.stdout.write("Prewarming model...\n");
    try {
      await prewarmModel(host, model, keepAlive);
      process.stdout.write("Model is warm.\n\n");
    } catch (error) {
      process.stdout.write(`Prewarm skipped: ${error.message}\n\n`);
    }
  }

  for (let turn = 0; turn < maxTurns; turn += 1) {
    let assistantContent = "";
    let toolCalls = [];
    let printedAssistantPrefix = false;
    const indicator = createThinkingIndicator("Assistant is thinking");
    let indicatorStopped = false;

    for await (const part of streamChat(host, {
      model,
      messages,
      stream: true,
      tools,
      keep_alive: keepAlive,
      options: chatOptions,
    })) {
      const msg = part.message || {};

      if (msg.content && !indicatorStopped) {
        indicator.stop("Assistant started responding.");
        indicatorStopped = true;
      }

      if (msg.content) {
        if (!printedAssistantPrefix) {
          process.stdout.write("Assistant: ");
          printedAssistantPrefix = true;
        }
        process.stdout.write(msg.content);
        assistantContent += msg.content;
      }

      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        toolCalls = msg.tool_calls;
        if (!indicatorStopped) {
          indicator.stop("Assistant requested a tool call.");
          indicatorStopped = true;
        }
      }
    }

    if (!indicatorStopped) {
      indicator.stop("Assistant finished thinking.");
    }

    if (!printedAssistantPrefix && toolCalls.length === 0 && looksLikeWeatherQuestion(prompt)) {
      const fallbackLocation = extractLocationFromPrompt(prompt);
      process.stdout.write("No model output. Running weather tool directly...\n");

      const directToolResult = await runTool({
        function: {
          name: "get_current_weather",
          arguments: {
            location: fallbackLocation,
            format: "celsius",
          },
        },
      });

      if (directToolResult.error) {
        process.stdout.write(`Assistant: ${directToolResult.error}\n`);
      } else {
        process.stdout.write(
          `Assistant: Current weather in ${directToolResult.location} is ${directToolResult.temperature}${directToolResult.temperature_unit}, ${directToolResult.condition}, wind ${directToolResult.wind_speed} ${directToolResult.wind_speed_unit}.\n`,
        );
      }

      return;
    }

    if (printedAssistantPrefix) {
      process.stdout.write("\n");
    }

    messages.push({
      role: "assistant",
      content: assistantContent,
      tool_calls: toolCalls,
    });

    if (toolCalls.length === 0) {
      return;
    }

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function?.name || "unknown_tool";
      process.stdout.write(`Tool: ${toolName} (running)\n`);

      let toolResult;
      try {
        toolResult = await runTool(toolCall);
      } catch (error) {
        toolResult = { error: error.message };
      }

      process.stdout.write(`Tool: ${toolName} (done)\n`);

      messages.push({
        role: "tool",
        name: toolName,
        content: JSON.stringify(toolResult),
      });
    }

    process.stdout.write("\n");
  }

  throw new Error("Max tool-call turns reached");
}
