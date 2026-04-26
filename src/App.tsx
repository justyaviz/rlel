import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, 
  Trash2, 
  Users, 
  UserMinus, 
  Search, 
  LogOut, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Activity,
  LayoutDashboard,
  Shield,
  Settings,
  Database
} from 'lucide-react';

interface InstagramProfile {
  pk: number;
  username: string;
  full_name: string;
  profile_pic_url: string;
}

type AppState = 'login' | 'dashboard' | 'analyzing' | 'results' | 'unfollowing';

export default function App() {
  const [state, setState] = useState<AppState>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<InstagramProfile[]>([]);
  const [selectedPks, setSelectedPks] = useState<Set<number>>(new Set());
  const [analysisCount, setAnalysisCount] = useState(50);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Fetch Parse error:', text);
        const statusText = `Status: ${res.status} ${res.statusText}`;
        const preview = text.substring(0, 100).replace(/<[^>]*>?/gm, '');
        throw new Error(`${statusText}. Server xabari: ${preview || 'Bo\'sh javob'}`);
      }

      if (data.success) {
        setUser(data.user);
        setState('dashboard');
      } else {
        setError(data.message || 'Login muvaffaqiyatsiz. Qaytadan urinib ko\'ring.');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Server bilan aloqa uzildi. Iltimos, birozdan so\'ng urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = async () => {
    setState('analyzing');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: analysisCount }),
      });
      const data = await res.json();
      if (data.success) {
        setProfiles(data.profiles);
        setState('results');
      } else {
        setError(data.message);
        setState('dashboard');
      }
    } catch (err) {
      setError('Analysis failed. Please try again.');
      setState('dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (selectedPks.size === 0) return;
    
    setState('unfollowing');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/unfollow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedPks) }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully unfollowed ${selectedPks.size} profiles.`);
        setProfiles(prev => prev.filter(p => !selectedPks.has(p.pk)));
        setSelectedPks(new Set());
        setState('results');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Unfollow operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (pk: number) => {
    const next = new Set(selectedPks);
    if (next.has(pk)) next.delete(pk);
    else next.add(pk);
    setSelectedPks(next);
  };

  const toggleAll = () => {
    if (selectedPks.size === profiles.length) {
      setSelectedPks(new Set());
    } else {
      setSelectedPks(new Set(profiles.map(p => p.pk)));
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setState('login');
    setUser(null);
    setProfiles([]);
    setSelectedPks(new Set());
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-50 selection:bg-sky-400 selection:text-slate-900">
      <AnimatePresence mode="wait">
        {state === 'login' ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex min-h-screen items-center justify-center p-4"
          >
            <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-8 shadow-2xl">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-sky-400">
                  <Instagram className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">InstaClean Pro</h1>
                <p className="mt-2 text-sm text-slate-500">Secure analysis dashboard for power users.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Username</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm focus:border-sky-400 focus:outline-none transition-colors"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Password</label>
                  <input
                    type="password"
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm focus:border-sky-400 focus:outline-none transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button
                  disabled={loading}
                  className="relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-sky-400 py-3.5 text-sm font-bold text-slate-950 transition active:scale-95 disabled:bg-slate-700 disabled:text-slate-500 group"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enter Dashboard'}
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
              </form>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/health');
                      const data = await res.json();
                      alert(`Server Holati: ${data.status === 'ok' ? 'YAXSHI (OK)' : 'NOSOZ'}\nUptime: ${Math.round(data.uptime)}s`);
                    } catch (e) {
                      alert('Server bilan bog\'lanib bo\'lmadi! (Network Error)');
                    }
                  }}
                  className="text-[10px] text-slate-600 hover:text-slate-400 uppercase tracking-widest font-bold transition-colors"
                >
                  Server holatini tekshirish
                </button>
              </div>

              {error && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="break-words">{error}</span>
                  </div>
                  {/* Technical Details */}
                  <div className="rounded border border-slate-800 bg-black/50 p-2 text-[9px] font-mono text-slate-500 overflow-x-auto">
                    <div className="font-bold text-slate-400 mb-1">TECHNICAL LOG:</div>
                    {error.includes('doctype') || error.includes('html') ? 'Server returned HTML (Crash/Block)' : error}
                  </div>
                </div>
              )}

              <footer className="mt-8 flex flex-col items-center gap-2 text-[10px] uppercase tracking-widest text-slate-600">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  <span>End-to-End Encrypted</span>
                </div>
                <p>© 2026 INSTACLEAN SYSTEMS INC.</p>
              </footer>
            </div>
          </motion.div>
        ) : (
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 p-6 hidden lg:flex flex-col gap-8">
              <div className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-sky-400">
                <Activity className="h-6 w-6" />
                <span>InstaClean</span>
                <span className="text-[10px] text-slate-600 font-mono translate-y-1">PRO</span>
              </div>

              <nav className="flex flex-col gap-1">
                <NavItem icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" active={state === 'dashboard'} onClick={() => setState('dashboard')} />
                <NavItem icon={<Users className="h-4 w-4" />} label="Audit Logs" active={false} disabled />
                <NavItem icon={<Search className="h-4 w-4" />} label="Safe Lists" active={false} disabled />
                <NavItem icon={<Database className="h-4 w-4" />} label="Storage" active={false} disabled />
                <NavItem icon={<Settings className="h-4 w-4" />} label="Settings" active={false} disabled />
              </nav>

              <div className="mt-auto">
                <div className="mb-4 rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">API Status</p>
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Secure Connected
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout Session
                </button>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
              <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-8 backdrop-blur-sm sticky top-0 z-40">
                <div>
                  <h2 className="text-sm font-bold tracking-tight">
                    {state === 'dashboard' ? 'Overview' : 'Profile Audit'}
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Session Active</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-slate-800/80 px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-700 shadow-sm">
                    <div className="h-6 w-6 rounded-full bg-sky-400 flex items-center justify-center text-slate-950 text-[10px] font-bold">
                      {user?.username?.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-slate-200">@{user?.username}</span>
                  </div>
                </div>
              </header>

              <div className="flex-1 p-8 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {state === 'dashboard' && (
                    <motion.div
                      key="dashboard"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="max-w-4xl"
                    >
                      <div className="mb-8">
                        <h1 className="text-3xl font-extrabold tracking-tight">Audit Dashboard</h1>
                        <p className="text-slate-500 mt-1">Configure your scan parameters for optimal results.</p>
                      </div>

                      <div className="grid gap-6">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6 font-mono">Analysis Parameters</h3>
                          
                          <div className="flex flex-col md:flex-row md:items-end gap-8">
                            <div className="space-y-4">
                              <p className="text-sm font-medium text-slate-400">Batch Scan Size</p>
                              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-hidden">
                                {[20, 50, 80, 100].map(n => (
                                  <button
                                    key={n}
                                    onClick={() => setAnalysisCount(n)}
                                    className={`relative flex-1 px-5 py-2.5 text-xs font-bold transition-all rounded-lg ${
                                      analysisCount === n 
                                      ? 'bg-sky-400 text-slate-950 shadow-lg' 
                                      : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={startAnalysis}
                              className="flex items-center justify-center gap-2 rounded-xl bg-sky-400 px-8 py-3.5 text-sm font-bold text-slate-950 transition hover:scale-[1.02] active:scale-95 shadow-xl shadow-sky-400/10"
                            >
                              <Search className="h-4 w-4" />
                              Start Deep Scan
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-40">
                          <div className="rounded-2xl border border-dashed border-slate-800 p-8 flex flex-col items-center justify-center text-center">
                            <div className="mb-4 h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-slate-700">
                              <Trash2 className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-600">Advanced Filters</p>
                            <p className="text-xs text-slate-700 mt-1">Coming in v2.4 Release</p>
                          </div>
                          <div className="rounded-2xl border border-dashed border-slate-800 p-8 flex flex-col items-center justify-center text-center">
                            <div className="mb-4 h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-slate-700">
                              <UserMinus className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-600">Auto-Sweep</p>
                            <p className="text-xs text-slate-700 mt-1">Enterprise Feature locked</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {state === 'analyzing' && (
                    <motion.div
                      key="analyzing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-full py-20 text-center"
                    >
                      <div className="relative mb-8">
                        <div className="h-32 w-32 rounded-full border-[10px] border-slate-800/50"></div>
                        <div className="absolute inset-0 h-32 w-32 animate-spin rounded-full border-t-[10px] border-sky-400"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-sky-400 font-mono text-xl font-bold">
                          {analysisCount}
                        </div>
                      </div>
                      <h2 className="text-2xl font-extrabold tracking-tight">Performing Neural Audit...</h2>
                      <p className="mt-2 text-slate-400 text-sm max-w-xs">
                        Correlating follow data and identifying non-reciprocal entities.
                      </p>
                    </motion.div>
                  )}

                  {state === 'results' && (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col h-full"
                    >
                      <div className="mb-8 flex items-center justify-between">
                        <div>
                          <h1 className="text-3xl font-extrabold tracking-tight">Analysis Results</h1>
                          <p className="text-slate-500 mt-1">Profiles detected as non-followers.</p>
                        </div>
                        <button
                          onClick={() => setState('dashboard')}
                          className="px-4 py-2 text-xs font-bold border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          Reset Audit
                        </button>
                      </div>

                      {success && (
                        <div className="mb-8 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400">
                          <span className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5" />
                            {success}
                          </span>
                          <button onClick={() => setSuccess('')} className="p-1 hover:bg-slate-800 rounded">
                            <CheckCircle2 className="h-4 w-4 opacity-50" />
                          </button>
                        </div>
                      )}

                      <div className="flex-1 shrink-0 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col">
                        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-sky-400 focus:ring-sky-400"
                              checked={selectedPks.size === profiles.length && profiles.length > 0}
                              onChange={toggleAll}
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Target Population ({profiles.length})
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded">
                            {selectedPks.size} SELECTED
                          </div>
                        </div>

                        <div className="overflow-y-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest w-12 text-center">#</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Profile Identity</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest hidden md:table-cell">Verification</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Audit Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {profiles.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                      <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="h-8 w-8" />
                                      </div>
                                      <div>
                                        <p className="text-lg font-bold">Optimal Standing</p>
                                        <p className="text-sm text-slate-500">No non-reciprocal followers found in this batch.</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                profiles.map((profile, i) => (
                                  <tr 
                                    key={profile.pk}
                                    className={`group transition-colors ${selectedPks.has(profile.pk) ? 'bg-sky-400/5' : 'hover:bg-slate-900/40'}`}
                                  >
                                    <td className="px-6 py-4 text-center">
                                      <input 
                                        type="checkbox" 
                                        className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-sky-400 focus:ring-sky-400"
                                        checked={selectedPks.has(profile.pk)}
                                        onChange={() => toggleSelect(profile.pk)}
                                      />
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-3">
                                        <img 
                                          src={profile.profile_pic_url} 
                                          alt={profile.username}
                                          referrerPolicy="no-referrer"
                                          className="h-9 w-9 rounded-full border border-slate-800 object-cover"
                                        />
                                        <div>
                                          <p className="text-sm font-bold text-slate-100 italic">@{profile.username}</p>
                                          <p className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{profile.full_name || 'No Display Name'}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 hidden md:table-cell">
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
                                        <span>User Identified</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <span className="inline-flex rounded bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-slate-400 border border-slate-700">
                                        No Follow Back
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <a 
                                        href={`https://instagram.com/${profile.username}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-slate-600 hover:text-sky-400 transition-colors"
                                      >
                                        <ChevronRight className="h-5 w-5" />
                                      </a>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Sticky Action Footer */}
                      {selectedPks.size > 0 && (
                        <motion.div
                          initial={{ y: 100 }}
                          animate={{ y: 0 }}
                          className="mt-6 flex items-center justify-between p-6 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Batch Operation</span>
                            <span className="text-sm font-bold text-sky-400">{selectedPks.size} Profiles queue'd for removal</span>
                          </div>
                          <button
                            onClick={handleUnfollow}
                            disabled={loading}
                            className="flex items-center gap-2 rounded-xl bg-red-500 px-8 py-3.5 text-sm font-bold text-white transition hover:scale-105 active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 shadow-xl shadow-red-500/20"
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4" />
                                Execute Unfollow
                              </>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {state === 'unfollowing' && (
                     <motion.div
                      key="unfollowing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-full py-20 text-center"
                    >
                      <div className="relative mb-8">
                        <div className="h-32 w-32 rounded-full border-[10px] border-slate-800/50"></div>
                        <div className="absolute inset-0 h-32 w-32 animate-spin rounded-full border-t-[10px] border-red-500"></div>
                        <UserMinus className="absolute inset-0 m-auto h-10 w-10 text-red-500" />
                      </div>
                      <h2 className="text-2xl font-extrabold tracking-tight">Executing Cleanup...</h2>
                      <p className="mt-2 text-slate-400 text-sm max-w-xs">
                        Removing selected profiles. Simulating natural interaction speed to prevent session locks.
                      </p>
                      <div className="mt-8 flex gap-2">
                        <div className="h-1.5 w-8 rounded-full bg-red-500 animate-pulse" />
                        <div className="h-1.5 w-8 rounded-full bg-slate-800" />
                        <div className="h-1.5 w-8 rounded-full bg-slate-800" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </main>
          </div>
        )}
      </AnimatePresence>

      {/* Global Footer Disclaimer */}
      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-20">
        <p className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
          Instaclean High Density Protocol v1.0 / Build 2026-04
        </p>
      </footer>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, disabled }: { icon: React.ReactNode, label: string, active: boolean, onClick?: () => void, disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
        active 
        ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/50' 
        : disabled 
          ? 'text-slate-800 cursor-not-allowed' 
          : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
      }`}
    >
      <span className={active ? 'text-sky-400' : 'text-inherit'}>{icon}</span>
      {label}
    </button>
  );
}
