import { useContext, useMemo, useState } from 'react';
import {
  CalendarDays, AlertTriangle,
  Clock, Flag, ChevronDown, ChevronRight as ChevronRightIcon,
  Activity, Target, Zap, ShieldAlert, Layers
} from 'lucide-react';
import { AppContext } from '../context/AppContext';

// ── Utilities (self-contained, mirrors PMProjectsView) ─────────────────────

const isRestDay = (date: Date) => {
  const day = date.getDay();
  if (day === 0) return true; // Sunday
  if (day === 6) {
    const d = date.getDate();
    if (d >= 8 && d <= 14) return true; // 2nd Saturday
  }
  return false;
};

const addWorkingDays = (startDate: Date, days: number) => {
  const result = new Date(startDate);
  let daysToAdd = Math.max(0, Math.ceil(days));
  while (daysToAdd > 0) {
    result.setDate(result.getDate() + 1);
    if (!isRestDay(result)) daysToAdd--;
  }
  return result;
};

const fmtDate = (d: Date | null) => {
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
};

const fmtDateShort = (d: Date | null) => {
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const computeTaskProgress = (task: any) => {
  if (task.status === 'Completed') return 100;
  if (!task.subtasks || task.subtasks.length === 0) return 0;
  const total = task.subtasks.reduce((s: number, st: any) => s + (Number(st.days) || 1), 0);
  const done = task.subtasks.filter((st: any) => st.completed).reduce((s: number, st: any) => s + (Number(st.days) || 1), 0);
  return total > 0 ? Math.round((done / total) * 100) : 0;
};

// Working days between two dates
const workingDaysBetween = (a: Date, b: Date) => {
  let count = 0;
  const cursor = new Date(a);
  while (cursor < b) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isRestDay(cursor)) count++;
  }
  return count;
};

const getHealthStatus = (task: any): 'not_started' | 'safe' | 'alert' | 'critical' | 'delayed' | 'done' => {
  if (task.status === 'Completed') return 'done';
  if (!task.startedAt || !task.assignedDays) return 'not_started';
  const start = new Date(task.startedAt);
  const today = new Date();
  const elapsed = Math.max(0, workingDaysBetween(start, today));
  const pct = (elapsed / task.assignedDays) * 100;
  if (pct > 100) return 'delayed';
  if (pct > 90) return 'critical';
  if (pct > 65) return 'alert';
  return 'safe';
};

const HEALTH_CONFIG = {
  not_started: { label: 'Not Started', color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200', bar: 'bg-gray-300', dot: 'bg-gray-400' },
  safe:        { label: 'On Track',    color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  alert:       { label: 'Alert',       color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   bar: 'bg-yellow-400',   dot: 'bg-yellow-400' },
  critical:    { label: 'Critical',    color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     bar: 'bg-red-500',     dot: 'bg-red-500' },
  delayed:     { label: 'Delayed',     color: 'text-red-700',  bg: 'bg-red-50',  border: 'border-red-200',  bar: 'bg-red-500',  dot: 'bg-red-500' },
  done:        { label: '✓ Completed', color: 'text-emerald-700',    bg: 'bg-emerald-50',    border: 'border-emerald-200',    bar: 'bg-emerald-500',    dot: 'bg-emerald-500' },
};

// ── Sub-components ──────────────────────────────────────────────────────────

const StatBadge = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <div className={`flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-xl font-black text-gray-900 leading-none">{value}</div>
      <div className="text-[11px] font-semibold text-gray-500 mt-0.5 whitespace-nowrap">{label}</div>
    </div>
  </div>
);

const ProgressBar = ({ pct, colorClass, className = '' }: { pct: number; colorClass: string; className?: string }) => (
  <div className={`relative h-2 bg-gray-100 rounded-full overflow-hidden ${className}`}>
    <div
      className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
    />
  </div>
);

// ── Milestone Row ───────────────────────────────────────────────────────────
const MilestoneRow = ({
  task, assigneeName, plannedEnd, dynamicEnd, today, showPlanned
}: {
  task: any; assigneeName: string; plannedEnd: Date; dynamicEnd: Date; today: Date; showPlanned: boolean;
}) => {
  const health = getHealthStatus(task);
  const cfg = HEALTH_CONFIG[health];
  const progress = computeTaskProgress(task);
  const isPast = dynamicEnd < today && task.status !== 'Completed';
  const isUpcoming = dynamicEnd >= today && dynamicEnd <= addWorkingDays(today, 14) && task.status !== 'Completed';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors border
      ${health === 'done' ? 'bg-emerald-50/60 border-emerald-100' :
        health === 'not_started' ? 'bg-gray-50/60 border-gray-100' :
        isPast ? 'bg-red-50/60 border-red-100' :
        isUpcoming ? 'bg-amber-50/60 border-amber-100' :
        'bg-white border-gray-100'}`}>
      {/* Status dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      
      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold truncate ${task.status === 'Completed' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
            {task.title}
          </span>
          {isPast && <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full flex-shrink-0">OVERDUE</span>}
          {isUpcoming && <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">DUE SOON</span>}
        </div>
        <div className="text-[10px] text-gray-400 font-medium mt-0.5">{assigneeName}</div>
      </div>

      {/* Progress */}
      <div className="flex-shrink-0 w-20">
        <ProgressBar pct={progress} colorClass={cfg.bar} />
        <div className="text-[10px] text-gray-400 text-right mt-0.5">{progress}%</div>
      </div>

      {/* Dates */}
      <div className="flex-shrink-0 text-right space-y-0.5">
        {showPlanned && (
          <div className="text-[10px] text-gray-400 font-medium">
            Plan: <span className="text-gray-600 font-bold">{fmtDateShort(plannedEnd)}</span>
          </div>
        )}
        <div className={`text-[10px] font-bold ${isPast ? 'text-red-600' : isUpcoming ? 'text-amber-600' : health === 'done' ? 'text-emerald-600' : 'text-gray-500'}`}>
          {task.status === 'Completed' ? '✓ Completed on time' : `Due: ${fmtDateShort(dynamicEnd)}`}
        </div>
      </div>
    </div>
  );
};

// ── Calendar Heatmap ────────────────────────────────────────────────────────
const CalendarWidget = ({ events }: { events: Array<{ date: Date; label: string; type: 'task' | 'deadline' | 'buffer' }> }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Show current month + next month
  const months = [0, 1].map(offset => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    return d;
  });

  const getDayEvents = (date: Date) => {
    return events.filter(e => {
      const ed = new Date(e.date);
      ed.setHours(0, 0, 0, 0);
      return ed.getTime() === date.getTime();
    });
  };

  return (
    <div className="flex gap-6 flex-wrap">
      {months.map((monthStart, mi) => {
        const year = monthStart.getFullYear();
        const month = monthStart.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const monthName = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

        const cells = [];
        // Empty cells for offset
        for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);

        return (
          <div key={mi} className="flex-1 min-w-[260px]">
            <div className="text-xs font-black text-gray-600 uppercase tracking-wider mb-3 text-center">{monthName}</div>
            <div className="grid grid-cols-7 gap-0.5">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-[10px] font-bold text-gray-400 text-center py-1">{d}</div>
              ))}
              {cells.map((day, idx) => {
                if (!day) return <div key={idx} />;
                const date = new Date(year, month, day);
                date.setHours(0, 0, 0, 0);
                const isToday = date.getTime() === today.getTime();
                const isRest = isRestDay(date);
                const dayEvents = getDayEvents(date);
                const hasDeadline = dayEvents.some(e => e.type === 'deadline');
                const hasTask = dayEvents.some(e => e.type === 'task');

                return (
                  <div
                    key={idx}
                    className={`relative flex flex-col items-center justify-center rounded-lg text-[11px] font-semibold aspect-square cursor-default group
                      ${isToday ? 'bg-[#1e3a5f] text-white shadow-sm hover:shadow-md transition-shadow' :
                        hasDeadline ? 'bg-red-100 text-red-800 border border-red-300' :
                        hasTask ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        isRest ? 'text-gray-300 bg-gray-50' :
                        'text-gray-600 hover:bg-gray-100'}`}
                    title={dayEvents.map(e => e.label).join(', ')}
                  >
                    {day}
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasDeadline && <span className="w-1 h-1 rounded-full bg-red-500" />}
                        {hasTask && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                      </div>
                    )}
                    {/* Tooltip */}
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-full mb-1 left-1/2 -trangray-x-1/2 hidden group-hover:block z-50 w-40 bg-gray-800 text-white text-[10px] rounded-lg px-2 py-1.5 shadow-xl whitespace-normal">
                        {dayEvents.map((e, i) => <div key={i}>• {e.label}</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-200 border border-red-300" />Deadline</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-50 border border-amber-200" />Task Due</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1e3a5f]" />Today</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Project Timeline Card ───────────────────────────────────────────────────
const ProjectTimelineCard = ({
  proj, projTasks, allTaskDates, users, today
}: {
  proj: any; projTasks: any[]; allTaskDates: Record<string, { start: Date; end: Date; plannedStart: Date; plannedEnd: Date }>;
  users: any[]; today: Date;
}) => {
  const [expanded, setExpanded] = useState(true);

  // Compute project-level timeline extents
  const taskDates = projTasks
    .map(t => allTaskDates[t.id])
    .filter(Boolean);

  const projStart = taskDates.length > 0
    ? new Date(Math.min(...taskDates.map(d => d.plannedStart.getTime())))
    : today;
  const projDeadline = proj.deadline ? new Date(proj.deadline) : null;
  const dynamicEnd = taskDates.length > 0
    ? new Date(Math.max(...taskDates.map(d => d.end.getTime())))
    : (projDeadline || today);

  const timelineEnd = projDeadline
    ? new Date(Math.max(projDeadline.getTime(), dynamicEnd.getTime()))
    : dynamicEnd;

  const totalMs = timelineEnd.getTime() - projStart.getTime();
  const todayPct = totalMs > 0 ? Math.max(0, Math.min(100, ((today.getTime() - projStart.getTime()) / totalMs) * 100)) : 0;
  const deadlinePct = (projDeadline && totalMs > 0) ? Math.max(0, Math.min(100, ((projDeadline.getTime() - projStart.getTime()) / totalMs) * 100)) : 100;

  // Overall project health
  const activeTasks = projTasks.filter(t => t.status !== 'Completed');
  const completedTasks = projTasks.filter(t => t.status === 'Completed');
  const overdueTasks = activeTasks.filter(t => {
    const d = allTaskDates[t.id];
    return d && d.end < today;
  });
  const alertTasks = activeTasks.filter(t => {
    const h = getHealthStatus(t);
    return h === 'alert' || h === 'critical' || h === 'delayed';
  });

  const overallProgress = projTasks.length > 0
    ? Math.round(projTasks.reduce((sum, t) => sum + computeTaskProgress(t), 0) / projTasks.length)
    : 0;

  const projHealth = overdueTasks.length > 0 ? 'delayed'
    : alertTasks.some(t => getHealthStatus(t) === 'critical') ? 'critical'
    : alertTasks.length > 0 ? 'alert'
    : 'safe';
  const healthCfg = HEALTH_CONFIG[projHealth];

  // Forecast: estimate completion date from current velocity
  const daysRemaining = workingDaysBetween(today, projDeadline || dynamicEnd);
  const tasksRemaining = projTasks.length - completedTasks.length;

  const statusBgMap: Record<string, string> = {
    Planning: 'bg-blue-100 text-blue-700',
    Active: 'bg-emerald-100 text-emerald-700',
    Completed: 'bg-blue-50 text-[#1e3a5f]',
    Suspended: 'bg-amber-100 text-amber-700',
    Dismissed: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${healthCfg.dot} flex-shrink-0`} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-gray-900 text-base">{proj.name}</h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusBgMap[proj.status] || 'bg-gray-100 text-gray-600'}`}>
                {proj.status}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${healthCfg.bg} ${healthCfg.color} ${healthCfg.border}`}>
                {healthCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Deadline: <strong className="text-gray-700">{fmtDate(projDeadline)}</strong>
              </span>
              <span>·</span>
              <span>{completedTasks.length}/{projTasks.length} tasks done</span>
              {proj.bufferPool != null && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-blue-400" /> Buffer pool: <strong className="text-[#3b82f6]">{proj.bufferPool}d</strong></span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-black text-gray-900">{overallProgress}%</div>
            <div className="text-[10px] text-gray-400 font-semibold">{completedTasks.length}/{projTasks.length} done</div>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-5">
          {/* Main progress bar */}
          <div>
            <ProgressBar pct={overallProgress} colorClass={healthCfg.bar} />
          </div>

          {/* Visual timeline */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Project Timeline Span</div>
            
            {/* Timeline ruler */}
            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
              {/* Progress fill */}
              <div
                className={`absolute top-0 left-0 h-full ${healthCfg.bar} opacity-80`}
                style={{ width: `${todayPct}%` }}
              />
              {/* Deadline marker */}
              {projDeadline && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: `${deadlinePct}%` }}
                  title={`Deadline: ${fmtDate(projDeadline)}`}
                />
              )}
              {/* Today label */}
              <div
                className="absolute top-1/2 -trangray-y-1/2 -trangray-x-1/2 z-20"
                style={{ left: `${todayPct}%` }}
              >
                <span className="bg-[#1e3a5f] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow whitespace-nowrap">
                  Today {Math.round(todayPct)}%
                </span>
              </div>
            </div>

            {/* Date labels */}
            <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 font-semibold">
              <span>{fmtDateShort(projStart)}</span>
              {projDeadline && <span className="text-red-500 font-bold">↓ {fmtDateShort(projDeadline)}</span>}
              <span>{fmtDateShort(timelineEnd)}</span>
            </div>

            {/* Per-task bars */}
            {projTasks.filter(t => allTaskDates[t.id]).map(task => {
              const td = allTaskDates[task.id];
              const taskStartPct = totalMs > 0 ? Math.max(0, Math.min(100, ((td.plannedStart.getTime() - projStart.getTime()) / totalMs) * 100)) : 0;
              const taskEndPct = totalMs > 0 ? Math.max(0, Math.min(100, ((td.plannedEnd.getTime() - projStart.getTime()) / totalMs) * 100)) : 0;
              const taskW = Math.max(1, taskEndPct - taskStartPct);
              const h = getHealthStatus(task);
              const hc = HEALTH_CONFIG[h];

              return (
                <div key={task.id} className="flex items-center gap-2 mt-2">
                  <div className="w-28 flex-shrink-0 text-[10px] text-gray-500 font-medium truncate" title={task.title}>
                    {task.title}
                  </div>
                  <div className="flex-1 relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 h-full rounded-full ${hc.bar} opacity-75`}
                      style={{ left: `${taskStartPct}%`, width: `${taskW}%` }}
                    />
                  </div>
                  <div className="w-12 flex-shrink-0 text-[10px] text-gray-400 text-right font-semibold">
                    {computeTaskProgress(task)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
              <div className="text-lg font-black text-gray-900">{tasksRemaining}</div>
              <div className="text-[10px] text-gray-500 font-semibold">Tasks Remaining</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
              <div className={`text-lg font-black ${daysRemaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>{Math.abs(daysRemaining)}d</div>
              <div className="text-[10px] text-gray-500 font-semibold">{daysRemaining < 0 ? 'Overdue by' : 'Days to Deadline'}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
              <div className={`text-lg font-black ${overdueTasks.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueTasks.length}</div>
              <div className="text-[10px] text-gray-500 font-semibold">Overdue Tasks</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
              <div className="text-lg font-black text-[#1e3a5f]">{proj.bufferPool ?? 0}d</div>
              <div className="text-[10px] text-gray-500 font-semibold">Buffer Remaining</div>
            </div>
          </div>

          {/* Milestone list */}
          {projTasks.length > 0 && (
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flag className="w-3 h-3" /> Task Milestones (sorted by due date)
              </div>
              <div className="space-y-1.5">
                {[...projTasks]
                  .filter(t => allTaskDates[t.id])
                  .sort((a, b) => allTaskDates[a.id].end.getTime() - allTaskDates[b.id].end.getTime())
                  .map(task => {
                    const td = allTaskDates[task.id];
                    const assignees = users.filter((u: any) => 
                      Array.isArray(task.assignedTo) 
                        ? task.assignedTo.includes(u.id) 
                        : task.assignedTo === u.id
                    );
                    const assigneeName = assignees.length > 0 ? assignees.map((a: any) => a.name).join(', ') : 'Unassigned';
                    return (
                      <MilestoneRow
                        key={task.id}
                        task={task}
                        assigneeName={assigneeName}
                        plannedEnd={td.plannedEnd}
                        dynamicEnd={td.end}
                        today={today}
                        showPlanned={true}
                      />
                    );
                  })
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main View ───────────────────────────────────────────────────────────────
export const ProjectTimelinesView = () => {
  const { currentUser, projects, tasks, users } = useContext(AppContext);
  const [filterHealth, setFilterHealth] = useState<'all' | 'safe' | 'alert' | 'critical' | 'delayed'>('all');

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const myProjects = useMemo(() =>
    projects.filter((p: any) => p.pmId === currentUser.id),
    [projects, currentUser]
  );

  // Compute all task dates (same algorithm as PMProjectsView)
  const allTaskDates = useMemo(() => {
    const resolved: Record<string, { start: Date; end: Date; plannedStart: Date; plannedEnd: Date }> = {};

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

      let plannedStart: Date;
      if (task.predecessors?.length) {
        const predEnds = task.predecessors.map((pid: string) => resolveTask(pid, new Set(visited)).plannedEnd);
        plannedStart = new Date(Math.max(...predEnds.map((d: Date) => d.getTime())));
      } else {
        plannedStart = new Date(projStart);
      }
      const plannedEnd = addWorkingDays(plannedStart, days);

      let start: Date;
      if (task.startedAt) {
        start = new Date(task.startedAt);
      } else if (task.predecessors?.length) {
        const predEnds = task.predecessors.map((pid: string) => resolveTask(pid, new Set(visited)).end);
        start = new Date(Math.max(...predEnds.map((d: Date) => d.getTime())));
      } else {
        start = new Date(today);
      }
      const end = addWorkingDays(start, days);
      const finalEnd = (task.status === 'Completed' && task.completedAt) ? new Date(task.completedAt) : end;

      resolved[taskId] = { start, end: finalEnd, plannedStart, plannedEnd };
      return resolved[taskId];
    };

    tasks.forEach((t: any) => resolveTask(t.id));
    return resolved;
  }, [tasks, projects, today]);

  // Overall stats
  const stats = useMemo(() => {
    let active = 0, behind = 0, dueSoon = 0;
    const nextTwoWeeks = addWorkingDays(today, 14);

    myProjects.forEach((proj: any) => {
      const projTasks = tasks.filter((t: any) => t.projectId === proj.id);
      if (proj.status === 'Active') active++;
      const hasOverdue = projTasks.some((t: any) => {
        const d = allTaskDates[t.id];
        return d && d.end < today && t.status !== 'Completed';
      });
      if (hasOverdue) behind++;
      const hasDue = projTasks.some((t: any) => {
        const d = allTaskDates[t.id];
        return d && d.end >= today && d.end <= nextTwoWeeks && t.status !== 'Completed';
      });
      if (hasDue) dueSoon++;
    });

    const tasksDueSoon = tasks.filter((t: any) => {
      if (!myProjects.some((p: any) => p.id === t.projectId)) return false;
      const d = allTaskDates[t.id];
      return d && d.end >= today && d.end <= nextTwoWeeks && t.status !== 'Completed';
    }).length;

    return { active, behind, dueSoon, tasksDueSoon };
  }, [myProjects, tasks, allTaskDates, today]);

  // Calendar events
  const calendarEvents = useMemo(() => {
    const events: Array<{ date: Date; label: string; type: 'task' | 'deadline' | 'buffer' }> = [];
    myProjects.forEach((proj: any) => {
      if (proj.deadline) {
        events.push({ date: new Date(proj.deadline), label: `${proj.name} deadline`, type: 'deadline' });
      }
      tasks.filter((t: any) => t.projectId === proj.id).forEach((t: any) => {
          const d = allTaskDates[t.id];
          if (d && t.status !== 'Completed') {
            events.push({ date: d.end, label: t.title, type: 'task' });
          }
        });
    });
    return events;
  }, [myProjects, tasks, allTaskDates]);

  // Filter projects by health
  const filteredProjects = useMemo(() => {
    return myProjects.filter((proj: any) => {
      if (filterHealth === 'all') return true;
      const projTasks = tasks.filter((t: any) => t.projectId === proj.id);
      const activeTasks = projTasks.filter((t: any) => t.status !== 'Completed');
      const overdue = activeTasks.some((t: any) => { const d = allTaskDates[t.id]; return d && d.end < today; });
      const hasCrit = activeTasks.some((t: any) => getHealthStatus(t) === 'critical');
      const hasAlert = activeTasks.some((t: any) => getHealthStatus(t) === 'alert');
      const projH = overdue ? 'delayed' : hasCrit ? 'critical' : hasAlert ? 'alert' : 'safe';
      return projH === filterHealth;
    });
  }, [myProjects, tasks, allTaskDates, today, filterHealth]);

  if (myProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 gap-4">
        <CalendarDays className="w-16 h-16 opacity-20" />
        <div className="text-lg font-bold">No Projects Found</div>
        <div className="text-sm text-gray-400">You have no assigned projects to display timelines for.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#3b82f6]" />
            Project Timelines
          </h2>
          <p className="text-sm text-gray-500 mt-1">Cross-project schedule overview, milestones, and health tracking</p>
        </div>
        <div className="text-[11px] text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-2 font-semibold shadow-sm">
          As of {today.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBadge icon={Layers} label="My Projects" value={myProjects.length} color="bg-blue-50 text-[#3b82f6]" />
        <StatBadge icon={Activity} label="Active Projects" value={stats.active} color="bg-emerald-100 text-emerald-600" />
        <StatBadge icon={AlertTriangle} label="Behind Schedule" value={stats.behind} color={stats.behind > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"} />
        <StatBadge icon={Clock} label="Tasks Due (14d)" value={stats.tasksDueSoon} color={stats.tasksDueSoon > 0 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400"} />
      </div>

      {/* Calendar Heatmap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-black text-gray-700 flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-blue-500" /> Deadline & Task Calendar
        </h3>
        <CalendarWidget events={calendarEvents} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-500">Filter by health:</span>
        {(['all', 'safe', 'alert', 'critical', 'delayed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterHealth(f)}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all
              ${filterHealth === f
                ? f === 'all' ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : `${HEALTH_CONFIG[f as keyof typeof HEALTH_CONFIG]?.bg || 'bg-gray-100'} ${HEALTH_CONFIG[f as keyof typeof HEALTH_CONFIG]?.color || 'text-gray-600'} border-current`
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
          >
            {f === 'all' ? 'All' : HEALTH_CONFIG[f as keyof typeof HEALTH_CONFIG]?.label}
          </button>
        ))}
      </div>

      {/* Project Timeline Cards */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-gray-100">
            No projects match the selected filter.
          </div>
        ) : (
          filteredProjects.map((proj: any) => (
            <ProjectTimelineCard
              key={proj.id}
              proj={proj}
              projTasks={tasks.filter((t: any) => t.projectId === proj.id)}
              allTaskDates={allTaskDates}
              users={users}
              today={today}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Health Legend
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(HEALTH_CONFIG).map(([key, cfg]) => (
            <div key={key} className={`flex items-center gap-2 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <div>
                <div className={`text-xs font-black ${cfg.color}`}>{cfg.label}</div>
                <div className="text-[10px] text-gray-400 font-medium">
                  {key === 'not_started' ? 'Awaiting kick-off' :
                   key === 'safe' ? 'Time used ≤ 65%' :
                   key === 'alert' ? 'Time used 65–90%' :
                   key === 'critical' ? 'Time used > 90%' :
                   key === 'delayed' ? 'Past deadline, incomplete' :
                   'All subtasks done'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
