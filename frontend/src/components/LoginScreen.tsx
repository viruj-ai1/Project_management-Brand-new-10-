import { useState, useContext } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck, HelpCircle, X, UserCog, MessageSquare } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import logoImg from '../assets/Logo.png';

export const LoginScreen = () => {
  const { setCurrentUser } = useContext(AppContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  const DEMO_USERS = [
    { label: 'MD', username: 'u1', password: 'MD@Virujgroup', role: 'Managing Director' },
    { label: 'VP R&D', username: 'u2', password: 'VP@Virujgroup', role: 'Vice President' },
    { label: 'PM A', username: 'u3', password: 'PMA@Virujgroup', role: 'Project Manager A' },
    { label: 'PM B', username: 'u4', password: 'PMB@Virujgroup', role: 'Project Manager B' },
    { label: 'ARD Head', username: 'u5', password: 'ARD@Virujgroup', role: 'ARD Head' },
    { label: 'CRD Head', username: 'u6', password: 'CRD@Virujgroup', role: 'CRD Head' },
    { label: 'DQA Head', username: 'u7', password: 'DQA@Virujgroup', role: 'DQA Head' },
    { label: 'SCM Head', username: 'u8', password: 'SCM@Virujgroup', role: 'SCM Head' },
    { label: 'TTR Head', username: 'u9', password: 'TTR@Virujgroup', role: 'TTR Head' },
    { label: 'Sr Chemist', username: 'u10', password: 'CHM@Virujgroup', role: 'Senior Chemist (ARD)' },
    { label: 'Client', username: 'u11', password: 'Client@Virujgroup', role: 'External Client' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const trimmed = username.trim();
      const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const apiBase = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
      const res = await axios.post(`${apiBase}/login`, {
        username: trimmed,
        password: password
      });
      if (res.data) {
        setCurrentUser(res.data);
      } else {
        setError('Invalid username or password. Please try again.');
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Connection failed. Please make sure the backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans">

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src={logoImg.src} alt="Viruj Chematrix" className="h-9 w-auto object-contain flex-shrink-0 max-w-[36px]" />
          <span className="text-lg font-bold text-[#1e3a5f] tracking-tight font-outfit">Viruj Chematrix</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-[#3b82f6] rounded-full text-xs font-semibold border border-blue-100">
          <ShieldCheck className="w-3.5 h-3.5" /> Secure Login
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
          
          <div className="hidden md:flex flex-col justify-center items-center p-12 bg-white border-r border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm mb-6">
                <img src={logoImg.src} alt="Viruj Chematrix" className="w-14 h-14 object-contain" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#1e3a5f] mb-1 leading-tight font-outfit">Viruj Chematrix</h1>
              <p className="text-[#3b82f6] text-sm font-semibold mb-8">Project Management Portal</p>
              <div className="w-12 border-t-2 border-gray-200 mb-8"></div>
              <p className="text-xs text-gray-400 font-medium">© 2026 Viruj Chematrix Pvt. Ltd.</p>
            </div>
          </div>

          <div className="p-10 md:p-12 flex flex-col justify-center bg-white">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-[#1e3a5f] tracking-tight mb-2 font-outfit">Sign In</h2>
              <p className="text-gray-500 font-medium text-sm">Enter your credentials to access the portal.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#3b82f6] transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="e.g. project_manager_a"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 font-medium"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#3b82f6] transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-12 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 font-medium"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#3b82f6] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center h-[52px]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Forgot Password link */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowForgotHelp(p => !p)}
                className="text-sm font-semibold text-[#3b82f6] hover:text-[#1d4ed8] transition-colors flex items-center gap-1.5 mx-auto"
              >
                <HelpCircle className="w-4 h-4" />
                Forgot your password?
              </button>
            </div>

            {/* Demo Quick Access */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Demo Quick Access</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {DEMO_USERS.map(u => (
                  <button
                    key={u.username}
                    onClick={() => {
                      setUsername(u.username);
                      setPassword(u.password);
                    }}
                    type="button"
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md border border-blue-200 transition-colors"
                    title={u.role}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Forgot Password Help Panel */}
            {showForgotHelp && (
              <div className="mt-4 relative rounded-xl border border-amber-200 bg-amber-50 p-4 fade-in">
                <button
                  onClick={() => setShowForgotHelp(false)}
                  className="absolute top-3 right-3 text-amber-400 hover:text-amber-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg flex-shrink-0 self-start">
                    <UserCog className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-800 mb-1">Contact the R&amp;D Head to reset your password</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      All password resets are handled by the <strong>Vice President (R&amp;D)</strong>. Please reach out to them directly.
                    </p>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-start gap-2 text-xs text-amber-800">
                        <span className="font-bold text-amber-600 w-4 flex-shrink-0">1.</span>
                        <span>Contact the <strong>R&amp;D Head (Vice President)</strong> and inform them you need a password reset.</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-amber-800">
                        <span className="font-bold text-amber-600 w-4 flex-shrink-0">2.</span>
                        <span>The R&amp;D Head logs in → goes to <strong>Hierarchy &amp; Team</strong> → clicks <strong>Reset Pwd</strong> next to your name.</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-amber-800">
                        <span className="font-bold text-amber-600 w-4 flex-shrink-0">3.</span>
                        <span>They will provide you a new password. Log in with it, then use <strong>Change Password</strong> to set your own.</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Can't reach the R&amp;D Head? Escalate to the Managing Director directly.
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};
