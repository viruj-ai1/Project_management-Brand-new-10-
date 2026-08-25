import { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Card, StatCard } from './SharedUI';
import { FolderKanban, CheckCircle2, Activity, Clock, ChevronRight } from 'lucide-react';
import { ReportsTab, GanttChartTab, useAllTaskDates } from './PMProjectsView';

export const ClientPortal = () => {
  const { projects, tasks, users, currentUser } = useContext(AppContext);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Filter projects explicitly assigned to this client
  const clientProjects = (projects || []).filter((p: any) => p.clientId === currentUser.id);
  
  const activeProjects = clientProjects.filter((p: any) => p.status === 'Active' || p.status === 'In Progress').length;
  const completedProjects = clientProjects.filter((p: any) => p.status === 'Completed').length;

  const allTaskDates = useAllTaskDates(tasks, projects);

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

  if (selectedProjectId) {
    const proj = clientProjects.find((p: any) => p.id === selectedProjectId);
    if (!proj) return null;
    const projTasks = tasks.filter((t: any) => t.projectId === proj.id);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <button
          onClick={() => setSelectedProjectId(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 bg-white px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all font-semibold text-sm w-fit"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
        </button>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <h2 className="text-2xl font-black text-gray-900">{proj.name}</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Task Completion Summary</h3>
              <ReportsTab projTasks={projTasks} proj={proj} users={users} allTaskDates={allTaskDates} isClientView={true} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Gantt Chart</h3>
              <GanttChartTab projTasks={projTasks} proj={proj} users={users} allTaskDates={allTaskDates} isClientView={true} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <FolderKanban className="w-8 h-8 text-[#1e3a5f]" /> Client Dashboard
        </h2>
        <p className="text-gray-500 mt-2 text-sm max-w-2xl">
          Welcome to your project portfolio. Track the high-level progress of all your active and completed projects here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Projects" value={clientProjects.length} icon={FolderKanban} colorClass="bg-blue-50 text-blue-600" />
        <StatCard title="Active Projects" value={activeProjects} icon={Activity} colorClass="bg-amber-50 text-amber-600" />
        <StatCard title="Completed Projects" value={completedProjects} icon={CheckCircle2} colorClass="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight border-b border-gray-100 pb-2">Project Portfolio</h3>
        
        {clientProjects.length === 0 ? (
          <Card className="p-12 text-center text-gray-500 bg-gray-50/50 border-dashed border-2 rounded-2xl">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-30 text-gray-400" />
            <p className="text-lg">No active projects to display at this time.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientProjects.map((proj: any) => {
              const pTasks = tasks.filter((t: any) => t.projectId === proj.id);
              const totalTasks = pTasks.length;
              const progressSum = pTasks.reduce((s: number, t: any) => s + getTaskProgress(t), 0);
              const overallProgress = totalTasks > 0 ? Math.round(progressSum / totalTasks) : 0;
              const isCompleted = proj.status === 'Completed';

              return (
                <Card 
                  key={proj.id} 
                  className="p-0 overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedProjectId(proj.id)}
                >
                  <div className={`px-5 py-3 ${isCompleted ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-[#1e3a5f]/5 border-b border-gray-100'} flex items-center justify-between`}>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${isCompleted ? 'text-emerald-700' : 'text-[#1e3a5f]'}`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                      {proj.status || 'Active'}
                    </span>
                  </div>
                  
                  <div className="p-6">
                    <h4 className="font-extrabold text-gray-900 text-xl mb-4 line-clamp-1">{proj.name}</h4>
                    
                    <div className="mb-6">
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                        <span className="uppercase tracking-wider">Overall Progress</span>
                        <span className={`text-sm ${overallProgress === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{overallProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ease-out ${overallProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                          style={{ width: `${overallProgress}%` }} 
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-gray-500 pt-4 border-t border-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Target Deadline</span>
                        <strong className="text-gray-900">{proj.deadline || 'Not scheduled'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-400" /> Milestone Tasks</span>
                        <strong className="text-gray-900">{totalTasks}</strong>
                      </div>
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
