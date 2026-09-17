import React, { useState, useEffect } from 'react';
import {
  Globe,
  Flame,
  KeyRound,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Eye,
  Loader2,
  X
} from 'lucide-react';
import { apiCreateShare, apiListMemoShares, apiRevokeShare } from '../api.js';

export const ShareModal = ({ memo, isOpen, onClose, onUpdateMemo }) => {
  const [activeTab, setActiveTab] = useState('public'); // 'public' | 'views_limit' | 'password'
  const [maxViews, setMaxViews] = useState(1);
  const [password, setPassword] = useState('');
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);

  const fetchShares = async () => {
    if (!memo) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiListMemoShares(memo.id);
      setShares(res.shares || []);
    } catch (err) {
      console.error('Failed fetching shares:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && memo) {
      fetchShares();
      setPassword('');
      setMaxViews(1);
      setError(null);
    }
  }, [isOpen, memo]);

  if (!isOpen || !memo) return null;

  const handleCreateShare = async () => {
    try {
      setCreating(true);
      setError(null);

      const payload = {
        memo_id: memo.id,
        share_type: activeTab
      };

      if (activeTab === 'views_limit') {
        payload.max_views = Math.max(1, parseInt(maxViews, 10) || 1);
      } else if (activeTab === 'password') {
        if (!password.trim()) {
          setError('Password cannot be empty.');
          setCreating(false);
          return;
        }
        payload.password = password.trim();
        if (maxViews && parseInt(maxViews, 10) > 0) {
          payload.max_views = parseInt(maxViews, 10);
        }
      }

      await apiCreateShare(payload);
      if (activeTab === 'public' && onUpdateMemo) {
        onUpdateMemo(memo.id, { visibility: 'public' });
      }
      await fetchShares();
      setPassword('');
    } catch (err) {
      console.error('Failed creating share:', err);
      setError(err.message || 'Failed creating share link.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeShare = async (id) => {
    try {
      await apiRevokeShare(id);
      await fetchShares();
    } catch (err) {
      console.error('Failed revoking share:', err);
      setError(err.message || 'Failed revoking share.');
    }
  };

  const copyToClipboard = (shareId, url) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-md p-5 border border-base-content/15 shadow-2xl bg-base-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">Share Note Link</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-xs btn-ghost btn-square"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="tabs tabs-boxed bg-base-200/80 p-1 my-3 text-xs grid grid-cols-3">
          <button
            type="button"
            className={`tab tab-xs gap-1 py-1.5 h-auto ${activeTab === 'public' ? 'tab-active font-semibold' : ''}`}
            onClick={() => setActiveTab('public')}
          >
            <Globe className="w-3.5 h-3.5 text-info" />
            <span>Public</span>
          </button>
          <button
            type="button"
            className={`tab tab-xs gap-1 py-1.5 h-auto ${activeTab === 'views_limit' ? 'tab-active font-semibold' : ''}`}
            onClick={() => setActiveTab('views_limit')}
          >
            <Flame className="w-3.5 h-3.5 text-error" />
            <span>N Views</span>
          </button>
          <button
            type="button"
            className={`tab tab-xs gap-1 py-1.5 h-auto ${activeTab === 'password' ? 'tab-active font-semibold' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <KeyRound className="w-3.5 h-3.5 text-warning" />
            <span>Password</span>
          </button>
        </div>

        {/* Tab Description & Form */}
        <div className="bg-base-200/50 p-3 rounded-xl border border-base-content/10 text-xs mb-3">
          {activeTab === 'public' && (
            <div>
              <p className="text-base-content/70 mb-2">
                Generates a permanent public link. Anyone with the URL can view this note until you revoke it.
              </p>
            </div>
          )}

          {activeTab === 'views_limit' && (
            <div>
              <p className="text-base-content/70 mb-2">
                <strong>Burn after reading:</strong> Note link will self-destruct after reaching the specified view count. Afterwards, the note automatically reverts to private.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-base-content/80 whitespace-nowrap">Max views:</label>
                <select
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  className="select select-bordered select-xs w-32"
                >
                  <option value={1}>1 View (Single-use)</option>
                  <option value={3}>3 Views</option>
                  <option value={5}>5 Views</option>
                  <option value={10}>10 Views</option>
                  <option value={25}>25 Views</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div>
              <p className="text-base-content/70 mb-2">
                Protect this note with a secret passphrase. Visitors must enter this password to view content.
              </p>
              <div className="flex flex-col gap-2 mt-2">
                <input
                  type="password"
                  placeholder="Set secret password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered input-xs w-full text-xs"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-base-content/70">Optional view limit:</label>
                  <select
                    value={maxViews}
                    onChange={(e) => setMaxViews(e.target.value)}
                    className="select select-bordered select-xs w-28"
                  >
                    <option value={0}>Unlimited</option>
                    <option value={1}>1 View</option>
                    <option value={5}>5 Views</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-error text-[11px] mt-2 font-medium">
              {error}
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={creating}
              onClick={handleCreateShare}
              className="btn btn-xs btn-primary gap-1 font-medium"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              <span>Generate Share Link</span>
            </button>
          </div>
        </div>

        {/* Active Share Links List */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50 block mb-1">
            Active Links ({shares.length})
          </span>

          {loading ? (
            <div className="py-4 text-center">
              <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-4 text-xs text-base-content/40 italic">
              No active share links for this note.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {shares.map((s) => {
                const isCopied = copiedId === s.id;
                const shareUrl = `/s/${s.id}`;

                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-base-200/80 border border-base-content/10 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-2">
                      {s.share_type === 'public' && (
                        <span className="badge badge-info badge-xs gap-1 shrink-0 font-medium">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      )}
                      {s.share_type === 'views_limit' && (
                        <span className="badge badge-error badge-xs gap-1 shrink-0 font-medium">
                          <Flame className="w-2.5 h-2.5" /> {s.view_count}/{s.max_views} Views
                        </span>
                      )}
                      {s.share_type === 'password' && (
                        <span className="badge badge-warning badge-xs gap-1 shrink-0 font-medium">
                          <KeyRound className="w-2.5 h-2.5" /> Password
                        </span>
                      )}

                      <span className="font-mono text-[11px] truncate opacity-70">
                        {shareUrl}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(s.id, shareUrl)}
                        className={`btn btn-xs btn-square ${isCopied ? 'btn-success text-success-content' : 'btn-ghost text-base-content/60'}`}
                        title="Copy link"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-xs btn-ghost btn-square text-base-content/60"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleRevokeShare(s.id)}
                        className="btn btn-xs btn-ghost btn-square text-error/60 hover:text-error"
                        title="Revoke link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-action mt-3">
          <button type="button" className="btn btn-xs btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose} />
    </div>
  );
};
