import { useState, useContext } from 'react';
import { UserPlus, Users, UserSquare2, KeyRound, Eye, EyeOff, CheckCircle, X, Copy, BadgeCheck } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { ROLES, DEPARTMENTS } from '../constants';
import { Card } from './SharedUI';

export const TeamManagement = () => {
  const { currentUser, users, addUser, updateUser, adminResetPassword } = useContext(AppContext);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [loginId, setLoginId] = useState('');
  const [loginIdError, setLoginIdError] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [provisionMode, setProvisionMode] = useState<'new' | 'existing'>('new');
  const [existingUserId, setExistingUserId] = useState('');
  const [newCredential, setNewCredential] = useState<{ id: string; name: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'id' | 'pwd' | null>(null);

  // Reset password state
  const [resetTarget, setResetTarget] = useState<string | null>(null); // userId being reset
  const [resetPwd, setResetPwd] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetError, setResetError] = useState('');

  const handleReset = async (userId: string) => {
    if (resetPwd.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    setResetStatus('loading'); setResetError('');
    try {
      await adminResetPassword(userId, resetPwd);
      setResetStatus('success');
      setTimeout(() => { setResetTarget(null); setResetPwd(''); setResetStatus('idle'); }, 1500);
    } catch (err: any) {
      setResetError(err?.response?.data?.detail || 'Reset failed. Try again.');
      setResetStatus('error');
    }
  };

  let allowedRoles: string[] = [];
  if (currentUser.role === ROLES.MANAGEMENT) allowedRoles = [ROLES.RD_HEAD, ROLES.SCM];
  else if (currentUser.role === ROLES.RD_HEAD) allowedRoles = [ROLES.PM];
  else if (currentUser.role === ROLES.PM) allowedRoles = [ROLES.DEPT_HEAD, ROLES.EMPLOYEE];
  else if (currentUser.role === ROLES.DEPT_HEAD) allowedRoles = [ROLES.EMPLOYEE];

  const directReports = users.filter((u: any) => u.managerId === currentUser.id);
  const availableExistingUsers = users.filter((u: any) => u.id !== currentUser.id && u.managerId !== currentUser.id);
  const isDeptHead = currentUser.role === ROLES.DEPT_HEAD;

  const copyToClipboard = (text: string, field: 'id' | 'pwd') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) {
      setLoginIdError('Login ID is required.');
      return;
    }
    if (!password || password.length < 6) {
      alert('Please set a password of at least 6 characters for the new user.');
      return;
    }
    const finalDept = isDeptHead ? currentUser.department : department;
    const capturedName = name;
    const capturedPassword = password;
    const capturedId = loginId.trim();
    try {
      const created = await addUser({ id: capturedId, name, role, department: finalDept, managerId: currentUser.id, password });
      const userId = created?.id ?? created;
      setNewCredential({ id: String(userId), name: capturedName, password: capturedPassword });
      setLoginId('');
      setLoginIdError('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '';
      if (err?.response?.status === 409 || detail.toLowerCase().includes('taken')) {
        setLoginIdError(detail || `Login ID '${capturedId}' is already taken. Choose a different one.`);
        return; // don't clear form so user can fix just the ID
      }
      alert('Failed to create user. Please try again.');
    }
    setName('');
    setRole('');
    setPassword('');
    if (!isDeptHead) setDepartment('');
  };

  const handleAddExistingUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingUserId || !role) {
      alert('Please select a user and a role.');
      return;
    }
    try {
      await updateUser(existingUserId, { managerId: currentUser.id, role });
      setExistingUserId('');
      setRole('');
      alert('User added to your team successfully!');
    } catch {
      alert('Failed to add existing user.');
    }
  };

  if (allowedRoles.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 mt-10 fade-in">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <div className="text-base font-bold text-gray-700">No Management Permissions</div>
        <div className="text-sm mt-1">You do not have permission to manage team hierarchy.</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Team Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your direct reports and hierarchy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <Card className="p-0 sticky top-6">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
              <h3 className="font-bold text-gray-900 flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <UserPlus className="w-4 h-4"/>
                </div>
                Provision Member
              </h3>
            </div>
            
            <div className="px-6 pt-5 pb-0">
              <div className="flex p-1 bg-gray-100/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setProvisionMode('new')}
                  className={`flex-1 text-sm font-semibold py-2 rounded-md transition-all ${provisionMode === 'new' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Create New
                </button>
                <button
                  type="button"
                  onClick={() => setProvisionMode('existing')}
                  className={`flex-1 text-sm font-semibold py-2 rounded-md transition-all ${provisionMode === 'existing' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Add Existing
                </button>
              </div>
            </div>

            {provisionMode === 'new' ? (
            <form onSubmit={handleAddUser} className="p-6 space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-gray-600 mb-2 uppercase tracking-wide">Full Name / Title</label>
                <input required type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm font-medium text-gray-900"
                  value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe (Analyst)" />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-600 mb-2 uppercase tracking-wide">
                  Assign Login ID <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  className={`w-full p-3 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:ring-2 transition-all text-sm font-mono font-bold text-gray-900 ${
                    loginIdError
                      ? 'border-red-400 focus:ring-red-500/20 focus:border-red-400'
                      : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                  }`}
                  value={loginId}
                  onChange={e => { setLoginId(e.target.value); setLoginIdError(''); }}
                  placeholder="e.g. jdoe_analyst"
                />
                {loginIdError
                  ? <p className="text-[11px] text-red-600 mt-1.5 font-medium">⚠ {loginIdError}</p>
                  : <p className="text-[11px] text-gray-400 mt-1.5">This will be the member's login username.</p>
                }
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-600 mb-2 uppercase tracking-wide">Assign Role</label>
                <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm font-medium text-gray-900"
                  value={role} onChange={e => setRole(e.target.value)}>
                  <option value="">Select Role...</option>
                  {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {!isDeptHead && ![ROLES.PM, ROLES.RD_HEAD, ROLES.MANAGEMENT].includes(role) && (
                <div>
                  <label className="block text-[13px] font-bold text-gray-600 mb-2 uppercase tracking-wide">Department</label>
                  <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm font-medium text-gray-900"
                    value={department} onChange={e => setDepartment(e.target.value)}>
                    <option value="">Select Department...</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[13px] font-bold text-gray-600 mb-2 uppercase tracking-wide">
                  Assign Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength={6}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm font-medium text-gray-900 pr-12"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                <p className="text-[11px] text-amber-600 mt-1.5 font-medium">⚠ Hand these credentials to the user directly. They can change their password after first login.</p>
              </div>

              {/* ── Credential Card (shown after successful creation) ── */}
              {newCredential && (
                <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50 p-4 fade-in">
                  <button
                    type="button"
                    onClick={() => setNewCredential(null)}
                    className="absolute top-2 right-2 text-emerald-400 hover:text-emerald-700 transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 mb-3">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-wide">New Login Credentials</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 mb-3 font-medium">Share these details with <span className="font-bold">{newCredential.name}</span>.</p>

                  {/* Login ID */}
                  <div className="mb-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Login ID</p>
                    <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-xl px-3 py-2">
                      <code className="flex-1 text-[13px] font-mono font-bold text-gray-800 break-all">{newCredential.id}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(newCredential.id, 'id')}
                        className="text-gray-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                        title="Copy ID"
                      >
                        {copiedField === 'id' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Password</p>
                    <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-xl px-3 py-2">
                      <code className="flex-1 text-[13px] font-mono font-bold text-gray-800">{newCredential.password}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(newCredential.password, 'pwd')}
                        className="text-gray-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                        title="Copy Password"
                      >
                        {copiedField === 'pwd' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button type="submit" className="w-full bg-[#1e3a5f] text-white px-4 py-3.5 rounded-xl font-bold hover:bg-[#162d4a] shadow-sm transition-all active:scale-[0.98] text-sm">
                  Add to Hierarchy
                </button>
              </div>
            </form>
            ) : (
            <form onSubmit={handleAddExistingUser} className="p-6 space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-gray-600 mb-2 uppercase tracking-wide">Select Existing User</label>
                <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm font-medium text-gray-900"
                  value={existingUserId} onChange={e => setExistingUserId(e.target.value)}>
                  <option value="">Select User...</option>
                  {availableExistingUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-600 mb-2 uppercase tracking-wide">Assign Role</label>
                <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm font-medium text-gray-900"
                  value={role} onChange={e => setRole(e.target.value)}>
                  <option value="">Select Role...</option>
                  {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-[#1e3a5f] text-white px-4 py-3.5 rounded-xl font-bold hover:bg-[#162d4a] shadow-sm transition-all active:scale-[0.98] text-sm">
                  Add to Hierarchy
                </button>
              </div>
            </form>
            )}
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card className="p-0">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <h3 className="font-bold text-gray-900 flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Users className="w-4 h-4"/>
                </div>
                Direct Reports
              </h3>
              <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2.5 py-1 rounded-full">{directReports.length}</span>
            </div>
            
            <div className="p-6">
              {directReports.length === 0 ? (
                <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <div className="font-medium text-gray-600">No team members assigned under you yet.</div>
                  <p className="text-sm mt-1">Use the form to provision new members.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {directReports.map((user: any) => {
                    const isSelf = user.id === currentUser.id;
                    const isResetting = resetTarget === user.id;
                    return (
                      <div key={user.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all">
                        {/* User info row */}
                        <div className="group flex items-center justify-between p-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-3.5 rounded-xl transition-colors ${isSelf ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                              <UserSquare2 className="w-6 h-6"/>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-[15px] flex items-center gap-2 mb-1">
                                {user.name}
                                {isSelf && <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">Self</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded-md">{user.role}</span>
                                {user.department && (<><span className="text-gray-300">•</span><span className="text-[13px] font-semibold text-blue-600">{user.department}</span></>)}
                              </div>
                            </div>
                          </div>
                          {/* Reset Password toggle button */}
                          {!isSelf && (
                            <button
                              onClick={() => {
                                if (isResetting) { setResetTarget(null); setResetPwd(''); setResetStatus('idle'); setResetError(''); }
                                else { setResetTarget(user.id); setResetPwd(''); setResetStatus('idle'); setResetError(''); }
                              }}
                              className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all"
                              style={{
                                background: isResetting ? '#fef2f2' : '#f0f4ff',
                                color: isResetting ? '#ef4444' : '#2563eb',
                                border: `1px solid ${isResetting ? '#fecaca' : '#bfdbfe'}`,
                              }}
                              title={isResetting ? 'Cancel reset' : 'Reset password for this user'}
                            >
                              {isResetting ? <X className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                              {isResetting ? 'Cancel' : 'Reset Pwd'}
                            </button>
                          )}
                        </div>

                        {/* Inline Reset Password Panel */}
                        {isResetting && (
                          <div className="border-t border-gray-100 bg-blue-50/50 px-4 py-4 fade-in">
                            {resetStatus === 'success' ? (
                              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                                <CheckCircle className="w-4 h-4" /> Password reset successfully! Share the new credentials with {user.name}.
                              </div>
                            ) : (
                              <>
                                <p className="text-[12px] font-semibold text-gray-500 mb-2">Set a new password for <span className="text-gray-800">{user.name}</span> (user forgot password or first-time setup)</p>
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type={showResetPwd ? 'text' : 'password'}
                                      value={resetPwd}
                                      onChange={e => { setResetPwd(e.target.value); setResetError(''); }}
                                      placeholder="New password (min. 6 chars)"
                                      className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm font-medium bg-white"
                                    />
                                    <button type="button" onClick={() => setShowResetPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500">
                                      {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleReset(user.id)}
                                    disabled={resetStatus === 'loading'}
                                    className="px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                                  >
                                    {resetStatus === 'loading' ? 'Saving...' : 'Set Password'}
                                  </button>
                                </div>
                                {resetError && <p className="text-[12px] text-red-600 font-semibold mt-2">{resetError}</p>}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
