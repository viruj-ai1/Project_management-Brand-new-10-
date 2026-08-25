"use client";
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  Users, LayoutDashboard, LogOut, Settings,
  ChevronLeft, ChevronRight, Menu, Bell, X, CheckCheck,
  AlertTriangle, CheckCircle, Clock, Zap, Briefcase, KeyRound
} from 'lucide-react';
import { AppProvider, AppContext } from '@/context/AppContext';
import { NotificationProvider, NotificationContext } from '@/context/NotificationContext';
import type { AppNotification } from '@/context/NotificationContext';
import { ROLES, EXTRA_TABS } from '@/constants';
import { LoginScreen } from '@/components/LoginScreen';
import { ManagementDashboard } from '@/components/ManagementDashboard';
import { PMDashboard } from '@/components/PMDashboard';
import { EmployeeWorkspace, ActiveWorkView, TaskInboxView } from '@/components/EmployeeWorkspace';
import { SCMDashboard } from '@/components/SCMDashboard';
import { TeamManagement } from '@/components/TeamManagement';
import { RDProjectsView } from '@/components/RDProjectsView';
import { PMProjectsView } from '@/components/PMProjectsView';
import { AIInsights } from '@/components/AIInsights';
import { ClientPortal } from '@/components/ClientPortal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import logoImg from '@/assets/Logo.png';

const PlaceholderView = ({ tabId, role }: { tabId: string, role: string }) => {
  const extraTabs = EXTRA_TABS[role] || [];
  const tabInfo = extraTabs.find(t => t.id === tabId) || { label: 'Module', icon: Settings };
  const Icon = tabInfo.icon || Settings;
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] w-full animate-in fade-in zoom-in-95 duration-500">
      <div className="relative group">
        <div className="absolute inset-0 bg-blue-400 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
        <div className="w-40 h-40 bg-white/70 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-xl border border-white/40 relative z-10">
          <Icon className="w-16 h-16 text-blue-600/50" />
        </div>
        <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-gradient-to-tr from-[#1e3a5f] to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl z-20">
          <Settings className="text-white w-6 h-6 animate-[spin_6s_linear_infinite]" />
        </div>
      </div>
      <div className="text-center mt-10 space-y-4 max-w-lg px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest">
          Coming Soon
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{tabInfo.label}</h2>
        <p className="text-gray-500 text-base leading-relaxed">
          We're actively crafting this module to provide powerful, data-driven tools specifically tailored for the <b className="text-gray-800">{role}</b> workflow. 
        </p>
      </div>
    </div>
  );
};

const MainApp = () => {
  const { currentUser, setCurrentUser, tasks } = useContext(AppContext);
  const { notifications, unreadCount, readIds, markAllRead, markRead } = useContext(NotificationContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDashboardProjectId, setSelectedDashboardProjectId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab('dashboard');
  }, [currentUser]);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  if (!currentUser) return <LoginScreen />;

  const userTabs = [...(EXTRA_TABS[currentUser.role] || [])];
  if (currentUser.role === ROLES.PM) {
    const hasSelfTasks = tasks?.some((t: any) => 
      (Array.isArray(t.assignedTo) ? t.assignedTo.includes(currentUser.id) : t.assignedTo === currentUser.id) || 
      (t.delegatedTo === currentUser.id && t.delegateRequestStatus === 'Approved')
    );
    if (hasSelfTasks) {
      userTabs.push(
        { id: 'active-work', label: 'Active Work', icon: Briefcase }
      );
    }
  }

  const navClick = (id: string) => {
    setActiveTab(id);
    setSelectedDashboardProjectId(null);
    setMobileOpen(false);
  };

  const renderNavItem = (id: string, label: string, Icon: any) => {
    const isActive = activeTab === id;
    return (
      <button
        key={id}
        onClick={() => navClick(id)}
        title={collapsed ? label : undefined}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 12,
          padding: collapsed ? '12px 0' : '11px 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 12,
          fontSize: '0.85rem',
          fontWeight: isActive ? 700 : 500,
          cursor: 'pointer',
          border: 'none',
          transition: 'all 0.2s ease',
          position: 'relative',
          background: isActive ? '#1e3a5f' : 'transparent',
          color: isActive ? '#ffffff' : '#6b7280',
          boxShadow: isActive ? '0 2px 8px rgba(30,58,95,0.25)' : 'none',
        }}
        onMouseEnter={e => {
          if (!isActive) {
            (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
            (e.currentTarget as HTMLButtonElement).style.color = '#111827';
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
          }
        }}
      >
        <Icon style={{ width: 20, height: 20, flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
        {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
        {collapsed && (
          <span className="
            absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs
            rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none
            whitespace-nowrap z-50 transition-opacity duration-150 shadow-xl
          ">
            {label}
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f5f7', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: collapsed ? 76 : 264,
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          flexShrink: 0,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          boxShadow: '1px 0 10px rgba(0,0,0,0.04)',
          zIndex: 20,
        }}
        className={`
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          fixed md:relative h-full md:h-auto inset-y-0 left-0
        `}
      >
        {/* Navy branding strip at top */}
        <div style={{
          background: '#1e3a5f',
          padding: collapsed ? '20px 0' : '20px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
            <div style={{
              width: 38, height: 38,
              borderRadius: 10,
              background: '#ffffff', // Solid white to prevent logo from mixing with navy background
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <img src={logoImg.src} alt="Viruj Chematrix" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.2, whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>
                  Project Management
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, letterSpacing: '0.5px', marginTop: 2 }}>
                  Viruj Chematrix
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              style={{ 
                background: '#f1f5f9', // Light gray background to contrast with white sidebar
                border: '1px solid #e2e8f0', 
                cursor: 'pointer', 
                color: '#475569', // Dark gray icon
                padding: 8, 
                borderRadius: 8, 
                display: 'flex', 
                alignItems: 'center', 
                position: 'absolute', 
                bottom: 76, 
                left: '50%', 
                transform: 'translateX(-50%)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* User info */}
        <div style={{ padding: collapsed ? '16px 10px' : '20px', flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#f8f9fa',
            border: '1px solid #f0f0f0',
            borderRadius: 14,
            padding: collapsed ? '12px' : '14px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: 38, height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #1e3a5f, #3b6fa0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: '0.9rem', fontWeight: 800, color: '#fff',
              boxShadow: '0 2px 8px rgba(30,58,95,0.3)',
            }}>
              {currentUser.name.charAt(0)}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500, marginTop: 2 }}>
                  {currentUser.role}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: collapsed ? '8px 10px' : '4px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {!collapsed && (
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 8, paddingLeft: 4 }}>
              Menu
            </div>
          )}

          {renderNavItem("dashboard", "Dashboard", LayoutDashboard)}

          {[ROLES.MANAGEMENT, ROLES.RD_HEAD, ROLES.PM, ROLES.DEPT_HEAD].includes(currentUser.role) && (
            renderNavItem("team", "Hierarchy & Team", Users)
          )}

          {userTabs.length > 0 && (
            <>
              {!collapsed && (
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.2px', margin: '20px 0 8px', paddingLeft: 4 }}>
                  Tools
                </div>
              )}
              {collapsed && <div style={{ height: 16 }} />}
              {userTabs.map(tab => (
                renderNavItem(tab.id, tab.label, tab.icon)
              ))}
            </>
          )}
        </nav>

        {/* Change Password + Logout */}
        <div style={{ padding: collapsed ? '12px 10px' : '16px', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
          {/* Change Password */}
          <button
            onClick={() => setShowChangePassword(true)}
            title={collapsed ? 'Change Password' : undefined}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10, width: '100%', padding: '9px 14px',
              background: 'none', border: '1px solid transparent', cursor: 'pointer',
              color: '#6b7280', borderRadius: 12,
              fontSize: '0.85rem', fontWeight: 500,
              transition: 'all 0.2s', marginBottom: 4,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff';
              (e.currentTarget as HTMLButtonElement).style.color = '#2563eb';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#bfdbfe';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
              (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
            }}
          >
            <KeyRound className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Change Password</span>}
          </button>
          {/* Sign Out */}
          <button
            onClick={() => setCurrentUser(null)}
            title={collapsed ? 'Sign Out' : undefined}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10, width: '100%', padding: '11px 14px',
              background: 'none', border: '1px solid transparent', cursor: 'pointer',
              color: '#9ca3af', borderRadius: 12,
              fontSize: '0.85rem', fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2';
              (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#fecaca';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
              (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
            }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Change Password Modal */}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          height: 64,
          background: '#ffffff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          gap: 16,
          flexShrink: 0,
          zIndex: 10,
        }}>
          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(o => !o)}
            style={{ background: '#f5f5f7', border: '1px solid #e5e7eb', cursor: 'pointer', color: '#374151', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center' }}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', color: '#111827', fontWeight: 700, letterSpacing: '-0.3px' }}>
              {activeTab === 'dashboard' ? 'Dashboard' :
               activeTab === 'team' ? 'Hierarchy & Team' :
               activeTab === 'pm-projects' ? 'Project Details' :
               [...(EXTRA_TABS[currentUser.role] || []), { id: 'active-work', label: 'Active Work' }]
                 .find(t => t.id === activeTab)?.label || activeTab}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500, marginTop: 1 }}>
              Welcome back, {currentUser.name.split(' ')[0]}
            </div>
          </div>

          {/* Role badge */}
          <div style={{
            fontSize: '0.72rem', fontWeight: 600,
            color: '#1e3a5f',
            background: '#f0f4ff',
            border: '1px solid #e0e7ff',
            padding: '6px 14px',
            borderRadius: 8,
            letterSpacing: '0.3px',
          }}>
            {currentUser.role}
          </div>

          {/* ── Bell Notification Button ── */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setBellOpen(o => !o); }}
              title="Notifications"
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 10,
                background: bellOpen ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${bellOpen ? '#bfdbfe' : '#e5e7eb'}`,
                cursor: 'pointer', transition: 'all 0.15s',
                color: '#475569',
              }}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -5,
                  background: '#ef4444', color: '#fff',
                  fontSize: '0.6rem', fontWeight: 800,
                  width: 17, height: 17, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #fff', lineHeight: 1,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* ── Dropdown panel ── */}
            {bellOpen && (
              <div style={{
                position: 'absolute', top: 44, right: 0,
                width: 360, maxHeight: 480,
                background: '#fff', borderRadius: 14,
                border: '1px solid #e2e8f0',
                boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
                zIndex: 1000, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  background: '#fafbfc',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell className="w-4 h-4" style={{ color: '#64748b' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <span style={{
                        background: '#fef2f2', color: '#ef4444',
                        fontSize: '0.65rem', fontWeight: 800,
                        padding: '2px 7px', borderRadius: 20,
                        border: '1px solid #fecaca',
                      }}>
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        title="Mark all read"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: '0.7rem', fontWeight: 600, color: '#3b82f6',
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '4px 8px', borderRadius: 6,
                        }}
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setBellOpen(false)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', padding: 4, borderRadius: 6,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', padding: '40px 20px', gap: 10,
                      color: '#94a3b8',
                    }}>
                      <CheckCircle style={{ width: 36, height: 36, color: '#bfdbfe' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>All caught up!</span>
                      <span style={{ fontSize: '0.75rem' }}>No notifications right now.</span>
                    </div>
                  ) : (
                    notifications.map((notif: AppNotification) => {
                      const isRead = readIds.has(notif.id);
                      const urgencyConfig: Record<string, { bg: string; border: string; icon: React.ReactNode; dot: string }> = {
                        danger: {
                          bg: isRead ? '#fff' : '#fff5f5',
                          border: '#fecaca',
                          icon: <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444', flexShrink: 0 }} />,
                          dot: '#ef4444',
                        },
                        success: {
                          bg: isRead ? '#fff' : '#f0fdf4',
                          border: '#bbf7d0',
                          icon: <CheckCircle className="w-4 h-4" style={{ color: '#16a34a', flexShrink: 0 }} />,
                          dot: '#16a34a',
                        },
                        info: {
                          bg: isRead ? '#fff' : '#eff6ff',
                          border: '#bfdbfe',
                          icon: <Zap className="w-4 h-4" style={{ color: '#2563eb', flexShrink: 0 }} />,
                          dot: '#2563eb',
                        },
                        warning: {
                          bg: isRead ? '#fff' : '#fffbeb',
                          border: '#fde68a',
                          icon: <Clock className="w-4 h-4" style={{ color: '#d97706', flexShrink: 0 }} />,
                          dot: '#d97706',
                        },
                      };
                      const cfg = urgencyConfig[notif.urgency] || urgencyConfig.info;

                      return (
                        <div
                          key={notif.id}
                          onClick={() => markRead(notif.id)}
                          style={{
                            display: 'flex', gap: 12, padding: '12px 16px',
                            borderBottom: '1px solid #f8fafc',
                            background: cfg.bg,
                            cursor: 'pointer', transition: 'background 0.15s',
                            position: 'relative',
                          }}
                        >
                          {!isRead && (
                            <span style={{
                              position: 'absolute', top: 14, left: 6,
                              width: 6, height: 6, borderRadius: '50%',
                              background: cfg.dot,
                            }} />
                          )}
                          <div style={{ marginTop: 1 }}>{cfg.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'flex-start', gap: 8,
                            }}>
                              <span style={{
                                fontSize: '0.82rem', fontWeight: isRead ? 500 : 700,
                                color: '#1e293b', lineHeight: 1.3,
                              }}>
                                {notif.message}
                              </span>
                              <span style={{
                                fontSize: '0.65rem', fontWeight: 600,
                                color: '#64748b', background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                padding: '2px 6px', borderRadius: 4,
                                flexShrink: 0, whiteSpace: 'nowrap',
                              }}>
                                {(() => {
                                  if (!notif.timestamp) return 'Today';
                                  const d = new Date(notif.timestamp);
                                  if (isNaN(d.getTime())) return 'Today';
                                  const now = new Date();
                                  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                  const startNotif = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                  const diffDays = Math.max(0, Math.floor((startNow.getTime() - startNotif.getTime()) / (1000 * 60 * 60 * 24)));
                                  if (diffDays === 0) return 'Today';
                                  if (diffDays === 1) return '1 day ago';
                                  return `${diffDays} days ago`;
                                })()}
                              </span>
                            </div>
                            <p style={{
                              fontSize: '0.73rem', color: '#64748b',
                              margin: '3px 0 0', lineHeight: 1.4,
                            }}>
                              {notif.detail}
                            </p>
                            <span style={{
                              display: 'inline-block', marginTop: 5,
                              fontSize: '0.65rem', fontWeight: 600,
                              color: '#94a3b8',
                              background: '#f8fafc',
                              padding: '2px 6px', borderRadius: 4,
                            }}>
                              {notif.taskTitle}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content area */}
        <main style={{ flex: 1, overflowY: 'auto', height: '100vh', padding: '32px 36px', background: '#f5f5f7' }}>
          <div style={{ maxWidth: 1360, margin: '0 auto' }} className="fade-in">
            {activeTab === 'team' ? (
              <TeamManagement />
            ) : activeTab === 'rd-projects' ? (
              <RDProjectsView />
            ) : activeTab === 'pm-projects' ? (
              <PMProjectsView 
                initialProjectId={selectedDashboardProjectId} 
                onBack={() => {
                  setSelectedDashboardProjectId(null);
                  setActiveTab('dashboard');
                }} 
              />
            ) : activeTab === 'active-work' ? (
              <ActiveWorkView />
            ) : activeTab === 'task-inbox' ? (
              <TaskInboxView />
            ) : activeTab === 'ai-insights' ? (
              <AIInsights />
            ) : activeTab === 'dashboard' ? (
              <>
                 {currentUser.role === ROLES.CLIENT && <ClientPortal />}
                {(currentUser.role === ROLES.MANAGEMENT || currentUser.role === ROLES.RD_HEAD) && (
                  <ManagementDashboard 
                    onProjectClick={(proj) => {
                      setSelectedDashboardProjectId(proj.id);
                      setActiveTab('pm-projects');
                    }} 
                  />
                )}
                {currentUser.role === ROLES.PM && <PMDashboard />}
                {(currentUser.role === ROLES.EMPLOYEE || currentUser.role === ROLES.DEPT_HEAD) && <EmployeeWorkspace />}
                {currentUser.role === ROLES.SCM && <SCMDashboard />}
              </>
            ) : (
              <PlaceholderView tabId={activeTab} role={currentUser.role} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { console.error('Caught by ErrorBoundary:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fee', color: '#c00', height: '100vh' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
