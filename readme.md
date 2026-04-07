## ⚡ AI Streaming Chat + Tool Calling (Weather) 🌦️

AI chat powered by open-source models, with streaming responses and function/tool calling to fetch live weather data.


🧠 AI-Powered Chat
Runs on open-source LLMs via Ollama for full local control.

🔧 Function / Tool Calling
AI can intelligently call tools (like weather APIs) to fetch real-time data.

🌦️ Live Weather Integration
Ask anything like:
- "What's the weather today?"
- "Will it rain tomorrow?"
- "What's the weather in Dhaka right now?


## Project Structure

```text
.
├── index.js
├── src
│   ├── chatLoop.js
│   ├── config.js
│   ├── ollamaClient.js
│   ├── tools
│   │   ├── index.js
│   │   └── weather.js
│   └── utils
│       └── status.js
└── readme.md
```

## Quick Start

### 1) Install dependencies

```bash
pnpm install
```

### 2) Run Ollama and pull a model

```bash
ollama pull qwen3.5:2b
```

Make sure Ollama is running on `http://127.0.0.1:11434` (default).

### 3) Start chatting

```bash
node index.js
```

Or pass a custom prompt:

```bash
node index.js "What's the weather in Dhaka today?"
```

## Environment Variables

Optional configuration:

- `OLLAMA_HOST` (default: `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (default: `qwen3.5:2b`)
- `OLLAMA_KEEP_ALIVE` (default: `30m`)
- `OLLAMA_PREWARM` (`0` disables prewarm; enabled by default)
- `OLLAMA_TEMPERATURE` (default: `0.2`)
- `OLLAMA_NUM_PREDICT` (default: `160`)

Example:

```bash
OLLAMA_MODEL=qwen3.5:2b OLLAMA_TEMPERATURE=0.1 node index.js "Weather in Chittagong"
```

## Example Prompts

- `What's the weather in Dhaka right now?`
- `Is it likely to rain in Sylhet today?`
- `Compare today's weather in Dhaka and Chittagong.`
- `Any conversation`


## Next Ideas

- Add more tools (news, currency, etc.)