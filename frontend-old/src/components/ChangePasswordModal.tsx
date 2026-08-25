import { useState, useContext } from 'react';
import { X, Lock, Eye, EyeOff, CheckCircle, AlertCircle, KeyRound } from 'lucide-react';
import { AppContext } from '../context/AppContext';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export const ChangePasswordModal = ({ onClose }: ChangePasswordModalProps) => {
  const { currentUser, changePassword } = useContext(AppContext);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordMismatch = confirmPassword && newPassword !== confirmPassword;
  const isStrong = newPassword.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setErrorMsg('New passwords do not match.'); setStatus('error'); return; }
    if (newPassword.length < 6) { setErrorMsg('New password must be at least 6 characters.'); setStatus('error'); return; }
    setStatus('loading'); setErrorMsg('');
    try {
      await changePassword(currentUser.id, oldPassword, newPassword);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden', animation: 'fadeInScale 0.2s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex' }}><KeyRound style={{ width: 18, height: 18, color: '#fff' }} /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Change Password</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>{currentUser?.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 6, display: 'flex', color: '#fff' }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 24px 20px' }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle style={{ width: 28, height: 28, color: '#16a34a' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111827', marginBottom: 6 }}>Password Changed!</div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 20 }}>Your password has been updated successfully. Use the new password on your next login.</p>
              <button onClick={onClose} style={{ background: '#1e3a5f', color: '#fff', border: 'none', cursor: 'pointer', padding: '10px 28px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem' }}>Done</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94a3b8' }} />
                  <input required type={showOld ? 'text' : 'password'} value={oldPassword}
                    onChange={e => { setOldPassword(e.target.value); setStatus('idle'); setErrorMsg(''); }}
                    placeholder="Your current (assigned) password"
                    style={{ width: '100%', paddingLeft: 38, paddingRight: 42, paddingTop: 11, paddingBottom: 11, border: '1.5px solid #e2e8f0', borderRadius: 10, outline: 'none', fontSize: '0.9rem', fontWeight: 500, background: '#f8fafc', color: '#111827', boxSizing: 'border-box' as const }} />
                  <button type="button" onClick={() => setShowOld(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    {showOld ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94a3b8' }} />
                  <input required type={showNew ? 'text' : 'password'} value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setStatus('idle'); setErrorMsg(''); }}
                    placeholder="At least 6 characters"
                    style={{ width: '100%', paddingLeft: 38, paddingRight: 42, paddingTop: 11, paddingBottom: 11, border: `1.5px solid ${passwordMismatch ? '#fca5a5' : (passwordsMatch ? '#86efac' : '#e2e8f0')}`, borderRadius: 10, outline: 'none', fontSize: '0.9rem', fontWeight: 500, background: '#f8fafc', color: '#111827', boxSizing: 'border-box' as const }} />
                  <button type="button" onClick={() => setShowNew(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    {showNew ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                {newPassword && <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>{[...Array(4)].map((_, i) => (<div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: newPassword.length >= (i + 1) * 2 ? (newPassword.length >= 10 ? '#16a34a' : newPassword.length >= 7 ? '#ca8a04' : '#ef4444') : '#e2e8f0', transition: 'background 0.2s' }} />))}</div>}
                {newPassword && <p style={{ fontSize: '0.7rem', color: isStrong ? '#16a34a' : '#ca8a04', marginTop: 4, fontWeight: 600 }}>{isStrong ? 'Strong enough' : 'Use 8+ characters for a stronger password'}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94a3b8' }} />
                  <input required type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setStatus('idle'); setErrorMsg(''); }}
                    placeholder="Repeat new password"
                    style={{ width: '100%', paddingLeft: 38, paddingRight: 42, paddingTop: 11, paddingBottom: 11, border: `1.5px solid ${passwordMismatch ? '#fca5a5' : (passwordsMatch ? '#86efac' : '#e2e8f0')}`, borderRadius: 10, outline: 'none', fontSize: '0.9rem', fontWeight: 500, background: '#f8fafc', color: '#111827', boxSizing: 'border-box' as const }} />
                  <button type="button" onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    {showConfirm ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                {passwordMismatch && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, fontWeight: 600 }}>Passwords do not match</p>}
                {passwordsMatch && <p style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 4, fontWeight: 600 }}>Passwords match</p>}
              </div>

              {status === 'error' && errorMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: '0.82rem', color: '#dc2626', fontWeight: 600 }}>
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />{errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px 0', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={status === 'loading' || !!passwordMismatch}
                  style={{ flex: 2, padding: '11px 0', background: status === 'loading' ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', cursor: status === 'loading' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {status === 'loading' ? (<><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Updating...</>) : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } } @keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
};