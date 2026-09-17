import { logError, logInfo } from '../utils/logger.js';

export const discoverModels = async (baseUrl, apiKey) => {
  if (!baseUrl) {
    throw new Error('Base URL is required.');
  }

  // Normalize baseUrl: remove trailing slash
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const modelsUrl = `${cleanBaseUrl}/models`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per Directive 4

  try {
    logInfo(`[LLM] Probing models from ${modelsUrl}`);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey && apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const res = await fetch(modelsUrl, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Endpoint returned status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    let modelIds = [];

    // OpenAI standard: { data: [ { id: "gpt-4" }, ... ] }
    if (Array.isArray(data.data)) {
      modelIds = data.data.map(m => (typeof m === 'string' ? m : m.id)).filter(Boolean);
    }
    // Ollama /api/tags or alternative: { models: [ { name: "llama3" }, ... ] }
    else if (Array.isArray(data.models)) {
      modelIds = data.models.map(m => m.name || m.id || m.model).filter(Boolean);
    }
    // Direct array: [ { id: "..." } ] or [ "..." ]
    else if (Array.isArray(data)) {
      modelIds = data.map(m => (typeof m === 'string' ? m : (m.id || m.name))).filter(Boolean);
    }

    // Sort alphabetically
    return modelIds.sort();
  } catch (err) {
    clearTimeout(timeoutId);
    logError(`[LLM] Failed discovering models from ${modelsUrl}:`, err.message);
    throw new Error(`Failed connecting to model provider (${err.name === 'AbortError' ? 'Connection timed out after 5s' : err.message})`);
  }
};

export const streamChatCompletion = async ({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature = 0.7,
  onChunk,
  onDone,
  onError
}) => {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const chatUrl = `${cleanBaseUrl}/chat/completions`;

  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey && apiKey.trim() !== '') {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const payload = {
    model,
    messages,
    stream: true,
    temperature
  };

  try {
    const res = await fetch(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`LLM upstream error ${res.status}: ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // preserve uncompleted line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // SSE comment or ping

        if (trimmed === 'data: [DONE]') {
          onDone();
          return;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              onChunk(delta);
            }
          } catch (jsonErr) {
            // ignore non-json SSE lines
          }
        }
      }
    }

    onDone();
  } catch (err) {
    logError(`[LLM] Stream chat error for model ${model}:`, err.message);
    onError(err);
  }
};
