import React, { useState, useEffect } from 'react';
import { X, Activity, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { apiListLogs } from '../api.js';

export const AuditLogsModal = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    apiListLogs({ limit: 50 })
      .then((res) => setLogs(res.logs || []))
      .catch((err) => console.error('Failed to load logs:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) fetchLogs();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-12 flex justify-center items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-base-100 rounded-2xl shadow-2xl border border-base-content/10 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden z-10 animate-scaleUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-info" />
            <h3 className="font-bold text-base">System & Ingestion Activity Logs</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchLogs}
              className="btn btn-xs btn-ghost gap-1"
              title="Refresh logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-ghost btn-square"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
          {loading && logs.length === 0 ? (
            <div className="text-center py-12 text-base-content/50 font-sans">
              Loading system activity...
            </div>
          ) : logs.length > 0 ? (
            logs.map((log) => {
              const dateStr = new Date(log.created_at).toLocaleTimeString();
              const isError = log.status === 'error';
              const isWarn = log.status === 'warn';

              return (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-lg border flex items-start justify-between gap-3 text-xs ${
                    isError
                      ? 'bg-error/10 border-error/20 text-error'
                      : isWarn
                      ? 'bg-warning/10 border-warning/20 text-warning'
                      : 'bg-base-200/50 border-base-content/5 text-base-content/85'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {isError ? (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-success" />
                    )}
                    <div>
                      <span className="font-bold tracking-wide mr-2">[{log.action}]</span>
                      <span className="opacity-90 break-all">{log.details}</span>
                    </div>
                  </div>
                  <span className="text-[10px] opacity-60 shrink-0">{dateStr}</span>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-base-content/50 font-sans">
              No audit records found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
