import React, { useState, useContext } from 'react';
import { FolderKanban, Target, Activity, Clock, UserSquare2, ShieldAlert, Plus, ArrowRight } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { ROLES, TASK_STATUS } from '../constants';
import { Card, StatCard } from './SharedUI';

export const ManagementDashboard = ({ onProjectClick }: { onProjectClick?: (proj: any) => void }) => {
  const { addProject, users, projects, tasks, currentUser } = useContext(AppContext);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', deadline: '', pmId: '', clientId: '', clientName: '' });

  const pms = users.filter((u: any) => u.role === ROLES.PM && (currentUser.role === ROLES.MANAGEMENT || u.managerId === currentUser.id));
  
  // Dashboard Metrics
  const totalProjects = projects.length;
  const globalBuffer = projects.reduce((acc: number, p: any) => acc + (p.bufferPool || 0), 0);
  const activeTasks = tasks.filter((t: any) => t.status === TASK_STATUS.PENDING_START).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProject(formData);
    setShowNewForm(false);
    setFormData({ name: '', deadline: '', pmId: '', clientId: '', clientName: '' });
  };

  const statusColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    'Planning': { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', border: 'border-gray-200' },
    'Active': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' },
    'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  };

  const renderProjectSection = (title: string, sectionProjects: any[], accentColor: string) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-2 h-6 rounded-full ${accentColor}`}></div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <span className="ml-auto text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{sectionProjects.length}</span>
      </div>
      <div className="flex flex-col gap-4">
        {sectionProjects.length === 0 ? (
          <div className="p-10 text-center text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-sm font-medium">No projects here yet</div>
          </div>
        ) : sectionProjects.map((proj: any) => {
          const projTasks = tasks.filter((t: any) => t.projectId === proj.id);
          const approvedTasks = projTasks.filter((t: any) => t.status === TASK_STATUS.PENDING_START).length;
          const progress = projTasks.length > 0 ? Math.round((approvedTasks / projTasks.length) * 100) : 0;
          const inProgressTasks = projTasks.filter((t: any) => t.status === TASK_STATUS.PENDING_START || t.status === 'In Progress' || t.status === 'Active').length;
          const status = proj.status || 'Planning';
          const sc = statusColors[status] || statusColors['Planning'];

          return (
            <Card key={proj.id} className="p-0 group cursor-pointer hover:shadow-md transition-all active:scale-[0.99]" onClick={() => onProjectClick?.(proj)}>
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                      <FolderKanban className="w-5 h-5 text-gray-500"/>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-[15px] leading-snug">{proj.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                        <span className={`text-[11px] font-semibold ${sc.text}`}>{status}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
                </div>
                
                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-[11px] text-gray-400 mb-1.5 font-medium">
                    <span>Planning Progress</span>
                    <span className="font-semibold text-gray-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#1e3a5f] h-1.5 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-3.5 h-3.5 text-gray-400"/>
                    <span>{proj.deadline}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <UserSquare2 className="w-3.5 h-3.5 text-gray-400"/>
                    <span className="truncate">{users.find((u: any) => u.id === proj.pmId)?.name || '—'}</span>
                  </div>
                  {proj.clientId && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <UserSquare2 className="w-3.5 h-3.5 text-blue-400"/>
                      <span className="truncate" title={`Client: ${users.find((u: any) => u.id === proj.clientId)?.name}`}>
                        {users.find((u: any) => u.id === proj.clientId)?.name || '—'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500">
                    <Activity className="w-3.5 h-3.5 text-blue-400"/>
                    <span><strong className="text-gray-800">{inProgressTasks}</strong> active</span>
                  </div>
                  {proj.bufferPool !== undefined && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500"/>
                      <span><strong className="text-gray-800">{proj.bufferPool}</strong>d buffer</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Project Management</h2>
          <p className="text-sm text-gray-500 mt-1">Overview of all project portfolios and their status</p>
        </div>
        <button 
          onClick={() => setShowNewForm(!showNewForm)}
          className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-[#162d4a] shadow-sm hover:shadow-md transition-all text-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard title="Active Portfolios" value={totalProjects} icon={FolderKanban} colorClass="bg-blue-50 text-blue-600" subtitle="Total projects provisioned" />
        <StatCard 
          title="Global Buffer Pool" 
          value={
            <div className="flex flex-col gap-2 mt-2 font-normal text-base">
              <div className="font-bold text-2xl text-gray-900 tracking-tight">{globalBuffer} Days</div>
              <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
                {projects.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-gray-500 text-[13px]">
                    <span className="truncate w-32 font-medium">{p.name}</span>
                    <span className="font-bold text-gray-800 tabular-nums">{p.bufferPool || 0}d</span>
                  </div>
                ))}
              </div>
            </div>
          } 
          icon={Target} 
          colorClass="bg-amber-50 text-amber-600" 
        />
        <StatCard 
          title="Tasks in Progress" 
          value={
            <div className="flex flex-col gap-2 mt-2 font-normal text-base">
              <div className="font-bold text-2xl text-gray-900 tracking-tight">{activeTasks} Tasks</div>
              <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
                {projects.map((p: any) => {
                  const projTasks = tasks.filter((t: any) => t.projectId === p.id);
                  const count = projTasks.filter((t: any) => t.status === TASK_STATUS.PENDING_START || t.status === 'In Progress' || t.status === 'Active').length;
                  return (
                    <div key={p.id} className="flex justify-between items-center text-gray-500 text-[13px]">
                      <span className="truncate w-32 font-medium">{p.name}</span>
                      <span className="font-bold text-gray-800 tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          } 
          icon={Activity} 
          colorClass="bg-emerald-50 text-emerald-600" 
        />
      </div>

      {/* New Project Form */}
      {showNewForm && (
        <Card className="p-0 fade-in">
          <div className="px-7 py-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Provision Project to PM</h3>
            <p className="text-sm text-gray-400 mt-1">Create a new project and assign it to a project manager</p>
          </div>
          <form onSubmit={handleSubmit} className="px-7 py-6 grid grid-cols-1 md:grid-cols-5 gap-5">
            <div>
              <label className="block text-[13px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Project Name</label>
              <input 
                required type="text" 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none bg-gray-50 focus:bg-white font-medium text-gray-900 text-sm"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Product Development Phase 2"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Target Deadline</label>
              <input 
                required type="date" 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none bg-gray-50 focus:bg-white font-medium text-gray-900 text-sm"
                value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Assign PM</label>
              <select 
                required 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none bg-gray-50 focus:bg-white font-medium text-gray-900 text-sm"
                value={formData.pmId} onChange={e => setFormData({...formData, pmId: e.target.value})}
              >
                <option value="">Select a PM...</option>
                {pms.map((pm: any) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Assign Client (Optional)</label>
              <select 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none bg-gray-50 focus:bg-white font-medium text-gray-900 text-sm"
                value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}
              >
                <option value="">Select a Client...</option>
                {users.filter((u: any) => u.role === ROLES.CLIENT).map((client: any) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Client's Name (Optional)</label>
              <input 
                type="text" 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none bg-gray-50 focus:bg-white font-medium text-gray-900 text-sm"
                value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})}
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div className="md:col-span-5 flex justify-end mt-2">
              <button type="button" onClick={() => setShowNewForm(false)} className="text-gray-400 hover:text-gray-600 font-medium text-sm px-5 py-2.5 rounded-xl transition-colors mr-3">
                Cancel
              </button>
              <button type="submit" className="bg-[#1e3a5f] text-white font-semibold px-7 py-2.5 rounded-xl hover:bg-[#162d4a] shadow-sm hover:shadow-md transition-all text-sm active:scale-[0.98]">
                Create & Assign
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Project sections */}
      <div className="flex flex-col xl:flex-row gap-8 mt-4">
        {renderProjectSection("Yet to be Started", projects.filter((p: any) => !p.status || p.status === 'Planning'), 'bg-gray-400')}
        {renderProjectSection("In Progress", projects.filter((p: any) => p.status === 'Active'), 'bg-blue-500')}
        {renderProjectSection("Completed", projects.filter((p: any) => p.status === 'Completed'), 'bg-emerald-500')}
      </div>
    </div>
  );
};
