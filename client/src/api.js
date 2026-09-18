// Native fetch API client (ES6 functions only, NO axios, NO classes)
import { compressToWebP } from './utils/imageCompressor.js';

const getStoredToken = () => localStorage.getItem('mesh_notes_token');


export const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem('mesh_notes_token', token);
  } else {
    localStorage.removeItem('mesh_notes_token');
  }
};

const request = async (endpoint, options = {}) => {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle FormData (e.g. for file imports)
  if (options.body instanceof FormData) {
    delete headers['Content-Type']; // Let browser set boundary automatically
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (res.status === 401) {
    // If token invalidated or expired, trigger logout notification
    if (token) {
      setStoredToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message = (typeof data === 'object' && data.error) ? data.error : (data || res.statusText);
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
};

// 1. Auth API
export const apiLogin = (email, password) => {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
};

export const apiRegister = (email, password) => {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
};

export const apiGetMe = () => request('/api/auth/me');

export const apiVerifyEmail = (token) => {
  return request('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
};

export const apiResendVerification = (email) => {
  return request('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
};

export const apiLogout = () => {
  return request('/api/auth/logout', { method: 'POST' }).finally(() => {
    setStoredToken(null);
  });
};

export const apiChangePassword = (currentPassword, newPassword) => {
  return request('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
};

// 2. Admin API
export const apiGetAdminUsers = () => request('/api/admin/users');
export const apiUpdateUserStatus = (id, status) => request(`/api/admin/users/${id}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status })
});
export const apiUpdateUserRole = (id, role) => request(`/api/admin/users/${id}/role`, {
  method: 'PATCH',
  body: JSON.stringify({ role })
});
export const apiDeleteUser = (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' });

// 3. Memos API
export const apiListMemos = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, v);
  });
  return request(`/api/memos?${query.toString()}`);
};

export const apiCreateMemo = (data) => request('/api/memos', {
  method: 'POST',
  body: JSON.stringify(data)
});

export const apiGetMemo = (id) => request(`/api/memos/${id}`);

export const apiUpdateMemo = (id, data) => request(`/api/memos/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(data)
});

export const apiDeleteMemo = (id) => request(`/api/memos/${id}`, { method: 'DELETE' });

// 4. Bookmarks & Reader API
export const apiListBookmarks = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, v);
  });
  return request(`/api/bookmarks?${query.toString()}`);
};

export const apiGetReaderContent = (id) => request(`/api/bookmarks/${id}/reader`);

export const apiUpdateBookmarkStatus = (id, status) => request(`/api/bookmarks/${id}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status })
});

export const apiDeleteBookmark = (id) => request(`/api/bookmarks/${id}`, { method: 'DELETE' });

// 5. Folders API
export const apiListFolders = () => request('/api/folders');
export const apiCreateFolder = (data) => request('/api/folders', {
  method: 'POST',
  body: JSON.stringify(data)
});
export const apiUpdateFolder = (id, data) => request(`/api/folders/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(data)
});
export const apiDeleteFolder = (id, cascade = false) => request(`/api/folders/${id}?cascade=${cascade}`, {
  method: 'DELETE'
});

// 6. Tags API
export const apiListTags = () => request('/api/tags');
export const apiDeleteTag = (id) => request(`/api/tags/${id}`, { method: 'DELETE' });

// 7. LLM Management API
export const apiListLlmProviders = () => request('/api/llm/providers');
export const apiCreateLlmProvider = (data) => request('/api/llm/providers', {
  method: 'POST',
  body: JSON.stringify(data)
});
export const apiDeleteLlmProvider = (id) => request(`/api/llm/providers/${id}`, { method: 'DELETE' });
export const apiDiscoverModels = (data) => request('/api/llm/discover-models', {
  method: 'POST',
  body: JSON.stringify(data)
});
export const apiGetLlmConfig = () => request('/api/llm/config');
export const apiUpdateLlmConfig = (data) => request('/api/llm/config', {
  method: 'PUT',
  body: JSON.stringify(data)
});

// 8. AI Prompts & SSE Stream API
export const apiListPrompts = (eventType) => {
  const query = eventType ? `?event_type=${eventType}` : '';
  return request(`/api/ai/prompts${query}`);
};
export const apiCreatePrompt = (data) => request('/api/ai/prompts', {
  method: 'POST',
  body: JSON.stringify(data)
});
export const apiUpdatePrompt = (id, data) => request(`/api/ai/prompts/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(data)
});
export const apiDeletePrompt = (id) => request(`/api/ai/prompts/${id}`, { method: 'DELETE' });

export const apiStreamAI = async ({
  providerId,
  model,
  eventType,
  promptId,
  customInstruction,
  selectedText,
  contextText,
  onChunk,
  onDone,
  onError
}) => {
  const token = getStoredToken();
  const res = await fetch('/api/ai/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      provider_id: providerId,
      model,
      event_type: eventType,
      prompt_id: promptId,
      custom_instruction: customInstruction,
      selected_text: selectedText,
      context_text: contextText
    })
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    onError(new Error(errorText || 'AI Stream failed'));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      if (trimmed === 'data: [DONE]') {
        onDone();
        return;
      }
      if (trimmed.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          if (parsed.error) {
            onError(new Error(parsed.error));
            return;
          }
          if (parsed.chunk) {
            onChunk(parsed.chunk);
          }
        } catch (_) {}
      }
    }
  }
  onDone();
};

// 9. Data Management API
export const apiImportFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/data/import', {
    method: 'POST',
    body: formData
  });
};

export const apiPurgeData = (target, confirm) => request('/api/data/purge', {
  method: 'POST',
  body: JSON.stringify({ target, confirm })
});

// 10. Audit Logs API
export const apiListLogs = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) query.append(k, v);
  });
  return request(`/api/logs?${query.toString()}`);
};

// 11. Uploads API
export const apiUploadImage = async (file) => {
  const compressedFile = await compressToWebP(file);
  const formData = new FormData();
  formData.append('file', compressedFile);
  return request('/api/uploads', {
    method: 'POST',
    body: formData
  });
};


// 12. Shares API
export const apiCreateShare = (data) => request('/api/shares', {
  method: 'POST',
  body: JSON.stringify(data)
});

export const apiListMemoShares = (memoId) => request(`/api/shares/memo/${memoId}`);

export const apiRevokeShare = (id) => request(`/api/shares/${id}`, {
  method: 'DELETE'
});

export const apiGetPublicShare = (token) => request(`/api/shares/view/${token}`);

export const apiUnlockPublicShare = (token, password) => request(`/api/shares/view/${token}/unlock`, {
  method: 'POST',
  body: JSON.stringify({ password })
});
