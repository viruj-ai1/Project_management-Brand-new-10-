import React, { createContext, useContext, useState, useMemo } from 'react';
import { AppContext } from './AppContext';
import { TASK_STATUS } from '../constants';

// ── Types ──────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'delayed'
  | 'behind_schedule'
  | 'completed_early'
  | 'completed_on_time'
  | 'unblocked'
  | 'overdue_start'
  | 'buffer_allocated'
  | 'delay_justified';

export interface AppNotification {
  id: string;
  type: NotificationType;
  taskId: string;
  taskTitle: string;
  message: string;
  detail: string;
  urgency: 'info' | 'success' | 'warning' | 'danger';
  forUserId: string;
  timestamp: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  readIds: Set<string>;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  readIds: new Set(),
  markAllRead: () => {},
  markRead: () => {},
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Walk managerId chain upward; return all ancestor user IDs (direct→top) */
export const getManagerChain = (userId: string, users: any[]): string[] => {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current = users.find((u: any) => u.id === userId);
  seen.add(userId);

  while (current && current.managerId && !seen.has(current.managerId)) {
    seen.add(current.managerId);
    const manager = users.find((u: any) => u.id === current.managerId);
    if (!manager) break;
    chain.push(manager.id);
    current = manager;
  }
  return chain;
};

const daysBetween = (a: Date, b: Date) =>
  Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

const parseDate = (s: string): Date => {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Compute weighted completion % from subtasks based on days weightage */
const computeCompletionPct = (subtasks: any[]): number => {
  if (!subtasks || subtasks.length === 0) return 0;
  const total = subtasks.reduce((s: number, st: any) => s + (Number(st.days) || 1), 0) || 1;
  const done = subtasks
    .filter((st: any) => st.completed)
    .reduce((s: number, st: any) => s + (Number(st.days) || 1), 0);
  return Math.round((done / total) * 100);
};

// ── Core computation ───────────────────────────────────────────────────────

const computeNotifications = (tasks: any[], users: any[]): AppNotification[] => {
  const notifs: AppNotification[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const task of tasks) {
    const rawAssignees = Array.isArray(task.assignedTo)
      ? task.assignedTo
      : task.assignedTo ? [task.assignedTo] : [];

    for (const rawAssigneeId of rawAssignees) {
      // Effective assignee (delegated or direct)
      const assigneeId =
        task.delegatedTo && task.delegateRequestStatus === 'Approved'
          ? task.delegatedTo
          : rawAssigneeId;

      if (!assigneeId) continue;

      const managers = getManagerChain(assigneeId, users);

    // ── 1. BEHIND SCHEDULE & DELAYED ────────────────────────────────────
    if (task.status === 'In Progress' && task.startedAt && task.assignedDays) {
      const start = parseDate(task.startedAt);
      const deadline = new Date(start);
      deadline.setDate(deadline.getDate() + Number(task.assignedDays));

      const daysElapsed = Math.max(0, daysBetween(start, today));
      const daysPercentage = Math.min(100, Math.round((daysElapsed / Number(task.assignedDays)) * 100));
      const completionPct = computeCompletionPct(task.subtasks || []);

      const isBehindSchedule = completionPct < daysPercentage;

      if (today > deadline) {
        // ── Past deadline: DELAYED ──
        const daysLate = daysBetween(deadline, today);
        const recipients = [...managers, assigneeId];
        for (const uid of recipients) {
          notifs.push({
            id: `delayed-${task.id}-${uid}`,
            type: 'delayed',
            taskId: task.id,
            taskTitle: task.title,
            message: `Task overdue by ${daysLate} day${daysLate !== 1 ? 's' : ''} ⚠`,
            detail: `"${task.title}" has exceeded its deadline (${deadline.toLocaleDateString()}) by ${daysLate} day${daysLate !== 1 ? 's' : ''}. Immediate action required.`,
            urgency: 'danger',
            forUserId: uid,
            timestamp: deadline.toISOString(),
          });
        }
        if (task.delayJustification) {
          for (const uid of managers) {
            notifs.push({
              id: `justified-${task.id}-${uid}`,
              type: 'delay_justified',
              taskId: task.id,
              taskTitle: task.title,
              message: `Delay Justification Provided 📝`,
              detail: `Assignee provided justification for delay on "${task.title}":\n\n${task.delayJustification}`,
              urgency: 'info',
              forUserId: uid,
              timestamp: deadline.toISOString(),
            });
          }
        }
      } else if (daysPercentage >= 65 && isBehindSchedule) {
        // ── Within deadline but behind schedule ──
        const gap = daysPercentage - completionPct;
        const zone = daysPercentage >= 90 ? 'Critical' : 'Alert';
        const recipients = [...managers, assigneeId];
        for (const uid of recipients) {
          notifs.push({
            id: `behind-${task.id}-${uid}-${daysPercentage}`,
            type: 'behind_schedule',
            taskId: task.id,
            taskTitle: task.title,
            message: `Behind schedule — ${zone} zone`,
            detail: `"${task.title}" is ${gap}% behind: ${completionPct}% done but ${daysPercentage}% of time consumed as of ${today.toLocaleDateString()}.`,
            urgency: daysPercentage >= 90 ? 'danger' : 'warning',
            forUserId: uid,
            timestamp: today.toISOString(),
          });
        }
      }
      
      if (task.bufferAllocated) {
        // Find successors (tasks that have this task in their predecessors)
        const successors = tasks.filter((t: any) => t.predecessors?.includes(task.id));
        const successorAssignees = successors.flatMap((t: any) => 
          Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : [])
        );
        const recipients = Array.from(new Set([...managers, ...successorAssignees]));
        
        for (const uid of recipients) {
          if (!uid) continue;
          
          let delayedSubtaskTitle = 'Main Task';
          if (task.delayedSubtaskId && task.delayedSubtaskId !== 'main') {
            const st = task.subtasks?.find((s: any) => s.id.toString() === task.delayedSubtaskId.toString());
            if (st) delayedSubtaskTitle = st.title || 'Untitled Subtask';
          }

          notifs.push({
            id: `buffer-alloc-${task.id}-${uid}`,
            type: 'buffer_allocated',
            taskId: task.id,
            taskTitle: task.title,
            message: `Buffer allocated ⚠`,
            detail: `Task Owner has requested a delay for "${task.title}".\n\nDelayed Item: ${delayedSubtaskTitle}\nReason: ${task.delayReason || 'None provided.'}\nAllocated: ${task.bufferDays} Days from buffer pool.`,
            urgency: 'warning',
            forUserId: uid,
            timestamp: task.updatedAt ? new Date(task.updatedAt).toISOString() : deadline ? deadline.toISOString() : today.toISOString(),
          });
        }
      }
    }

    // ── 2 & 3. COMPLETED EARLY / ON-TIME ────────────────────────────────
    if (
      task.status === 'Completed' &&
      task.completedAt &&
      task.startedAt &&
      task.assignedDays
    ) {
      const start = parseDate(task.startedAt);
      const completedDate = parseDate(task.completedAt);
      const deadline = new Date(start);
      deadline.setDate(deadline.getDate() + Number(task.assignedDays));

      const daysEarly = daysBetween(completedDate, deadline); // positive = early

      if (daysEarly > 0) {
        for (const mgrId of managers) {
          notifs.push({
            id: `early-${task.id}-${mgrId}`,
            type: 'completed_early',
            taskId: task.id,
            taskTitle: task.title,
            message: `Completed ${daysEarly} day${daysEarly !== 1 ? 's' : ''} early 🎉`,
            detail: `"${task.title}" finished ahead of schedule on ${completedDate.toLocaleDateString()} (Deadline was ${deadline.toLocaleDateString()}).`,
            urgency: 'success',
            forUserId: mgrId,
            timestamp: task.completedAt,
          });
        }
      } else if (daysEarly >= -1) {
        // on-time window: ±1 day
        for (const mgrId of managers) {
          notifs.push({
            id: `ontime-${task.id}-${mgrId}`,
            type: 'completed_on_time',
            taskId: task.id,
            taskTitle: task.title,
            message: `Completed on time ✓`,
            detail: `"${task.title}" was delivered within the scheduled window on ${completedDate.toLocaleDateString()}.`,
            urgency: 'success',
            forUserId: mgrId,
            timestamp: task.completedAt,
          });
        }
      }
    }

    // ── 4 & 5. SUCCESSOR UNBLOCKED / OVERDUE START ──────────────────────
    if (
      task.status === TASK_STATUS.PENDING_START &&
      task.predecessors &&
      task.predecessors.length > 0
    ) {
      const allPredsDone = task.predecessors.every((predId: string) => {
        const pred = tasks.find((t: any) => t.id === predId);
        return pred && pred.status === 'Completed';
      });

      if (allPredsDone) {
        // Find most-recent predecessor completion date
        let latestCompletion: Date | null = null;
        for (const predId of task.predecessors) {
          const pred = tasks.find((t: any) => t.id === predId);
          if (pred?.completedAt) {
            const d = parseDate(pred.completedAt);
            if (!latestCompletion || d > latestCompletion) {
              latestCompletion = d;
            }
          }
        }

        if (latestCompletion) {
          const daysSince = daysBetween(latestCompletion, today);

          if (daysSince > 2) {
            notifs.push({
              id: `overdue-start-${task.id}`,
              type: 'overdue_start',
              taskId: task.id,
              taskTitle: task.title,
              message: `Task start is overdue`,
              detail: `"${task.title}" was unblocked ${daysSince} day${daysSince !== 1 ? 's' : ''} ago (${latestCompletion.toLocaleDateString()}) but hasn't started yet.`,
              urgency: 'danger',
              forUserId: assigneeId,
              timestamp: latestCompletion.toISOString(),
            });
          } else {
            notifs.push({
              id: `unblocked-${task.id}`,
              type: 'unblocked',
              taskId: task.id,
              taskTitle: task.title,
              message: `You can start this task now`,
              detail: `All predecessor tasks for "${task.title}" are complete as of ${latestCompletion.toLocaleDateString()}.`,
              urgency: 'info',
              forUserId: assigneeId,
              timestamp: latestCompletion.toISOString(),
            });
          }
        }
      }
    }
    }
  }

  return notifs;
};

// ── Provider ───────────────────────────────────────────────────────────────

const LS_KEY = 'vc_notif_read';

const loadReadIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, tasks, users } = useContext(AppContext);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  const allNotifications = useMemo(
    () => (tasks && users ? computeNotifications(tasks, users) : []),
    [tasks, users]
  );

  const myNotifications = useMemo(
    () =>
      currentUser
        ? allNotifications.filter((n) => n.forUserId === currentUser.id)
        : [],
    [allNotifications, currentUser]
  );

  const unreadCount = myNotifications.filter((n) => !readIds.has(n.id)).length;

  const markRead = (id: string) =>
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      return next;
    });

  const markAllRead = () => {
    const ids = myNotifications.map((n) => n.id);
    setReadIds((prev) => {
      const next = new Set([...prev, ...ids]);
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <NotificationContext.Provider
      value={{ notifications: myNotifications, unreadCount, readIds, markAllRead, markRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
