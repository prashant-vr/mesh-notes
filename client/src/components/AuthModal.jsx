import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiVerifyEmail, apiResendVerification } from '../api.js';

export const AuthView = () => {
  const { login, register, verifyEmail } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null); // 'success' | 'error' | null
  const [needsVerificationNotice, setNeedsVerificationNotice] = useState(false);
  const [resending, setResending] = useState(false);

  // Check URL query parameters for ?verify=token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verify');
    if (token) {
      setVerifying(true);
      apiVerifyEmail(token)
        .then((res) => {
          setVerifyStatus('success');
          setSuccessMsg('Email verified successfully! You are now signed in.');
          verifyEmail(res.token, res.user);
          // Clean up URL parameter without full reload
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          setVerifyStatus('error');
          setError(err.message || 'Verification token is invalid or has expired.');
        })
        .finally(() => {
          setVerifying(false);
        });
    }
  }, [verifyEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await register(email, password);
        if (res.email_verification_required && res.user.email_verified === 0) {
          setNeedsVerificationNotice(true);
          setSuccessMsg('Account created! A verification link has been sent to your email.');
        }
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address to resend verification.');
      return;
    }
    setResending(true);
    setError(null);
    try {
      const res = await apiResendVerification(email);
      setSuccessMsg(res.message || 'Verification link resent. Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-300 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-2xl border border-base-content/10 p-6 sm:p-8 animate-scaleUp">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-content font-black text-2xl shadow-md mb-3">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Mesh Notes</h1>
          <p className="text-xs text-base-content/60 mt-1">
            Self-hosted notes, link archiving & BYOK AI assistant
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-base-content/70 block mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-base-content/40 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full pl-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-base-content/70 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-base-content/40 absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full pl-9 text-sm"
              />
            </div>
          </div>

          {verifying && (
            <div className="alert alert-info text-xs py-2 mb-3">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Verifying your email token...</span>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success text-xs py-2 mb-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error text-xs py-2 mb-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {needsVerificationNotice && (
            <div className="bg-base-200 p-3 rounded-lg border border-base-content/10 text-xs space-y-2 mb-3">
              <p className="font-semibold text-base-content">Verify your email address</p>
              <p className="text-base-content/70">
                We sent a confirmation link to <span className="font-mono font-medium">{email}</span>. Please click the link to activate all workspace features.
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="btn btn-xs btn-outline w-full"
              >
                {resending ? 'Resending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || verifying}
            className="btn btn-primary w-full gap-2 mt-2 shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="divider text-xs text-base-content/40 my-4">OR</div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-primary hover:underline font-medium"
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-base-content/5 text-center text-[11px] text-base-content/40 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span>Secured with 1-year token versioning & WAL SQLite</span>
        </div>
      </div>
    </div>
  );
};
