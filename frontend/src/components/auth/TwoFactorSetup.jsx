import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, QrCode, Copy, CheckCircle, X, Loader } from 'lucide-react';
import { apiRequest } from '../../services/api';

export default function TwoFactorSetup({ onClose }) {
  const [step, setStep] = useState('status'); // 'status' | 'setup' | 'verify' | 'done'
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiRequest('/2fa/status');
      setIs2FAEnabled(data.isEnabled);
    } catch (e) {}
  };

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/2fa/setup', 'POST');
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes || []);
      setStep('setup');
    } catch (e) {
      setError(e.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!token || token.length !== 6) { setError('Please enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    try {
      await apiRequest('/2fa/verify', 'POST', { token });
      setIs2FAEnabled(true);
      setStep('done');
    } catch (e) {
      setError(e.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!token || token.length !== 6) { setError('Enter the 6-digit code to disable 2FA'); return; }
    setLoading(true);
    setError('');
    try {
      await apiRequest('/2fa/disable', 'POST', { token });
      setIs2FAEnabled(false);
      setToken('');
      setStep('status');
    } catch (e) {
      setError(e.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white font-display">Two-Factor Authentication</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status View */}
          {step === 'status' && (
            <>
              <div className={`flex items-center gap-4 p-4 rounded-2xl border ${is2FAEnabled ? 'bg-emerald-950/30 border-emerald-800' : 'bg-slate-800 border-slate-700'}`}>
                {is2FAEnabled
                  ? <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                  : <ShieldOff className="w-8 h-8 text-slate-400 flex-shrink-0" />
                }
                <div>
                  <p className="font-semibold text-white text-sm">{is2FAEnabled ? '2FA is Active' : '2FA is Disabled'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {is2FAEnabled
                      ? 'Your account is protected with a time-based one-time password.'
                      : 'Enable 2FA to secure your account with Google Authenticator or Authy.'}
                  </p>
                </div>
              </div>

              {!is2FAEnabled ? (
                <button onClick={handleSetup} disabled={loading} className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition-all">
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Enable Two-Factor Authentication
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 text-center">Enter your 6-digit authenticator code to disable 2FA</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-rose-500"
                  />
                  {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
                  <button onClick={handleDisable} disabled={loading} className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center gap-2 transition-all">
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                    Disable 2FA
                  </button>
                </div>
              )}
            </>
          )}

          {/* Setup View — QR Code */}
          {step === 'setup' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 text-center">Scan this QR code with <span className="text-indigo-400 font-semibold">Google Authenticator</span> or <span className="text-indigo-400 font-semibold">Authy</span></p>

              {qrCode && (
                <div className="flex justify-center p-4 bg-white rounded-2xl mx-auto w-48 h-48">
                  <img src={qrCode} alt="2FA QR Code" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-2">
                <code className="flex-1 text-xs text-slate-300 font-mono break-all">{secret}</code>
                <button onClick={copySecret} className="flex-shrink-0 p-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 text-center">Or enter the code manually if you can't scan</p>

              <button onClick={() => { setStep('verify'); setError(''); }} className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all">
                Next — Verify Code →
              </button>
            </div>
          )}

          {/* Verify Step */}
          {step === 'verify' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 text-center">Enter the <span className="text-indigo-400 font-semibold">6-digit code</span> from your authenticator app to confirm setup</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full px-4 py-4 bg-slate-950 border border-slate-700 rounded-xl text-white text-center text-3xl tracking-widest font-mono focus:outline-none focus:border-indigo-500"
              />
              {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
              <button onClick={handleVerify} disabled={loading || token.length !== 6} className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-all">
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Activate 2FA
              </button>
            </div>
          )}

          {/* Done View */}
          {step === 'done' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-white">2FA Enabled!</h4>
              <p className="text-sm text-slate-400">Your account is now protected. Save your backup codes in a safe place.</p>
              <div className="grid grid-cols-2 gap-2 bg-slate-800 rounded-2xl p-3">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-xs text-slate-300 font-mono text-center py-1 px-2 bg-slate-900 rounded-lg">{code}</code>
                ))}
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
