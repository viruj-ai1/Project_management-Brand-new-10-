import { useState, useContext, useEffect, useMemo } from 'react';
import { ChevronRight, FileText, AlertCircle, Activity, Users, Play, CheckCircle2, Circle, Zap, AlertTriangle, FolderKanban, Inbox, CheckSquare, X, Clock, Briefcase, Calendar } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { ROLES, TASK_STATUS, addWorkingDays, getWorkingDaysElapsed } from '../constants';
import { Card, StatCard } from './SharedUI';

export const EmployeeWorkspace = () => {
  const { currentUser, tasks, projects, users } = useContext(AppContext);

  const myTasks = tasks.filter((t: any) => 
    (Array.isArray(t.assignedTo) ? t.assignedTo.includes(currentUser.id) : t.assignedTo === currentUser.id) || 
    (t.delegatedTo === currentUser.id && t.delegateRequestStatus === 'Approved')
  );
  
  const pendingStartTasks = myTasks.filter((t: any) => t.status === TASK_STATUS.PENDING_START).length;
  const activeTasks = myTasks.filter((t: any) => t.status === 'In Progress').length;
  const isDeptHead = currentUser.role === ROLES.DEPT_HEAD;
  const directReports = users.filter((u: any) => u.managerId === currentUser.id);

  // Group by project
  const myProjectIds = Array.from(new Set(myTasks.map((t: any) => t.projectId)));
  const myProjects = projects.filter((p: any) => myProjectIds.includes(p.id));

  const getTaskProgress = (task: any) => {
    if (task.status === 'Completed') return 100;
    const subtasks = task.subtasks || [];
    if (subtasks.length === 0) {
      // No subtasks: use task-level daily log ticks
      const total = task.assignedDays || task.finalTotalDays || 0;
      if (total === 0) return 0;
      const done = (task.taskDailyLogsCompleted || []).filter(Boolean).length;
      return Math.round((Math.min(done, total) / total) * 100);
    }
    const completedSubtasks = subtasks.filter((st: any) => st.completed);
    const totalWeight = subtasks.reduce((sum: number, st: any) => sum + (Number(st.days) || 1), 0) || 1;
    const completedWeight = completedSubtasks.reduce((sum: number, st: any) => sum + (Number(st.days) || 1), 0);
    return Math.round((completedWeight / totalWeight) * 100);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{isDeptHead ? 'Department Workspace' : 'My Workspace'}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Pending Start" value={pendingStartTasks} icon={AlertCircle} colorClass={pendingStartTasks > 0 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"} subtitle="Tasks to begin" />
        <StatCard title="Active Assignments" value={activeTasks} icon={Activity} colorClass="bg-green-100 text-green-600" subtitle="In progress" />
        {isDeptHead && (
          <StatCard title="Department Size" value={directReports.length} icon={Users} colorClass="bg-blue-50 text-[#3b82f6]" subtitle="Direct reports" />
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-[#1e3a5f]" /> My Assigned Projects
        </h3>
        
        {myProjects.length === 0 ? (
          <Card className="p-8 text-center max-w-2xl mx-auto space-y-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <Inbox className="w-12 h-12 mx-auto text-gray-400 opacity-60" />
            <p className="text-gray-500">You are not currently assigned to any projects.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myProjects.map((proj: any) => {
              const projTasks = myTasks.filter((t: any) => t.projectId === proj.id);
              const pm = users.find((u: any) => u.id === proj.pmId);
              const progressSum = projTasks.reduce((s: number, t: any) => s + getTaskProgress(t), 0);
              const myProgress = projTasks.length > 0 ? Math.round(progressSum / projTasks.length) : 0;

              return (
                <Card key={proj.id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-sm hover:shadow-md transition-shadow transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {proj.status}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">
                        Deadline: {proj.deadline || 'None'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-gray-900 text-base mb-1 line-clamp-1">{proj.name}</h4>
                    <p className="text-xs text-gray-500 mb-4">Project Manager: <strong>{pm?.name || 'Unknown'}</strong></p>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    <div className="flex justify-between text-[11px] font-bold text-gray-500">
                      <span>My Progress ({projTasks.length} Task{projTasks.length !== 1 ? 's' : ''})</span>
                      <span>{myProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${myProgress}%` }} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const TaskWorkDetail = ({ task, onBack }: { task: any, onBack: () => void }) => {
  const { projects, updateTask, tasks } = useContext(AppContext);
  const proj = projects.find((p: any) => p.id === task.projectId);

  const [requestedExtensionDays, setRequestedExtensionDays] = useState(1);
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);

  const options = useMemo(() => ["Technical difficulties", "Dependency delay", "Underestimated effort", "Resource unavailable", "Scope creep"], []);
  const currentReasonVal = task.delayJustification || "";
  const initialSelectVal = currentReasonVal === "" 
    ? "" 
    : (options.includes(currentReasonVal) ? currentReasonVal : "Other");

  const [selectedReason, setSelectedReason] = useState(initialSelectVal);
  const [customReasonText, setCustomReasonText] = useState(options.includes(currentReasonVal) ? "" : currentReasonVal);

  const [dailyDescriptions, setDailyDescriptions] = useState<string[]>(['']);
  // Local state for task-level daily log text (instant typing)
  const [localTaskDailyLogs, setLocalTaskDailyLogs] = useState<string[]>(() => {
    const count = task.assignedDays > 0 ? task.assignedDays : (task.finalTotalDays || 1);
    return Array(count).fill('').map((_, i) => (task.taskDailyLogs || [])[i] || '');
  });
  // Local state for task-level daily log ticks (instant progress bar update)
  const [localTaskDailyLogsCompleted, setLocalTaskDailyLogsCompleted] = useState<boolean[]>(() => {
    const count = task.assignedDays > 0 ? task.assignedDays : (task.finalTotalDays || 1);
    return Array(count).fill(false).map((_, i) => !!(task.taskDailyLogsCompleted || [])[i]);
  });

  useEffect(() => {
    setDailyDescriptions(prev => {
      const next = [...prev];
      if (next.length < requestedExtensionDays) {
        while (next.length < requestedExtensionDays) next.push('');
      } else if (next.length > requestedExtensionDays) {
        next.splice(requestedExtensionDays);
      }
      return next;
    });
  }, [requestedExtensionDays]);

  useEffect(() => {
    const val = task.delayJustification || "";
    const sel = val === "" ? "" : (options.includes(val) ? val : "Other");
    setSelectedReason(sel);
    setCustomReasonText(options.includes(val) ? "" : val);
  }, [task.delayJustification, options]);

  // Sync local daily logs if task changes externally (e.g., switched tasks)
  useEffect(() => {
    const count = task.assignedDays > 0 ? task.assignedDays : (task.finalTotalDays || 1);
    setLocalTaskDailyLogs(
      Array(count).fill('').map((_, i) => (task.taskDailyLogs || [])[i] || '')
    );
    setLocalTaskDailyLogsCompleted(
      Array(count).fill(false).map((_, i) => !!(task.taskDailyLogsCompleted || [])[i])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const subtasks = task.subtasks || [];
  const allPrereqsChecked = !task.prerequisitesChecklist || task.prerequisitesChecklist.every((r: any) => r.completed);
  const completedSubtasks = subtasks.filter((st: any) => st.completed);
  const allSubtasksCompleted = subtasks.length === 0 || completedSubtasks.length === subtasks.length;

  const totalWeight = subtasks.reduce((sum: number, st: any) => sum + (Number(st.days) || 1), 0) || 1;
  const completedWeight = completedSubtasks.reduce((sum: number, st: any) => sum + (Number(st.days) || 1), 0);

  // For tasks with no subtasks, progress comes from local day-tick state
  const noSubtaskDayCount = (task.assignedDays || 0) > 0 ? task.assignedDays : (task.finalTotalDays || 1);
  const completionPercentage = task.status === 'Completed' ? 100
    : subtasks.length === 0
      ? Math.round((localTaskDailyLogsCompleted.filter(Boolean).length / Math.max(noSubtaskDayCount, 1)) * 100)
      : Math.round((completedWeight / totalWeight) * 100);

  const daysAllocated = task.assignedDays || 0;
  const totalDaysAllocated = daysAllocated + (task.bufferDays || 0);
  const startDate = task.startedAt ? new Date(task.startedAt) : null;
  const endDate = startDate && totalDaysAllocated
    ? addWorkingDays(startDate, totalDaysAllocated) : null;
  const today = new Date();
  const daysElapsed = startDate ? getWorkingDaysElapsed(startDate, today) : 0;
  const daysRemaining = Math.max(0, totalDaysAllocated - daysElapsed);
  const daysPercentage = totalDaysAllocated > 0 ? Math.min(150, Math.round((daysElapsed / totalDaysAllocated) * 100)) : 0;

  const isInYellowZone = task.status === 'In Progress'
    && daysAllocated > 0
    && daysPercentage > 65
    && completionPercentage < daysPercentage;

  const daysBarColor = (() => {
    if (completionPercentage >= 100) return 'bg-emerald-500'; // already completed
    if (daysPercentage > 100) return 'bg-red-500';            // overdue
    if (daysPercentage > 85)  return 'bg-red-500';            // 85–100% of days used
    if (daysPercentage > 65)  return 'bg-amber-500';          // 65–85% of days used
    return 'bg-emerald-500';                                  // ≤65% of days used
  })();

  const handleApplyExtension = (days: number) => {
    const newLogs = dailyDescriptions.map((desc, i) => ({
      id: `ext-${Date.now()}-${i}`,
      day: (task.extensionDayLogs?.length || 0) + i + 1,
      description: desc,
      completed: false,
      completedAt: null
    }));
    updateTask(task.id, {
      bufferDays: (task.bufferDays || 0) + days,
      extensionDayLogs: [...(task.extensionDayLogs || []), ...newLogs]
    });
    setDailyDescriptions(['']);
    setRequestedExtensionDays(1);
  };

  const handleToggleExtensionDay = (logId: string) => {
    const updatedLogs = (task.extensionDayLogs || []).map((log: any) =>
      log.id === logId
        ? { ...log, completed: !log.completed, completedAt: !log.completed ? new Date().toISOString() : null }
        : log
    );
    updateTask(task.id, { extensionDayLogs: updatedLogs });
  };

  const handleToggleSubtask = (stId: any) => {
    const updatedSubtasks = subtasks.map((st: any) => {
      if (st.id.toString() === stId.toString()) {
        const isNowCompleted = !st.completed;
        return { 
          ...st, 
          completed: isNowCompleted,
          completedAt: isNowCompleted ? new Date().toISOString() : undefined 
        };
      }
      return st;
    });
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleUpdateSubtaskField = (stId: any, field: string, value: any) => {
    const updatedSubtasks = subtasks.map((st: any) =>
      st.id.toString() === stId.toString() ? { ...st, [field]: value } : st
    );
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleAddActionPoint = (stId: any) => {
    const updatedSubtasks = subtasks.map((st: any) => {
      if (st.id.toString() === stId.toString()) {
        const actionPoints = [...(st.actionPoints || []), { id: Date.now(), text: '', done: false }];
        return { ...st, actionPoints };
      }
      return st;
    });
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleUpdateActionPoint = (stId: any, apIdx: number, field: string, value: any) => {
    const updatedSubtasks = subtasks.map((st: any) => {
      if (st.id.toString() === stId.toString()) {
        const actionPoints = [...(st.actionPoints || [])];
        actionPoints[apIdx] = { ...actionPoints[apIdx], [field]: value };
        return { ...st, actionPoints };
      }
      return st;
    });
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleDeleteActionPoint = (stId: any, apIdx: number) => {
    const updatedSubtasks = subtasks.map((st: any) => {
      if (st.id.toString() === stId.toString()) {
        const actionPoints = [...(st.actionPoints || [])];
        actionPoints.splice(apIdx, 1);
        return { ...st, actionPoints };
      }
      return st;
    });
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleUpdateDailyLog = (stId: any, dayIdx: number, value: string) => {
    const updatedSubtasks = subtasks.map((st: any) => {
      if (st.id.toString() === stId.toString()) {
        const assignedDays = Number(st.days) || 1;
        const dailyLogs = Array(assignedDays).fill('').map((_, i) => (st.dailyLogs || [])[i] || '');
        dailyLogs[dayIdx] = value;
        return { ...st, dailyLogs };
      }
      return st;
    });
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleToggleDailyLogCompleted = (stId: any, dayIdx: number) => {
    const updatedSubtasks = subtasks.map((st: any) => {
      if (st.id.toString() === stId.toString()) {
        const dailyLogsCompleted = st.dailyLogsCompleted ? [...st.dailyLogsCompleted] : [];
        dailyLogsCompleted[dayIdx] = !dailyLogsCompleted[dayIdx];
        return { ...st, dailyLogsCompleted };
      }
      return st;
    });
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  // ── Task-level daily logs (used when task has NO subtasks) ──────────────
  const taskDailyLogCount = noSubtaskDayCount;
  // Use localTaskDailyLogsCompleted so progress bar updates instantly on tick
  const taskDailyLogsCompleted = localTaskDailyLogsCompleted;
  const allTaskDaysCompleted = taskDailyLogsCompleted.every(Boolean) && taskDailyLogCount > 0;

  const handleUpdateTaskDailyLog = (dayIdx: number, value: string) => {
    setLocalTaskDailyLogs(prev => {
      const next = [...prev];
      next[dayIdx] = value;
      return next;
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveTaskDailyLog = (_dayIdx?: number) => {
    const logs = Array(taskDailyLogCount).fill('').map((_, i) => localTaskDailyLogs[i] || '');
    updateTask(task.id, { taskDailyLogs: logs });
  };

  const handleToggleTaskDailyLogCompleted = (dayIdx: number) => {
    // Update local state immediately → progress bar reacts instantly
    const newCompleted = [...localTaskDailyLogsCompleted];
    newCompleted[dayIdx] = !newCompleted[dayIdx];
    setLocalTaskDailyLogsCompleted(newCompleted);
    // Persist logs + completion to backend
    const logs = Array(taskDailyLogCount).fill('').map((_, i) => localTaskDailyLogs[i] || '');
    updateTask(task.id, { taskDailyLogsCompleted: newCompleted, taskDailyLogs: logs });
  };

  // Mark the whole task complete early (from any day card)
  const handleMarkTaskCompleteEarly = () => {
    const logs = Array(taskDailyLogCount).fill('').map((_, i) => localTaskDailyLogs[i] || '');
    updateTask(task.id, {
      status: 'Completed',
      completedAt: new Date().toISOString(),
      taskDailyLogs: logs,
      taskDailyLogsCompleted: localTaskDailyLogsCompleted
    });
    onBack();
  };

  const handleMarkCompleted = () => {
    const completedAt = new Date().toISOString();
    
    // We no longer manually update project bufferPool since it is now dynamically calculated
    // when tasks are marked as completed.

    updateTask(task.id, { status: 'Completed', completedAt });
    onBack();
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-900 flex items-center bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm transition-colors">
        <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Back to Active Tasks
      </button>

      {/* Hero */}
      <div className="bg-gray-50 border border-gray-200 text-gray-900 p-8 rounded-xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-300 rounded-full mix-blend-multiply filter blur-3xl opacity-5 -trangray-y-1/2 trangray-x-1/2"></div>
        <div className="uppercase tracking-wider text-gray-500 text-xs font-bold mb-2">Active Work Session</div>
        <h2 className="text-3xl font-black mb-3 text-gray-900">{task.title}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>Project: <strong className="text-gray-900">{proj?.name}</strong></span>
          {startDate && <span>Start: <strong className="text-gray-900">{startDate.toLocaleDateString()}</strong></span>}
          {endDate && <span>End (Target): <strong className="text-gray-900">{endDate.toLocaleDateString()}</strong></span>}
          <span>Assigned: <strong className="text-gray-900">{daysAllocated} Days</strong></span>
        </div>
        {task.specs && (
          <p className="text-gray-600 bg-white border border-gray-200 p-4 rounded-lg mt-3 relative z-10 shadow-sm">
            <FileText className="w-4 h-4 inline mr-2 text-gray-400" />{task.specs}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Assigned Days" 
          value={`${totalDaysAllocated}d`} 
          icon={Circle} 
          colorClass="bg-gray-50 text-gray-600 border border-gray-100" 
        />
        <StatCard title="Days Elapsed" value={`${daysElapsed}d`} icon={Calendar} colorClass="bg-gray-50 text-gray-600 border border-gray-100" />
        <StatCard title="Days Remaining" value={`${daysRemaining}d`} icon={AlertCircle} colorClass="bg-gray-50 text-gray-600 border border-gray-100" />
        <StatCard title="Subtasks Done" value={`${completedSubtasks.length}/${subtasks.length}`} icon={CheckCircle2} colorClass="bg-gray-50 text-gray-600 border border-gray-100" />
      </div>

      {/* Schedule Performance */}
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-gray-500" /> Schedule Performance</h3>
        <div className="relative pt-8 pb-4">
          <div
            className="absolute top-2 w-0.5 h-10 bg-gray-800 z-20 transition-all duration-500"
            style={{ left: `${Math.min(100, daysPercentage)}%`, marginLeft: '-1px' }}
          >
            <div className="absolute -top-6 -left-10 w-20 text-center text-[10px] font-bold text-gray-900 bg-white border border-gray-200 py-0.5 rounded shadow-sm">
              Today: {daysPercentage}%
            </div>
          </div>
          <div className="flex h-6 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
            {/* Clean neutral background bar */}
          </div>
          <div className="absolute top-8 left-0 h-6 w-full pointer-events-none">
            {completionPercentage > 0 && (
              <div
                className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white shadow-sm ${daysBarColor}`}
                style={{ width: `${completionPercentage}%` }}
              >
                {completionPercentage > 5 ? `${completionPercentage}%` : ''}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end items-center mt-4 pt-4 border-t border-gray-100">
          <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${completionPercentage >= daysPercentage ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/80' : 'bg-rose-50 text-rose-700 border border-rose-100/80'}`}>
            {completionPercentage >= daysPercentage ? 'On/Ahead of Schedule' : 'Behind Schedule'}
          </div>
        </div>

        {/* Yellow zone — Timeline Extension Slider (always visible when behind schedule) */}
        {isInYellowZone && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mt-6">
            <div className="text-[11px] font-extrabold text-amber-700 uppercase tracking-wider mb-3">
              Extend Your Timeline
            </div>
            <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-gray-700">
                    <span>Days to extend:</span>
                    <span className="text-sm font-black text-[#1e3a5f] bg-blue-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                      {requestedExtensionDays} Day{requestedExtensionDays !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={30}
                    value={requestedExtensionDays}
                    onChange={e => {
                      const n = Number(e.target.value);
                      setRequestedExtensionDays(n);
                      setDailyDescriptions(Array.from({ length: n }, (_, i) => dailyDescriptions[i] || ''));
                    }}
                    className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
                    <span>1 Day</span>
                    <span>30 Days</span>
                  </div>
                </div>
                <button
                  onClick={() => handleApplyExtension(requestedExtensionDays)}
                  disabled={!dailyDescriptions.every(d => d.trim() !== "")}
                  className="bg-[#1e3a5f] hover:bg-[#0a6349] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 self-end sm:self-center whitespace-nowrap"
                >
                  <Clock className="w-3.5 h-3.5" /> Apply Extension
                </button>
              </div>
              {/* Per-day activity descriptions — required for each extended day */}
              <div className="border-t border-amber-100 pt-3 space-y-2">
                <p className="text-[11px] font-bold text-amber-700">
                  Write what you will work on for each extended day — all fields must be filled before applying.
                </p>
                {dailyDescriptions.map((desc, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-50 text-[#1e3a5f] text-[10px] font-black flex items-center justify-center">{idx + 1}</span>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-xs text-gray-700 font-medium placeholder:text-gray-400 placeholder:font-normal"
                      placeholder={`Day ${idx + 1}: What will you work on?`}
                      value={desc}
                      onChange={(e) => {
                        const next = [...dailyDescriptions];
                        next[idx] = e.target.value;
                        setDailyDescriptions(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Extended day tracking logs — tick off each completed extended day */}
        {task.extensionDayLogs && task.extensionDayLogs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Extended Days Tracker
              <span className="ml-auto text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded-full">
                {task.extensionDayLogs.filter((l: any) => l.completed).length}/{task.extensionDayLogs.length} done
              </span>
            </div>
            <div className="space-y-2">
              {task.extensionDayLogs.map((log: any) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    log.completed
                      ? 'bg-emerald-50 border-emerald-100'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => handleToggleExtensionDay(log.id)}
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      log.completed
                        ? 'bg-[#1e3a5f] border-[#1e3a5f]'
                        : 'border-gray-300 bg-white hover:border-[#1e3a5f]'
                    }`}
                  >
                    {log.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase">Ext. Day {log.day}</span>
                      {log.completed && log.completedAt && (
                        <span className="text-[10px] text-emerald-600 font-bold">
                          ✓ Done {new Date(log.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 font-medium ${ log.completed ? 'text-gray-400 line-through' : 'text-gray-700' }`}>
                      {log.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delay justification */}
        {daysBarColor === 'bg-red-500' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
              <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> Delay Justification Required <span className="text-rose-600">*</span>
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm text-gray-700 font-medium"
                value={selectedReason}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedReason(val);
                  if (val === "Other") {
                    updateTask(task.id, { delayJustification: customReasonText || "Other reason" });
                  } else {
                    setCustomReasonText("");
                    updateTask(task.id, { delayJustification: val });
                  }
                }}
              >
                <option value="" disabled>Select reason for delay...</option>
                <option value="Technical difficulties">Technical difficulties</option>
                <option value="Dependency delay">Dependency delay</option>
                <option value="Underestimated effort">Underestimated effort</option>
                <option value="Resource unavailable">Resource unavailable</option>
                <option value="Scope creep">Scope creep</option>
                <option value="Other">Other</option>
              </select>
              {selectedReason === "Other" && (
                <div className="mt-3">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Please specify your custom reason:</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm text-gray-700 font-medium placeholder:text-gray-400 placeholder:font-normal"
                    placeholder="Enter custom delay justification..."
                    value={customReasonText}
                    onChange={(e) => {
                      const text = e.target.value;
                      setCustomReasonText(text);
                      updateTask(task.id, { delayJustification: text });
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Subtasks Section */}
      <Card className="p-6">
        <h3 className="font-bold text-xl text-gray-900 mb-5 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-gray-500" />
          {subtasks.length === 0 ? 'Day-to-Day Tracking' : 'Subtasks'}
        </h3>

        {subtasks.length === 0 ? (
          /* ── No subtasks: show task-level day-by-day tracker ── */
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-[#1e3a5f] text-sm">Daily Progress Log</p>
                <p className="text-[11px] text-[#3b82f6] mt-0.5">
                  Write what happened each day and tick it off to track your progress.
                  All {taskDailyLogCount} day{taskDailyLogCount !== 1 ? 's' : ''} must be ticked to mark this task complete.
                </p>
              </div>
              <div className="ml-auto shrink-0 text-right">
                <div className="text-2xl font-black text-[#1e3a5f]">
                  {taskDailyLogsCompleted.filter(Boolean).length}<span className="text-base font-semibold text-blue-400">/{taskDailyLogCount}</span>
                </div>
                <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wide">Days Done</div>
              </div>
            </div>

            {/* Progress bar — color based on days-elapsed thresholds */}
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${daysBarColor}`}
                style={{ width: `${taskDailyLogCount > 0 ? Math.round((taskDailyLogsCompleted.filter(Boolean).length / taskDailyLogCount) * 100) : 0}%` }}
              />
            </div>

            <div className="space-y-3">
              {Array.from({ length: taskDailyLogCount }).map((_, dayIdx) => {
                const isCompleted = taskDailyLogsCompleted[dayIdx];
                const log = localTaskDailyLogs[dayIdx] || '';
                return (
                  <div
                    key={dayIdx}
                    className={`rounded-xl border transition-all shadow-sm overflow-hidden ${
                      isCompleted ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Day number badge / tick button */}
                      <button
                        onClick={() => handleToggleTaskDailyLogCompleted(dayIdx)}
                        title={isCompleted ? 'Mark as incomplete' : 'Mark day as done'}
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] transition-all shadow-sm border-2 ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-white border-blue-300 text-[#3b82f6] hover:bg-blue-50'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : dayIdx + 1}
                      </button>

                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-extrabold uppercase tracking-wider ${
                          isCompleted ? 'text-emerald-600' : 'text-gray-500'
                        }`}>
                          Day {dayIdx + 1}
                        </span>
                        {isCompleted && (
                          <span className="ml-2 text-[10px] font-bold text-emerald-500">✓ Completed</span>
                        )}
                      </div>

                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : log.trim()
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isCompleted ? 'Done' : log.trim() ? 'Logged' : 'Pending'}
                      </span>
                    </div>

                    <div className="px-4 pb-3">
                      <textarea
                        value={log}
                        onChange={e => handleUpdateTaskDailyLog(dayIdx, e.target.value)}
                        onBlur={() => handleSaveTaskDailyLog(dayIdx)}
                        placeholder={`Day ${dayIdx + 1}: What happened today? What did you work on?`}
                        rows={2}
                        className={`w-full text-xs p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none transition-colors placeholder:text-gray-300 ${
                          isCompleted
                            ? 'bg-emerald-50/30 border-emerald-200 text-gray-600'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      />
                    </div>

                    {/* Early task completion button — visible on every day card */}
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100 flex items-center justify-between gap-3">
                      <p className="text-[10px] text-gray-400 leading-tight">
                        Task finished early? Mark it complete without ticking all days.
                      </p>
                      <button
                        onClick={handleMarkTaskCompleteEarly}
                        className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Task Completed
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Has subtasks: original subtask list ── */
          <div className="space-y-3">
            {subtasks.map((st: any) => {
              const assignedDays = Number(st.days) || 1;
              const actionPoints = st.actionPoints || [];
              const dailyLogs: string[] = Array(assignedDays).fill('').map(
                (_, i) => (st.dailyLogs || [])[i] || ''
              );
              const isExpanded = expandedSubtaskId === st.id.toString();

              const isUnblocked = (() => {
                if (st.completed) return true;
                if (!st.predecessors || st.predecessors.length === 0) return true;
                return st.predecessors.every((predId: string) => {
                  return isPredecessorCompleted(predId, tasks).completed;
                });
              })();

              return (
                <div key={st.id} className={`rounded-xl border transition-all shadow-sm overflow-hidden ${st.completed ? 'border-emerald-200 bg-emerald-50/30' : isUnblocked ? 'border-gray-200 bg-white' : 'border-dashed border-gray-300 bg-gray-100 opacity-40 grayscale pointer-events-none'}`}>
                  {/* Header row */}
                  <div className="flex items-center gap-3 p-4">
                    <div onClick={() => isUnblocked && handleToggleSubtask(st.id)} className={`shrink-0 ${isUnblocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      {st.completed
                        ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        : <Circle className="w-6 h-6 text-gray-300 hover:text-blue-400 transition-colors" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${st.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {st.title || 'Untitled Subtask'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {assignedDays}d assigned{st.level ? ` • ${st.level}` : ''}
                        {actionPoints.length > 0 ? ` • ${actionPoints.filter((a: any) => a.done).length}/${actionPoints.length} action points` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedSubtaskId(isExpanded ? null : st.id.toString())}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#3b82f6] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors shrink-0"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-6">
                      {/* Subtask Status & Buffer Request */}
                      <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        {!st.startedAt ? (
                          <div className="flex flex-col gap-1">
                            {!allPrereqsChecked && task.status === TASK_STATUS.PENDING_START && (
                              <div className="text-[10px] text-amber-600 font-medium leading-tight flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> Please complete parent task prerequisites first.
                              </div>
                            )}
                            <button 
                              disabled={!allPrereqsChecked && task.status === TASK_STATUS.PENDING_START}
                              onClick={() => handleUpdateSubtaskField(st.id, 'startedAt', new Date().toISOString())} 
                              className={`font-bold flex items-center gap-1.5 text-sm ${(!allPrereqsChecked && task.status === TASK_STATUS.PENDING_START) ? 'text-gray-400 cursor-not-allowed' : 'text-[#3b82f6] hover:underline'}`}
                            >
                              <Play className="w-4 h-4" /> Start Working
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-gray-600">
                            Started: {new Date(st.startedAt).toLocaleDateString()}
                          </div>
                        )}
                        {st.startedAt && !st.completed && (
                          (() => {
                              const stStart = new Date(st.startedAt);
                              const stElapsed = Math.floor((new Date().getTime() - stStart.getTime()) / (1000 * 3600 * 24));
                              const stYellow = stElapsed > (assignedDays * 0.65);
                              return (
                                <div className={`flex items-center gap-3 border-l pl-4 border-gray-200 ${stYellow ? 'text-amber-600 font-bold' : 'text-gray-500'}`}>
                                  <span className="text-sm">{stElapsed} / {assignedDays}d elapsed</span>
                                </div>
                              )
                          })()
                        )}
                      </div>

                      {/* Action Points */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-sm text-gray-700 flex items-center gap-1.5">
                            <CheckSquare className="w-4 h-4 text-blue-400" /> Action Points
                          </h4>
                          <button
                            onClick={() => handleAddActionPoint(st.id)}
                            className="text-[10px] font-bold text-[#3b82f6] bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                          >
                            + Add Action Point
                          </button>
                        </div>
                        {actionPoints.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-2">No action points yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {actionPoints.map((ap: any, apIdx: number) => (
                              <div key={ap.id || apIdx} className="flex items-start gap-2 bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
                                <input
                                  type="checkbox"
                                  checked={ap.done || false}
                                  onChange={e => handleUpdateActionPoint(st.id, apIdx, 'done', e.target.checked)}
                                  className="mt-0.5 w-3.5 h-3.5 text-[#3b82f6] rounded border-gray-300 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={ap.text}
                                  onChange={e => handleUpdateActionPoint(st.id, apIdx, 'text', e.target.value)}
                                  placeholder="Describe this action point..."
                                  className={`flex-1 text-xs bg-transparent outline-none border-b border-transparent focus:border-blue-300 pb-0.5 transition-colors ${ap.done ? 'line-through text-gray-400' : 'text-gray-700'}`}
                                />
                                <button onClick={() => handleDeleteActionPoint(st.id, apIdx)} className="text-red-300 hover:text-red-500 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Daily Log */}
                      <div>
                        <h4 className="font-bold text-sm text-gray-700 flex items-center gap-1.5 mb-3">
                          <Play className="w-4 h-4 text-blue-400" /> Day-to-Day Reasoning
                          <span className="text-[10px] font-normal text-gray-400">(1 entry per assigned day)</span>
                        </h4>
                        <div className="space-y-2.5">
                          {dailyLogs.map((log, dayIdx) => {
                            const isCompleted = st.dailyLogsCompleted?.[dayIdx];
                            return (
                              <div key={dayIdx} className="flex gap-3 items-start">
                                <button
                                  onClick={() => handleToggleDailyLogCompleted(st.id, dayIdx)}
                                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[10px] transition-colors shadow-sm ${isCompleted ? 'bg-green-500 hover:bg-green-600' : 'bg-[#1e3a5f] hover:bg-[#162d4a]'}`}
                                  title={isCompleted ? "Mark as incomplete" : "Mark as completed"}
                                >
                                  {dayIdx + 1}
                                </button>
                                <textarea
                                  value={log}
                                  onChange={e => handleUpdateDailyLog(st.id, dayIdx, e.target.value)}
                                  placeholder={`What did you work on Day ${dayIdx + 1}?`}
                                  className={`flex-1 text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-[52px] resize-none transition-colors ${isCompleted ? 'bg-green-50/30 border-green-200 text-gray-700' : 'bg-white border-gray-200 text-gray-700'}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          {/* For tasks WITH subtasks: unlock when all subtasks done */}
          {/* For tasks WITHOUT subtasks: unlock when all daily days are ticked */}
          {(subtasks.length > 0 ? allSubtasksCompleted : allTaskDaysCompleted) ? (
            <button
              onClick={handleMarkCompleted}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 px-6 rounded-xl text-lg transition-transform hover:scale-[1.01] active:scale-[0.99] shadow-lg flex justify-center items-center gap-2"
            >
              <CheckCircle2 className="w-6 h-6" /> Complete Phase &amp; Handover
            </button>
          ) : (
            <div className="text-center text-gray-500 py-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 font-medium">
              {subtasks.length > 0
                ? 'Complete all subtasks above to unlock the final completion button.'
                : `Tick off all ${taskDailyLogCount} days above to unlock the final completion button.`
              }
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};















/** Computes unblock status for a task that has predecessors */
export const isPredecessorCompleted = (predId: string, allTasks: any[]): { completed: boolean, completedAt?: string } => {
  const mainTask = allTasks.find(t => String(t.id) === String(predId));
  if (mainTask) {
    return { completed: mainTask.status === 'Completed', completedAt: mainTask.completedAt };
  }
  for (const t of allTasks) {
    if (t.subtasks) {
      const st = t.subtasks.find((s: any) => String(s.id) === String(predId));
      if (st) return { completed: !!st.completed, completedAt: undefined };
    }
  }
  return { completed: false };
};

export const getPredecessorTitle = (predId: string, allTasks: any[]) => {
  const mainTask = allTasks.find(t => String(t.id) === String(predId));
  if (mainTask) return mainTask.title || 'Untitled Task';
  for (const t of allTasks) {
    if (t.subtasks) {
      const st = t.subtasks.find((s: any) => String(s.id) === String(predId));
      if (st) return `${t.title} - ${st.title || 'Untitled Subtask'}`;
    }
  }
  return 'Unknown Task';
};

export const getAllExternalSuccessors = (task: any, allTasks: any[]) => {
  const successorIds = new Set<string>();
  const successorTitles: Record<string, string> = {};

  const myIds = [String(task.id)];
  if (task.subtasks) {
    task.subtasks.forEach((st: any) => myIds.push(String(st.id)));
  }

  allTasks.forEach(t => {
    if (String(t.id) === String(task.id)) return;
    
    if (t.predecessors) {
      t.predecessors.forEach((p: string) => {
        if (myIds.includes(String(p))) {
          successorIds.add(String(t.id));
          successorTitles[String(t.id)] = t.title || 'Untitled';
        }
      });
    }

    if (t.subtasks) {
      t.subtasks.forEach((st: any) => {
        if (st.predecessors) {
          st.predecessors.forEach((p: string) => {
            if (myIds.includes(String(p))) {
              const sid = String(st.id);
              successorIds.add(sid);
              successorTitles[sid] = `${t.title} - ${st.title || 'Untitled'}`;
            }
          });
        }
      });
    }
  });

  return Array.from(successorIds).map(id => ({ id, title: successorTitles[id] }));
};

export const getAllExternalPredecessors = (task: any) => {
  const externalPreds = new Set<string>(task.predecessors || []);
  if (task.subtasks) {
    task.subtasks.forEach((st: any) => {
      if (st.predecessors) {
        st.predecessors.forEach((p: string) => {
          if (!task.subtasks.find((s: any) => String(s.id) === String(p))) {
            externalPreds.add(String(p));
          }
        });
      }
    });
  }
  return Array.from(externalPreds);
};

const getPredUnblockInfo = (task: any, allTasks: any[]): {
  allPredsDone: boolean;
  daysSinceUnblock: number;
  unblockDate: string | null;
  hasPredecessors: boolean;
} => {
  const externalPreds = getAllExternalPredecessors(task);
  if (externalPreds.length === 0) {
    return { allPredsDone: false, daysSinceUnblock: -1, unblockDate: null, hasPredecessors: false };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let allDone = true;
  let latestCompletion: Date | null = null;

  for (const predId of externalPreds) {
    const info = isPredecessorCompleted(predId, allTasks);
    if (!info.completed) {
      allDone = false;
      break;
    }
    if (info.completedAt) {
      const d = new Date(info.completedAt);
      d.setHours(0, 0, 0, 0);
      if (!latestCompletion || d > latestCompletion) latestCompletion = d;
    }
  }

  if (!allDone) return { allPredsDone: false, daysSinceUnblock: -1, unblockDate: null, hasPredecessors: true };

  if (!latestCompletion) return { allPredsDone: true, daysSinceUnblock: 0, unblockDate: null, hasPredecessors: true };

  const daysSince = Math.floor((today.getTime() - latestCompletion.getTime()) / (1000 * 60 * 60 * 24));
  return {
    allPredsDone: true,
    daysSinceUnblock: daysSince,
    unblockDate: latestCompletion.toISOString().split('T')[0],
    hasPredecessors: true,
  };
};



export const ActiveWorkView = () => {
  const { currentUser, tasks, projects, updateTask } = useContext(AppContext);
  const [workingTaskId, setWorkingTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (workingTaskId) {
    const task = tasks.find((t: any) => t.id === workingTaskId);
    if (task) {
      return <TaskWorkDetail task={task} onBack={() => setWorkingTaskId(null)} />;
    }
  }

  const myTasks = tasks.filter((t: any) => 
    (Array.isArray(t.assignedTo) ? t.assignedTo.includes(currentUser.id) : t.assignedTo === currentUser.id) || 
    (t.delegatedTo === currentUser.id && t.delegateRequestStatus === 'Approved')
  );
  const displayedTasks = myTasks.filter((t: any) => {
    if (t.status === 'In Progress' || t.status === TASK_STATUS.PENDING_START) {
      const { allPredsDone, hasPredecessors } = getPredUnblockInfo(t, tasks);
      const hasIncompletePredecessors = hasPredecessors && !allPredsDone;
      const proj = projects.find((p: any) => p.id === t.projectId);
      const isProjNotStarted = (!proj || proj.status !== 'Active');
      return !hasIncompletePredecessors && !isProjNotStarted;
    }
    return false;
  });

  const getTaskProgress = (task: any) => {
    if (task.status === 'Completed') return 100;
    const subtasks = task.subtasks || [];
    if (subtasks.length === 0) {
      const total = task.assignedDays || task.finalTotalDays || 0;
      if (total === 0) return 0;
      const done = (task.taskDailyLogsCompleted || []).filter(Boolean).length;
      return Math.round((Math.min(done, total) / total) * 100);
    }
    const completedSubtasks = subtasks.filter((st: any) => st.completed);
    const totalWeight = subtasks.reduce((sum: number, st: any) => sum + (Number(st.days) || 1), 0) || 1;
    const completedWeight = completedSubtasks.reduce((sum: number, st: any) => sum + (Number(st.days) || 1), 0);
    return Math.round((completedWeight / totalWeight) * 100);
  };

  const grouped = displayedTasks.reduce((acc: any, t: any) => {
    if (!acc[t.projectId]) acc[t.projectId] = [];
    acc[t.projectId].push(t);
    return acc;
  }, {});

  if (selectedProjectId) {
    const proj = projects.find((p: any) => p.id === selectedProjectId);
    const projTasks = grouped[selectedProjectId] || [];

    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setSelectedProjectId(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 bg-white px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all font-semibold text-sm w-fit"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Projects
        </button>

        <h3 className="text-xl font-extrabold text-gray-900 border-b border-gray-200 pb-3 flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-[#3b82f6]" />
          {proj ? proj.name : 'Unknown Project'} — Active Work
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projTasks.map((task: any) => {
            return (
              <Card
                key={task.id}
                onClick={() => setWorkingTaskId(task.id)}
                className="p-5 flex flex-col h-full hover:shadow-sm hover:shadow-md transition-shadow transition-all cursor-pointer hover:border-blue-300"
              >
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-gray-900 leading-tight pr-4">{task.title}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 w-max ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {task.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                      {task.status}
                    </span>
                  </div>
                  {task.specs && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 bg-gray-50 p-2 rounded">{task.specs}</p>
                  )}

                  {getAllExternalPredecessors(task).length > 0 && (
                    <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mb-3">
                      <span className="font-bold uppercase tracking-wider text-gray-400">Predecessors:</span>
                      {getAllExternalPredecessors(task).map((predId: string) => {
                        const isComp = isPredecessorCompleted(predId, tasks).completed;
                        const title = getPredecessorTitle(predId, tasks);
                        return (
                          <span key={predId} className={`px-2 py-1 rounded-md border font-semibold flex items-center gap-1 ${
                            isComp ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            <span className="truncate max-w-[200px]">{title}</span>
                            {isComp ? '✓' : '...'}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {(() => {
                    const successors = getAllExternalSuccessors(task, tasks);
                    if (successors.length === 0) return null;
                    return (
                      <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mb-3">
                        <span className="font-bold uppercase tracking-wider text-gray-400">Successors:</span>
                        {successors.map(s => (
                          <span key={s.id} className="px-2 py-1 rounded-md border font-semibold flex items-center gap-1 bg-purple-50 border-purple-200 text-purple-700">
                            <span className="truncate max-w-[200px]">{s.title}</span>
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {task.status === TASK_STATUS.PENDING_START && (() => {
                    const { allPredsDone, daysSinceUnblock, unblockDate } = getPredUnblockInfo(task, tasks);
                    if (!allPredsDone) return null;
                    if (daysSinceUnblock > 2) {
                      return (
                        <div
                          className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-[11px] text-red-700 font-medium"
                          onClick={e => e.stopPropagation()}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <span>
                            <strong>Overdue Start:</strong> Unblocked {daysSinceUnblock} day{daysSinceUnblock !== 1 ? 's' : ''} ago{unblockDate ? ` (${unblockDate})` : ''}. Please start immediately.
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div
                        className="mb-3 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-[11px] text-emerald-700 font-medium"
                        onClick={e => e.stopPropagation()}
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>Ready to Start:</strong> All predecessor tasks are complete. You can begin this task now!
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="mb-4 text-xs">
                    <div className="font-bold text-gray-700 flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> Prerequisites Checklist
                      </div>
                      {task.status === TASK_STATUS.PENDING_START && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newChecklist = [...(task.prerequisitesChecklist || []), {
                              id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                              text: '',
                              completed: false
                            }];
                            updateTask(task.id, { prerequisitesChecklist: newChecklist });
                          }}
                          className="text-[10px] bg-blue-50 text-[#1e3a5f] hover:bg-blue-50 font-bold px-2 py-1 rounded-md transition-colors"
                        >
                          + Add Item
                        </button>
                      )}
                    </div>
                    {(!task.prerequisitesChecklist || task.prerequisitesChecklist.length === 0) && (
                      <p className="text-[10px] text-gray-400 italic">No prerequisites defined.</p>
                    )}
                    <div className="space-y-1.5">
                      {task.prerequisitesChecklist?.map((req: any, rIdx: number) => (
                        <div key={req.id || rIdx} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={req.completed || false}
                            onChange={(e) => {
                              const newChecklist = [...task.prerequisitesChecklist];
                              newChecklist[rIdx] = { ...req, completed: e.target.checked };
                              updateTask(task.id, { prerequisitesChecklist: newChecklist });
                            }}
                            className="w-3.5 h-3.5 mt-1 rounded text-[#3b82f6] border-gray-300 focus:ring-blue-500 cursor-pointer"
                            disabled={task.status !== TASK_STATUS.PENDING_START}
                          />
                          {task.status === TASK_STATUS.PENDING_START ? (
                            <input
                              type="text"
                              value={req.text}
                              placeholder="e.g. Get access to server"
                              onChange={(e) => {
                                const newChecklist = [...task.prerequisitesChecklist];
                                newChecklist[rIdx] = { ...req, text: e.target.value };
                                updateTask(task.id, { prerequisitesChecklist: newChecklist });
                              }}
                              className={`flex-1 text-[11px] bg-white border border-gray-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 ${req.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                            />
                          ) : (
                            <span className={`text-[11px] mt-0.5 leading-tight ${req.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                              {req.text}
                            </span>
                          )}
                          {task.status === TASK_STATUS.PENDING_START && (
                            <button
                              onClick={() => {
                                const newChecklist = [...task.prerequisitesChecklist];
                                newChecklist.splice(rIdx, 1);
                                updateTask(task.id, { prerequisitesChecklist: newChecklist });
                              }}
                              className="text-red-400 hover:text-red-600 ml-1 mt-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full bg-green-50 text-green-800 px-4 py-2.5 rounded-lg text-center font-bold border border-green-200 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="text-sm font-semibold">
                        {task.durationValue !== undefined && task.durationUnit
                          ? `${Math.round(task.durationValue * 0.7 * 10) / 10} ${task.durationUnit}`
                          : `${task.assignedDays || 0} Days`
                        } Target
                      </span>
                    </div>
                    {task.status === TASK_STATUS.PENDING_START && (() => {
                      const allPrereqsChecked = !task.prerequisitesChecklist || task.prerequisitesChecklist.every((r: any) => r.completed);
                      return (
                        <div className="w-full">
                          {!allPrereqsChecked && (
                            <div className="text-[10px] text-amber-600 font-medium mb-1.5 leading-tight text-left flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> Please complete all prerequisites before starting.
                            </div>
                          )}
                          <button
                            disabled={!allPrereqsChecked}
                            onClick={(e) => {
                              e.stopPropagation();
                              const startedAt = new Date().toISOString().split('T')[0];
                              updateTask(task.id, { status: 'In Progress', startedAt });
                              setWorkingTaskId(task.id);
                            }}
                            className={`w-full font-bold py-2 px-3 rounded text-xs transition-colors mt-1 flex items-center justify-center gap-1.5 shadow-sm ${
                              allPrereqsChecked
                                ? 'bg-[#1e3a5f] hover:bg-[#162d4a] text-white'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Start Work
                          </button>
                        </div>
                      );
                    })()}

                    {task.status === 'In Progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkingTaskId(task.id);
                        }}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-[#1e3a5f] font-bold py-2 px-3 rounded text-xs transition-colors mt-1 shadow-sm border border-blue-200 flex items-center justify-center gap-1.5"
                      >
                        <Activity className="w-3.5 h-3.5" /> Resume Work
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const myProjects = Object.keys(grouped).map(pid => projects.find((p: any) => p.id === pid)).filter(Boolean);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-sans tracking-tight flex items-center gap-2">
        <Briefcase className="w-6 h-6 text-[#3b82f6]" /> Active Work
      </h2>
      <p className="text-gray-500 text-sm">Tasks that are ready to be worked on or currently in progress.</p>

      {myProjects.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white border border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No active work available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {myProjects.map((proj: any) => {
            const projTasks = grouped[proj.id] || [];
            const activeTasks = projTasks.length;
            const progressSum = projTasks.reduce((s: number, t: any) => s + getTaskProgress(t), 0);
            const myProgress = projTasks.length > 0 ? Math.round(progressSum / projTasks.length) : 0;
            const pStatus = proj.status || 'Active';
            const isCompleted = pStatus === 'Completed';

            return (
              <Card
                key={proj.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-200 group bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-300 overflow-hidden"
                onClick={() => setSelectedProjectId(proj.id)}
              >
                <div className={`px-5 py-2.5 ${isCompleted ? 'bg-blue-50 border-blue-200 text-[#1e3a5f]' : 'bg-green-50 border-green-200 text-green-700'} border-b flex items-center justify-between`}>
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {pStatus}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#1e3a5f] transition-colors mb-1">{proj.name}</h3>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{activeTasks} active tasks</span>
                      <span className="font-bold text-[#3b82f6]">{myProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${isCompleted ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${myProgress}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Circle className="w-3.5 h-3.5 text-gray-400" />
                      Deadline: <strong className="text-gray-700">{proj.deadline || 'Not set'}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                      <span>{activeTasks} tasks ready/in-progress</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectId(proj.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold text-xs transition-all shadow-sm"
                  >
                    Go to Active Work <ChevronRight className="w-3.5 h-3.5" />
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

export const TaskInboxView = () => {
  const { currentUser, tasks, projects } = useContext(AppContext);
  const [workingTaskId, setWorkingTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (workingTaskId) {
    const task = tasks.find((t: any) => t.id === workingTaskId);
    if (task) {
      return <TaskWorkDetail task={task} onBack={() => setWorkingTaskId(null)} />;
    }
  }

  const myTasks = tasks.filter((t: any) => 
    (Array.isArray(t.assignedTo) ? t.assignedTo.includes(currentUser.id) : t.assignedTo === currentUser.id) || 
    (t.delegatedTo === currentUser.id && t.delegateRequestStatus === 'Approved')
  );

  const getTaskProgress = (task: any) => {
    if (task.status === 'Completed') return 100;
    const subtasks = task.subtasks || [];
    if (subtasks.length === 0) {
      const total = task.assignedDays || task.finalTotalDays || 0;
      if (total === 0) return 0;
      const done = (task.taskDailyLogsCompleted || []).filter(Boolean).length;
      return Math.round((Math.min(done, total) / total) * 100);
    }
    const completedSubtasks = subtasks.filter((st: any) => st.completed);
    const totalWeight = subtasks.reduce((sum: number, st: any) => sum + (Number(st.days) || 1), 0) || 1;
    const completedWeight = completedSubtasks.reduce((sum: number, st: any) => sum + (Number(st.days) || 1), 0);
    return Math.round((completedWeight / totalWeight) * 100);
  };

  const grouped = myTasks.reduce((acc: any, t: any) => {
    if (!acc[t.projectId]) acc[t.projectId] = [];
    acc[t.projectId].push(t);
    return acc;
  }, {});

  if (selectedProjectId) {
    const proj = projects.find((p: any) => p.id === selectedProjectId);
    const projTasks = grouped[selectedProjectId] || [];

    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setSelectedProjectId(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 bg-white px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all font-semibold text-sm w-fit"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Projects
        </button>

        <h3 className="text-xl font-extrabold text-gray-900 border-b border-gray-200 pb-3 flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-[#1e3a5f]" />
          {proj ? proj.name : 'Unknown Project'} — Task Inbox
        </h3>
        
        <div className="flex flex-col gap-4">
          {projTasks.map((task: any) => {
            const progress = getTaskProgress(task);
            const isCompleted = task.status === 'Completed';
            const isInProgress = task.status === 'In Progress';
            const isApproved = task.status === TASK_STATUS.PENDING_START;

            const isUnblocked = (() => {
              if (isCompleted) return true;
              if (isApproved || isInProgress) {
                const externalPreds = getAllExternalPredecessors(task);
                const hasIncompletePredecessors = externalPreds.length > 0 && externalPreds.some((predId: string) => {
                  return !isPredecessorCompleted(predId, tasks).completed;
                });
                const isProjNotStarted = (!proj || proj.status !== 'Active');
                return !hasIncompletePredecessors && !isProjNotStarted;
              }
              return false;
            })();

            return (
              <Card key={task.id} className={`p-0 overflow-hidden border rounded-xl shadow-sm transition-all ${isUnblocked ? 'bg-white border-gray-200 hover:shadow-md' : 'bg-gray-100 border-dashed border-gray-300 opacity-40 grayscale pointer-events-none'}`}>
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Task Info section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-extrabold text-gray-900 text-lg truncate">{task.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap shrink-0 ${
                        isCompleted ? 'bg-green-100 text-green-700' :
                        isInProgress ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Activity className="w-2.5 h-2.5" />}
                        {task.status}
                      </span>
                    </div>

                    {task.specs && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100">{task.specs}</p>
                    )}

                    {getAllExternalPredecessors(task).length > 0 && (
                      <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-bold uppercase tracking-wider text-gray-400">Predecessors:</span>
                        {getAllExternalPredecessors(task).map((predId: string) => {
                          const isComp = isPredecessorCompleted(predId, tasks).completed;
                          const title = getPredecessorTitle(predId, tasks);
                          return (
                            <span key={predId} className={`px-2 py-1 rounded-md border font-semibold flex items-center gap-1 ${
                              isComp ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>
                              <span className="truncate max-w-[200px]">{title}</span>
                              {isComp ? '✓' : '...'}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {(() => {
                      const successors = getAllExternalSuccessors(task, tasks);
                      if (successors.length === 0) return null;
                      return (
                        <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mt-2">
                          <span className="font-bold uppercase tracking-wider text-gray-400">Successors:</span>
                          {successors.map(s => (
                            <span key={s.id} className="px-2 py-1 rounded-md border font-semibold flex items-center gap-1 bg-purple-50 border-purple-200 text-purple-700">
                              <span className="truncate max-w-[200px]">{s.title}</span>
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Progress & Action section */}
                  <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
                    <div className="w-full">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-1.5">
                        <span className="uppercase tracking-wider">Progress</span>
                        <span className="text-gray-700">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500 ease-out bg-blue-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {isUnblocked ? (
                      <div className="flex items-center justify-between text-xs font-bold text-[#1e3a5f]">
                        <span className="flex items-center gap-1">
                          {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                          {isCompleted ? 'Task Finished' : 'Ready for Work'}
                        </span>
                        {!isCompleted && (
                          <button
                            onClick={() => setWorkingTaskId(task.id)}
                            className="bg-[#1e3a5f] text-white font-bold py-2 px-5 rounded-lg hover:bg-[#162d4a] transition-colors shadow-sm hover:shadow flex items-center gap-1.5"
                          >
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200/60 shadow-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="leading-tight">Waiting on predecessors to complete</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const myProjects = Object.keys(grouped).map(pid => projects.find((p: any) => p.id === pid)).filter(Boolean);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight tracking-tight flex items-center gap-2 font-sans">
        <Inbox className="w-6 h-6 text-[#1e3a5f]" /> Task Inbox
      </h2>
      <p className="text-gray-500 text-sm">All tasks assigned to you across your active projects.</p>

      {myProjects.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white border border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-xl">
          <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No assigned tasks found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {myProjects.map((proj: any) => {
            const projTasks = grouped[proj.id] || [];
            const pStatus = proj.status || 'Active';
            const isCompleted = pStatus === 'Completed';

            return (
              <Card
                key={proj.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-200 group bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-300 overflow-hidden"
                onClick={() => setSelectedProjectId(proj.id)}
              >
                <div className={`px-5 py-2.5 ${isCompleted ? 'bg-blue-50 border-blue-200 text-[#1e3a5f]' : 'bg-green-50 border-green-200 text-green-700'} border-b flex items-center justify-between`}>
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {pStatus}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#1e3a5f] transition-colors mb-1">{proj.name}</h3>
                  
                  {/* Progress removed */}

                  <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Circle className="w-3.5 h-3.5 text-gray-400" />
                      Deadline: <strong className="text-gray-700">{proj.deadline || 'Not set'}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                      <span>{projTasks.length} tasks delegated</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectId(proj.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold text-xs transition-all shadow-sm"
                  >
                    Manage Tasks <ChevronRight className="w-3.5 h-3.5" />
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

