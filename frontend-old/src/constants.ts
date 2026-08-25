import { Target, PieChart, BarChart, Briefcase, Store, Package, BookOpen, Clock, FolderKanban, Inbox, Sparkles } from 'lucide-react';

export const ROLES = {
  MANAGEMENT: 'Managing Director',
  RD_HEAD: 'Vice President (R&D)',
  SCM: 'SCM', 
  PM: 'Project Manager',
  DEPT_HEAD: 'Department Head',
  EMPLOYEE: 'Analysts/Chemists',
  CLIENT: 'Client'
};

export const DEPARTMENTS = ['ARD', 'CRD', 'DQA', 'SCM'];

export const TASK_STATUS: Record<string, string> = {
  PENDING_START: 'Pending Start',
  PENDING_ESTIMATE: 'Pending Estimate',
  ESTIMATED: 'Estimated',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed'
};

export const EXTRA_TABS: Record<string, any[]> = {
  [ROLES.MANAGEMENT]: [
    { id: 'strategic-planning', label: 'Strategic Planning', icon: Target },
    { id: 'financials', label: 'Financials', icon: PieChart },
    { id: 'reports', label: 'Global Reports', icon: BarChart },
    { id: 'pm-projects', label: 'Execution Tracker', icon: FolderKanban },
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles }
  ],
  [ROLES.RD_HEAD]: [
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles }
  ],
  [ROLES.SCM]: [
    { id: 'vendors', label: 'Vendor Management', icon: Store },
    { id: 'inventory', label: 'Inventory', icon: Package }
  ],
  [ROLES.PM]: [
    { id: 'pm-projects', label: 'Projects', icon: FolderKanban },
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles }
  ],
  [ROLES.DEPT_HEAD]: [
    { id: 'task-inbox', label: 'Task Inbox', icon: Inbox },
    { id: 'active-work', label: 'Active Work', icon: Briefcase }
  ],
  [ROLES.EMPLOYEE]: [
    { id: 'task-inbox', label: 'Task Inbox', icon: Inbox },
    { id: 'active-work', label: 'Active Work', icon: Briefcase },
    { id: 'timesheet', label: 'Timesheets', icon: Clock },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen }
  ],
  [ROLES.CLIENT]: []
};
export const isRestDay = (date: Date) => {
  const day = date.getDay();
  if (day === 0) return true; // Sunday
  if (day === 6) {
    const d = date.getDate();
    if (d >= 8 && d <= 14) return true; // 2nd Saturday
  }
  return false;
};

export const addWorkingDays = (startDate: Date, days: number) => {
  const result = new Date(startDate);
  let daysToAdd = Math.max(0, Math.ceil(days));
  while (daysToAdd > 0) {
    result.setDate(result.getDate() + 1);
    if (!isRestDay(result)) {
      daysToAdd--;
    }
  }
  return result;
};

export const getWorkingDaysElapsed = (start: Date, end: Date) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  if (startDate > endDate) return 0;
  
  let count = 0;
  const current = new Date(startDate);
  while (current < endDate) {
    if (!isRestDay(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

export const computeDynamicBufferPool = (projId: string, tasks: any[]) => {
  const pTasks = tasks.filter((t: any) => t.projectId === projId);
  let pool = 0;
  pTasks.forEach((t: any) => {
    const assigned = t.assignedDays || 0;
    const initialBuffer = (t.finalTotalDays || 0) - assigned;
    
    let consumed = 0;
    let saved = 0;
    if (t.startedAt) {
      const start = new Date(t.startedAt);
      const end = (t.status === 'Completed' && t.completedAt) ? new Date(t.completedAt) : new Date();
      const actual = getWorkingDaysElapsed(start, end);
      consumed = Math.max(0, actual - assigned);
      if (t.status === 'Completed') {
        saved = Math.max(0, assigned - actual);
      }
    }
    const deducted = Math.max(t.bufferDays || 0, consumed);
    pool += (initialBuffer - deducted + saved);
  });
  return pool;
};
