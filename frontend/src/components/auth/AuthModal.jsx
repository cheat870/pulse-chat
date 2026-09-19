import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Lock, Mail, User, Phone, Camera, Sparkles, AlertCircle, Settings, Check, X, ExternalLink } from 'lucide-react';

export default function AuthModal() {
  const { login, register, loginWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  // Form State
  const [loginId, setLoginId] = useState(() => {
    try {
      return localStorage.getItem('pulsechat_remembered_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('pulsechat_remembered_email') || '';
    } catch {
      return '';
    }
  });
  const [phone, setPhone] = useState('');
  const [statusText, setStatusText] = useState('Available');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google OAuth State
  const DEFAULT_GOOGLE_CLIENT_ID = '715090036708-71i01i4rjoql423jajv2580vm6up658t.apps.googleusercontent.com';
  const [googleClientId, setGoogleClientId] = useState(() => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('pulsechat_google_client_id') || DEFAULT_GOOGLE_CLIENT_ID;
  });
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');

  const fetchGoogleProfileAndLogin = async (accessToken) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const googleProfile = await res.json();
      if (!googleProfile.email) {
        throw new Error('Could not retrieve email from Google account');
      }
      await loginWithGoogle({ profile: googleProfile });
    } catch (err) {
      setError(err.message || 'Failed to complete Google Sign-In');
    } finally {
      setLoading(false);
    }
  };

  // Check if returning from Google OAuth redirect or postMessage from popup
  useEffect(() => {
    // 1. Direct URL hash check (for full-page redirects)
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        if (accessToken) {
          window.history.replaceState(null, null, window.location.pathname);
          fetchGoogleProfileAndLogin(accessToken);
        }
      }
    } catch {}

    // 2. Listen for postMessage from popup window
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'GOOGLE_OAUTH_TOKEN' && event.data.hash) {
        const params = new URLSearchParams(event.data.hash.substring(1));
        const accessToken = params.get('access_token');
        if (accessToken) {
          fetchGoogleProfileAndLogin(accessToken);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleSignIn = () => {
    setError('');
    const clientId = (googleClientId || DEFAULT_GOOGLE_CLIENT_ID).trim();
    if (!clientId) {
      setShowGoogleConfig(true);
      return;
    }

    setLoading(true);

    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const isDesktopOrNative = typeof window !== 'undefined' && (
      window.location.origin === 'null' ||
      window.location.protocol === 'file:' ||
      (window.location.hostname === 'localhost' && !import.meta.env.DEV)
    );
    const redirectUri = isDesktopOrNative ? 'https://pulse-chat-two-sigma.vercel.app' : window.location.origin;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email%20profile%20openid&prompt=select_account`;

    const popup = window.open(
      authUrl,
      'google_oauth_popup',
      `width=${width},height=${height},top=${top},left=${left},status=no,toolbar=no,menubar=no`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // If popup was blocked by browser, redirect current page directly
      window.location.href = authUrl;
      return;
    }

    // Polling interval to detect when Google redirects popup back to our domain
    const timer = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setLoading(false);
          return;
        }

        if (popup.location.href && popup.location.href.includes(window.location.origin)) {
          clearInterval(timer);
          const hash = popup.location.hash;
          popup.close();

          if (hash && hash.includes('access_token=')) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            if (accessToken) {
              fetchGoogleProfileAndLogin(accessToken);
            }
          } else {
            setLoading(false);
          }
        }
      } catch (e) {
        // Cross-origin check while popup is still on accounts.google.com (normal behavior)
      }
    }, 500);
  };

  const handleSaveGoogleClientId = (e) => {
    e.preventDefault();
    if (!clientIdInput.trim()) return;
    const cleanId = clientIdInput.trim();
    try {
      localStorage.setItem('pulsechat_google_client_id', cleanId);
    } catch {}
    setGoogleClientId(cleanId);
    setShowGoogleConfig(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!loginId || !password) {
          throw new Error('Please fill in all required fields');
        }
        try {
          localStorage.setItem('pulsechat_remembered_email', loginId.trim());
        } catch (e) {}
        await login(loginId, password);
      } else {
        if (!username || !email || !password) {
          throw new Error('Username, email, and password are required');
        }
        try {
          localStorage.setItem('pulsechat_remembered_email', email.trim());
        } catch (e) {}
        const formData = new FormData();
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('phone', phone);
        formData.append('statusText', statusText);
        if (avatarFile) {
          formData.append('avatar', avatarFile);
        }
        await register(formData);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden glass-panel">
        
        {/* Header Branding */}
        <div className="relative p-8 text-center bg-gradient-to-b from-indigo-900/40 via-indigo-900/10 to-transparent">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
            <MessageSquare className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">PulseChat</h1>
          <p className="mt-1 text-sm text-slate-400">Real-time Messaging & Friends Network</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 px-6">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${
              isLogin
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${
              !isLogin
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-rose-300 bg-rose-950/50 border border-rose-800/60 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLogin && (
            <div className="flex flex-col items-center justify-center mb-2">
              <label className="relative group cursor-pointer">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden group-hover:border-indigo-500 transition-all">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-7 h-7 text-slate-500 group-hover:text-indigo-400" />
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                <span className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 text-white rounded-full text-xs shadow-lg">
                  <Camera className="w-3.5 h-3.5" />
                </span>
              </label>
              <span className="mt-1 text-xs text-slate-400">Upload Profile Photo</span>
            </div>
          )}

          {isLogin ? (
            <>
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-slate-300">Username or Email</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. alex or alex@example.com"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-slate-300">Username *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="alex_dev"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-slate-300">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-slate-300">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="+1 234 567 890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-slate-300">Status Message</label>
                <input
                  type="text"
                  placeholder="Hey there! I am using PulseChat"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block mb-1.5 text-xs font-semibold text-slate-300">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="w-full border-t border-slate-800"></div>
            <span className="absolute px-3 bg-slate-900 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          {/* Google Sign In Area */}
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-3 shadow-sm hover:border-slate-700 disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setClientIdInput(googleClientId || DEFAULT_GOOGLE_CLIENT_ID);
                setShowGoogleConfig(true);
              }}
              className="text-[11px] text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              <Settings className="w-3 h-3" />
              <span>Google OAuth Config</span>
            </button>
          </div>
        </form>
      </div>

      {/* Google OAuth Configuration Modal */}
      {showGoogleConfig && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 relative">
            <button
              onClick={() => setShowGoogleConfig(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Google OAuth Setup</h3>
                <p className="text-xs text-slate-400">Sign in with Google (Google Identity Services)</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-indigo-300">📌 របៀបបង្កើត Google Client ID:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>ចូលទៅ <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-indigo-400 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-3 h-3" /></a></li>
                  <li>ជ្រើសរើស <strong>Create Credentials → OAuth client ID</strong></li>
                  <li>Application type: <strong>Web application</strong></li>
                  <li>Authorized JavaScript origins:
                    <code className="block mt-1 p-1 bg-slate-900 text-indigo-300 rounded text-[11px] select-all">https://pulse-chat-two-sigma.vercel.app</code>
                  </li>
                  <li>Copy <strong>Client ID</strong> យកមកបិទភ្ជាប់ខាងក្រោម៖</li>
                </ol>
              </div>

              <form onSubmit={handleSaveGoogleClientId} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save & Activate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGoogleConfig(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
