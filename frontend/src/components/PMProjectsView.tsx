import { useState, useContext, useEffect } from 'react';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderKanban, ChevronRight, ChevronDown, Clock, ShieldAlert, CheckSquare,
  Send, UserSquare2, Activity, AlertCircle, CheckCircle,
  PauseCircle, XCircle, Plus, Search, Users, Trash2, Save, BarChart3, X, AlertTriangle, CheckCircle2, Play, Sparkles
} from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { TASK_STATUS, ROLES, computeDynamicBufferPool, addWorkingDays, isRestDay, getWorkingDaysElapsed } from '../constants';
import { Card, StatCard } from './SharedUI';

const PROJECT_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  Planning: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock },
  Active: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle },
  Completed: { color: 'text-[#1e3a5f]', bg: 'bg-blue-50', border: 'border-blue-200', icon: CheckCircle },
  Suspended: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: PauseCircle },
  Dismissed: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
};



const fmtDate = (d: Date) => {
  if (!d || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const computeTaskProgress = (task: any) => {
  if (task.status === 'Completed') return 100;
  if (!task.subtasks || task.subtasks.length === 0) {
    // No subtasks: progress is driven by task-level daily log ticks
    const total = task.assignedDays || task.finalTotalDays || 0;
    if (total === 0) return 0;
    const done = (task.taskDailyLogsCompleted || []).filter(Boolean).length;
    return Math.round((Math.min(done, total) / total) * 100);
  }
  const total = task.subtasks.reduce((sum: number, st: any) => sum + (Number(st.days) || 1), 0);
  const done = task.subtasks.filter((st: any) => st.completed).reduce((sum: number, st: any) => sum + (Number(st.days) || 1), 0);
  return total > 0 ? Math.round((done / total) * 100) : 0;
};

const getTaskTimeColor = (task: any) => {
  // Trial statuses short-circuit the real elapsed logic
  if (task.status === 'Delayed') return 'bg-red-500';
  if (task.status === 'About to be Delayed') return 'bg-yellow-400';
  if (task.status === 'Completed') return 'bg-green-500';
  if (!task.startedAt || !task.assignedDays) return 'bg-green-500';

  const startDate = new Date(task.startedAt);
  const today = new Date();
  const daysElapsed = getWorkingDaysElapsed(startDate, today);
  const daysPercentage = Math.round((daysElapsed / task.assignedDays) * 100);

  if (daysPercentage > 100) return 'bg-red-500';   // overdue
  if (daysPercentage > 85) return 'bg-red-500';   // 85–100% of days used
  if (daysPercentage > 65) return 'bg-yellow-400'; // 65–85% of days used
  return 'bg-green-500';                            // ≤65% of days used
};

// Derive a simulated progress % for trial statuses so task bar width is meaningful
const getTrialSimulatedProgress = (task: any, realProgress: number): number => {
  if (task.status === 'Delayed') return 92;
  if (task.status === 'About to be Delayed') return 78;
  return realProgress;
};

// Description label shown below progress bar during trial
const getTrialProgressLabel = (task: any): string | null => {
  if (task.status === 'Delayed') return '🔴 Delayed — task has exceeded 85% of assigned days';
  if (task.status === 'About to be Delayed') return '🟡 About to be Delayed — task is at ~78% of assigned days';
  if (task.status === 'In Progress') return '🟢 In Progress — task is progressing on schedule (~50% elapsed)';
  return null;
};

const getProjectTimeColor = (proj: any, projTasks: any[]) => {
  if (proj.status === 'Completed') return 'bg-green-500';

  let totalElapsed = 0;
  let totalAssigned = 0;
  const today = new Date();

  projTasks.forEach((task: any) => {
    if (task.assignedDays) {
      totalAssigned += task.assignedDays;
      if (task.startedAt) {
        const startDate = new Date(task.startedAt);
        if (task.status === 'Completed') {
          const endDate = task.completedAt ? new Date(task.completedAt) : today;
          totalElapsed += Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
        } else {
          totalElapsed += Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
        }
      }
    }
  });

  if (totalAssigned === 0) return 'bg-green-500';
  const daysPercentage = Math.round((totalElapsed / totalAssigned) * 100);

  if (daysPercentage > 100) return 'bg-red-500';    // overdue
  if (daysPercentage > 85) return 'bg-red-500';    // 85–100% of days used
  if (daysPercentage > 65) return 'bg-yellow-400'; // 65–85% of days used
  return 'bg-green-500';                             // ≤65% of days used
};

const calculateWorkingDaysFromWeeks = (val: number) => {
  const weeks = Math.floor(val);
  const extraDays = Math.round((val - weeks) * 10);
  return weeks * 7 + extraDays;
};

// computeTaskProgress has been hoisted above

const SubtaskDaysInput = ({ initialDays, onSave }: { initialDays: number, onSave: (val: number) => void }) => {
  const [val, setVal] = useState(String(initialDays || ''));

  useEffect(() => {
    setVal(String(initialDays || ''));
  }, [initialDays]);

  const handleBlur = () => {
    const numeric = parseFloat(val) || 0;
    onSave(numeric);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const numeric = parseFloat(val) || 0;
      onSave(numeric);
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className="w-14 p-1 border border-gray-300 rounded text-center text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};

const TrialRunSimulation = ({ task, updateTask }: { task: any, updateTask: any }) => {
  return (
    <div className="mt-4 bg-[#f4f8fc] border border-blue-100 rounded-xl p-4 shadow-sm w-full">
      <div className="flex items-center gap-2 mb-4 text-[#1e3a5f] font-bold text-[11px] tracking-wider uppercase">
        <Sparkles className="w-4 h-4 text-blue-500" />
        TRIAL RUN SIMULATION (PM / R&D HEAD)
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
          <select
            className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white outline-none"
            value={task.status || 'Pending Start'}
            onChange={(e) => {
              const newStatus = e.target.value;
              // For trial: simulate dynamic dates based on status to drive color coding
              const assigned = task.assignedDays || 1;
              let simStartedAt: string | null;

              if (newStatus === 'In Progress') {
                // Simulate 50% elapsed → green zone (≤65%)
                const daysBack = Math.round(assigned * 0.5);
                const d = new Date();
                d.setDate(d.getDate() - daysBack);
                simStartedAt = d.toISOString();
              } else if (newStatus === 'About to be Delayed') {
                // Simulate 78% elapsed → yellow zone (65–85%)
                const daysBack = Math.round(assigned * 0.78);
                const d = new Date();
                d.setDate(d.getDate() - daysBack);
                simStartedAt = d.toISOString();
              } else if (newStatus === 'Delayed') {
                // Simulate 92% elapsed → red zone (>85%)
                const daysBack = Math.round(assigned * 0.92);
                const d = new Date();
                d.setDate(d.getDate() - daysBack);
                simStartedAt = d.toISOString();
              } else if (newStatus === 'Completed') {
                // Simulate completed today
                simStartedAt = task.startedAt || new Date().toISOString();
              } else {
                // Pending Start — clear simulated date so bar stays green (no startedAt)
                simStartedAt = null;
              }

              updateTask(task.id, {
                status: newStatus,
                startedAt: simStartedAt,
                ...(newStatus === 'Completed' ? { completedAt: new Date().toISOString() } : { completedAt: null })
              });
            }}
          >
            <option value="Pending Start">Pending Start</option>
            <option value="In Progress">In Progress</option>
            <option value="About to be Delayed">About to be Delayed</option>
            <option value="Delayed">Delayed</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
          <input
            type="date"
            className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white outline-none"
            value={task.startedAt ? new Date(task.startedAt).toISOString().split('T')[0] : ''}
            onChange={(e) => updateTask(task.id, { startedAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Days (70%)</label>
          <input
            type="number"
            className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white outline-none"
            value={task.assignedDays || ''}
            onChange={(e) => {
              const val = Number(e.target.value) || 0;
              const bufferDays = val <= 3 ? 0 : Math.ceil(val * (3 / 7));
              updateTask(task.id, {
                assignedDays: val,
                plannedBufferDays: bufferDays,
                finalTotalDays: val + bufferDays
              });
            }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Buffer Days (30%)</label>
          <input
            type="number"
            readOnly
            className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
            value={task.plannedBufferDays !== undefined ? task.plannedBufferDays : task.bufferDays || ''}
          />
        </div>
      </div>



      <div>
        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Delay Justification (Reason)</label>
        <input
          type="text"
          placeholder="Provide reason if task is delayed..."
          className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white outline-none"
          value={task.delayJustification || ''}
          onChange={(e) => updateTask(task.id, { delayJustification: e.target.value })}
        />
      </div>

      {/* Reset Trial */}
      <div className="mt-3 pt-3 border-t border-blue-100 flex justify-end">
        <button
          type="button"
          onClick={() => updateTask(task.id, {
            status: 'Pending Start',
            startedAt: null,
            completedAt: null,
            delayJustification: ''
          })}
          className="text-[10px] font-bold text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-all"
        >
          ↺ Reset Trial — Restore Real State
        </button>
      </div>
    </div>
  );
};

// computeCriticalChain is imported from utils
const TaskDurationEditor = ({ task, updateTask, readOnly, projects, updateProject }: { task: any, updateTask: any, readOnly?: boolean, projects?: any[], updateProject?: any }) => {
  const [val, setVal] = useState(String(task.durationValue !== undefined ? task.durationValue : (task.finalTotalDays || task.assignedDays || 0)));
  const [unit, setUnit] = useState(task.durationUnit || 'days');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    const numericVal = parseFloat(val);
    if (isNaN(numericVal) || numericVal <= 0) {
      alert("Please enter a valid duration.");
      return;
    }
    const finalTotalDays = unit === 'weeks'
      ? calculateWorkingDaysFromWeeks(numericVal)
      : Math.round(numericVal);
    const assignedDays = finalTotalDays <= 3 ? finalTotalDays : Math.ceil(finalTotalDays * 0.7);
    const bufferDays = finalTotalDays <= 3 ? 0 : finalTotalDays - assignedDays;

    updateTask(task.id, {
      durationValue: numericVal,
      durationUnit: unit,
      finalTotalDays,
      assignedDays,
      plannedBufferDays: bufferDays,
      bufferDays: 0
    });

    // add buffer to project pool if task has a project
    if (bufferDays > 0 && task.projectId && projects && updateProject) {
      const proj = projects.find(p => p.id === task.projectId);
      if (proj) {
        updateProject(proj.id, {
          bufferPool: (proj.bufferPool || 0) + bufferDays
        });
      }
    }

    setIsEditing(false);
  };


  if (!isEditing) {

    let daysElapsed;
    if (task.startedAt) {
      const start = new Date(task.startedAt);
      const end = task.completedAt ? new Date(task.completedAt) : new Date();
      daysElapsed = getWorkingDaysElapsed(start, end);
    } else {
      daysElapsed = 0;
    }

    // Buffer consumed is any days taken beyond the assigned days.
    const bufferConsumed = Math.max(0, daysElapsed - (task.assignedDays || 0));

    const formatDuration = (assigned: number) => {
      return bufferConsumed > 0 ? `${assigned}d + ${bufferConsumed}d` : `${assigned} Days`;
    };

    const statusDisplay = (() => {
      if (task.status === TASK_STATUS.PENDING_START) {
        return {
          header: 'Target',
          value: `${formatDuration(task.assignedDays || 0)} Target`,
          color: 'text-gray-500',
          bg: 'bg-gray-100'
        };
      } else if (task.status === 'In Progress') {
        return {
          header: 'In Progress',
          value: `${formatDuration(task.assignedDays || 0)} Target`,
          color: 'text-blue-700',
          bg: 'bg-blue-50'
        };
      } else if (task.status === 'Completed') {
        const daysCompletedNum = task.completedAt ? Math.max(1, daysElapsed) : (task.assignedDays || 0);
        return {
          header: 'Completed',
          value: `${daysCompletedNum} Day${daysCompletedNum !== 1 ? 's' : ''} Taken`,
          color: 'text-green-700',
          bg: 'bg-green-50'
        };
      } else if (task.status === 'Delayed') {
        return {
          header: 'Delayed',
          value: `${formatDuration(task.assignedDays || 0)} Target`,
          color: 'text-red-700',
          bg: 'bg-red-50'
        };
      } else {
        return {
          header: task.status as string,
          value: `${formatDuration(task.assignedDays || 0)} Target`,
          color: 'text-gray-700',
          bg: 'bg-gray-100'
        };
      }
    })();

    return (
      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 shadow-sm w-full sm:w-52 space-y-3">
        {statusDisplay.header && (
          <div className={`p-2.5 rounded-lg border text-center ${statusDisplay.bg} border-current/10`}>
            <div className={`text-[10px] font-extrabold uppercase tracking-wider ${statusDisplay.color}`}>{statusDisplay.header}</div>
            <div className="text-lg font-black text-gray-900 leading-tight mt-0.5">{statusDisplay.value}</div>
          </div>
        )}
        <div className="border-t border-gray-100 pt-3">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Duration Split
          </div>
          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Actual Days:</span>
              <span className="font-extrabold text-gray-900">{task.finalTotalDays || task.assignedDays || 0} Days</span>
            </div>
            <div className="flex justify-between">
              <span>Assigned Days:</span>
              <span className="font-extrabold text-green-600">{task.assignedDays || 0} Days</span>
            </div>
            <div className="flex justify-between">
              <span>Actual Buffer:</span>
              <span className="font-extrabold text-blue-600">{task.plannedBufferDays !== undefined ? task.plannedBufferDays : Math.max(0, (task.finalTotalDays || task.assignedDays || 0) - (task.assignedDays || 0))} Days</span>
            </div>
            <div className="flex justify-between">
              <span>Consumed Buffer:</span>
              <span className="font-extrabold text-amber-600">{bufferConsumed} Days</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining Buffer:</span>
              <span className="font-extrabold text-[#3b82f6]">{Math.max(0, (task.plannedBufferDays !== undefined ? task.plannedBufferDays : Math.max(0, (task.finalTotalDays || task.assignedDays || 0) - (task.assignedDays || 0))) - bufferConsumed)} Days</span>
            </div>
            <div className="flex justify-between font-bold border-t border-gray-100 pt-1.5 mt-1.5">
              <span>Total Duration:</span>
              <span className="text-gray-900">{(task.assignedDays || 0) + bufferConsumed} Days</span>
            </div>
          </div>
        </div>
        {task.status !== 'Completed' && !readOnly && (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full bg-blue-50 hover:bg-blue-50 text-[#1e3a5f] border border-blue-200 transition py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 mt-1"
          >
            Edit Duration
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm w-full sm:w-52">
      <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Edit Duration</div>
      <div className="flex gap-1.5 mb-2">
        <input
          type="number"
          min="0.5"
          step="any"
          className="w-16 p-1.5 text-xs border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white font-bold text-center"
          value={val}
          onChange={e => setVal(e.target.value)}
        />
        <select
          className="flex-1 p-1.5 text-xs border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white font-bold"
          value={unit}
          onChange={e => setUnit(e.target.value)}
        >
          <option value="days">Days</option>
          <option value="weeks">Weeks</option>
        </select>
      </div>
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          className="bg-green-600 text-white py-1 px-2.5 rounded text-[10px] font-bold hover:bg-green-700 transition flex-1"
        >
          Save
        </button>
        <button
          onClick={() => {
            setVal(String(task.durationValue !== undefined ? task.durationValue : (task.finalTotalDays || task.assignedDays || 0)));
            setUnit(task.durationUnit || 'days');
            setIsEditing(false);
          }}
          className="bg-gray-200 text-gray-700 py-1 px-2.5 rounded text-[10px] font-bold hover:bg-gray-300 transition flex-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export const ReportsTab = ({ projTasks, proj, users, allTaskDates, isClientView = false }: { projTasks: any[], proj: any, users: any[], allTaskDates: Record<string, any>, isClientView?: boolean }) => {
  const chainMap = computeCriticalChain(projTasks);

  const getTaskDepartment = (u: any) => {
    if (!u) return 'Unassigned';
    if (u.department) return u.department;
    if (u.name.includes('SCM')) return 'SCM';
    if (u.name.includes('DQA')) return 'DQA';
    if (u.name.includes('ARD')) return 'ARD';
    if (u.name.includes('CRD')) return 'CRD';
    if (u.role === ROLES.PM) return 'Project Manager';
    return u.name;
  };

  // Department aggregation
  const deptStats: Record<string, any> = {};
  projTasks.forEach(t => {
    const taskAssignees = users.filter(u =>
      Array.isArray(t.assignedTo)
        ? t.assignedTo.includes(u.id)
        : t.assignedTo === u.id
    );
    const depts = taskAssignees.length > 0 ? [...new Set(taskAssignees.map(a => getTaskDepartment(a)))] : ['Unassigned'];

    depts.forEach(dept => {
      if (!deptStats[dept]) deptStats[dept] = { total: 0, completed: 0, inProgress: 0, delayed: 0, progressSum: 0 };
      deptStats[dept].total++;
      if (t.status === 'Completed') deptStats[dept].completed++;
      else if (t.status === 'In Progress') deptStats[dept].inProgress++;

      // Check if delayed
      let isDelayed = false;
      if (t.status !== 'Completed' && t.startedAt && t.assignedDays) {
        const start = new Date(t.startedAt);
        const today = new Date();
        const elapsed = getWorkingDaysElapsed(start, today);
        if (elapsed > t.assignedDays) isDelayed = true;
      }
      if (isDelayed) deptStats[dept].delayed++;

      deptStats[dept].progressSum += computeTaskProgress(t);
    });
  });

  const delayedTasks = projTasks.filter(t => {
    if (t.status === 'Completed') return false;
    if (!t.startedAt || !t.assignedDays) return false;
    const start = new Date(t.startedAt);
    const today = new Date();
    const elapsed = getWorkingDaysElapsed(start, today);
    return elapsed > t.assignedDays;
  });

  const completedTasksCount = projTasks.filter((t: any) => t.status === 'Completed').length;
  const totalProgress = projTasks.length > 0
    ? Math.round(projTasks.reduce((acc: number, t: any) => acc + computeTaskProgress(t), 0) / projTasks.length)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Task Completion Summary */}
      <Card className="p-6 bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#3b82f6]" /> Task Completion Summary
          </h3>
          <div className="bg-blue-50 text-[#1e3a5f] px-3 py-1 rounded-lg text-sm font-bold border border-blue-200">
            Overall Tasks Progress: {completedTasksCount}/{projTasks.length} ({totalProgress}%)
          </div>
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
              <tr>
                <th className="p-3.5 border-r border-gray-200 w-16 text-center">S.No</th>
                <th className="p-3.5 border-r border-gray-200 min-w-[200px]">Task Name</th>
                {!isClientView && <th className="p-3.5 border-r border-gray-200">Owner</th>}
                {!isClientView && <th className="p-3.5 border-r border-gray-200">Dept</th>}
                <th className="p-3.5 border-r border-gray-200">Planned Start</th>
                <th className="p-3.5 border-r border-gray-200">Planned End</th>
                <th className="p-3.5 border-r border-gray-200">Dynamic Start</th>
                <th className="p-3.5 border-r border-gray-200">Dynamic End</th>
                <th className="p-3.5 border-r border-gray-200 min-w-[150px]">Progress</th>
                <th className="p-3.5 border-r border-gray-200">Status</th>
                <th className="p-3.5">Chain Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projTasks.map((t, idx) => {
                const taskAssignees = users.filter(u =>
                  Array.isArray(t.assignedTo)
                    ? t.assignedTo.includes(u.id)
                    : t.assignedTo === u.id
                );
                const namesStr = taskAssignees.length > 0 ? taskAssignees.map(a => a.name).join(', ') : 'Unassigned';
                const deptsStr = taskAssignees.length > 0 ? [...new Set(taskAssignees.map(a => getTaskDepartment(a)))].join(', ') : 'Unassigned';
                const prog = computeTaskProgress(t);
                const chainRole = chainMap.get(t.id) || 'Feeding';
                const dates = allTaskDates?.[t.id];
                const pStartStr = dates?.plannedStart ? fmtDate(dates.plannedStart) : '-';
                const pEndStr = dates?.plannedEnd ? fmtDate(dates.plannedEnd) : '-';
                const dStartStr = dates?.start ? fmtDate(dates.start) : '-';
                const dEndStr = dates?.end ? fmtDate(dates.end) : '-';

                return (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5 text-center font-medium border-r border-gray-100 text-gray-500">{idx + 1}</td>
                    <td className="p-3.5 border-r border-gray-100 font-bold text-gray-700">{t.title}</td>
                    {!isClientView && <td className="p-3.5 border-r border-gray-100 text-gray-600">{namesStr}</td>}
                    {!isClientView && <td className="p-3.5 border-r border-gray-100 text-gray-600 font-bold text-xs">{deptsStr}</td>}
                    <td className="p-3.5 border-r border-gray-100 text-gray-500 text-xs">{pStartStr}</td>
                    <td className="p-3.5 border-r border-gray-100 text-gray-500 text-xs">{pEndStr}</td>
                    <td className="p-3.5 border-r border-gray-100 text-[#3b82f6] font-semibold text-xs">{dStartStr}</td>
                    <td className="p-3.5 border-r border-gray-100 text-[#3b82f6] font-semibold text-xs">{dEndStr}</td>
                    <td className="p-3.5 border-r border-gray-100">
                      {(() => {
                        const displayProg = getTrialSimulatedProgress(t, prog);
                        const barClr = getTaskTimeColor(t);
                        const lbl = getTrialProgressLabel(t);
                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden w-24">
                                <div className={`h-full rounded-full ${barClr}`} style={{ width: `${displayProg}%` }} />
                              </div>
                              <span className="text-xs font-bold text-gray-500">{displayProg}%</span>
                            </div>
                            {lbl && <span className="text-[9px] font-semibold italic text-gray-400">{lbl}</span>}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3.5 border-r border-gray-100">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t.status}</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${chainRole === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                        {chainRole}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Buffer Consumption Details */}
      {!isClientView && (
        <Card className="p-6 bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#3b82f6]" /> Buffer Penetration Details
            </h3>
            <div className="bg-blue-50 text-[#1e3a5f] px-3 py-1 rounded-lg text-sm font-bold border border-blue-200">
              Remaining Pool Buffer: {computeDynamicBufferPool(proj.id, projTasks)} Days
            </div>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                <tr>
                  <th className="p-3.5 border-r border-gray-200 w-16 text-center">S.No</th>
                  <th className="p-3.5 border-r border-gray-200 min-w-[200px]">Task Name</th>
                  {!isClientView && <th className="p-3.5 border-r border-gray-200">Owner</th>}
                  <th className="p-3.5 border-r border-gray-200 text-center">Planned Buffer</th>
                  <th className="p-3.5 border-r border-gray-200 text-center">Consumed Buffer</th>
                  <th className="p-3.5 text-center">Buffer Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projTasks.map((t, idx) => {
                  const taskAssignees = users.filter(u =>
                    Array.isArray(t.assignedTo)
                      ? t.assignedTo.includes(u.id)
                      : t.assignedTo === u.id
                  );
                  const namesStr = taskAssignees.length > 0 ? taskAssignees.map(a => a.name).join(', ') : 'Unassigned';
                  const planned = t.plannedBufferDays !== undefined ? t.plannedBufferDays : (t.bufferDays || 0);
                  let actualDays = 0;
                  if (t.startedAt) {
                    const start = new Date(t.startedAt);
                    const end = t.completedAt ? new Date(t.completedAt) : new Date();
                    let count = 0;
                    const cur = new Date(start);
                    cur.setHours(0, 0, 0, 0);
                    const endD = new Date(end);
                    endD.setHours(0, 0, 0, 0);
                    while (cur < endD) {
                      if (!isRestDay(cur)) count++;
                      cur.setDate(cur.getDate() + 1);
                    }
                    actualDays = Math.max(0, count);
                  }
                  const consumed = Math.max(0, actualDays - (t.assignedDays || 0));
                  let health = 'Safe';
                  let hStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (consumed > planned) {
                    health = 'Critical';
                    hStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                  } else if (consumed > 0) {
                    health = 'Watch';
                    hStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                  }

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3.5 text-center font-medium border-r border-gray-100 text-gray-500">{idx + 1}</td>
                      <td className="p-3.5 border-r border-gray-100 font-bold text-gray-700">{t.title}</td>
                      {!isClientView && <td className="p-3.5 border-r border-gray-100 text-gray-600">{namesStr}</td>}
                      <td className="p-3.5 border-r border-gray-100 text-center font-bold text-gray-600">{planned}d</td>
                      <td className="p-3.5 border-r border-gray-100 text-center font-bold text-gray-600">{consumed}d</td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm ${hStyle}`}>{health}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Department Progress */}
      {!isClientView && (
        <Card className="p-6 bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#3b82f6]" /> Department Progress
          </h3>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                <tr>
                  <th className="p-3.5 border-r border-gray-200 w-16 text-center">S.No</th>
                  <th className="p-3.5 border-r border-gray-200 min-w-[150px]">Department</th>
                  <th className="p-3.5 border-r border-gray-200 text-center">Total Tasks</th>
                  <th className="p-3.5 border-r border-gray-200 text-center">Completed</th>
                  <th className="p-3.5 border-r border-gray-200 text-center">In Progress</th>
                  <th className="p-3.5 border-r border-gray-200 text-center">Delayed</th>
                  <th className="p-3.5 min-w-[150px]">Progress%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(deptStats).map(([dept, stats], idx) => {
                  const avg = stats.total > 0 ? Math.round(stats.progressSum / stats.total) : 0;
                  return (
                    <tr key={dept} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3.5 text-center font-medium border-r border-gray-100 text-gray-500">{idx + 1}</td>
                      <td className="p-3.5 border-r border-gray-100 font-bold text-gray-700 uppercase tracking-wide">{dept}</td>
                      <td className="p-3.5 border-r border-gray-100 text-center font-black text-gray-900">{stats.total}</td>
                      <td className="p-3.5 border-r border-gray-100 text-center font-black text-emerald-600">{stats.completed}</td>
                      <td className="p-3.5 border-r border-gray-100 text-center font-black text-blue-600">{stats.inProgress}</td>
                      <td className="p-3.5 border-r border-gray-100 text-center font-black text-rose-600">{stats.delayed}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden w-24">
                            <div className={`h-full rounded-full ${avg === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${avg}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-600">{avg}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delays & Overruns */}
      {!isClientView && (
        <Card className="p-6 bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2 mb-4 text-rose-700">
            <ShieldAlert className="w-5 h-5" /> Delays & Overruns
          </h3>
          {delayedTasks.length === 0 ? (
            <div className="text-center p-8 text-gray-500 border border-dashed border-gray-200 rounded-xl bg-gray-50">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-50" />
              Great news! No tasks are currently delayed or overrunning their assigned schedule.
            </div>
          ) : (
            <div className="overflow-x-auto border border-rose-100 rounded-xl">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-rose-50 border-b border-rose-100 text-rose-800 font-bold">
                  <tr>
                    <th className="p-3.5 border-r border-rose-100 w-16 text-center">S.No</th>
                    <th className="p-3.5 border-r border-rose-100 min-w-[200px]">Task Name</th>
                    <th className="p-3.5 border-r border-rose-100">Owner</th>
                    <th className="p-3.5 border-r border-rose-100 text-center">Assigned Days</th>
                    <th className="p-3.5 border-r border-rose-100 text-center">Actual Days</th>
                    <th className="p-3.5">Delay Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50">
                  {delayedTasks.map((t, idx) => {
                    const taskAssignees = users.filter(u =>
                      Array.isArray(t.assignedTo)
                        ? t.assignedTo.includes(u.id)
                        : t.assignedTo === u.id
                    );
                    const namesStr = taskAssignees.length > 0 ? taskAssignees.map(a => a.name).join(', ') : 'Unassigned';
                    const start = new Date(t.startedAt);
                    const today = new Date();
                    const actualDays = getWorkingDaysElapsed(start, today);

                    return (
                      <tr key={t.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="p-3.5 text-center font-medium border-r border-rose-50 text-gray-500">{idx + 1}</td>
                        <td className="p-3.5 border-r border-rose-50 font-bold text-gray-700">{t.title}</td>
                        <td className="p-3.5 border-r border-rose-50 text-gray-600">{namesStr}</td>
                        <td className="p-3.5 border-r border-rose-50 text-center font-bold text-gray-600">{t.assignedDays || 0}d</td>
                        <td className="p-3.5 border-r border-rose-50 text-center font-black text-rose-600">{actualDays}d</td>
                        <td className="p-3.5 text-xs text-gray-600 max-w-xs truncate" title={t.delayJustification || 'No reason provided'}>
                          {t.delayJustification || <span className="italic text-gray-400">No reason provided</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

import { computeCriticalChain } from '../utils/criticalChain';

export const useAllTaskDates = (tasks: any[], projects: any[]) => {
  return useMemo(() => {
    const resolved: Record<string, { start: Date; end: Date; plannedStart: Date; plannedEnd: Date }> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getProjectStart = (projectId: string) => {
      const p = projects.find((p: any) => p.id === projectId);
      if (p?.createdAt) {
        const d = new Date(p.createdAt);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      return new Date(today);
    };

    const resolveTask = (taskId: string, visited: Set<string> = new Set()): { start: Date; end: Date; plannedStart: Date; plannedEnd: Date } => {
      if (resolved[taskId]) return resolved[taskId];

      const task = tasks.find((t: any) => t.id === taskId);
      if (!task || visited.has(taskId)) return { start: today, end: today, plannedStart: today, plannedEnd: today };
      visited.add(taskId);

      const projStart = getProjectStart(task.projectId);
      const days = task.finalTotalDays || task.assignedDays || task.estimatedDays || 1;

      // 1. Calculate Planned Dates (Anchored to projStart, cascades linearly)
      let plannedStart: Date;
      if (task.predecessors?.length) {
        const predEnds = task.predecessors.map((pid: string) => {
          const pd = resolveTask(pid, new Set(visited));
          return pd.plannedEnd;
        });
        plannedStart = new Date(Math.max(...predEnds.map((d: Date) => d.getTime())));
      } else {
        plannedStart = new Date(projStart);
      }
      const plannedEnd = addWorkingDays(plannedStart, days);

      // 2. Calculate Dynamic Dates
      let start: Date;
      if (task.startedAt) {
        start = new Date(task.startedAt);
      } else if (task.predecessors?.length) {
        const predEnds = task.predecessors.map((pid: string) => {
          const pd = resolveTask(pid, new Set(visited));
          return pd.end;
        });
        start = new Date(Math.max(...predEnds.map((d: Date) => d.getTime())));
      } else {
        start = new Date(today);
      }

      const end = addWorkingDays(start, days);

      let finalEnd = end;
      if (task.status === 'Completed' && task.completedAt) {
        finalEnd = new Date(task.completedAt);
      }

      resolved[taskId] = { start, end: finalEnd, plannedStart, plannedEnd };
      return resolved[taskId];
    };

    tasks.forEach((task: any) => resolveTask(task.id));
    return resolved;
  }, [tasks, projects]);
};

export const PMProjectsView = ({ initialProjectId = null, onBack = null }: { initialProjectId?: string | null, onBack?: (() => void) | null }) => {
  const { currentUser, projects, tasks, addTasksBulk, updateTask, users, updateProject } = useContext(AppContext);
  const isBelowPM = currentUser.role === ROLES.DEPT_HEAD || currentUser.role === ROLES.EMPLOYEE;

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);

  useEffect(() => {
    if (initialProjectId !== null) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const [taskCount, setTaskCount] = useState<number | ''>('');
  const [tasksList, setTasksList] = useState<any[]>([
    { title: '', assignedTo: [], durationValue: '', durationUnit: 'days', subtasks: [], subtaskCountInput: '', showSubtasks: false, prerequisitesChecklist: [] }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [projectSubTab, setProjectSubTab] = useState<'tasks' | 'chart' | 'gantt' | 'reports' | 'business' | 'team' | 'rm'>('tasks');

  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [expandedTaskLogId, setExpandedTaskLogId] = useState<string | null>(null);
  const [editingParentTitle, setEditingParentTitle] = useState<string | null>(null);
  const [parentTitleEditValue, setParentTitleEditValue] = useState<string>('');
  const [subtaskTabs, setSubtaskTabs] = useState<Record<string, 'list' | 'chart'>>({});
  const [bufferAllocateTask, setBufferAllocateTask] = useState<any>(null);
  const [bufferDaysInput, setBufferDaysInput] = useState<string>('');

  const handleParentTitleSave = (oldParentTitle: string, tasksToUpdate: any[]) => {
    const newTitle = parentTitleEditValue.trim();
    if (newTitle && newTitle !== oldParentTitle) {
      tasksToUpdate.forEach(t => {
        const parts = t.title.split(' — ');
        parts[0] = newTitle;
        const updatedTitle = parts.join(' — ');
        updateTask(t.id, { title: updatedTitle });
      });
    }
    setEditingParentTitle(null);
  };

  const modifyPredecessorOfAny = (targetId: string, predId: string, isAdd: boolean) => {
    const taskMatch = tasks.find((t: any) => String(t.id) === String(targetId));
    if (taskMatch) {
      let predecessors = taskMatch.predecessors || [];
      if (isAdd) {
        if (!predecessors.includes(predId)) predecessors = [...predecessors, predId];
      } else {
        predecessors = predecessors.filter((id: string) => String(id) !== String(predId));
      }
      updateTask(taskMatch.id, { predecessors });
      return;
    }

    const parentTask = tasks.find((t: any) => (t.subtasks || []).some((st: any) => String(st.id) === String(targetId)));
    if (parentTask) {
      const updatedSubtasks = parentTask.subtasks.map((st: any) => {
        if (String(st.id) === String(targetId)) {
          let predecessors = st.predecessors || [];
          if (isAdd) {
            if (!predecessors.includes(predId)) predecessors = [...predecessors, predId];
          } else {
            predecessors = predecessors.filter((id: string) => String(id) !== String(predId));
          }
          return { ...st, predecessors };
        }
        return st;
      });
      updateTask(parentTask.id, { subtasks: updatedSubtasks });
    }
  };

  const handleAddPredecessor = (task: any, predId: string) => modifyPredecessorOfAny(String(task.id), predId, true);
  const handleRemovePredecessor = (task: any, predId: string) => modifyPredecessorOfAny(String(task.id), predId, false);
  const handleAddSuccessor = (task: any, succId: string) => modifyPredecessorOfAny(succId, String(task.id), true);
  const handleRemoveSuccessor = (task: any, succId: string) => modifyPredecessorOfAny(succId, String(task.id), false);

  const handleAddSubtaskPredecessor = (subtaskId: any, predId: string) => modifyPredecessorOfAny(String(subtaskId), predId, true);
  const handleRemoveSubtaskPredecessor = (subtaskId: any, predId: string) => modifyPredecessorOfAny(String(subtaskId), predId, false);
  const handleAddSubtaskSuccessor = (subtaskId: any, succId: string) => modifyPredecessorOfAny(succId, String(subtaskId), true);
  const handleRemoveSubtaskSuccessor = (subtaskId: any, succId: string) => modifyPredecessorOfAny(succId, String(subtaskId), false);

  const isHigherHierarchy = currentUser.role === ROLES.MANAGEMENT || currentUser.role === ROLES.RD_HEAD;
  const readOnly = isHigherHierarchy;
  const myProjects = isHigherHierarchy ? projects : projects.filter((p: any) => p.pmId === currentUser.id);
  const assignableUsers = useMemo(() => {
    const direct = users.filter((u: any) => u.managerId === currentUser.id);
    const directIds = new Set(direct.map((u: any) => u.id));
    const indirect = users.filter((u: any) => u.managerId && directIds.has(u.managerId));
    return [
      currentUser,
      ...direct,
      ...indirect
    ];
  }, [users, currentUser]);

  const allProjectNodes = useMemo(() => {
    const nodes: { id: string, title: string, type: 'task' | 'subtask', predecessors: string[], projectId: string }[] = [];
    tasks.forEach((t: any) => {
      nodes.push({ id: String(t.id), title: `Task: ${t.title || 'Untitled'}`, type: 'task', predecessors: (t.predecessors || []).map(String), projectId: t.projectId });
      if (t.subtasks) {
        t.subtasks.forEach((st: any) => {
          nodes.push({ id: String(st.id), title: `Subtask: ${st.title || 'Untitled'}`, type: 'subtask', predecessors: (st.predecessors || []).map(String), projectId: t.projectId });
        });
      }
    });
    return nodes;
  }, [tasks]);

  const allTaskDates = useAllTaskDates(tasks, projects);

  const filtered = myProjects.filter((p: any) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTaskCountChange = (val: string) => {
    if (val === '') {
      setTaskCount('');
      setTasksList([]);
      return;
    }
    const count = parseInt(val);
    const newCount = Math.max(1, count);
    setTaskCount(newCount);
    setTasksList(prev => {
      const list = [...prev];
      if (newCount > list.length) {
        for (let i = list.length; i < newCount; i++) {
          list.push({ title: '', assignedTo: [], durationValue: '', durationUnit: 'days', subtasks: [], subtaskCountInput: '', showSubtasks: false, prerequisitesChecklist: [] });
        }
      } else if (newCount < list.length) {
        list.splice(newCount);
      }
      return list;
    });
  };

  const handleNestedSubtaskCountChange = (taskIdx: number, countVal: string) => {
    setTasksList(prev => {
      const list = [...prev];
      const task = { ...list[taskIdx] };
      task.subtaskCountInput = countVal;

      const count = parseInt(countVal) || 0;
      if (count > 0) {
        const subtasks = [...task.subtasks];
        if (count > subtasks.length) {
          for (let i = subtasks.length; i < count; i++) {
            subtasks.push({ title: '', assignedTo: [], durationValue: '', durationUnit: 'days' });
          }
        } else if (count < subtasks.length) {
          subtasks.splice(count);
        }
        task.subtasks = subtasks;
      } else {
        task.subtasks = [];
      }
      list[taskIdx] = task;
      return list;
    });
  };

  // ── PROJECT DETAIL VIEW ──────────────────────────────────────────────────
  if (selectedProjectId) {
    const proj = projects.find((p: any) => p.id === selectedProjectId);
    if (!proj) { setSelectedProjectId(null); return null; }

    const projTasks = tasks.filter((t: any) => t.projectId === proj.id);
    const approvedTasks = projTasks.filter((t: any) => t.status === TASK_STATUS.PENDING_START).length;
    const totalAssignedDays = projTasks.reduce((s: number, t: any) => s + (t.assignedDays || 0), 0);

    // Group all tasks by parent title
    const groupedForProjectProgress: Record<string, any[]> = {};
    projTasks.forEach((t: any) => {
      const parentTitle = t.title.split(' — ')[0];
      if (!groupedForProjectProgress[parentTitle]) {
        groupedForProjectProgress[parentTitle] = [];
      }
      groupedForProjectProgress[parentTitle].push(t);
    });

    // Calculate progress for each in-progress group
    const inProgressGroupProgresses: number[] = [];
    Object.keys(groupedForProjectProgress).forEach((parentTitle) => {
      const subtasksList = groupedForProjectProgress[parentTitle];
      const inProgressTasks = subtasksList.filter((t: any) => t.status && t.status.includes('In Progress'));

      if (inProgressTasks.length > 0) {
        const totalDaysAll = subtasksList.reduce((sum: number, t: any) => sum + (t.assignedDays || 0), 0);
        const taskProgress = totalDaysAll > 0
          ? Math.round(subtasksList.reduce((sum: number, t: any) => sum + (computeTaskProgress(t) * (t.assignedDays || 0)), 0) / totalDaysAll)
          : Math.round(subtasksList.reduce((sum: number, t: any) => sum + computeTaskProgress(t), 0) / subtasksList.length);

        inProgressGroupProgresses.push(taskProgress);
      }
    });

    // Whole project progress is the average of in-progress groups
    const progress = inProgressGroupProgresses.length > 0
      ? Math.round(inProgressGroupProgresses.reduce((sum, p) => sum + p, 0) / inProgressGroupProgresses.length)
      : 0;

    const pCfg = PROJECT_STATUS_CONFIG[proj.status] || PROJECT_STATUS_CONFIG['Planning'];
    const ProjStatusIcon = pCfg.icon;

    const handleAddTask = (e: React.FormEvent) => {
      e.preventDefault();

      // Check if any task or subtask is missing an assignee
      let missingAssignee = false;
      tasksList.forEach(task => {
        if (task.showSubtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((st: any) => {
            if (!st.assignedTo || (Array.isArray(st.assignedTo) && st.assignedTo.length === 0)) {
              missingAssignee = true;
            }
          });
        } else {
          if (!task.assignedTo || (Array.isArray(task.assignedTo) && task.assignedTo.length === 0)) {
            missingAssignee = true;
          }
        }
      });

      if (missingAssignee) {
        alert('Please select at least one assignee for all tasks and subtasks.');
        return;
      }

      // Validation for subtask overflow removed because parent days are now determined by subtasks

      const tasksToSubmit: any[] = [];
      let totalNewBuffer = 0;

      tasksList.forEach((task) => {
        let parentFinalTotalDays = 0;
        let parentAssignedDays = 0;
        let parentBufferDays = 0;
        let parentFinalVal = 0;
        let parentUnit = 'days';

        if (task.showSubtasks && task.subtasks.length > 0) {
          const allAssignees = new Set<string>();
          const mappedSubtasks = task.subtasks.map((st: any, i: number) => {
            if (Array.isArray(st.assignedTo)) st.assignedTo.forEach((u: string) => allAssignees.add(u));
            else if (st.assignedTo) allAssignees.add(st.assignedTo);

            const stVal = parseFloat(st.durationValue) || 0;
            const stUnit = st.durationUnit || 'days';
            const stFinalTotalDays = stUnit === 'weeks' ? calculateWorkingDaysFromWeeks(stVal) : stVal;
            const stAssignedDays = stFinalTotalDays <= 3 ? stFinalTotalDays : Math.ceil(stFinalTotalDays * 0.7);
            const stBufferDays = stFinalTotalDays <= 3 ? 0 : stFinalTotalDays - stAssignedDays;

            parentFinalTotalDays += stFinalTotalDays;
            parentAssignedDays += stAssignedDays;
            parentBufferDays += stBufferDays;

            return {
              id: Date.now() + i,
              title: st.title,
              days: stAssignedDays, // 70% shown for subtask
              assignedTo: st.assignedTo,
              completed: false
            };
          });

          totalNewBuffer += parentBufferDays;

          tasksToSubmit.push({
            title: task.title,
            specs: '',
            assignedTo: Array.from(allAssignees),
            projectId: proj!.id,
            status: TASK_STATUS.PENDING_START,
            durationValue: parentFinalTotalDays, // Fallback representing total days
            durationUnit: 'days',
            finalTotalDays: parentFinalTotalDays,
            assignedDays: parentAssignedDays,
            plannedBufferDays: parentBufferDays,
            bufferDays: 0,
            subtasks: mappedSubtasks,
            prerequisitesChecklist: []
          });
        } else {
          parentFinalVal = parseFloat(task.durationValue) || 1;
          parentUnit = task.durationUnit || 'days';
          parentFinalTotalDays = parentUnit === 'weeks' ? calculateWorkingDaysFromWeeks(parentFinalVal) : parentFinalVal;
          parentAssignedDays = parentFinalTotalDays <= 3 ? parentFinalTotalDays : Math.ceil(parentFinalTotalDays * 0.7);
          parentBufferDays = parentFinalTotalDays <= 3 ? 0 : parentFinalTotalDays - parentAssignedDays;

          totalNewBuffer += parentBufferDays;

          tasksToSubmit.push({
            title: task.title,
            specs: '',
            assignedTo: task.assignedTo,
            projectId: proj!.id,
            status: TASK_STATUS.PENDING_START,
            durationValue: parentFinalVal,
            durationUnit: parentUnit,
            finalTotalDays: parentFinalTotalDays,
            assignedDays: parentAssignedDays,
            plannedBufferDays: parentBufferDays,
            bufferDays: 0,
            prerequisitesChecklist: []
          });
        }
      });

      addTasksBulk(tasksToSubmit);

      if (totalNewBuffer > 0) {
        updateProject(proj.id, {
          bufferPool: (proj.bufferPool || 0) + totalNewBuffer
        });
      }

      // Reset form
      setTasksList([{ title: '', assignedTo: [], durationValue: '', durationUnit: 'days', subtasks: [], subtaskCountInput: '', showSubtasks: false, prerequisitesChecklist: [] }]);
      setTaskCount(1);
      setShowTaskForm(false);
    };

    return (
      <div className="space-y-6">
        {/* Back & Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                setSelectedProjectId(null);
                setShowTaskForm(false);
                setProjectSubTab('tasks');
              }
            }}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 bg-white px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all font-semibold text-sm"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to Projects
          </button>
          {!readOnly && (
            <button
              onClick={() => {
                setTaskCount(1);
                setTasksList([{ title: '', assignedTo: [], durationValue: '', durationUnit: 'days', subtasks: [], subtaskCountInput: '', showSubtasks: false, prerequisitesChecklist: [] }]);
                setShowTaskForm(true);
              }}
              className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md transition-shadow shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> Assign New Task
            </button>
          )}
        </div>

        {/* Hero header */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full -mr-20 -mt-20" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${pCfg.bg} ${pCfg.color}`}>
                <ProjStatusIcon className="w-3.5 h-3.5" /> {proj.status}
              </span>

              {currentUser?.role === ROLES.RD_HEAD && (
                <div className="flex items-center gap-2 ml-2">
                  {proj.status === 'Planning' && (
                    <button
                      onClick={() => updateProject(proj.id, { status: 'Active' })}
                      className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" /> Start
                    </button>
                  )}
                  {proj.status === 'Active' && (
                    <button
                      onClick={() => updateProject(proj.id, { status: 'Suspended' })}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm"
                    >
                      <PauseCircle className="w-3.5 h-3.5" /> Hold
                    </button>
                  )}
                  {proj.status === 'Suspended' && (
                    <button
                      onClick={() => updateProject(proj.id, { status: 'Active' })}
                      className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  {proj.status !== 'Dismissed' && proj.status !== 'Completed' && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to dismiss this project?')) {
                          updateProject(proj.id, { status: 'Dismissed' });
                        }
                      }}
                      className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  )}
                </div>
              )}
              {proj.priority && (
                <span className="text-xs bg-white/10 text-blue-100 px-3 py-1.5 rounded-full border border-white/20">
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

            <div className="flex flex-wrap gap-6 mt-6 text-sm text-blue-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Deadline: <strong className="text-white">{proj.deadline || 'N/A'}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Tasks: <strong className="text-white">{projTasks.length}</strong>
              </div>
              {(proj.clientId || proj.clientName) && (
                <div className="flex items-center gap-2">
                  <UserSquare2 className="w-4 h-4 text-blue-200" /> Client: <strong className="text-white">
                    {proj.clientName || (proj.clientId ? users.find((u: any) => u.id === proj.clientId)?.name : 'Client')}
                  </strong>
                </div>
              )}
              {/* Projected Start Date */}
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Projected Start:</span>
                {readOnly ? (
                  <strong className="text-white">{proj.projectedStart || 'Not set'}</strong>
                ) : (
                  <input
                    type="date"
                    value={proj.projectedStart || ''}
                    onChange={e => updateProject(proj.id, { projectedStart: e.target.value })}
                    className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer [color-scheme:dark]"
                    title="Set Projected Start Date"
                  />
                )}
              </div>
              {/* Projected End Date */}
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Projected End:</span>
                {readOnly ? (
                  <strong className="text-white">{proj.projectedEnd || 'Not set'}</strong>
                ) : (
                  <input
                    type="date"
                    value={proj.projectedEnd || ''}
                    onChange={e => updateProject(proj.id, { projectedEnd: e.target.value })}
                    className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer [color-scheme:dark]"
                    title="Set Projected End Date"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Buffer pool badge */}
          <div className="absolute top-6 right-6 bg-blue-500/20 border border-blue-300/30 rounded-2xl px-5 py-4 text-center backdrop-blur-sm">
            <div className="text-xs text-blue-200 font-bold uppercase tracking-wider mb-1">Buffer Pool</div>
            <div className="text-3xl font-black text-white">{computeDynamicBufferPool(proj.id, projTasks)}</div>
            <div className="text-xs text-blue-300 font-medium">Days Saved</div>
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Tasks" value={projTasks.length} icon={CheckSquare} colorClass="bg-gray-100 text-gray-600" />
          <StatCard title="Target Tasks" value={approvedTasks} icon={CheckCircle} colorClass="bg-green-100 text-green-600" />
          <StatCard title="Days Assigned" value={`${totalAssignedDays}d`} icon={Clock} colorClass="bg-blue-50 text-[#3b82f6]" />
          <StatCard title="Delayed Tasks" value={projTasks.filter((t: any) => t.status === 'Delayed').length} icon={AlertTriangle} colorClass="bg-red-50 text-red-600" />
        </div>

        {/* Progress */}
        <Card className="p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#3b82f6]" /> Task Completion Progress
            </h3>
            <span className="text-sm font-bold text-[#1e3a5f]">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProjectTimeColor(proj, projTasks)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>Progress of In-Progress Tasks</span>
            <span>{inProgressGroupProgresses.length} active task groups</span>
          </div>
        </Card>

        {/* Modal: Assign Tasks form */}
        {showTaskForm && createPortal(
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl p-6 border border-gray-200 shadow-2xl relative bg-white flex flex-col max-h-[90vh] rounded-2xl">
              <div className="flex items-center justify-between mb-4 border-b pb-3 flex-shrink-0">
                <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                  <CheckSquare className="w-5 h-5 text-[#3b82f6]" /> Assign New Tasks
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                  ✕ Close
                </button>
              </div>

              {/* Number of tasks input */}
              <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center flex-shrink-0">
                <div>
                  <label className="block text-sm font-bold text-gray-700">Number of Tasks</label>
                  <p className="text-xs text-gray-500">Specify how many tasks to delegate</p>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-20 p-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold text-sm bg-white"
                  value={taskCount}
                  onChange={e => handleTaskCountChange(e.target.value)}
                />
              </div>

              <form onSubmit={handleAddTask} className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
                <div className="space-y-4">
                  {tasksList.map((task, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#3b82f6] bg-blue-50 px-2.5 py-1 rounded-lg">
                          Task #{idx + 1}
                        </span>
                        {!task.showSubtasks ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTasksList(prev => {
                                const list = [...prev];
                                list[idx] = { ...list[idx], showSubtasks: true, subtasks: [{ title: '', assignedTo: [] }] };
                                return list;
                              });
                            }}
                            className="text-xs font-bold text-[#3b82f6] hover:text-[#1e3a5f] bg-blue-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                          >
                            + Add Subtasks
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTasksList(prev => {
                                const list = [...prev];
                                list[idx] = { ...list[idx], showSubtasks: false, subtasks: [], subtaskCountInput: '1' };
                                return list;
                              });
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
                          >
                            Remove Subtasks
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Task Title *</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Stability Study"
                          className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                          value={task.title}
                          onChange={e => {
                            const updated = [...tasksList];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setTasksList(updated);
                          }}
                        />
                      </div>


                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">Assign To *</label>
                          <details className="relative group w-full">
                            <summary className="w-full p-2.5 border border-gray-300 rounded-xl bg-white cursor-pointer list-none flex justify-between items-center text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
                              <span className="truncate pr-2">
                                {task.assignedTo && task.assignedTo.length > 0
                                  ? assignableUsers.filter((u: any) => Array.isArray(task.assignedTo) ? task.assignedTo.includes(u.id) : task.assignedTo === u.id).map((u: any) => u.name).join(', ') || 'Select Assignees'
                                  : 'Select Assignees'}
                              </span>
                              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                            </summary>
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto p-2 space-y-1.5">
                              {assignableUsers.map((u: any) => {
                                const isChecked = Array.isArray(task.assignedTo)
                                  ? task.assignedTo.includes(u.id)
                                  : task.assignedTo === u.id;
                                return (
                                  <label key={u.id} className="flex items-center gap-2.5 p-1.5 hover:bg-blue-50/50 rounded-lg cursor-pointer transition-colors text-xs font-medium text-gray-700">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      className="w-4 h-4 rounded text-[#3b82f6] border-gray-300 focus:ring-blue-500 cursor-pointer"
                                      onChange={e => {
                                        const updated = [...tasksList];
                                        let currentAssigned = Array.isArray(task.assignedTo)
                                          ? [...task.assignedTo]
                                          : (task.assignedTo ? [task.assignedTo] : []);
                                        if (e.target.checked) {
                                          if (!currentAssigned.includes(u.id)) {
                                            currentAssigned.push(u.id);
                                          }
                                        } else {
                                          currentAssigned = currentAssigned.filter((id: string) => id !== u.id);
                                        }
                                        updated[idx] = { ...updated[idx], assignedTo: currentAssigned };
                                        setTasksList(updated);
                                      }}
                                    />
                                    <span>{u.name} <span className="text-[10px] text-gray-400">({u.role === ROLES.DEPT_HEAD ? 'Department' : u.role})</span></span>
                                  </label>
                                );
                              })}
                            </div>
                          </details>
                        </div>

                        <div className={task.showSubtasks ? "col-span-1 md:col-span-2 md:w-1/2" : ""}>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            {task.showSubtasks ? "Total Task Duration (Aggregated)" : "Duration *"}
                          </label>
                          {task.showSubtasks ? (
                            <div className="flex gap-2 items-center w-full">
                              {(() => {
                                const totalDays = task.subtasks.reduce((sum: number, st: any) => {
                                  const stVal = parseFloat(st.durationValue) || 0;
                                  const stUnit = st.durationUnit || 'days';
                                  return sum + (stUnit === 'weeks' ? calculateWorkingDaysFromWeeks(stVal) : stVal);
                                }, 0);
                                const assignedTotal = task.subtasks.reduce((sum: number, st: any) => {
                                  const stVal = parseFloat(st.durationValue) || 0;
                                  const stUnit = st.durationUnit || 'days';
                                  const stFinal = stUnit === 'weeks' ? calculateWorkingDaysFromWeeks(stVal) : stVal;
                                  return sum + (stFinal <= 3 ? stFinal : Math.ceil(stFinal * 0.7));
                                }, 0);
                                return (
                                  <div className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 text-xs font-bold flex justify-between shadow-inner">
                                    <span>{totalDays} Total Days</span>
                                    <span className="text-[#3b82f6]">{assignedTotal} Assigned Days</span>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                required
                                type="text"
                                inputMode="decimal"
                                className="w-24 p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white font-bold text-center"
                                value={task.durationValue}
                                onChange={e => {
                                  const updated = [...tasksList];
                                  updated[idx] = { ...updated[idx], durationValue: e.target.value };
                                  setTasksList(updated);
                                }}
                              />
                              <select
                                className="flex-1 p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white font-bold"
                                value={task.durationUnit}
                                onChange={e => {
                                  const updated = [...tasksList];
                                  updated[idx] = { ...updated[idx], durationUnit: e.target.value };
                                  setTasksList(updated);
                                }}
                              >
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                              </select>
                            </div>
                          )}
                          {task.showSubtasks && (
                            <div className="mt-2 text-[10px] text-[#1e3a5f] font-bold bg-blue-50/80 p-2 rounded-lg border border-blue-200">
                              The parent task duration is dynamically aggregated from its subtasks. Each subtask's duration will be split: 70% for actual work (if &gt;3 days) and the rest added to the project buffer.
                            </div>
                          )}
                        </div>
                      </div>

                      {task.showSubtasks && (
                        <div className="space-y-3 pt-2 border-t border-gray-200">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-gray-700">Subtasks for Task #{idx + 1}</label>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-bold text-gray-500">Number of Subtasks:</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-16 p-1 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold text-xs bg-white"
                                value={task.subtaskCountInput}
                                onChange={e => handleNestedSubtaskCountChange(idx, e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Aggregated Subtask Tracker */}
                          {(() => {
                            const totalDays = task.subtasks.reduce((sum: number, st: any) => {
                              const stVal = parseFloat(st.durationValue) || 0;
                              const stUnit = st.durationUnit || 'days';
                              return sum + (stUnit === 'weeks' ? calculateWorkingDaysFromWeeks(stVal) : stVal);
                            }, 0);
                            const assignedTotal = task.subtasks.reduce((sum: number, st: any) => {
                              const stVal = parseFloat(st.durationValue) || 0;
                              const stUnit = st.durationUnit || 'days';
                              const stFinal = stUnit === 'weeks' ? calculateWorkingDaysFromWeeks(stVal) : stVal;
                              return sum + (stFinal <= 3 ? stFinal : Math.ceil(stFinal * 0.7));
                            }, 0);
                            const bufferTotal = totalDays - assignedTotal;

                            return (
                              <div className="rounded-xl border p-3 mb-2 bg-blue-50 border-blue-200">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#1e3a5f]">
                                    Aggregated Task Duration
                                  </span>
                                  <span className="text-[10px] font-extrabold text-[#1e3a5f]">
                                    {totalDays}d Total
                                  </span>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[10px] text-gray-600 font-bold">{assignedTotal}d Assigned Work (70%)</span>
                                  <span className="text-[10px] text-gray-600 font-bold">{bufferTotal}d Buffer Generated (30%)</span>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="space-y-2">
                            {task.subtasks.map((sub: any, sIdx: number) => (
                              <div key={sIdx} className="p-3 border border-gray-200 rounded-lg bg-white grid grid-cols-1 md:grid-cols-3 gap-3 shadow-sm">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Subtask #{sIdx + 1} Title *</label>
                                  <input
                                    required
                                    type="text"
                                    placeholder="e.g. Documentation"
                                    className="w-full p-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-gray-50"
                                    value={sub.title}
                                    onChange={e => {
                                      const updated = [...tasksList];
                                      const taskToUpdate = { ...updated[idx] };
                                      const subtasks = [...taskToUpdate.subtasks];
                                      subtasks[sIdx] = { ...subtasks[sIdx], title: e.target.value };
                                      taskToUpdate.subtasks = subtasks;
                                      updated[idx] = taskToUpdate;
                                      setTasksList(updated);
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Assign Subtask To *</label>
                                  <details className="relative group w-full">
                                    <summary className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 cursor-pointer list-none flex justify-between items-center text-[11px] font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
                                      <span className="truncate pr-2">
                                        {sub.assignedTo && sub.assignedTo.length > 0
                                          ? assignableUsers.filter((u: any) => Array.isArray(sub.assignedTo) ? sub.assignedTo.includes(u.id) : sub.assignedTo === u.id).map((u: any) => u.name).join(', ') || 'Select Assignees'
                                          : 'Select Assignees'}
                                      </span>
                                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    </summary>
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-40 overflow-y-auto p-1.5 space-y-1">
                                      {assignableUsers.map((u: any) => {
                                        const isChecked = Array.isArray(sub.assignedTo)
                                          ? sub.assignedTo.includes(u.id)
                                          : sub.assignedTo === u.id;
                                        return (
                                          <label key={u.id} className="flex items-center gap-2 p-1 hover:bg-blue-50/50 rounded cursor-pointer transition-colors text-[11px] text-gray-700">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              className="w-3.5 h-3.5 rounded text-[#3b82f6] border-gray-300 focus:ring-blue-500 cursor-pointer"
                                              onChange={e => {
                                                const updated = [...tasksList];
                                                const taskToUpdate = { ...updated[idx] };
                                                const subtasks = [...taskToUpdate.subtasks];
                                                let currentAssigned = Array.isArray(sub.assignedTo)
                                                  ? [...sub.assignedTo]
                                                  : (sub.assignedTo ? [sub.assignedTo] : []);
                                                if (e.target.checked) {
                                                  if (!currentAssigned.includes(u.id)) {
                                                    currentAssigned.push(u.id);
                                                  }
                                                } else {
                                                  currentAssigned = currentAssigned.filter((id: string) => id !== u.id);
                                                }
                                                subtasks[sIdx] = { ...subtasks[sIdx], assignedTo: currentAssigned };
                                                taskToUpdate.subtasks = subtasks;
                                                updated[idx] = taskToUpdate;
                                                setTasksList(updated);
                                              }}
                                            />
                                            <span>{u.name} <span className="text-[9px] text-gray-400">({u.role === ROLES.DEPT_HEAD ? 'Department' : u.role})</span></span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </details>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Duration *</label>
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      className="w-14 p-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-gray-50 text-center font-bold"
                                      value={sub.durationValue || ''}
                                      onChange={e => {
                                        const updated = [...tasksList];
                                        const taskToUpdate = { ...updated[idx] };
                                        const subtasks = [...taskToUpdate.subtasks];
                                        subtasks[sIdx] = { ...subtasks[sIdx], durationValue: e.target.value };
                                        taskToUpdate.subtasks = subtasks;
                                        updated[idx] = taskToUpdate;
                                        setTasksList(updated);
                                      }}
                                    />
                                    <select
                                      className="flex-1 p-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-gray-50 font-bold"
                                      value={sub.durationUnit || 'days'}
                                      onChange={e => {
                                        const updated = [...tasksList];
                                        const taskToUpdate = { ...updated[idx] };
                                        const subtasks = [...taskToUpdate.subtasks];
                                        subtasks[sIdx] = { ...subtasks[sIdx], durationUnit: e.target.value };
                                        taskToUpdate.subtasks = subtasks;
                                        updated[idx] = taskToUpdate;
                                        setTasksList(updated);
                                      }}
                                    >
                                      <option value="days">Days</option>
                                      <option value="weeks">Weeks</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>


                {/* Check for empty state to disable */}
                {(() => {
                  const isDisabled = taskCount === '' || tasksList.length === 0;

                  return (
                    <>
                      {/* Buffer preview */}
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-[#1e3a5f]">
                        <div className="font-bold mb-1 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Buffer Pool Policy</div>
                        <p>Once estimates are received, 30% of the final approved days will automatically be added to this project's buffer pool ({computeDynamicBufferPool(proj.id, projTasks)} days saved so far).</p>
                      </div>

                      <div className="pt-2 sticky bottom-0 bg-white">
                        <button
                          type="submit"
                          disabled={isDisabled}
                          className={`w-full px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${isDisabled
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-[#1e3a5f] text-white hover:bg-[#162d4a] shadow-sm hover:shadow-md transition-shadow shadow-blue-500/20'
                            }`}
                        >
                          <Send className="w-4 h-4" /> Delegate Tasks & Subtasks
                        </button>
                      </div>
                    </>
                  );
                })()}
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Main Content Area: Tabbed selection between task list and dependency flow */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setProjectSubTab('tasks')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${projectSubTab === 'tasks' ? 'border-blue-600 text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Tasks & Delegation ({projTasks.length})
            </button>
            <button
              onClick={() => setProjectSubTab('chart')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${projectSubTab === 'chart' ? 'border-blue-600 text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Dependency Flow Chart
            </button>
            <button
              onClick={() => setProjectSubTab('gantt')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${projectSubTab === 'gantt' ? 'border-blue-600 text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Gantt Chart
            </button>
            <button
              onClick={() => setProjectSubTab('reports')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${projectSubTab === 'reports' ? 'border-blue-600 text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Reports
            </button>
            <button
              onClick={() => setProjectSubTab('business')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${projectSubTab === 'business' ? 'border-blue-600 text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Business Case List
            </button>
            <button
              onClick={() => setProjectSubTab('team')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${projectSubTab === 'team' ? 'border-blue-600 text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Project Team
            </button>
            <button
              onClick={() => setProjectSubTab('rm')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${projectSubTab === 'rm' ? 'border-blue-600 text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              RM list
            </button>
          </div>

          {projectSubTab === 'chart' ? (
            <ProjectDependencyChart projTasks={projTasks} />
          ) : projectSubTab === 'gantt' ? (
            <GanttChartTab projTasks={projTasks} proj={proj} users={users} allTaskDates={allTaskDates} />
          ) : projectSubTab === 'reports' ? (
            <ReportsTab projTasks={projTasks} proj={proj} users={users} allTaskDates={allTaskDates} />
          ) : projectSubTab === 'business' ? (
            <BusinessCaseTab proj={proj} updateProject={updateProject} />
          ) : projectSubTab === 'team' ? (
            <ProjectTeamTab projTasks={projTasks} users={users} />
          ) : projectSubTab === 'rm' ? (
            <RMListTab proj={proj} updateProject={updateProject} />
          ) : projTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm">
              <CheckSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium text-gray-500">No tasks delegated yet</p>
              <p className="text-sm mt-1">Use the "Assign New Task" button on the top right to delegate a task.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const chainMap = computeCriticalChain(projTasks);
                const groupedTasks: Record<string, any[]> = {};
                projTasks.forEach((t: any) => {
                  const parts = t.title.split(' — ');
                  const parentTitle = parts[0];
                  if (!groupedTasks[parentTitle]) {
                    groupedTasks[parentTitle] = [];
                  }
                  groupedTasks[parentTitle].push(t);
                });

                const sortedParentTitles = Object.keys(groupedTasks).sort((a, b) => {
                  const tA = groupedTasks[a][0];
                  const tB = groupedTasks[b][0];
                  const idA = typeof tA.id === 'string' ? parseInt(tA.id) || tA.id : tA.id;
                  const idB = typeof tB.id === 'string' ? parseInt(tB.id) || tB.id : tB.id;
                  if (typeof idA === 'number' && typeof idB === 'number') {
                    return idA - idB;
                  }
                  return String(idA).localeCompare(String(idB));
                });

                return sortedParentTitles.map((parentTitle: string) => {
                  const subtasksList = groupedTasks[parentTitle];
                  // Task Progress (based on all subtasks)
                  const totalDaysAll = subtasksList.reduce((sum: number, t: any) => sum + (t.assignedDays || 0), 0);
                  const taskProgress = (() => {
                    let totalElapsed = 0;
                    subtasksList.forEach((t: any) => {
                      if (t.startedAt) {
                        const start = new Date(t.startedAt);
                        const end = t.status === 'Completed' && t.completedAt ? new Date(t.completedAt) : new Date();
                        totalElapsed += getWorkingDaysElapsed(start, end);
                      }
                    });
                    if (totalDaysAll === 0) return 0;
                    return Math.min(100, Math.round((totalElapsed / totalDaysAll) * 100));
                  })();

                  // For trial status, use the first task in group's status to drive color
                  const trialTask = subtasksList[0];
                  const displayProgress = getTrialSimulatedProgress(trialTask, taskProgress);
                  const progressBarColor = getTaskTimeColor(trialTask);
                  const trialLabel = getTrialProgressLabel(trialTask);

                  return (
                    <Card key={parentTitle} className="p-6 hover:border-gray-300 transition-all space-y-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
                        <div className="flex-1">
                          {editingParentTitle === parentTitle && !readOnly ? (
                            <div className="flex items-center gap-2 mb-2">
                              <CheckSquare className="w-5 h-5 text-[#3b82f6]" />
                              <input
                                autoFocus
                                className="text-lg font-extrabold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 outline-none w-full max-w-sm"
                                value={parentTitleEditValue}
                                onChange={(e) => setParentTitleEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleParentTitleSave(parentTitle, subtasksList);
                                }}
                                onBlur={() => handleParentTitleSave(parentTitle, subtasksList)}
                              />
                            </div>
                          ) : (
                            <h4 className="font-extrabold text-gray-900 text-lg flex items-center gap-2 mb-2 group relative w-fit">
                              <CheckSquare className="w-5 h-5 text-[#3b82f6]" />
                              {parentTitle}
                              {!readOnly && (
                                <button
                                  onClick={() => {
                                    setEditingParentTitle(parentTitle);
                                    setParentTitleEditValue(parentTitle);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 transition-all rounded-full hover:bg-blue-50 ml-1"
                                  title="Edit Task Heading"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                </button>
                              )}
                            </h4>
                          )}
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-gray-500 w-36">Task Progress:</span>
                              <div className="flex-1 max-w-md bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${progressBarColor}`}
                                  style={{ width: `${displayProgress}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-600">{displayProgress}%</span>
                            </div>
                            {trialLabel && (
                              <span className="text-[10px] font-semibold text-gray-500 italic ml-36">{trialLabel}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-lg shrink-0">
                          <button
                            onClick={() => setSubtaskTabs(prev => ({ ...prev, [parentTitle]: 'list' }))}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-md transition-colors ${subtaskTabs[parentTitle] !== 'chart' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            List View
                          </button>
                          <button
                            onClick={() => setSubtaskTabs(prev => ({ ...prev, [parentTitle]: 'chart' }))}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-md transition-colors ${subtaskTabs[parentTitle] === 'chart' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            Dependencies
                          </button>
                        </div>
                      </div>

                      {subtaskTabs[parentTitle] === 'chart' ? (
                        <div className="mt-4 pt-2 overflow-x-auto">
                          <ProjectDependencyChart projTasks={subtasksList} />
                        </div>
                      ) : (
                        <div className="space-y-6 divide-y divide-gray-100">
                          {subtasksList.map((task: any) => {
                            const chainStatus = chainMap.get(task.id) || 'Feeding';
                            const parts = task.title.split(' — ');
                            const displayTitle = parts[1] || 'Main Task';
                            const assignees = users.filter((u: any) =>
                              Array.isArray(task.assignedTo)
                                ? task.assignedTo.includes(u.id)
                                : task.assignedTo === u.id
                            );

                            const taskColor = getTaskTimeColor(task);
                            const isTaskBehind = taskColor === 'bg-yellow-400' || taskColor === 'bg-red-500';

                            const isUnblocked = (() => {
                              if (task.status === 'Completed' || task.status === 'In Progress' || task.status === 'Delayed') return true;
                              if (!task.predecessors || task.predecessors.length === 0) return true;
                              return task.predecessors.every((predId: string) => {
                                const pred = projTasks.find((pt: any) => String(pt.id) === String(predId));
                                return !pred || pred.status === 'Completed';
                              });
                            })();

                            return (
                              <div key={task.id} className="pt-5 first:pt-0 flex flex-col md:flex-row gap-6 justify-between items-start w-full">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                                    <span className="font-bold text-gray-900 text-xs bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm">
                                      {displayTitle}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                        task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                          task.status === 'Delayed' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-500'
                                      }`}>
                                      {task.status === 'Completed' ? <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" /> : task.status === 'Delayed' ? <AlertCircle className="w-2.5 h-2.5 inline mr-1" /> : <Activity className="w-2.5 h-2.5 inline mr-1" />}
                                      {task.status}
                                    </span>
                                    {!isUnblocked && task.status !== 'Completed' && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                        Blocked
                                      </span>
                                    )}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${chainStatus === 'Critical'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      }`}>
                                      {chainStatus === 'Critical' ? 'Critical Chain' : 'Feeding Chain'}
                                    </span>

                                    {/* Subtasks badge */}
                                    {task.subtasks && task.subtasks.length > 0 && (
                                      <span className={`${(!readOnly && isTaskBehind && computeDynamicBufferPool(proj.id, projTasks) > 0) ? 'ml-auto' : 'ml-auto'} flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-[#3b82f6] border border-blue-100`}>
                                        {task.subtasks.length} Subtask{task.subtasks.length !== 1 ? 's' : ''}
                                      </span>
                                    )}

                                    {/* Allocate Buffer button */}
                                    {!readOnly && isTaskBehind && computeDynamicBufferPool(proj.id, projTasks) > 0 && (
                                      <button
                                        onClick={() => setBufferAllocateTask(task)}
                                        className={`${task.subtasks && task.subtasks.length > 0 ? 'ml-2' : 'ml-auto'} flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors border border-orange-200 shadow-sm`}
                                      >
                                        <ShieldAlert className="w-3 h-3" /> Allocate Buffer
                                      </button>
                                    )}
                                  </div>

                                  {task.specs && (
                                    <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed mb-3">
                                      {task.specs}
                                    </p>
                                  )}
                                  {task.prerequisitesChecklist && task.prerequisitesChecklist.length > 0 && (
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
                                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> Prerequisites
                                      </div>
                                      <div className="space-y-1.5">
                                        {task.prerequisitesChecklist.map((req: any, rIdx: number) => (
                                          <div key={req.id || rIdx} className="flex items-start gap-2">
                                            <div className={`mt-0.5 w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 border ${req.completed ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'
                                              }`}>
                                              {req.completed && <CheckSquare className="w-2.5 h-2.5 fill-current" />}
                                            </div>
                                            <span className={`text-[11px] leading-snug ${req.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                              {req.text}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {task.delayJustification && (
                                    <div className="text-xs font-bold text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 leading-relaxed mb-3 flex items-start gap-2">
                                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                      <div>
                                        <span className="uppercase text-[10px] tracking-wider opacity-70 block mb-0.5">Delay Justification</span>
                                        {task.delayJustification}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-4 mt-2">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <UserSquare2 className="w-3.5 h-3.5 text-gray-400" />
                                      <strong className="text-gray-700">
                                        {assignees.length > 0 ? assignees.map((a: any) => a.name).join(', ') : 'Unknown'}
                                      </strong>
                                      <span className="text-gray-300">•</span>
                                      <span>
                                        {assignees.length > 0
                                          ? assignees.map((a: any) => a.role === ROLES.DEPT_HEAD ? 'Department' : a.role).join(', ')
                                          : 'Unknown'}
                                      </span>
                                    </div>
                                    {allTaskDates[task.id] && (
                                      <div className="flex flex-col gap-1 text-xs text-gray-500">
                                        {!isBelowPM && (
                                          <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                            <span>Planned Start: <strong className="text-gray-700">{fmtDate(allTaskDates[task.id].plannedStart)}</strong></span>
                                            <span className="text-gray-300">•</span>
                                            <span>Planned End: <strong className="text-gray-700">{fmtDate(allTaskDates[task.id].plannedEnd)}</strong></span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                                          <span>Dynamic Start: <strong className="text-[#1e3a5f]">{fmtDate(allTaskDates[task.id].start)}</strong></span>
                                          <span className="text-gray-300">•</span>
                                          <span>Dynamic End: <strong className="text-[#1e3a5f]">{fmtDate(allTaskDates[task.id].end)}</strong></span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Dependencies UI */}
                                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-bold text-gray-500">Predecessors:</span>
                                      {task.predecessors && task.predecessors.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                          {task.predecessors.map((predId: string) => {
                                            const predNode = allProjectNodes.find(n => String(n.id) === String(predId));
                                            return (
                                              <span key={predId} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 shadow-sm">
                                                {predNode ? predNode.title : 'Deleted Node'}
                                                {!readOnly && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleRemovePredecessor(task, predId)}
                                                    className="text-red-400 hover:text-red-600 font-bold ml-1 text-xs"
                                                  >
                                                    ×
                                                  </button>
                                                )}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-400 italic">None</span>
                                      )}

                                      {!readOnly && allProjectNodes.filter(n => n.projectId === proj.id && String(n.id) !== String(task.id) && !(task.predecessors || []).map(String).includes(String(n.id))).length > 0 && (
                                        <select
                                          className="p-1 text-[10px] border border-gray-200 rounded bg-white text-gray-600 outline-none focus:ring-1 focus:ring-blue-500 ml-auto cursor-pointer max-w-[150px]"
                                          value=""
                                          onChange={e => {
                                            if (e.target.value) {
                                              handleAddPredecessor(task, e.target.value);
                                            }
                                          }}
                                        >
                                          <option value="">+ Add Predecessor</option>
                                          {allProjectNodes
                                            .filter(n => n.projectId === proj.id && String(n.id) !== String(task.id) && !(task.predecessors || []).map(String).includes(String(n.id)))
                                            .map((n: any) => (
                                              <option key={n.id} value={n.id}>{n.title}</option>
                                            ))
                                          }
                                        </select>
                                      )}
                                    </div>

                                    {(() => {
                                      const successors = allProjectNodes.filter(n => n.predecessors.includes(String(task.id)));
                                      const eligibleSuccessors = allProjectNodes.filter(n =>
                                        n.projectId === proj.id &&
                                        String(n.id) !== String(task.id) &&
                                        !n.predecessors.includes(String(task.id)) &&
                                        !(task.predecessors || []).map(String).includes(String(n.id))
                                      );

                                      return (
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-xs font-bold text-gray-500">Successors:</span>
                                          {successors.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                              {successors.map((succ: any) => (
                                                <span key={succ.id} className="inline-flex items-center gap-1 bg-blue-50 text-[#1e3a5f] text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100 shadow-sm">
                                                  {succ.title}
                                                  {!readOnly && (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleRemoveSuccessor(task, succ.id)}
                                                      className="text-red-400 hover:text-red-600 font-bold ml-1 text-xs"
                                                    >
                                                      ×
                                                    </button>
                                                  )}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-gray-400 italic">None</span>
                                          )}

                                          {!readOnly && eligibleSuccessors.length > 0 && (
                                            <select
                                              className="p-1 text-[10px] border border-gray-200 rounded bg-white text-gray-600 outline-none focus:ring-1 focus:ring-blue-500 ml-auto cursor-pointer max-w-[150px]"
                                              value=""
                                              onChange={e => {
                                                if (e.target.value) {
                                                  handleAddSuccessor(task, e.target.value);
                                                }
                                              }}
                                            >
                                              <option value="">+ Add Successor</option>
                                              {eligibleSuccessors.map((n: any) => (
                                                <option key={n.id} value={n.id}>{n.title}</option>
                                              ))}
                                            </select>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {!readOnly && <TrialRunSimulation task={task} updateTask={updateTask} />}

                                  {/* ── Read-only Daily Log (PM view) for tasks with NO subtasks ── */}
                                  {(!task.subtasks || task.subtasks.length === 0) && (() => {
                                    const logCount = task.assignedDays || task.finalTotalDays || 0;
                                    const logs: string[] = Array(logCount).fill('').map(
                                      (_: any, i: number) => (task.taskDailyLogs || [])[i] || ''
                                    );
                                    const logsCompleted: boolean[] = Array(logCount).fill(false).map(
                                      (_: any, i: number) => !!(task.taskDailyLogsCompleted || [])[i]
                                    );
                                    const doneDays = logsCompleted.filter(Boolean).length;
                                    if (logCount === 0) return null;
                                    const isExpanded = expandedTaskLogId === task.id.toString();

                                    return (
                                      <div className="mt-4 pt-3 border-t border-gray-100">
                                        <button
                                          onClick={() => setExpandedTaskLogId(isExpanded ? null : task.id.toString())}
                                          className="w-full flex flex-col gap-2 hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors cursor-pointer text-left group"
                                        >
                                          <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform group-hover:text-blue-500 ${isExpanded ? 'rotate-180' : ''}`} />
                                              <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> Action Points & Daily Logs
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-bold bg-blue-50 text-[#1e3a5f] px-2 py-0.5 rounded-full border border-blue-100">
                                              {doneDays} / {logCount} days ticked
                                            </span>
                                          </div>
                                          {/* mini progress bar */}
                                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                              className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                              style={{ width: `${logCount > 0 ? Math.round((doneDays / logCount) * 100) : 0}%` }}
                                            />
                                          </div>
                                        </button>

                                        {isExpanded && (
                                          <div className="space-y-4 mt-3 pl-2 border-l-2 border-gray-100 ml-1">
                                            {/* Action Points */}
                                            <div>
                                              <h4 className="font-bold text-xs text-gray-700 flex items-center gap-1.5 mb-2">
                                                <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> Action Points
                                              </h4>
                                              {!task.actionPoints || task.actionPoints.length === 0 ? (
                                                <p className="text-[10px] text-gray-400 italic">No action points provided.</p>
                                              ) : (
                                                <div className="space-y-1.5">
                                                  {task.actionPoints.map((ap: any, apIdx: number) => (
                                                    <div key={apIdx} className="flex items-start gap-2 bg-white rounded p-2 border border-gray-200">
                                                      <input type="checkbox" checked={ap.done || false} readOnly className="mt-0.5 w-3 h-3 text-[#3b82f6] rounded border-gray-300" />
                                                      <span className={`text-[10px] ${ap.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{ap.text || 'Empty action point'}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>

                                            {/* Daily Logs */}
                                            <div>
                                              <h4 className="font-bold text-xs text-gray-700 flex items-center gap-1.5 mb-2">
                                                <Activity className="w-3.5 h-3.5 text-blue-400" /> Daily Logs
                                              </h4>
                                              <div className="space-y-2">
                                                {Array.from({ length: logCount }).map((_, dayIdx) => {
                                                  const isDone = logsCompleted[dayIdx];
                                                  const entry = logs[dayIdx];
                                                  return (
                                                    <div
                                                      key={dayIdx}
                                                      className={`flex items-start gap-3 p-3 rounded-xl border ${isDone ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-200'
                                                        }`}
                                                    >
                                                      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${isDone
                                                          ? 'bg-emerald-500 border-emerald-500 text-white'
                                                          : 'bg-white border-gray-300 text-gray-400'
                                                        }`}>
                                                        {isDone ? '✓' : dayIdx + 1}
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isDone ? 'text-emerald-600' : 'text-gray-400'
                                                            }`}>Day {dayIdx + 1}</span>
                                                          {isDone && <span className="text-[10px] font-bold text-emerald-500">Completed</span>}
                                                        </div>
                                                        {entry ? (
                                                          <p className={`text-xs leading-relaxed ${isDone ? 'text-gray-500' : 'text-gray-700'
                                                            }`}>{entry}</p>
                                                        ) : (
                                                          <p className="text-[10px] italic text-gray-300">No entry written yet</p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* ── Read-only Subtasks (PM view) ── */}
                                  {task.subtasks && task.subtasks.length > 0 && (() => {
                                    let currentDynamicStart = allTaskDates[task.id]?.start || new Date();
                                    let currentPlannedStart = allTaskDates[task.id]?.plannedStart || new Date();

                                    return (
                                      <div className="mt-4 space-y-6 ml-6 border-l-2 border-blue-100 pl-4 w-full">
                                        {task.subtasks.map((st: any) => {
                                          const stDays = st.days || 1;
                                          const stStart = currentDynamicStart;
                                          const stEnd = addWorkingDays(stStart, stDays);
                                          currentDynamicStart = stEnd;

                                          const plannedStart = currentPlannedStart;
                                          const plannedEnd = addWorkingDays(plannedStart, stDays);
                                          currentPlannedStart = plannedEnd;

                                          const stCompleted = st.completed;
                                          const stStatus = stCompleted ? 'Completed' : (st.startedAt ? 'In Progress' : 'Pending Start');
                                          
                                          const isUnblocked = (() => {
                                            if (stCompleted) return true;
                                            if (!st.predecessors || st.predecessors.length === 0) return true;
                                            return st.predecessors.every((predId: string) => {
                                              const pred = task.subtasks.find((s: any) => String(s.id) === String(predId));
                                              return !pred || pred.completed;
                                            });
                                          })();


                                          // isExpandedSubtask
                                          const isExpandedSubtask = expandedSubtaskId === st.id.toString();

                                          // Duration Split metrics
                                          const stAssignedDays = Number(st.days) || 1;

                                          const stChainStatus = chainMap.get(String(st.id));

                                          // subtask status badges colors
                                          const stStatusBg = stStatus === 'Completed' ? 'bg-blue-50 text-[#1e3a5f]' :
                                            stStatus === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                              'bg-gray-100 text-gray-500';

                                          return (
                                            <div key={st.id} className="pt-4 border-t border-gray-100 first:border-0 w-full">
                                              <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                                                    <span className="font-bold text-gray-900 text-xs bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm">
                                                      {st.title || 'Untitled Subtask'}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stStatusBg}`}>
                                                       <Activity className="w-2.5 h-2.5 inline mr-1" />{stStatus}
                                                     </span>
                                                     {!isUnblocked && !stCompleted && (
                                                       <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                         Blocked
                                                       </span>
                                                     )}
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 shadow-sm">
                                                      Subtask
                                                    </span>
                                                    {stChainStatus && (
                                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border ${stChainStatus === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                        {stChainStatus} Chain
                                                      </span>
                                                    )}
                                                  </div>



                                                  <div className="flex flex-wrap gap-4 mt-2 mb-2">
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                      <UserSquare2 className="w-3.5 h-3.5 text-gray-400" />
                                                      <strong className="text-gray-700">
                                                        {assignees.length > 0 ? assignees.map((a: any) => a.name).join(', ') : 'Unknown'}
                                                      </strong>
                                                    </div>
                                                    <div className="flex flex-col gap-1 text-xs text-gray-500">
                                                      <div className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>Planned Start: <strong className="text-gray-700">{fmtDate(plannedStart)}</strong></span>
                                                        <span className="text-gray-300">•</span>
                                                        <span>Planned End: <strong className="text-gray-700">{fmtDate(plannedEnd)}</strong></span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                                                        <span>Dynamic Start: <strong className="text-[#1e3a5f]">{fmtDate(stStart)}</strong></span>
                                                        <span className="text-gray-300">•</span>
                                                        <span>Dynamic End: <strong className="text-[#1e3a5f]">{fmtDate(stEnd)}</strong></span>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Subtask Dependencies UI */}
                                                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <span className="text-[10px] font-bold text-gray-500 uppercase">Predecessors:</span>
                                                      {st.predecessors && st.predecessors.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                          {st.predecessors.map((predId: string) => {
                                                            const predNode = allProjectNodes.find(n => String(n.id) === String(predId));
                                                            return (
                                                              <span key={predId} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 shadow-sm">
                                                                {predNode ? predNode.title : 'Deleted Node'}
                                                                {!readOnly && (
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveSubtaskPredecessor(st.id, predId)}
                                                                    className="text-red-400 hover:text-red-600 font-bold ml-1 text-[10px]"
                                                                  >
                                                                    ×
                                                                  </button>
                                                                )}
                                                              </span>
                                                            );
                                                          })}
                                                        </div>
                                                      ) : (
                                                        <span className="text-[10px] text-gray-400 italic">None</span>
                                                      )}

                                                      {!readOnly && allProjectNodes.filter(n => n.projectId === proj.id && String(n.id) !== String(st.id) && !(st.predecessors || []).map(String).includes(String(n.id))).length > 0 && (
                                                        <select
                                                          className="p-1 text-[10px] border border-gray-200 rounded bg-white text-gray-600 outline-none focus:ring-1 focus:ring-blue-500 ml-auto cursor-pointer max-w-[120px]"
                                                          value=""
                                                          onChange={e => {
                                                            if (e.target.value) handleAddSubtaskPredecessor(st.id, e.target.value);
                                                          }}
                                                        >
                                                          <option value="">+ Add</option>
                                                          {allProjectNodes
                                                            .filter(n => n.projectId === proj.id && String(n.id) !== String(st.id) && !(st.predecessors || []).map(String).includes(String(n.id)))
                                                            .map((n: any) => <option key={n.id} value={n.id}>{n.title}</option>)
                                                          }
                                                        </select>
                                                      )}
                                                    </div>

                                                    {(() => {
                                                      const successors = allProjectNodes.filter(n => n.predecessors.includes(String(st.id)));
                                                      const eligibleSuccessors = allProjectNodes.filter(n =>
                                                        n.projectId === proj.id && String(n.id) !== String(st.id) &&
                                                        !n.predecessors.includes(String(st.id)) &&
                                                        !(st.predecessors || []).map(String).includes(String(n.id))
                                                      );

                                                      return (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                          <span className="text-[10px] font-bold text-gray-500 uppercase">Successors:</span>
                                                          {successors.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5">
                                                              {successors.map((succ: any) => (
                                                                <span key={succ.id} className="inline-flex items-center gap-1 bg-blue-50 text-[#1e3a5f] text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100 shadow-sm">
                                                                  {succ.title}
                                                                  {!readOnly && (
                                                                    <button
                                                                      type="button"
                                                                      onClick={() => handleRemoveSubtaskSuccessor(st.id, succ.id)}
                                                                      className="text-red-400 hover:text-red-600 font-bold ml-1 text-[10px]"
                                                                    >
                                                                      ×
                                                                    </button>
                                                                  )}
                                                                </span>
                                                              ))}
                                                            </div>
                                                          ) : (
                                                            <span className="text-[10px] text-gray-400 italic">None</span>
                                                          )}

                                                          {!readOnly && eligibleSuccessors.length > 0 && (
                                                            <select
                                                              className="p-1 text-[10px] border border-gray-200 rounded bg-white text-gray-600 outline-none focus:ring-1 focus:ring-blue-500 ml-auto cursor-pointer max-w-[120px]"
                                                              value=""
                                                              onChange={e => {
                                                                if (e.target.value) handleAddSubtaskSuccessor(st.id, e.target.value);
                                                              }}
                                                            >
                                                              <option value="">+ Add</option>
                                                              {eligibleSuccessors.map((n: any) => <option key={n.id} value={n.id}>{n.title}</option>)}
                                                            </select>
                                                          )}
                                                        </div>
                                                      );
                                                    })()}
                                                  </div>
                                                </div>

                                                {/* Right side panel - Duration Split & Arrow Toggle */}
                                                <div className="flex items-center gap-4 shrink-0 w-full md:w-auto">
                                                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 shadow-sm w-full sm:w-52 space-y-3 shrink-0">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                      Duration
                                                    </div>
                                                    <div className="space-y-1.5 text-xs text-gray-600">
                                                      <div className="flex justify-between items-center font-bold">
                                                        <span>Assigned Days:</span>
                                                        {!readOnly ? (
                                                          <div className="flex items-center gap-1.5">
                                                            <SubtaskDaysInput
                                                              initialDays={st.days}
                                                              onSave={(newDays) => {
                                                                const updatedSubtasks = task.subtasks.map((subSt: any) => {
                                                                  if (subSt.id === st.id) {
                                                                    return { ...subSt, days: newDays };
                                                                  }
                                                                  return subSt;
                                                                });

                                                                let parentAssignedDays = 0;
                                                                let parentFinalTotalDays = 0;
                                                                let parentPlannedBufferDays = 0;

                                                                updatedSubtasks.forEach((subSt: any) => {
                                                                  const subDays = parseFloat(subSt.days) || 0;
                                                                  parentAssignedDays += subDays;

                                                                  let subTotal = subDays;
                                                                  let subBuffer = 0;
                                                                  if (subDays > 3) {
                                                                    subTotal = Math.ceil(subDays / 0.7);
                                                                    subBuffer = subTotal - subDays;
                                                                  }
                                                                  parentFinalTotalDays += subTotal;
                                                                  parentPlannedBufferDays += subBuffer;
                                                                });

                                                                updateTask(task.id, {
                                                                  subtasks: updatedSubtasks,
                                                                  assignedDays: parentAssignedDays,
                                                                  finalTotalDays: parentFinalTotalDays,
                                                                  plannedBufferDays: parentPlannedBufferDays
                                                                });
                                                              }}
                                                            />
                                                            <span>Days</span>
                                                          </div>
                                                        ) : (
                                                          <span className="text-green-600">{stAssignedDays} Days</span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <button
                                                    onClick={() => setExpandedSubtaskId(isExpandedSubtask ? null : st.id.toString())}
                                                    className="p-2 text-gray-400 hover:text-[#3b82f6] hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 self-center flex items-center justify-center"
                                                    title="Toggle Action Points & Daily Logs"
                                                  >
                                                    <ChevronDown className={`w-5 h-5 transition-transform ${isExpandedSubtask ? 'rotate-180' : ''}`} />
                                                  </button>
                                                </div>
                                              </div>

                                              {isExpandedSubtask && (
                                                <div className="mt-4 bg-gray-50/50 border border-gray-200 rounded-xl p-4 space-y-4 w-full">
                                                  {/* Action Points */}
                                                  <div>
                                                    <h4 className="font-bold text-xs text-gray-700 flex items-center gap-1.5 mb-2">
                                                      <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> Action Points
                                                    </h4>
                                                    {!st.actionPoints || st.actionPoints.length === 0 ? (
                                                      <p className="text-[10px] text-gray-400 italic">No action points provided.</p>
                                                    ) : (
                                                      <div className="space-y-1.5">
                                                        {st.actionPoints.map((ap: any, apIdx: number) => (
                                                          <div key={apIdx} className="flex items-start gap-2 bg-white rounded p-2 border border-gray-200">
                                                            <input type="checkbox" checked={ap.done || false} readOnly className="mt-0.5 w-3 h-3 text-[#3b82f6] rounded border-gray-300" />
                                                            <span className={`text-[10px] ${ap.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{ap.text || 'Empty action point'}</span>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* Daily Log */}
                                                  <div>
                                                    <h4 className="font-bold text-xs text-gray-700 flex items-center gap-1.5 mb-2">
                                                      <Activity className="w-3.5 h-3.5 text-blue-400" /> Day-to-Day Reasoning
                                                    </h4>
                                                    {(() => {
                                                      const assignedDaysForLog = Number(st.days) || 1;
                                                      const logs = st.dailyLogs || [];
                                                      if (logs.length === 0 && !logs.some((l: string) => l)) {
                                                        return <p className="text-[10px] text-gray-400 italic">No daily logs recorded yet.</p>;
                                                      }
                                                      return (
                                                        <div className="space-y-1.5">
                                                          {Array.from({ length: assignedDaysForLog }).map((_, dayIdx) => {
                                                            const isCompleted = st.dailyLogsCompleted?.[dayIdx];
                                                            return (
                                                              <div key={dayIdx} className="flex items-start gap-2">
                                                                <button
                                                                  onClick={() => {
                                                                    if (readOnly) return;
                                                                    const newCompleted = st.dailyLogsCompleted ? [...st.dailyLogsCompleted] : [];
                                                                    newCompleted[dayIdx] = !newCompleted[dayIdx];
                                                                    const newSubtasks = task.subtasks.map((s: any) =>
                                                                      s.id === st.id ? { ...s, dailyLogsCompleted: newCompleted } : s
                                                                    );
                                                                    updateTask(task.id, { subtasks: newSubtasks });
                                                                  }}
                                                                  disabled={readOnly}
                                                                  className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] shrink-0 transition-colors ${readOnly ? '' : 'cursor-pointer hover:opacity-80 shadow-sm'} ${isCompleted ? 'bg-green-500 text-white border border-green-600' : 'bg-blue-50 text-[#1e3a5f] border border-blue-200'}`}
                                                                  title={isCompleted ? "Mark as incomplete" : "Mark as completed"}
                                                                >
                                                                  D{dayIdx + 1}
                                                                </button>
                                                                <div className={`flex-1 bg-white border rounded p-1.5 text-[10px] min-h-[28px] transition-colors ${isCompleted ? 'border-green-200 bg-green-50/30 text-gray-700' : 'border-gray-200 text-gray-600'}`}>
                                                                  {logs[dayIdx] || <span className="italic text-gray-300">No update</span>}
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      );
                                                    })()}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Right panel: duration editor */}
                                <div className="flex-shrink-0 sm:min-w-[190px] w-full sm:w-auto">
                                  <TaskDurationEditor task={task} updateTask={updateTask} readOnly={readOnly} projects={projects} updateProject={updateProject} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                });
              })()}

              {/* Allocate Buffer Modal */}
              {bufferAllocateTask && proj && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-orange-50">
                      <h3 className="font-bold text-lg text-orange-800 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" />
                        Allocate Buffer
                      </h3>
                      <button onClick={() => { setBufferAllocateTask(null); setBufferDaysInput(''); }} className="text-orange-500 hover:text-orange-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-gray-600 mb-4">
                        The task <strong>{bufferAllocateTask.title}</strong> is falling behind schedule. You can allocate buffer days from the Project Pool to extend its deadline safely.
                      </p>

                      <div className="flex items-center gap-6 mb-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Budget</span>
                          <span className="text-sm font-black text-gray-700">₹{proj.budget?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">Buffer Pool</span>
                          <span className="text-sm font-black text-[#1e3a5f]">{computeDynamicBufferPool(proj.id, tasks)} days</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Days to Allocate</label>
                        <input
                          type="number"
                          min="1"
                          max={computeDynamicBufferPool(proj.id, tasks)}
                          value={bufferDaysInput}
                          onChange={e => setBufferDaysInput(e.target.value)}
                          placeholder={`Max ${computeDynamicBufferPool(proj.id, tasks)} days`}
                          className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                    <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                      <button
                        onClick={() => { setBufferAllocateTask(null); setBufferDaysInput(''); }}
                        className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const days = parseInt(bufferDaysInput) || 0;
                          if (days <= 0 || days > computeDynamicBufferPool(proj.id, tasks)) {
                            alert('Invalid buffer days');
                            return;
                          }

                          // We don't deduct from proj.bufferPool because it's dynamically calculated.
                          // We just extend the task's deadline by adding to its bufferDays and finalTotalDays.

                          // Add to task bufferDays
                          updateTask(bufferAllocateTask.id, {
                            bufferAllocated: true,
                            bufferDays: (bufferAllocateTask.bufferDays || 0) + days,
                            finalTotalDays: (bufferAllocateTask.finalTotalDays || 0) + days
                          });

                          setBufferAllocateTask(null);
                          setBufferDaysInput('');
                        }}
                        disabled={!bufferDaysInput || parseInt(bufferDaysInput) > computeDynamicBufferPool(proj.id, tasks)}
                        className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Allocate Buffer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PROJECT LIST VIEW ─────────────────────────────────────────────────────


  const totalBufferManaged = myProjects.reduce((acc: number, p: any) => acc + computeDynamicBufferPool(p.id, tasks), 0);
  const totalTasks = tasks.filter((t: any) => myProjects.some((p: any) => p.id === t.projectId)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">My Projects</h2>
        <p className="text-sm text-gray-500 mt-1">Manage delegated tasks and monitor buffer pools across your assigned projects</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Projects Assigned" value={myProjects.length} icon={FolderKanban} colorClass="bg-blue-100 text-blue-600" />
        <StatCard title="Total Tasks" value={totalTasks} icon={CheckSquare} colorClass="bg-gray-100 text-gray-600" />
        <StatCard title="Total Buffer Saved" value={`${totalBufferManaged}d`} icon={ShieldAlert} colorClass="bg-blue-50 text-[#3b82f6]" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Search projects..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Project cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-2 border-dashed border-gray-200 bg-gray-50/50">
          <FolderKanban className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-medium text-gray-500">No projects assigned to you yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((proj: any) => {
            const projTasks = tasks.filter((t: any) => t.projectId === proj.id);
            const pCfg = PROJECT_STATUS_CONFIG[proj.status] || PROJECT_STATUS_CONFIG['Planning'];
            const PIcon = pCfg.icon;

            return (
              <div
                key={proj.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-200 group bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-300 overflow-hidden"
                onClick={() => setSelectedProjectId(proj.id)}
              >
                {/* Status stripe */}
                <div className={`px-5 py-2.5 ${pCfg.bg} ${pCfg.border} border-b flex items-center justify-between`}>
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${pCfg.color}`}>
                    <PIcon className="w-3.5 h-3.5" /> {proj.status}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#1e3a5f] transition-colors mb-1">{proj.name}</h3>
                  {proj.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{proj.description}</p>}

                  {/* Progress removed */}

                  <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Deadline: <strong className="text-gray-700">{proj.deadline || 'Not set'}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-3.5 h-3.5 text-gray-400" />
                      <span>{projTasks.length} tasks delegated</span>
                    </div>
                    {(proj.clientId || proj.clientName) && (
                      <div className="flex items-center gap-2">
                        <UserSquare2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>Client: <strong className="text-gray-700">{proj.clientName || (proj.clientId ? users.find((u: any) => u.id === proj.clientId)?.name : 'Client')}</strong></span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[#3b82f6] font-bold">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Buffer pool: {computeDynamicBufferPool(proj.id, tasks)} days
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-4">
                  <button
                    onClick={() => setSelectedProjectId(proj.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold text-xs transition-all shadow-sm"
                  >
                    {readOnly ? 'View Details' : 'Manage Tasks & Estimates'} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const BusinessCaseTab = ({ proj, updateProject }: { proj: any, updateProject: any }) => {
  const defaultColumns = [
    "Name of the Product", "CAS No", "Project Code", "Client Name",
    "Applicable Industry", "Projected Quantity",
    "Target Price", "Timeline Available", "No of Routes Available",
    "Patent Available (Y/N)", "Patent to be Filed (Y/N)",
    "Final Selected Route", "Timeline for Selected Route"
  ];
  const [data, setData] = useState<any[]>(proj.businessCase?.length ? proj.businessCase : [Object.fromEntries(defaultColumns.map(c => [c, '']))]);

  const updateCell = (rowIndex: number, colName: string, val: string) => {
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [colName]: val };
    setData(newData);
  };

  const addProductColumn = () => {
    const newEntry = Object.fromEntries(cols.map(c => [c, '']));
    setData([...data, newEntry]);
  };

  const removeProductColumn = (index: number) => {
    if (!confirm(`Are you sure you want to delete Product ${index + 1}?`)) return;
    setData(data.filter((_, i) => i !== index));
  };

  const addFieldRow = () => {
    const fieldName = prompt("Enter new field/attribute name:");
    if (!fieldName) return;
    const trimmed = fieldName.trim();
    if (!trimmed) return;
    if (cols.includes(trimmed)) {
      alert("This field already exists!");
      return;
    }
    setData(data.map(row => ({ ...row, [trimmed]: '' })));
  };

  const removeFieldRow = (colName: string) => {
    if (!confirm(`Are you sure you want to delete the field "${colName}"?`)) return;
    setData(data.map(row => {
      const copy = { ...row };
      delete copy[colName];
      return copy;
    }));
  };

  const save = () => {
    updateProject(proj.id, { businessCase: data });
    alert("Saved Business Case successfully!");
  };

  if (data.length === 0) return null;
  const cols = Object.keys(data[0] || {});

  return (
    <Card className="p-6 bg-white overflow-hidden flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-lg text-gray-900">Business Case Details</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={addFieldRow}
            className="bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 transition-colors"
          >
            Add Row (Field)
          </button>
          <button
            onClick={addProductColumn}
            className="bg-blue-50 hover:bg-blue-50 text-[#1e3a5f] px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 transition-colors"
          >
            Add Column (Product)
          </button>
          <button
            onClick={save}
            className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
            <tr>
              <th className="p-3 border-r border-gray-200 bg-gray-100/50 w-64 min-w-[200px]">Field / Attribute</th>
              {data.map((_, i) => (
                <th key={i} className="p-3 border-r border-gray-200 last:border-0 min-w-[180px]">
                  <div className="flex items-center justify-between gap-2">
                    <span>Product {i + 1}</span>
                    {data.length > 1 && (
                      <button
                        onClick={() => removeProductColumn(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((colName) => (
              <tr key={colName} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/30 transition-colors">
                <td className="p-3 font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 w-64 min-w-[200px]">
                  <div className="flex items-center justify-between gap-2 group">
                    <span className="truncate" title={colName}>{colName}</span>
                    {!defaultColumns.includes(colName) && (
                      <button
                        onClick={() => removeFieldRow(colName)}
                        className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded"
                        title="Delete Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
                {data.map((row, rowIndex) => (
                  <td key={rowIndex} className="p-1 border-r border-gray-100 last:border-0 min-w-[180px]">
                    <input
                      className="w-full p-2 outline-none focus:bg-blue-50/50 hover:bg-gray-50 transition-colors bg-transparent"
                      value={row[colName] || ''}
                      onChange={e => updateCell(rowIndex, colName, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const ProjectTeamTab = ({ projTasks, users }: { projTasks: any[], users: any[] }) => {
  const assigneeIds = [...new Set(projTasks.flatMap(t => Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : [])))];
  const members = assigneeIds.map(id => users.find(u => u.id === id)).filter(Boolean);

  return (
    <Card className="p-6">
      <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-[#3b82f6]" /> Project Team</h3>
      {members.length === 0 ? (
        <div className="text-center p-8 text-gray-500 border border-dashed border-gray-200 rounded-xl">No team members assigned to tasks yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => {
            const manager = users.find(u => u.id === m.managerId);
            return (
              <div key={m.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors bg-white shadow-sm">
                <div className="p-3 bg-blue-50 text-[#3b82f6] rounded-xl"><UserSquare2 className="w-6 h-6" /></div>
                <div className="flex-grow min-w-0">
                  <div className="font-bold text-gray-900 truncate">{m.name}</div>
                  <div className="text-xs font-bold text-[#3b82f6] uppercase mt-0.5">{m.role}</div>
                </div>
                <div className="text-right border-l border-gray-100 pl-4">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Reports To</div>
                  <div className="text-sm font-semibold text-gray-700 truncate">{manager ? manager.name : 'N/A'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const ProjectDependencyChart = ({ projTasks }: { projTasks: any[] }) => {
  // Compute predecessor depths to establish columns
  const taskDepths: Record<string, number> = {};
  const getDepth = (taskId: string, visited: Set<string> = new Set()): number => {
    if (taskDepths[taskId] !== undefined) return taskDepths[taskId];
    if (visited.has(taskId)) return 0;
    visited.add(taskId);

    const task = projTasks.find(t => t.id === taskId);
    if (!task || !task.predecessors || task.predecessors.length === 0) {
      taskDepths[taskId] = 0;
      return 0;
    }

    const depths = task.predecessors.map((pId: string) => getDepth(pId, visited));
    const maxDepth = Math.max(...depths) + 1;
    taskDepths[taskId] = maxDepth;
    return maxDepth;
  };

  projTasks.forEach(t => getDepth(t.id));

  // Compute critical chain to isolate parallel tracks
  const chainMap = useMemo(() => computeCriticalChain(projTasks), [projTasks]);

  // Columns layout
  const columns: Record<number, any[]> = {};
  projTasks.forEach(t => {
    const depth = taskDepths[t.id] || 0;
    if (!columns[depth]) columns[depth] = [];
    columns[depth].push(t);
  });

  const colWidth = 260;
  const rowHeight = 110;
  const paddingX = 40;
  const paddingY = 40;

  // Compute node coordinates
  const nodes: Record<string, { x: number; y: number; task: any }> = {};
  const depthKeys = Object.keys(columns).map(Number).sort((a, b) => a - b);

  depthKeys.forEach((depth) => {
    const colTasks = columns[depth];

    // Sort tasks so Critical chain tasks are placed at the top (Row 0)
    // and Feeding chain tasks (or extra tasks) follow in subsequent parallel rows
    const sortedColTasks = [...colTasks].sort((a, b) => {
      const aIsCritical = chainMap.get(String(a.id)) === 'Critical';
      const bIsCritical = chainMap.get(String(b.id)) === 'Critical';
      if (aIsCritical && !bIsCritical) return -1;
      if (!aIsCritical && bIsCritical) return 1;
      return 0;
    });

    sortedColTasks.forEach((task, rowIdx) => {
      nodes[task.id] = {
        x: depth * colWidth + paddingX,
        y: rowIdx * rowHeight + paddingY,
        task
      };
    });
  });

  // Calculate width and height of canvas
  const canvasWidth = Math.max(depthKeys.length * colWidth + paddingX * 2, 800);
  const maxRows = Math.max(...Object.values(columns).map(c => c.length), 1);
  const canvasHeight = maxRows * rowHeight + paddingY * 2;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm overflow-auto">
      <div className="mb-4">
        <h4 className="font-bold text-gray-900 text-base">Task Dependency Flow</h4>
        <p className="text-xs text-gray-500 mt-1">Visual graph showing predecessor and successor task dependencies (left-to-right flow).</p>
      </div>

      {projTasks.length === 0 ? (
        <div className="py-12 text-center text-gray-400">No tasks delegated to display dependency chart.</div>
      ) : (
        <div className="relative border border-gray-100 rounded-xl bg-gray-50/50 p-4" style={{ minWidth: `${canvasWidth}px` }}>
          <svg className="absolute inset-0 pointer-events-none" width={canvasWidth} height={canvasHeight}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
              </marker>
            </defs>

            {/* Draw connection lines */}
            {projTasks.map((task) => {
              const toNode = nodes[task.id];
              if (!task.predecessors || !toNode) return null;

              return task.predecessors.map((predId: string) => {
                const fromNode = nodes[predId];
                if (!fromNode) return null;

                // Connection points
                const startX = fromNode.x + 200; // Node card width is 200
                const startY = fromNode.y + 35;  // Node card middle height
                const endX = toNode.x;
                const endY = toNode.y + 35;

                // Bezier curve
                const controlX = startX + (endX - startX) / 2;

                return (
                  <path
                    key={`${predId}-${task.id}`}
                    d={`M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                    className="opacity-70 hover:opacity-100 hover:stroke-blue-600 transition-colors"
                  />
                );
              });
            })}
          </svg>

          {/* Draw Task Node Cards */}
          <div style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, position: 'relative' }}>
            {Object.keys(nodes).map((taskId) => {
              const node = nodes[taskId];
              const task = (node as { x: number; y: number; task: any }).task;

              const isCritical = chainMap.get(String(task.id)) === 'Critical';
              const cardBgColor = isCritical
                ? 'bg-red-100 border-red-300 text-red-900'
                : 'bg-emerald-100 border-emerald-300 text-emerald-900';

              const isCompleted = task.status === 'Completed';
              const isInProgress = task.status === 'In Progress';
              const isApproved = task.status === TASK_STATUS.PENDING_START;

              let daysTakenText = null;
              if (isCompleted && task.startedAt && task.completedAt) {
                const start = new Date(task.startedAt);
                const end = new Date(task.completedAt);
                const daysTaken = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                daysTakenText = `${daysTaken}d taken`;
              }

              return (
                <div
                  key={taskId}
                  className={`absolute border hover:opacity-90 rounded-xl p-3 shadow-sm hover:shadow-sm hover:shadow-md transition-shadow transition-all flex flex-col justify-between ${cardBgColor}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: '200px',
                    height: '75px',
                    zIndex: 10
                  }}
                >
                  <div className="truncate font-bold text-xs opacity-90" title={task.title}>
                    {task.title}
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase bg-white/60 shadow-sm border border-black/5">
                      {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : isApproved ? 'Target' : 'Pending'}
                    </span>
                    {isCompleted && daysTakenText ? (
                      <span className="text-[10px] font-black bg-white/60 text-emerald-800 px-1.5 py-0.5 rounded shadow-sm border border-black/5">
                        {daysTakenText}
                      </span>
                    ) : task.assignedDays ? (
                      <span className="text-[10px] font-black bg-white/60 px-1.5 py-0.5 rounded shadow-sm border border-black/5">
                        {task.assignedDays}d
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const RMListTab = ({ proj, updateProject }: { proj: any, updateProject: any }) => {
  const [stages, setStages] = useState<any[]>(() => {
    if (proj.rmStages && proj.rmStages.length > 0) return proj.rmStages;
    if (proj.rmList && proj.rmList.length > 0) return [{ id: 'stage-1', name: 'Stage 1', items: proj.rmList }];
    return [{ id: 'stage-1', name: 'Stage 1', items: [{ name: '', casNumber: '', remarks: '' }] }];
  });

  const updateStageName = (stageId: string, newName: string) => {
    setStages(stages.map(s => s.id === stageId ? { ...s, name: newName } : s));
  };

  const addStage = () => {
    const newStage = {
      id: `stage-${Date.now()}`,
      name: `Stage ${stages.length + 1}`,
      items: [{ name: '', casNumber: '', remarks: '' }]
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (stageId: string) => {
    if (!confirm("Are you sure you want to delete this entire stage and all its materials?")) return;
    const newStages = stages.filter(s => s.id !== stageId);
    setStages(newStages.length ? newStages : [{ id: `stage-${Date.now()}`, name: 'Stage 1', items: [{ name: '', casNumber: '', remarks: '' }] }]);
  };

  const updateCell = (stageId: string, rowIndex: number, colName: string, val: string) => {
    setStages(stages.map(s => {
      if (s.id === stageId) {
        const newItems = [...s.items];
        newItems[rowIndex] = { ...newItems[rowIndex], [colName]: val };
        return { ...s, items: newItems };
      }
      return s;
    }));
  };

  const addRow = (stageId: string) => {
    setStages(stages.map(s => {
      if (s.id === stageId) {
        return { ...s, items: [...s.items, { name: '', casNumber: '', remarks: '' }] };
      }
      return s;
    }));
  };

  const removeRow = (stageId: string, index: number) => {
    if (!confirm(`Are you sure you want to delete this item?`)) return;
    setStages(stages.map(s => {
      if (s.id === stageId) {
        const newItems = s.items.filter((_: any, i: number) => i !== index);
        return { ...s, items: newItems.length ? newItems : [{ name: '', casNumber: '', remarks: '' }] };
      }
      return s;
    }));
  };

  const save = () => {
    updateProject(proj.id, { rmStages: stages });
    alert("Saved Raw Material stages successfully!");
  };

  return (
    <Card className="p-6 bg-white overflow-hidden flex flex-col space-y-6 shadow-sm border border-gray-100 rounded-2xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-[#3b82f6]" /> Raw Material Stages
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={addStage}
            className="bg-blue-50 hover:bg-blue-100 text-[#1e3a5f] px-3.5 py-1.5 rounded-lg text-xs font-bold border border-blue-200 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Stage
          </button>
          <button
            onClick={save}
            className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-shadow shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {stages.map((stage, stageIndex) => (
          <div key={stage.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center">
                  {stageIndex + 1}
                </span>
                <input
                  type="text"
                  value={stage.name}
                  onChange={(e) => updateStageName(stage.id, e.target.value)}
                  className="font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 flex-1 max-w-sm"
                  placeholder="Stage Name..."
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addRow(stage.id)}
                  className="text-[#1e3a5f] bg-white border border-gray-200 hover:bg-gray-100 px-3 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Item
                </button>
                <button
                  onClick={() => removeStage(stage.id)}
                  className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                  title="Delete Stage"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-3 border-r border-gray-100 w-12 text-center">#</th>
                    <th className="p-3 border-r border-gray-100 min-w-[200px]">Material Name</th>
                    <th className="p-3 border-r border-gray-100 min-w-[150px]">CAS Number</th>
                    <th className="p-3 border-r border-gray-100 min-w-[250px]">Remarks</th>
                    <th className="p-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {stage.items.map((row: any, rowIndex: number) => (
                    <tr key={rowIndex} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 font-semibold text-gray-400 bg-gray-50/30 border-r border-gray-100 text-center w-12 text-xs">
                        {rowIndex + 1}
                      </td>
                      <td className="p-1 border-r border-gray-100 min-w-[200px]">
                        <input
                          className="w-full p-2 outline-none focus:bg-blue-50/30 hover:bg-gray-50/50 transition-colors bg-transparent text-gray-800 text-xs rounded-lg"
                          placeholder="Material name..."
                          value={row.name || ''}
                          onChange={e => updateCell(stage.id, rowIndex, 'name', e.target.value)}
                        />
                      </td>
                      <td className="p-1 border-r border-gray-100 min-w-[150px]">
                        <input
                          className="w-full p-2 outline-none focus:bg-blue-50/30 hover:bg-gray-50/50 transition-colors bg-transparent text-gray-800 text-xs rounded-lg"
                          placeholder="CAS e.g. 103-90-2"
                          value={row.casNumber || ''}
                          onChange={e => updateCell(stage.id, rowIndex, 'casNumber', e.target.value)}
                        />
                      </td>
                      <td className="p-1 border-r border-gray-100 min-w-[250px]">
                        <input
                          className="w-full p-2 outline-none focus:bg-blue-50/30 hover:bg-gray-50/50 transition-colors bg-transparent text-gray-800 text-xs rounded-lg"
                          placeholder="Remarks..."
                          value={row.remarks || ''}
                          onChange={e => updateCell(stage.id, rowIndex, 'remarks', e.target.value)}
                        />
                      </td>
                      <td className="p-1 text-center w-12">
                        <button
                          onClick={() => removeRow(stage.id, rowIndex)}
                          className="text-gray-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ── GANTT CHART TAB ────────────────────────────────────────────────────────
export const GanttChartTab = ({ projTasks, proj, users, allTaskDates, isClientView = false }: { projTasks: any[], proj: any, users: any[], allTaskDates: Record<string, any>, isClientView?: boolean }) => {
  const today = useMemo(() => new Date(), []);
  today.setHours(0, 0, 0, 0);

  // Determine overall project timeline
  const projectDeadline = proj.deadline ? new Date(proj.deadline) : null;

  const taskData = useMemo(() => {
    return projTasks.map(task => {
      const { start, end, plannedStart, plannedEnd } = allTaskDates[task.id] || { start: today, end: today };
      const assignees = users.filter((u: any) =>
        Array.isArray(task.assignedTo)
          ? task.assignedTo.includes(u.id)
          : task.assignedTo === u.id
      );
      const assigneeNames = assignees.length > 0 ? assignees.map(a => a.name).join(', ') : 'Unassigned';

      // Compute schedule performance: how much of the bar has elapsed vs total
      const totalMs = end.getTime() - start.getTime();
      const elapsedMs = Math.min(today.getTime() - start.getTime(), totalMs);
      const pctElapsed = totalMs > 0 ? Math.max(0, elapsedMs / totalMs) * 100 : 0;

      const isCompleted = task.status === 'Completed';
      // Trial statuses override the elapsed-based color computation
      const isTrialDelayed = task.status === 'Delayed';
      const isTrialAboutToDelay = task.status === 'About to be Delayed';
      const isDelayed = isTrialDelayed || (!isCompleted && !isTrialAboutToDelay && today > end);
      const isCritical = isTrialDelayed || (!isCompleted && !isDelayed && !isTrialAboutToDelay && pctElapsed > 90);
      const isAlert = isTrialAboutToDelay || (!isCompleted && !isDelayed && !isCritical && pctElapsed > 65);
      const isSafe = !isCompleted && !isDelayed && !isCritical && !isAlert;

      // Deadline = end of assigned (core) days — this is where buffer begins
      // The bar's total width spans to 'end' which includes buffer days
      const assignedCoreDays = task.assignedDays || task.estimatedDays || 1;
      const approvedDays = task.finalTotalDays || assignedCoreDays;
      const deadlineDate = addWorkingDays(start, assignedCoreDays);

      return { task, start, end, deadlineDate, plannedStart, plannedEnd, approvedDays, assigneeNames, pctElapsed, isCompleted, isDelayed, isCritical, isAlert, isSafe };
    });
  }, [projTasks, users, today, allTaskDates]);

  // Compute chart timeline bounds
  const allDates = taskData.flatMap(d => [d.start, d.end, d.deadlineDate]);
  if (projectDeadline) allDates.push(projectDeadline);
  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : today;
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : today;
  // Add small padding
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 4);
  const totalSpanDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / 86400000);

  const dateToPercent = (d: Date) =>
    Math.max(0, Math.min(100, ((d.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100));

  // Generate header date labels (weekly)
  const dateLabels: Date[] = [];
  const labelDate = new Date(minDate);
  while (labelDate <= maxDate) {
    dateLabels.push(new Date(labelDate));
    labelDate.setDate(labelDate.getDate() + Math.ceil(totalSpanDays / 8));
  }

  const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  const BAR_COLOR = {
    completed: { bar: 'bg-emerald-500', text: 'Completed', dot: 'bg-emerald-500' },
    safe: { bar: 'bg-emerald-500', text: 'Safe', dot: 'bg-emerald-500' },
    alert: { bar: 'bg-amber-500', text: 'Alert', dot: 'bg-amber-500' },
    critical: { bar: 'bg-red-500', text: 'Critical', dot: 'bg-red-500' },
    delayed: { bar: 'bg-orange-500', text: 'Delayed', dot: 'bg-orange-500' },
  };

  const getBarStyle = (d: typeof taskData[0]) => {
    if (d.isCompleted) return BAR_COLOR.completed;
    if (d.isDelayed) return BAR_COLOR.delayed;
    if (d.isCritical) return BAR_COLOR.critical;
    if (d.isAlert) return BAR_COLOR.alert;
    return BAR_COLOR.safe;
  };

  if (projTasks.length === 0) {
    return (
      <Card className="p-10 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
        <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
        <p className="font-medium text-gray-500">No tasks to display</p>
        <p className="text-sm mt-1">Assign tasks to see the Gantt chart.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white overflow-hidden space-y-5 shadow-sm border border-gray-100 rounded-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#3b82f6]" /> Gantt Chart
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Schedule performance analysis — deadline: <strong>{proj.deadline || 'N/A'}</strong></p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          {Object.entries(BAR_COLOR).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
              <span className="text-gray-600">{cfg.text}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: '950px' }}>
          {/* Timeline header */}
          <div className="flex border-b border-gray-400 relative bg-gray-50 rounded-t-xl">
            <div className="w-48 flex-shrink-0 text-[10px] font-black text-gray-600 uppercase tracking-wider pl-4 py-3 border-r border-gray-400">TASK / OWNER</div>
            <div className="flex-1 relative py-3">
              {dateLabels.map((d, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] font-bold text-gray-500 -trangray-x-1/2 whitespace-nowrap"
                  style={{ left: `${dateToPercent(d)}%` }}
                >
                  {fmtDate(d)}
                </span>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <div className="divide-y divide-gray-400 border-t border-gray-400">
            {taskData.map((d, idx) => {
              const { task, start, end, deadlineDate, plannedStart, plannedEnd, approvedDays, assigneeNames, isCompleted } = d;
              const barStyle = getBarStyle(d);
              const leftPct = dateToPercent(start);
              const rightPct = dateToPercent(end);
              const widthPct = Math.max(0.5, rightPct - leftPct);
              const deadlinePct = dateToPercent(deadlineDate);
              const days = approvedDays;

              const bufferDays = task.bufferDays || 0;
              let bufferLeftPct = 100;
              if (bufferDays > 0) {
                const coreEnd = addWorkingDays(start, task.assignedDays || 1);
                const coreRightPct = dateToPercent(coreEnd);
                const bufferRelLeft = ((coreRightPct - leftPct) / widthPct) * 100;
                bufferLeftPct = Math.min(100, Math.max(0, bufferRelLeft));
              }

              let completedText = '';
              if (isCompleted) {
                let daysCompletedNum: number;
                if (task.startedAt && task.completedAt) {
                  const s = new Date(task.startedAt);
                  const c = new Date(task.completedAt);
                  const diffTime = Math.max(0, c.getTime() - s.getTime());
                  daysCompletedNum = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                } else if (task.completedAt) {
                  daysCompletedNum = 1;
                } else {
                  daysCompletedNum = task.assignedDays || 0;
                }
                completedText = `Completed - ${daysCompletedNum} ${daysCompletedNum === 1 ? 'day' : 'days'}`;
              }

              return (
                <div key={task.id} className={`group ${idx % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'} hover:bg-gray-100 transition-colors`}>
                  <div className="flex items-stretch gap-0 h-14">
                    {/* Task label */}
                    <div className="w-48 flex-shrink-0 pr-4 pl-4 py-2 border-r border-gray-400 flex flex-col justify-center">
                      <div className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5" title={task.title}>
                        {d.isCritical && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                        {d.isAlert && <AlertCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                        <span className="truncate">{task.title}</span>
                      </div>
                      {!isClientView && <div className="text-[10px] text-gray-500 truncate" title={assigneeNames}>{assigneeNames}</div>}
                    </div>

                    {/* Bar track */}
                    <div className="flex-1 relative">
                      {/* Vertical grid lines */}
                      <div className="absolute inset-0 pointer-events-none">
                        {dateLabels.map((d, i) => (
                          <div key={i} className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: `${dateToPercent(d)}%` }} />
                        ))}
                      </div>
                      {/* Project deadline marker */}
                      {projectDeadline && (
                        <div
                          className="absolute top-0 bottom-0 z-20"
                          style={{ left: `${dateToPercent(projectDeadline)}%` }}
                        >
                          <div className="w-0.5 h-full bg-red-400 border-dashed opacity-60" />
                        </div>
                      )}

                      {/* Top Bar: Dynamic Duration */}
                      <div
                        className={`peer absolute top-1.5 h-6 rounded-md shadow-sm transition-all flex items-center overflow-hidden border border-black/10 ${barStyle.bar}`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      >
                        {/* Buffer Striping Overlay */}
                        {bufferDays > 0 && !isCompleted && (
                          <div
                            className="absolute top-0 bottom-0 right-0 pointer-events-none z-10"
                            style={{
                              left: `${bufferLeftPct}%`,
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 8px)'
                            }}
                          />
                        )}

                        {/* Text label overlayed on top */}
                        {widthPct > 8 && (
                          <span className="absolute left-2 text-[10.5px] font-bold truncate z-10 text-white flex items-center gap-1 drop-shadow-sm hover:shadow-md transition-shadow">
                            {isCompleted ? `✓ ${completedText}` : (d.isCritical ? <><AlertTriangle className="w-3 h-3" /> {days}d</> : (d.isAlert ? <><AlertCircle className="w-3 h-3" /> {days}d</> : `${barStyle.text} - ${days}d`))}
                          </span>
                        )}
                      </div>

                      {/* Justification Popover */}
                      {task.delayJustification && (
                        <div
                          className="absolute top-8 z-50 bg-white border border-red-200 shadow-lg rounded-lg p-2.5 flex flex-col gap-1 w-56 opacity-0 invisible peer-hover:opacity-100 peer-hover:visible hover:opacity-100 hover:visible transition-all duration-200"
                          style={{ left: `${Math.min(leftPct, 80)}%` }}
                        >
                          <div className="absolute -top-1.5 left-4 w-3 h-3 bg-white border-l border-t border-red-200 rotate-45" />
                          <div className="flex items-center gap-1.5 text-red-600 font-bold text-[10px] uppercase tracking-wide relative z-10">
                            <AlertTriangle className="w-3 h-3" /> Delay Justification
                          </div>
                          <div className="text-xs text-gray-700 font-medium leading-relaxed whitespace-pre-wrap relative z-10">
                            {task.delayJustification}
                          </div>
                        </div>
                      )}

                      {/* Bottom Bar: Planned Duration (Grey) */}
                      {plannedStart && plannedEnd && dateToPercent(plannedStart) <= 100 && (
                        <div
                          className="absolute bottom-1.5 h-2.5 rounded-full shadow-sm bg-gray-500 opacity-80 group/greybar flex items-center justify-center overflow-visible"
                          style={{
                            left: `${dateToPercent(plannedStart)}%`,
                            width: `${Math.max(0.5, dateToPercent(plannedEnd) - dateToPercent(plannedStart))}%`
                          }}
                          title={`Planned: ${fmtDate(plannedStart)} → ${fmtDate(plannedEnd)}`}
                        >
                          <span className="opacity-0 group-hover/greybar:opacity-100 transition-opacity absolute -top-5 whitespace-nowrap text-[9px] font-bold text-gray-700 bg-white border border-gray-200 px-1 py-0.5 rounded shadow-sm z-30 pointer-events-none">Baseline Schedule</span>
                        </div>
                      )}

                      {/* Task deadline marker */}
                      {deadlinePct >= 0 && deadlinePct <= 100 && (
                        <div
                          className="absolute top-0 bottom-0 z-20 flex flex-col items-center"
                          style={{ left: `${deadlinePct}%` }}
                          title={`Task Deadline: ${fmtDate(deadlineDate)} (${days}d)`}
                        >
                          <div className="w-0.5 h-full border-r border-dashed border-red-500/70" />
                          <div className="absolute -top-1 w-1.5 h-1.5 bg-red-500 rotate-45 border border-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Today + deadline annotations row */}
          <div className="relative mt-2 h-6 flex">
            <div className="w-48 flex-shrink-0 border-r border-gray-300" />
            <div className="flex-1 relative h-full">
              {projectDeadline && (
                <div
                  className="absolute text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full -trangray-x-1/2 whitespace-nowrap shadow-sm"
                  style={{ left: `${dateToPercent(projectDeadline)}%` }}
                >
                  Deadline
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Performance Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-extrabold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> Schedule Performance Analysis
        </h4>
        <p className="text-[11px] text-gray-500">Industry-standard colour coding comparing time elapsed against task duration.</p>
        <div className="relative w-full h-5 rounded-full overflow-hidden flex">
          {/* Coloured zone segments */}
          <div className="h-full bg-emerald-500" style={{ width: '65%' }} title="Safe 0–65%" />
          <div className="h-full bg-amber-500" style={{ width: '25%' }} title="Alert 65–90%" />
          <div className="h-full bg-red-500" style={{ width: '10%' }} title="Critical >90%" />
        </div>
        <div className="relative w-full">
          {/* Overall project progress marker */}
          {(() => {
            const projStart = taskData.length ? new Date(Math.min(...taskData.map(d => d.start.getTime()))) : today;
            const projEnd = taskData.length ? new Date(Math.max(...taskData.map(d => d.end.getTime()))) : today;
            const projTotalMs = projEnd.getTime() - projStart.getTime();
            const projElapsedMs = today.getTime() - projStart.getTime();
            const projPct = projTotalMs > 0 ? Math.max(0, Math.min(100, (projElapsedMs / projTotalMs) * 100)) : 0;
            const completedCount = taskData.filter(d => d.isCompleted).length;
            const delayedCount = taskData.filter(d => d.isDelayed).length;
            const label = delayedCount > 0 ? 'Behind Schedule' : projPct > 90 ? 'Critical' : projPct > 65 ? 'Alert' : 'On/Ahead of Schedule';
            const labelColor = delayedCount > 0 ? 'bg-red-500' : projPct > 90 ? 'bg-red-500' : projPct > 65 ? 'bg-yellow-500' : 'bg-green-500';
            return (
              <>
                <div
                  className="absolute -top-5 flex items-center gap-1"
                  style={{ left: `${projPct}%`, transform: 'trangrayX(-50%)' }}
                >
                  <span className="text-[10px] font-black text-gray-700 bg-white border border-gray-200 px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    Today: {Math.round(projPct)}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div className="flex flex-wrap gap-3 text-[11px] font-semibold">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Safe (0–65%)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />Alert (65–90%)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Critical (&gt;90%)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Delayed</span>
                  </div>
                  <span className={`text-[11px] font-black text-white px-3 py-1 rounded-full shadow-sm ${labelColor}`}>
                    {label}
                  </span>
                </div>
                <div className="flex gap-4 mt-3 text-[11px] text-gray-500">
                  <span>✅ <strong>{completedCount}</strong> completed</span>
                  <span>🔴 <strong>{delayedCount}</strong> delayed</span>
                  <span>📋 <strong>{taskData.length}</strong> total</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </Card>
  );
};

