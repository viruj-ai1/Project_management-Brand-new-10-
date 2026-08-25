import { useState, useContext } from 'react';
import {
  FolderKanban, Plus, ChevronRight, Clock, Users, ShieldAlert,
  CheckCircle, XCircle, PauseCircle, Search, X, Calendar, Tag,
  User, Play, RotateCcw, CheckSquare, AlertCircle,
  Activity, UserSquare2
} from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { ROLES, TASK_STATUS } from '../constants';
import { Card, StatCard } from './SharedUI';

const PROJECT_STATUSES = ['Planning', 'Active', 'Completed', 'Suspended', 'Dismissed'];

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; badge: string }> = {
  Planning: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock, badge: 'bg-blue-100 text-blue-700' },
  Active: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, badge: 'bg-green-100 text-green-700' },
  Completed: { color: 'text-[#1e3a5f]', bg: 'bg-blue-50', border: 'border-blue-200', icon: CheckCircle, badge: 'bg-blue-50 text-[#1e3a5f]' },
  Suspended: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: PauseCircle, badge: 'bg-amber-100 text-amber-700' },
  Dismissed: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, badge: 'bg-red-100 text-red-700' },
};

const PRIORITY_CONFIG: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  Low: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const TASK_STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  [TASK_STATUS.PENDING_START]: { color: 'text-green-700', bg: 'bg-green-100' },
};

const CATEGORIES = ['Formulation R&D', 'Clinical Trial', 'Regulatory', 'Technology Transfer', 'Quality Assurance', 'Other'];
const PRIORITIES = ['High', 'Medium', 'Low'];

// Action buttons for each project status
const STATUS_ACTIONS: Record<string, { label: string; icon: any; targetStatus: string; className: string }[]> = {
  Planning: [
    { label: 'Start Project', icon: Play, targetStatus: 'Active', className: 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/30' },
    { label: 'Dismiss', icon: XCircle, targetStatus: 'Dismissed', className: 'bg-red-100 hover:bg-red-200 text-red-700' },
  ],
  Active: [
    { label: 'Mark Completed', icon: CheckCircle, targetStatus: 'Completed', className: 'bg-[#1e3a5f] hover:bg-[#162d4a] text-white shadow-blue-500/30' },
    { label: 'Suspend', icon: PauseCircle, targetStatus: 'Suspended', className: 'bg-amber-100 hover:bg-amber-200 text-amber-700' },
    { label: 'Dismiss', icon: XCircle, targetStatus: 'Dismissed', className: 'bg-red-100 hover:bg-red-200 text-red-700' },
  ],
  Suspended: [
    { label: 'Resume Project', icon: RotateCcw, targetStatus: 'Active', className: 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/30' },
    { label: 'Dismiss', icon: XCircle, targetStatus: 'Dismissed', className: 'bg-red-100 hover:bg-red-200 text-red-700' },
  ],
  Completed: [
    { label: 'Reopen', icon: RotateCcw, targetStatus: 'Active', className: 'bg-blue-100 hover:bg-blue-200 text-blue-700' },
  ],
  Dismissed: [
    { label: 'Reopen Planning', icon: RotateCcw, targetStatus: 'Planning', className: 'bg-blue-100 hover:bg-blue-200 text-blue-700' },
  ],
};

export const RDProjectsView = () => {
  const { projects, tasks, addProject, updateProjectStatus, users } = useContext(AppContext);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', deadline: '', pmId: '', description: '', category: '', priority: 'Medium', clientId: '', clientName: ''
  });

  const pms = users.filter((u: any) => u.role === ROLES.PM);
  const clients = users.filter((u: any) => u.role === ROLES.CLIENT);

  const filtered = projects.filter((p: any) => {
    const matchesStatus = activeFilter === 'All' || p.status === activeFilter;
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const counts: Record<string, number> = { All: projects.length };
  PROJECT_STATUSES.forEach(s => { counts[s] = projects.filter((p: any) => p.status === s).length; });

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    addProject(formData);
    setFormData({ name: '', deadline: '', pmId: '', description: '', category: '', priority: 'Medium', clientId: '', clientName: '' });
    setShowForm(false);
  };

  const canStartProject = (projId: string) => {
    const projTasks = tasks.filter((t: any) => t.projectId === projId);
    return projTasks.length > 0 && projTasks.every((t: any) =>
      t.status === TASK_STATUS.PENDING_START || t.status === 'In Progress' || t.status === 'Completed'
    );
  };

  // ── PROJECT DETAIL VIEW ──────────────────────────────────────────────────
  if (selectedProjectId) {
    const proj = projects.find((p: any) => p.id === selectedProjectId);
    if (!proj) { setSelectedProjectId(null); return null; }

    const cfg = STATUS_CONFIG[proj.status] || STATUS_CONFIG['Planning'];
    const StatusIcon = cfg.icon;
    const pm = users.find((u: any) => u.id === proj.pmId);
    const clientObj = users.find((u: any) => u.id === proj.clientId);
    const projTasks = tasks.filter((t: any) => t.projectId === proj.id);
    const actions = STATUS_ACTIONS[proj.status] || [];

    const totalAssignedDays = projTasks.reduce((s: number, t: any) => s + (t.assignedDays || 0), 0);
    const totalBufferDays = projTasks.reduce((s: number, t: any) => s + (t.bufferDays || 0), 0);
    const approvedCount = projTasks.filter((t: any) => t.status === TASK_STATUS.PENDING_START).length;
    const progress = projTasks.length > 0 ? Math.round((approvedCount / projTasks.length) * 100) : 0;

    return (
      <div className="space-y-8 fade-in">
        {/* Back button */}
        <button
          onClick={() => setSelectedProjectId(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 bg-white px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all font-semibold text-sm"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Projects
        </button>

        {/* Hero header */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-[#1e3a5f] text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gray-700/20 rounded-full -ml-10 -mb-10" />
          <div className="relative z-10">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${cfg.badge}`}>
                <StatusIcon className="w-3.5 h-3.5" /> {proj.status}
              </span>
              {proj.priority && (
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${PRIORITY_CONFIG[proj.priority] || ''}`}>
                  {proj.priority} Priority
                </span>
              )}
              {proj.category && (
                <span className="text-xs bg-white/10 text-blue-100 px-3 py-1.5 rounded-full border border-white/20">
                  {proj.category}
                </span>
              )}
            </div>

            <h2 className="text-3xl font-black mb-2 tracking-tight">{proj.name}</h2>
            {proj.description && <p className="text-blue-200 text-sm max-w-2xl leading-relaxed">{proj.description}</p>}

            {/* Meta row */}
            <div className="flex flex-wrap gap-6 mt-6 text-sm">
              <div className="flex items-center gap-2 text-blue-200">
                <Calendar className="w-4 h-4" />
                Deadline: <strong className="text-white">{proj.deadline || 'N/A'}</strong>
              </div>
              <div className="flex items-center gap-2 text-blue-200">
                <User className="w-4 h-4" />
                PM: <strong className="text-white">{pm?.name || 'Unassigned'}</strong>
              </div>
              <div className="flex items-center gap-2 text-blue-200">
                <User className="w-4 h-4" />
                Client: <strong className="text-white">{clientObj?.name || 'None'}</strong>
              </div>
              <div className="flex items-center gap-2 text-blue-200">
                <ShieldAlert className="w-4 h-4" />
                Buffer Pool: <strong className="text-white">{proj.bufferPool || 0} Days</strong>
              </div>
            </div>

            {/* Action buttons */}
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-7 pt-7 border-t border-white/10 items-center">
                {actions.map(action => {
                  const AIcon = action.icon;
                  const isStartAction = action.targetStatus === 'Active' && proj.status === 'Planning';
                  const startable = !isStartAction || canStartProject(proj.id);
                  return (
                    <div key={action.targetStatus} className="flex flex-col items-start gap-1">
                      <button
                        disabled={!startable}
                        onClick={() => updateProjectStatus(proj.id, action.targetStatus)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${startable
                            ? `${action.className} hover:scale-105 active:scale-95`
                            : 'bg-gray-700/50 text-gray-400 cursor-not-allowed shadow-none border border-gray-600'
                          }`}
                      >
                        <AIcon className="w-4 h-4" /> {action.label}
                      </button>
                      {isStartAction && !startable && (
                        <span className="text-xs text-amber-400 font-medium mt-1">
                          Requires at least 1 task and all estimates approved by PM.
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Tasks" value={projTasks.length} icon={CheckSquare} colorClass="bg-blue-100 text-blue-600" />
          <StatCard title="Tasks Approved" value={approvedCount} icon={CheckCircle} colorClass="bg-green-100 text-green-600" />
          <StatCard title="Days Assigned" value={`${totalAssignedDays}d`} icon={Clock} colorClass="bg-blue-50 text-[#3b82f6]" />
          <StatCard title="Buffer Saved" value={`${totalBufferDays}d`} icon={ShieldAlert} colorClass="bg-amber-100 text-amber-600" />
        </div>

        {/* Progress bar */}
        <Card className="p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#3b82f6]" /> Planning Progress
            </h3>
            <span className="text-sm font-bold text-[#3b82f6]">{progress}% Tasks Approved</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-[#1e3a5f] h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>

        {/* Tasks list */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-4 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#3b82f6]" /> Delegated Tasks ({projTasks.length})
          </h3>

          {projTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-2 border-dashed border-gray-200 bg-gray-50/50">
              <AlertCircle className="w-12 h-12 mb-3 opacity-25" />
              <p className="font-medium">No tasks delegated yet</p>
              <p className="text-sm mt-1 text-gray-400">The assigned PM needs to delegate tasks first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projTasks.map((task: any) => {
                const assignees = users.filter((u: any) =>
                  Array.isArray(task.assignedTo)
                    ? task.assignedTo.includes(u.id)
                    : task.assignedTo === u.id
                );
                const assigneeNames = assignees.length > 0 ? assignees.map((a: any) => a.name).join(', ') : 'Unknown';
                const assigneeRoles = assignees.length > 0
                  ? assignees.map((a: any) => a.role === ROLES.DEPT_HEAD ? 'Department' : a.role).join(', ')
                  : '';
                const tsCfg = TASK_STATUS_CONFIG[task.status] || { color: 'text-gray-600', bg: 'bg-gray-100' };
                const isApproved = task.status === TASK_STATUS.PENDING_START;

                return (
                  <Card key={task.id} className="p-5">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                      {/* Left: task info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="font-bold text-gray-900 text-base">{task.title}</h4>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tsCfg.bg} ${tsCfg.color}`}>
                            {task.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed mb-3">
                          {task.specs}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <UserSquare2 className="w-4 h-4 text-gray-400" />
                          <span>Assigned to: <strong className="text-gray-900">{assigneeNames}</strong></span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">{assigneeRoles}</span>
                        </div>
                      </div>

                      {/* Right: day breakdown */}
                      <div className="flex-shrink-0 sm:min-w-[200px]">
                        {isApproved ? (
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 text-center">
                            <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Approved Allocation</div>
                            <div className="text-3xl font-black text-green-700 mb-1">{task.assignedDays}</div>
                            <div className="text-xs text-green-600 font-medium mb-3">Days Assigned</div>
                            <div className="border-t border-green-200 pt-2 space-y-1.5 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500">Estimated:</span>
                                <span className="font-bold text-gray-700">{task.estimatedDays} days</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500">Total Final:</span>
                                <span className="font-bold text-gray-700">{task.finalTotalDays} days</span>
                              </div>
                              <div className="flex justify-between items-center border-t border-green-100 pt-1.5">
                                <span className="text-[#3b82f6] flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" /> Buffer:
                                </span>
                                <span className="font-black text-[#1e3a5f]">+{task.bufferDays} days</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Pending</div>
                            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <div className="text-xs text-gray-400">Awaiting project manager assignment</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtasks if approved */}
                    {isApproved && task.subtasks?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subtasks Breakdown</div>
                        <div className="space-y-1.5">
                          {task.subtasks.map((st: any, i: number) => (
                            <div key={st.id || i} className="flex justify-between items-center text-xs bg-gray-50 px-3 py-2 rounded-lg">
                              <span className="text-gray-700 font-medium">{i + 1}. {st.title}</span>
                              <div className="flex items-center gap-3">
                                {st.prereqs && <span className="text-gray-400 italic">Deps: {st.prereqs}</span>}
                                <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">{st.days}d</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN LIST VIEW ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">R&D Project Portfolio</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and track all research & development projects</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#162d4a] transition-all shadow-sm hover:shadow-md transition-shadow shadow-blue-500/30 font-bold text-sm"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: counts['All'], color: 'bg-gray-100 text-gray-600', icon: FolderKanban },
          { label: 'Planning', value: counts['Planning'], color: 'bg-blue-100 text-blue-600', icon: Clock },
          { label: 'Active', value: counts['Active'], color: 'bg-green-100 text-green-600', icon: CheckCircle },
          { label: 'Completed', value: counts['Completed'], color: 'bg-blue-50 text-[#3b82f6]', icon: CheckCircle },
          { label: 'Suspended', value: counts['Suspended'], color: 'bg-amber-100 text-amber-600', icon: PauseCircle },
          { label: 'Dismissed', value: counts['Dismissed'], color: 'bg-red-100 text-red-600', icon: XCircle },
        ].map(s => (
          <StatCard key={s.label} title={s.label} value={s.value} icon={s.icon} colorClass={s.color} />
        ))}
      </div>

      {/* New Project Form */}
      {showForm && (
        <Card className="p-6 border-2 border-blue-100 bg-gradient-to-br from-blue-50/60 to-white">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#3b82f6]" /> Register New R&D Project
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Project Name *</label>
              <input required type="text" placeholder="e.g. Paracetamol 500mg Tablet Formulation"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea rows={2} placeholder="Brief project scope & objectives..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white resize-none"
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <select className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                <option value="">Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
              <select className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Target Deadline *</label>
              <input required type="date"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Project Manager *</label>
              <select required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.pmId} onChange={e => setFormData({ ...formData, pmId: e.target.value })}>
                <option value="">Select PM...</option>
                {pms.map((pm: any) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Client (Optional)</label>
              <select className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })}>
                <option value="">No Client...</option>
                {clients.map((client: any) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Client's Name (Optional)</label>
              <input type="text" placeholder="e.g. Acme Corp"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-50 transition-all text-sm">
                Cancel
              </button>
              <button type="submit"
                className="bg-[#1e3a5f] text-white px-6 py-2.5 rounded-xl hover:bg-[#162d4a] transition-all font-bold shadow-sm hover:shadow-md transition-shadow text-sm">
                Register Project
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', ...PROJECT_STATUSES].map(status => {
            const cfg = status === 'All' ? null : STATUS_CONFIG[status];
            return (
              <button key={status} onClick={() => setActiveFilter(status)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeFilter === status
                    ? (cfg ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-gray-800 text-white border-gray-800')
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>
                {status} <span className="ml-1 opacity-60 text-xs">({counts[status] ?? 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Project Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-2 border-dashed border-gray-200 bg-gray-50/50">
          <FolderKanban className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No projects found</p>
          <p className="text-sm mt-1">
            {activeFilter !== 'All' ? `No ${activeFilter.toLowerCase()} projects yet.` : 'Create your first project to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((proj: any) => {
            const cfg = STATUS_CONFIG[proj.status] || STATUS_CONFIG['Planning'];
            const StatusIcon = cfg.icon;
            const pm = users.find((u: any) => u.id === proj.pmId);
            const projTasks = tasks.filter((t: any) => t.projectId === proj.id);
            const approvedCount = projTasks.filter((t: any) => t.status === TASK_STATUS.PENDING_START).length;
            const progress = projTasks.length > 0 ? Math.round((approvedCount / projTasks.length) * 100) : 0;
            // Primary action for the card
            const primaryAction = STATUS_ACTIONS[proj.status]?.[0];

            return (
              <Card
                key={proj.id}
                className="p-0 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 hover:border-blue-300 group overflow-hidden"
              >
                {/* Coloured status stripe */}
                <div className={`px-5 py-2.5 ${cfg.bg} ${cfg.border} border-b flex items-center justify-between`}
                  onClick={() => setSelectedProjectId(proj.id)}>
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${cfg.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" /> {proj.status}
                  </span>
                  {proj.priority && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[proj.priority] || ''}`}>
                      {proj.priority}
                    </span>
                  )}
                </div>

                <div className="p-5" onClick={() => setSelectedProjectId(proj.id)}>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-[#1e3a5f] transition-colors mb-2">
                    {proj.name}
                  </h3>
                  {proj.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{proj.description}</p>
                  )}
                  {proj.category && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium">{proj.category}</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  {projTasks.length > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{approvedCount}/{projTasks.length} tasks approved</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Deadline: <strong className="text-gray-700">{proj.deadline || 'Not set'}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      PM: <strong className="text-gray-700">{pm?.name || 'Unassigned'}</strong>
                    </div>
                    {(proj.bufferPool || 0) > 0 && (
                      <div className="flex items-center gap-2 text-[#3b82f6]">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <strong>{proj.bufferPool} days</strong> buffer saved
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer: primary action + view details */}
                <div className="px-5 pb-4 flex flex-col gap-2">
                  {primaryAction && (() => {
                    const AIcon = primaryAction.icon;
                    const isStartAction = primaryAction.targetStatus === 'Active' && proj.status === 'Planning';
                    const startable = !isStartAction || canStartProject(proj.id);
                    return (
                      <div className="w-full flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          disabled={!startable}
                          onClick={e => { e.stopPropagation(); updateProjectStatus(proj.id, primaryAction.targetStatus); }}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${startable
                              ? `${primaryAction.className} hover:scale-105 active:scale-95`
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                            }`}
                        >
                          <AIcon className="w-3.5 h-3.5" /> {primaryAction.label}
                        </button>
                        {isStartAction && !startable && (
                          <span className="text-[10px] text-amber-600 font-medium text-center">
                            Awaiting PM estimate approvals.
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => setSelectedProjectId(proj.id)}
                    className="flex items-center justify-center gap-1 w-full py-2.5 rounded-xl font-bold text-xs text-[#3b82f6] border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all"
                  >
                    Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
