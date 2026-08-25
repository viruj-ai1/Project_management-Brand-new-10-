import { useState, useContext } from 'react';
import { FolderKanban, ShieldAlert, ChevronRight, UserSquare2, Activity, Clock, ArrowRight } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { TASK_STATUS, computeDynamicBufferPool } from '../constants';
import { Card, StatCard } from './SharedUI';

export const PMDashboard = () => {
  const { currentUser, projects, tasks, users } = useContext(AppContext);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const myProjects = projects.filter((p: any) => p.pmId === currentUser.id);
  const projectTasks = tasks.filter((t: any) => t.projectId === selectedProject?.id);
  const activeProject = projects.find((p: any) => p.id === selectedProject?.id);

  const statusColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    'Planning': { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', border: 'border-gray-200' },
    'Active': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' },
    'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  };

  if (!selectedProject || !activeProject) {
    // PM OVERVIEW DASHBOARD
    const totalMyProjects = myProjects.length;
    const totalBufferManaged = myProjects.reduce((acc: number, p: any) => acc + computeDynamicBufferPool(p.id, tasks), 0);

    return (
      <div className="space-y-8 fade-in">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">PM Workspace</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your assigned project portfolios</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <StatCard title="Assigned Portfolios" value={totalMyProjects} icon={FolderKanban} colorClass="bg-blue-50 text-blue-600" />
          <StatCard title="Buffer Managed" value={`${totalBufferManaged} Days`} icon={ShieldAlert} colorClass="bg-blue-50 text-blue-600" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-5 border-b border-gray-100 pb-3">My Portfolios</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myProjects.length === 0 ? (
              <div className="col-span-full p-10 text-center text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                <div className="text-sm font-medium">No projects assigned to you yet.</div>
              </div>
            ) : myProjects.map((proj: any) => {
              const status = proj.status || 'Active';
              const sc = statusColors[status] || statusColors['Active'];
              return (
                <Card key={proj.id} className="p-0 group cursor-pointer" onClick={() => setSelectedProject(proj)}>
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border border-gray-200 group-hover:border-blue-200 transition-colors">
                          <FolderKanban className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-colors"/>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-[15px] leading-snug group-hover:text-[#1e3a5f] transition-colors">{proj.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                            <span className={`text-[11px] font-semibold ${sc.text}`}>{status}</span>
                            {proj.clientId && (
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                                Client: {users.find((u: any) => u.id === proj.clientId)?.name || 'Client'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors mt-1" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[13px] pt-2 border-t border-gray-100 mt-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-3.5 h-3.5 text-gray-400"/>
                        <span>{proj.deadline}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Activity className="w-3.5 h-3.5 text-blue-400"/>
                        <span><strong className="text-gray-800">{tasks.filter((t: any) => t.projectId === proj.id).length}</strong> tasks</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    );
  }

  // DEEP DIVE WORKSPACE
  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedProject(null)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2.5 rounded-xl border border-gray-200 transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{activeProject.name}</h2>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Task Portfolio</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className="font-medium text-gray-700">{projectTasks.length} {projectTasks.length === 1 ? 'Task' : 'Tasks'}</span>
              {activeProject.clientId && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="font-semibold text-gray-700">Client: {users.find((u: any) => u.id === activeProject.clientId)?.name || 'Client'}</span>
                </>
              )}
            </p>
          </div>
        </div>
        
        <div className="bg-[#1e3a5f] text-white px-5 py-3 rounded-xl font-bold shadow-[0_4px_12px_rgba(30,58,95,0.2)] flex items-center gap-4 border border-[#2d5a8e]">
          <ShieldAlert className="w-6 h-6 text-blue-300" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-blue-200 font-semibold mb-0.5">Global Buffer Pool</div>
            <div className="text-xl leading-none">{computeDynamicBufferPool(activeProject.id, tasks)} Days Saved</div>
          </div>
        </div>
      </div>

      <div>
        {projectTasks.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 mt-6">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <div className="text-base font-medium text-gray-600 mb-1">No tasks generated yet</div>
            <p className="text-sm">Tasks for this portfolio will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projectTasks.map((task: any) => {
              const assignees = users.filter((u: any) =>
                Array.isArray(task.assignedTo)
                  ? task.assignedTo.includes(u.id)
                  : task.assignedTo === u.id
              );
              return (
                <Card key={task.id} className="p-0 hover:border-blue-200 transition-colors group overflow-visible">
                  <div className="p-5 flex flex-col sm:flex-row gap-5 justify-between items-center">
                    
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-gray-900 text-lg leading-tight mb-2 group-hover:text-[#1e3a5f] transition-colors">{task.title}</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100/80 leading-relaxed mb-4">{task.specs}</p>
                      
                      <div className="flex flex-wrap gap-3 text-[13px] items-center">
                        <span className="flex items-center gap-1.5 font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200/60">
                          <UserSquare2 className="w-4 h-4 text-gray-400" /> 
                          {assignees.length > 0 ? assignees.map((a: any) => `${a.name} (${a.role === 'Department Head' ? 'Department' : a.role})`).join(', ') : 'Unassigned'}
                        </span>
                        
                        <span className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg border ${
                          task.status === TASK_STATUS.PENDING_ESTIMATE ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          task.status === TASK_STATUS.ESTIMATED ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          task.status === TASK_STATUS.PENDING_START ? 'bg-green-50 text-green-700 border-green-100' :
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          <Activity className="w-3.5 h-3.5" /> {task.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-full sm:w-auto">
                      {task.status === TASK_STATUS.PENDING_ESTIMATE && (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm sm:min-w-[180px] text-center">
                          <div className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mb-2">Estimate Status</div>
                          <div className="text-sm font-bold text-gray-700">Awaiting Estimate</div>
                        </div>
                      )}

                      {task.status === TASK_STATUS.ESTIMATED && (
                        <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5 text-sm sm:min-w-[180px] text-center shadow-sm">
                          <div className="text-amber-600/80 font-bold text-[11px] uppercase tracking-wider mb-1">Estimated</div>
                          <div className="text-3xl font-black text-amber-600 tracking-tight">{task.estimatedDays} <span className="text-lg">Days</span></div>
                          <div className="text-xs font-semibold text-amber-600/80 mt-1.5 bg-amber-100/50 py-1 rounded-md">{task.subtasks?.length || 0} subtasks</div>
                        </div>
                      )}

                      {task.status === TASK_STATUS.PENDING_START && (
                        <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-5 text-sm sm:min-w-[180px] text-center">
                          <div className="text-emerald-700/80 font-bold text-[11px] uppercase tracking-wider mb-1">Target</div>
                          <div className="text-3xl font-black text-emerald-600 tracking-tight">{task.assignedDays} <span className="text-lg">Days</span></div>
                          {task.bufferDays > 0 && (
                            <div className="text-[11px] text-blue-600 font-bold mt-2 bg-blue-100/50 py-1 rounded-md flex items-center justify-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> +{task.bufferDays}d Buffer Saved
                            </div>
                          )}
                        </div>
                      )}

                      {task.status === 'In Progress' && (
                        <div className="bg-blue-50 border border-blue-200/60 rounded-2xl p-5 text-sm sm:min-w-[180px] text-center">
                          <div className="text-blue-700/80 font-bold text-[11px] uppercase tracking-wider mb-1">In Progress</div>
                          <div className="text-3xl font-black text-blue-600 tracking-tight">{task.assignedDays} <span className="text-lg">Days</span></div>
                          <div className="mt-2 space-y-1">
                            <div className="text-xs font-semibold text-blue-700/60">Est: {task.estimatedDays}d</div>
                            {task.bufferDays > 0 && (
                              <div className="text-[11px] text-blue-700 font-bold bg-blue-100/50 py-1 rounded-md flex items-center justify-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> +{task.bufferDays}d Buffer Saved
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {task.status === 'Completed' && (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm sm:min-w-[180px] text-center relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                          <div className="text-gray-500 font-bold text-[11px] uppercase tracking-wider mb-1">Completed In</div>
                          {(() => {
                            let daysCompleted;
                            if (task.startedAt && task.completedAt) {
                              const start = new Date(task.startedAt);
                              const end = new Date(task.completedAt);
                              const diffTime = Math.max(0, end.getTime() - start.getTime());
                              daysCompleted = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            } else if (task.completedAt) {
                              daysCompleted = 1;
                            } else {
                              daysCompleted = task.assignedDays || 0;
                            }
                            return <div className="text-3xl font-black text-gray-900 tracking-tight">{daysCompleted} <span className="text-lg">Days</span></div>;
                          })()}
                          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                            <div className="text-xs font-medium text-gray-500">Est: {task.estimatedDays}d</div>
                            {task.bufferDays > 0 && (
                              <div className="text-[11px] text-[#1e3a5f] font-bold flex items-center justify-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-amber-500" /> +{task.bufferDays}d Taken
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
