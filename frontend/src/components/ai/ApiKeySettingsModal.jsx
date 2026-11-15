import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Key, Loader2, Shield, X } from 'lucide-react';
import { getAiConfig, getStoredGeminiKey, setStoredGeminiKey } from '../../api/ai';

export default function ApiKeySettingsModal({ isOpen, onClose, onKeySaved, toast }) {
  const [apiKey, setApiKey] = useState('');
  const [backendConfigured, setBackendConfigured] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredGeminiKey());
      setTestResult(null);
      checkConfig();
    }
  }, [isOpen]);

  const checkConfig = async () => {
    const config = await getAiConfig();
    setBackendConfigured(config.configured);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredGeminiKey(apiKey);
    if (toast) toast(apiKey.trim() ? 'Gemini API key saved!' : 'Custom Gemini API key cleared');
    if (onKeySaved) onKeySaved(apiKey);
    onClose();
  };

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim() || (backendConfigured ? 'BACKEND' : '');
    if (!keyToTest) {
      setTestResult({ success: false, message: 'Please enter a Gemini API key first.' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with the word OK if you receive this.' }] }],
        }),
      });

      if (res.ok) {
        setTestResult({ success: true, message: 'Connection successful! Gemini 2.5 Flash is active and responding.' });
      } else {
        const err = await res.json().catch(() => ({}));
        setTestResult({ success: false, message: err?.error?.message || `Status ${res.status}: Failed to reach Gemini.` });
      }
    } catch (e) {
      setTestResult({ success: false, message: `Network error: ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card border border-line rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-card2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand grid place-items-center">
              <Key size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Gemini AI Configuration</h3>
              <p className="text-xs text-ink2">Manage your Google Gemini API credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-ink2 hover:bg-hov hover:text-ink transition">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {backendConfigured && (
            <div className="p-3 rounded-xl bg-ok/10 border border-ok/20 flex items-start gap-2.5 text-xs text-ink">
              <CheckCircle2 size={16} className="text-ok shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-ok">Backend Server Key Active:</span> A <code className="bg-white/60 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> is configured on the Zentriq backend. You can still supply an override below if needed.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full h-10 px-3.5 rounded-xl border border-line bg-card2 text-sm text-ink placeholder:text-mute focus:outline-hidden focus:ring-2 focus:ring-brand/30 focus:border-brand font-mono"
              />
            </div>
            <p className="text-xs text-ink2 mt-1.5 flex items-center justify-between">
              <span>Key is stored securely in your browser session.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline font-medium"
              >
                Get a free Gemini API key <ExternalLink size={12} />
              </a>
            </p>
          </div>

          {/* Test connection results */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs ${testResult.success ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <div className="font-semibold mb-0.5">{testResult.success ? '✓ Key Validated' : '✕ Connection Error'}</div>
              <div>{testResult.message}</div>
            </div>
          )}

          <div className="rounded-xl border border-line bg-card2 p-3.5 space-y-2 text-xs text-ink2">
            <div className="font-semibold text-ink flex items-center gap-1.5">
              <Shield size={14} className="text-brand" /> Privacy & Security Note
            </div>
            <p>
              Your problem statements are processed securely via the official Gemini API for structured PRD generation. The primary model used is <b className="text-ink">Gemini 2.5 Flash</b>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-line bg-card2">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={testing || !apiKey.trim()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition disabled:opacity-50"
          >
            {testing ? <Loader2 size={13} className="animate-spin text-brand" /> : <Key size={13} />}
            <span>{testing ? 'Testing Key…' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-9 px-4 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-medium transition shadow-xs"
            >
              Save Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
