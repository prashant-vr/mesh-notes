import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import {
  Globe,
  Flame,
  KeyRound,
  Lock,
  Unlock,
  AlertTriangle,
  FlameKindling,
  Check,
  Tag,
  ArrowLeft,
  Moon,
  Sun,
  Loader2
} from 'lucide-react';
import { apiGetPublicShare, apiUnlockPublicShare } from '../api.js';

export const PublicShareView = ({ token }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  // Password unlock state
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState(null);

  // Theme state
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('mesh_theme') || 'dark';
    setIsDark(savedTheme !== 'light' && savedTheme !== 'cupcake');
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('mesh_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    if (!token) return;

    const fetchShare = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsExpired(false);
        const res = await apiGetPublicShare(token);
        setData(res);
      } catch (err) {
        if (err.status === 410 || err.message?.includes('expired') || err.message?.includes('limit')) {
          setIsExpired(true);
        } else {
          setError(err.message || 'Failed loading shared note.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchShare();
  }, [token]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    try {
      setUnlocking(true);
      setUnlockError(null);
      const res = await apiUnlockPublicShare(token, password.trim());
      setData(res);
    } catch (err) {
      if (err.status === 410) {
        setIsExpired(true);
      } else {
        setUnlockError(err.message || 'Incorrect password.');
      }
    } finally {
      setUnlocking(false);
    }
  };

  const renderMarkdown = (content) => {
    try {
      return { __html: marked.parse(content || '', { breaks: true }) };
    } catch (_) {
      return { __html: content };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-300 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
        <span className="text-xs text-base-content/60 font-mono">Loading shared note...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-300 flex flex-col items-center p-4 sm:p-6 text-base-content antialiased">
      {/* Top Navbar */}
      <header className="w-full max-w-2xl flex items-center justify-between py-3 mb-6 border-b border-base-content/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-content font-black text-sm shadow-sm">
            M
          </div>
          <span className="font-bold text-sm tracking-tight">Mesh Notes</span>
          <span className="badge badge-xs badge-neutral opacity-60">Shared</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-xs btn-ghost btn-square"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <a
            href="/"
            className="btn btn-xs btn-outline btn-primary gap-1"
          >
            <span>Open App</span>
          </a>
        </div>
      </header>

      {/* Expired / Burned State */}
      {isExpired ? (
        <div className="w-full max-w-md bg-base-100 border border-error/30 rounded-2xl p-6 text-center shadow-xl animate-fadeIn my-auto">
          <div className="w-12 h-12 rounded-2xl bg-error/15 text-error flex items-center justify-center mx-auto mb-3">
            <FlameKindling className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-base text-base-content mb-1">Note Has Expired</h2>
          <p className="text-xs text-base-content/70 leading-relaxed">
            This shared note was configured to self-destruct or has reached its maximum view limit. It is no longer accessible.
          </p>
          <div className="mt-5">
            <a href="/" className="btn btn-sm btn-ghost gap-1 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mesh Notes</span>
            </a>
          </div>
        </div>
      ) : error ? (
        <div className="w-full max-w-md bg-base-100 border border-base-content/10 rounded-2xl p-6 text-center shadow-xl my-auto">
          <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
          <h2 className="font-bold text-sm text-base-content mb-1">Unable to Load Note</h2>
          <p className="text-xs text-base-content/70">{error}</p>
        </div>
      ) : data?.is_protected ? (
        /* Password Protected Prompt */
        <div className="w-full max-w-sm bg-base-100 border border-base-content/15 rounded-2xl p-6 shadow-xl animate-fadeIn my-auto">
          <div className="w-12 h-12 rounded-2xl bg-warning/15 text-warning flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-base text-center mb-1">Password Protected</h2>
          <p className="text-xs text-base-content/60 text-center mb-4">
            This note requires a secret passphrase to unlock.
          </p>

          <form onSubmit={handleUnlock} className="flex flex-col gap-3">
            <input
              type="password"
              autoFocus
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-sm input-bordered w-full text-xs"
            />

            {unlockError && (
              <span className="text-error text-xs font-medium text-center">
                {unlockError}
              </span>
            )}

            <button
              type="submit"
              disabled={unlocking || !password.trim()}
              className="btn btn-sm btn-primary w-full gap-1"
            >
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              <span>Unlock Note</span>
            </button>
          </form>
        </div>
      ) : (
        /* Note Reading Card */
        <article className="w-full max-w-2xl bg-base-100 border border-base-content/10 rounded-2xl p-6 sm:p-8 shadow-md">
          {/* Metadata & Warning Banners */}
          <div className="flex items-center justify-between gap-2 border-b border-base-content/10 pb-3 mb-4 text-xs text-base-content/60 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base-content">
                @{data.author || 'anonymous'}
              </span>
              <span>·</span>
              <span>{new Date(data.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {data.share_type === 'public' && (
                <span className="badge badge-info badge-xs gap-1">
                  <Globe className="w-2.5 h-2.5" /> Public
                </span>
              )}
              {data.share_type === 'views_limit' && (
                <span className="badge badge-error badge-xs gap-1 font-semibold">
                  <Flame className="w-2.5 h-2.5" /> {data.max_views - data.view_count + (data.is_exhausted ? 0 : 0)} views left
                </span>
              )}
              {data.share_type === 'password' && (
                <span className="badge badge-warning badge-xs gap-1">
                  <KeyRound className="w-2.5 h-2.5" /> Protected
                </span>
              )}
            </div>
          </div>

          {/* Single-use burn warning banner */}
          {data.share_type === 'views_limit' && data.max_views === 1 && (
            <div className="alert alert-warning py-2 px-3 text-xs mb-4 rounded-xl flex items-center gap-2">
              <Flame className="w-4 h-4 text-warning shrink-0" />
              <span><strong>Burn after reading:</strong> This note will self-destruct once you navigate away or refresh.</span>
            </div>
          )}

          {/* Markdown content */}
          <div
            className="markdown-body text-sm leading-relaxed"
            dangerouslySetInnerHTML={renderMarkdown(data.content)}
          />

          {/* Tags */}
          {data.tags && data.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-4 mt-6 border-t border-base-content/10">
              {data.tags.map((tag) => (
                <span key={tag} className="badge badge-sm badge-outline gap-1 text-xs">
                  <Tag className="w-2.5 h-2.5 opacity-60" />
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>
      )}

      {/* Footer */}
      <footer className="mt-auto pt-8 pb-4 text-center text-xs text-base-content/40">
        Mesh Notes · Self-Hosted & Decentralized Note Stream
      </footer>
    </div>
  );
};
