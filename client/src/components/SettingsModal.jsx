import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Database,
  Cpu,
  Key,
  Download,
  Upload,
  Trash2,
  Check,
  AlertTriangle,
  RefreshCw,
  Plus,
  Shield,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  apiChangePassword,
  apiGetAdminUsers,
  apiUpdateUserStatus,
  apiUpdateUserRole,
  apiDeleteUser,
  apiListLlmProviders,
  apiCreateLlmProvider,
  apiDeleteLlmProvider,
  apiDiscoverModels,
  apiGetLlmConfig,
  apiUpdateLlmConfig,
  apiListPrompts,
  apiCreatePrompt,
  apiDeletePrompt,
  apiImportFile,
  apiPurgeData
} from '../api.js';

export const SettingsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('account'); // 'account' | 'data' | 'llm'

  // Account State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Super Admin Users State
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Data Management State
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [purgeMsg, setPurgeMsg] = useState(null);

  // LLM State
  const [providers, setProviders] = useState([]);
  const [newProviderLabel, setNewProviderLabel] = useState('');
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState('https://api.openai.com/v1');
  const [newProviderApiKey, setNewProviderApiKey] = useState('');
  const [llmConfig, setLlmConfig] = useState({
    default_generation_provider_id: '',
    default_generation_model: '',
    default_selection_provider_id: '',
    default_selection_model: ''
  });
  const [discoveredModels, setDiscoveredModels] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState(null);
  const [llmSavedMsg, setLlmSavedMsg] = useState(null);

  // AI Prompts State
  const [prompts, setPrompts] = useState([]);
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptEventType, setPromptEventType] = useState('selection');
  const [promptSystem, setPromptSystem] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('{{input}}');

  useEffect(() => {
    if (!isOpen) return;

    // Load LLM providers and config
    apiListLlmProviders().then(r => setProviders(r.providers || [])).catch(() => {});
    apiGetLlmConfig().then(r => {
      if (r.config) setLlmConfig(r.config);
    }).catch(() => {});
    apiListPrompts().then(r => setPrompts(r.prompts || [])).catch(() => {});

    // Load admin users if superadmin
    if (user?.role === 'superadmin') {
      loadAdminUsers();
    }
  }, [isOpen, user]);

  const loadAdminUsers = () => {
    setLoadingUsers(true);
    apiGetAdminUsers()
      .then(r => setAdminUsers(r.users || []))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    try {
      await apiChangePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password updated. Other sessions invalidated.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    }
  };

  const handleAdminUpdateStatus = async (targetId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await apiUpdateUserStatus(targetId, nextStatus);
      loadAdminUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAdminUpdateRole = async (targetId, currentRole) => {
    const nextRole = currentRole === 'user' ? 'admin' : 'user';
    try {
      await apiUpdateUserRole(targetId, nextRole);
      loadAdminUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAdminDeleteUser = async (targetId) => {
    if (!confirm('Permanently delete this user and all their notes?')) return;
    try {
      await apiDeleteUser(targetId);
      loadAdminUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateProvider = async (e) => {
    e.preventDefault();
    if (!newProviderLabel.trim() || !newProviderBaseUrl.trim()) return;

    try {
      await apiCreateLlmProvider({
        label: newProviderLabel.trim(),
        base_url: newProviderBaseUrl.trim(),
        api_key: newProviderApiKey.trim()
      });
      setNewProviderLabel('');
      setNewProviderApiKey('');
      const pRes = await apiListLlmProviders();
      setProviders(pRes.providers || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteProvider = async (id) => {
    try {
      await apiDeleteLlmProvider(id);
      setProviders(providers.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDiscoverModels = async (providerId) => {
    setDiscovering(true);
    setDiscoveryError(null);
    try {
      const res = await apiDiscoverModels({ provider_id: providerId });
      setDiscoveredModels(res.models || []);
    } catch (err) {
      setDiscoveryError(err.message);
    } finally {
      setDiscovering(false);
    }
  };

  const handleSaveLlmConfig = async () => {
    try {
      await apiUpdateLlmConfig(llmConfig);
      setLlmSavedMsg('Default models saved successfully.');
      setTimeout(() => setLlmSavedMsg(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreatePrompt = async (e) => {
    e.preventDefault();
    if (!promptTitle.trim() || !promptTemplate.trim()) return;

    try {
      await apiCreatePrompt({
        title: promptTitle.trim(),
        event_type: promptEventType,
        system_prompt: promptSystem.trim(),
        user_prompt_template: promptTemplate.trim()
      });
      setPromptTitle('');
      setPromptSystem('');
      setPromptTemplate('{{input}}');
      setShowNewPrompt(false);
      const prRes = await apiListPrompts();
      setPrompts(prRes.prompts || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePrompt = async (id) => {
    try {
      await apiDeletePrompt(id);
      setPrompts(prompts.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    setImportLoading(true);
    setImportMsg(null);
    try {
      const res = await apiImportFile(importFile);
      setImportMsg({ type: 'success', text: res.message });
      setImportFile(null);
    } catch (err) {
      setImportMsg({ type: 'error', text: err.message });
    } finally {
      setImportLoading(false);
    }
  };

  const handlePurgeCache = async () => {
    if (!confirm('Clear all cached reader articles?')) return;
    try {
      const res = await apiPurgeData('cache');
      setPurgeMsg({ type: 'success', text: res.message });
    } catch (err) {
      setPurgeMsg({ type: 'error', text: err.message });
    }
  };

  const handlePurgeAccount = async () => {
    const confirmation = prompt('Type "WIPE" to permanently erase all your personal notes, bookmarks, and folders:');
    if (confirmation !== 'WIPE') return;

    try {
      const res = await apiPurgeData('account', 'WIPE');
      setPurgeMsg({ type: 'success', text: res.message });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setPurgeMsg({ type: 'error', text: err.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 flex justify-center items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Settings Modal Container */}
      <div className="relative bg-base-100 rounded-2xl shadow-2xl border border-base-content/10 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden z-10 animate-scaleUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg">Settings Hub</h2>
            <span className="badge badge-neutral text-xs">v1.0.0</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-square"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-base-content/10 bg-base-200/30 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'account'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/60 hover:text-base-content'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Manage Account</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'data'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/60 hover:text-base-content'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Data Management</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('llm')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'llm'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/60 hover:text-base-content'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>LLM & AI Prompts</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: MANAGE ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="card bg-base-200/50 p-4 border border-base-content/5">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Account Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-base-content/60 block mb-1">Email Address</span>
                    <span className="font-mono bg-base-100 p-2 rounded block border border-base-content/10">
                      {user?.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-base-content/60 block mb-1">Assigned Role</span>
                    <span className="badge badge-primary font-mono uppercase">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Password Change */}
              <div className="card bg-base-200/50 p-4 border border-base-content/5">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Update Password
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                  <div>
                    <label className="text-xs text-base-content/60 block mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="input input-sm input-bordered w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-base-content/60 block mb-1">New Password (min 6 chars)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input input-sm input-bordered w-full text-xs"
                    />
                  </div>
                  <button type="submit" className="btn btn-sm btn-primary">
                    Update Password
                  </button>

                  {passwordMsg && (
                    <div className={`alert text-xs py-2 ${passwordMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                      <span>{passwordMsg.text}</span>
                    </div>
                  )}
                </form>
              </div>

              {/* Super Admin Control Panel */}
              {user?.role === 'superadmin' && (
                <div className="card bg-base-200/50 p-4 border border-warning/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-warning">
                      <Shield className="w-4 h-4" />
                      Super Admin User Control Panel
                    </h3>
                    <button
                      type="button"
                      onClick={loadAdminUsers}
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table table-xs w-full">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map((u) => (
                          <tr key={u.id}>
                            <td className="font-mono text-xs">{u.email}</td>
                            <td>
                              <span className={`badge badge-xs ${u.role === 'superadmin' ? 'badge-primary' : u.role === 'admin' ? 'badge-secondary' : 'badge-ghost'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-xs ${u.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                                {u.status}
                              </span>
                            </td>
                            <td>
                              {u.id !== user.id && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAdminUpdateStatus(u.id, u.status)}
                                    className="btn btn-xs btn-ghost"
                                  >
                                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminUpdateRole(u.id, u.role)}
                                    className="btn btn-xs btn-ghost"
                                  >
                                    {u.role === 'user' ? 'Make Admin' : 'Demote'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminDeleteUser(u.id)}
                                    className="btn btn-xs btn-ghost text-error"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DATA MANAGEMENT */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Import Card */}
              <div className="card bg-base-200/50 p-4 border border-base-content/5">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  Import Bookmarks & Notes
                </h3>
                <p className="text-xs text-base-content/60 mb-3">
                  Upload standard browser bookmark exports (<code>bookmarks.html</code>), Netscape format, JSON archives, or CSV files.
                </p>

                <form onSubmit={handleImportSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md">
                  <input
                    type="file"
                    accept=".html,.htm,.json,.csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="file-input file-input-sm file-input-bordered w-full text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!importFile || importLoading}
                    className="btn btn-sm btn-primary shrink-0"
                  >
                    {importLoading ? <span className="loading loading-spinner loading-xs" /> : 'Import'}
                  </button>
                </form>

                {importMsg && (
                  <div className={`alert text-xs py-2 mt-3 ${importMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    <span>{importMsg.text}</span>
                  </div>
                )}
              </div>

              {/* Export Card */}
              <div className="card bg-base-200/50 p-4 border border-base-content/5">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" />
                  Complete Data Export
                </h3>
                <p className="text-xs text-base-content/60 mb-3">
                  Download a complete zip archive containing all notes as individual Markdown files with YAML frontmatter, standard Netscape <code>bookmarks.html</code>, and full JSON backup.
                </p>
                <a
                  href="/api/data/export"
                  download
                  className="btn btn-sm btn-outline btn-primary gap-2 w-fit"
                >
                  <Download className="w-4 h-4" />
                  Download Complete Zip Archive
                </a>
              </div>

              {/* Purge Card */}
              <div className="card bg-base-200/50 p-4 border border-error/20">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-error">
                  <AlertTriangle className="w-4 h-4" />
                  Data Purge & Cleanup
                </h3>
                <p className="text-xs text-base-content/60 mb-3">
                  Clean up cached web readability content or completely wipe your personal notes and bookmarks.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handlePurgeCache}
                    className="btn btn-sm btn-outline btn-warning text-xs"
                  >
                    Clear Cached Article Content
                  </button>
                  <button
                    type="button"
                    onClick={handlePurgeAccount}
                    className="btn btn-sm btn-error text-xs"
                  >
                    Wipe Personal Account Data
                  </button>
                </div>

                {purgeMsg && (
                  <div className="alert alert-info text-xs py-2 mt-3">
                    <span>{purgeMsg.text}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LLM & AI PROMPTS */}
          {activeTab === 'llm' && (
            <div className="space-y-6">
              {/* LLM Providers List */}
              <div className="card bg-base-200/50 p-4 border border-base-content/5">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  Configured LLM Providers (BYOK)
                </h3>
                <p className="text-xs text-base-content/60 mb-3">
                  Connect any OpenAI-compatible API endpoint (Ollama, OpenAI, OpenRouter, Groq, LocalAI).
                </p>

                {providers.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {providers.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-base-100 rounded-xl border border-base-content/10 flex items-center justify-between flex-wrap gap-2 text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{p.label}</span>
                          <span className="font-mono text-[11px] text-base-content/60">{p.base_url}</span>
                          <span className="text-[10px] text-base-content/50">Key: {p.api_key_masked || 'None'}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={discovering}
                            onClick={() => handleDiscoverModels(p.id)}
                            className="btn btn-xs btn-outline btn-primary gap-1"
                            title="Probing /models endpoint with 5s timeout"
                          >
                            <RefreshCw className={`w-3 h-3 ${discovering ? 'animate-spin' : ''}`} />
                            Discover Models
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProvider(p.id)}
                            className="btn btn-xs btn-ghost text-error"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-base-content/50 italic mb-4">No LLM providers configured yet.</p>
                )}

                {discoveryError && (
                  <div className="alert alert-error text-xs py-2 mb-3">
                    <span>{discoveryError}</span>
                  </div>
                )}

                {/* Add Provider Form */}
                <form onSubmit={handleCreateProvider} className="p-3 bg-base-100/70 rounded-xl border border-base-content/10 space-y-2">
                  <span className="font-semibold text-xs block">Add New Provider</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Label (e.g. Local Ollama, Groq)"
                      value={newProviderLabel}
                      onChange={(e) => setNewProviderLabel(e.target.value)}
                      className="input input-xs input-bordered text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="API Base URL (e.g. http://localhost:11434/v1)"
                      value={newProviderBaseUrl}
                      onChange={(e) => setNewProviderBaseUrl(e.target.value)}
                      className="input input-xs input-bordered text-xs"
                    />
                    <input
                      type="password"
                      placeholder="API Key (optional for local)"
                      value={newProviderApiKey}
                      onChange={(e) => setNewProviderApiKey(e.target.value)}
                      className="input input-xs input-bordered text-xs"
                    />
                  </div>
                  <button type="submit" className="btn btn-xs btn-primary gap-1">
                    <Plus className="w-3 h-3" />
                    Add Provider
                  </button>
                </form>
              </div>

              {/* Default Model Assignments */}
              <div className="card bg-base-200/50 p-4 border border-base-content/5">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  Default Model Configuration
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-base-content/70 block mb-1 font-medium">Default Generation Model (Ask AI / /ai)</label>
                    <select
                      value={llmConfig.default_generation_provider_id || ''}
                      onChange={(e) => setLlmConfig({ ...llmConfig, default_generation_provider_id: e.target.value })}
                      className="select select-xs select-bordered w-full mb-1"
                    >
                      <option value="">Select Provider...</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Model ID (e.g. llama3.2, gpt-4o-mini)"
                      value={llmConfig.default_generation_model || ''}
                      onChange={(e) => setLlmConfig({ ...llmConfig, default_generation_model: e.target.value })}
                      className="input input-xs input-bordered w-full"
                    />
                    {discoveredModels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                        {discoveredModels.slice(0, 10).map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setLlmConfig({ ...llmConfig, default_generation_model: m })}
                            className="badge badge-xs badge-outline cursor-pointer hover:badge-primary text-[10px]"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-base-content/70 block mb-1 font-medium">Default Selection Model (Highlight Transformation)</label>
                    <select
                      value={llmConfig.default_selection_provider_id || ''}
                      onChange={(e) => setLlmConfig({ ...llmConfig, default_selection_provider_id: e.target.value })}
                      className="select select-xs select-bordered w-full mb-1"
                    >
                      <option value="">Select Provider...</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Model ID (e.g. llama3.2, gpt-4o-mini)"
                      value={llmConfig.default_selection_model || ''}
                      onChange={(e) => setLlmConfig({ ...llmConfig, default_selection_model: e.target.value })}
                      className="input input-xs input-bordered w-full"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveLlmConfig}
                    className="btn btn-xs btn-primary gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Save Defaults
                  </button>
                  {llmSavedMsg && <span className="text-xs text-success">{llmSavedMsg}</span>}
                </div>
              </div>

              {/* Custom Prompt Templates */}
              <div className="card bg-base-200/50 p-4 border border-base-content/5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Prompt Template Library
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNewPrompt(!showNewPrompt)}
                    className="btn btn-xs btn-outline btn-primary gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    New Prompt
                  </button>
                </div>

                {showNewPrompt && (
                  <form onSubmit={handleCreatePrompt} className="p-3 bg-base-100 rounded-xl border border-base-content/10 mb-3 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Prompt Title (e.g. Key Takeaways)"
                        value={promptTitle}
                        onChange={(e) => setPromptTitle(e.target.value)}
                        className="input input-xs input-bordered"
                      />
                      <select
                        value={promptEventType}
                        onChange={(e) => setPromptEventType(e.target.value)}
                        className="select select-xs select-bordered"
                      >
                        <option value="selection">Selection Event (Transform Highlight)</option>
                        <option value="generation">Generation Event (Draft From Scratch)</option>
                      </select>
                    </div>
                    <textarea
                      placeholder="System Prompt (Optional)"
                      value={promptSystem}
                      onChange={(e) => setPromptSystem(e.target.value)}
                      className="textarea textarea-bordered textarea-xs w-full"
                      rows={2}
                    />
                    <textarea
                      required
                      placeholder="User Prompt Template (use {{input}} and {{context}} tokens)"
                      value={promptTemplate}
                      onChange={(e) => setPromptTemplate(e.target.value)}
                      className="textarea textarea-bordered textarea-xs w-full font-mono"
                      rows={2}
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setShowNewPrompt(false)}
                        className="btn btn-xs btn-ghost"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-xs btn-primary">
                        Save Prompt
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {prompts.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-base-100 rounded-lg border border-base-content/10 flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{p.title}</span>
                          <span className="badge badge-xs badge-neutral text-[9px]">{p.event_type}</span>
                          {p.user_id === null && <span className="badge badge-xs badge-ghost text-[9px]">System Default</span>}
                        </div>
                        <span className="text-[11px] text-base-content/60 font-mono truncate max-w-md mt-0.5">
                          {p.user_prompt_template}
                        </span>
                      </div>

                      {p.user_id && (
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(p.id)}
                          className="btn btn-xs btn-ghost text-error"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
