export const computeCriticalChain = (projTasks: any[]) => {
  const flatNodes: any[] = [];
  projTasks.forEach(t => {
    flatNodes.push({
      id: String(t.id),
      assignedDays: t.assignedDays || 1,
      predecessors: (t.predecessors || []).map(String)
    });
    if (t.subtasks) {
      t.subtasks.forEach((st: any) => {
        flatNodes.push({
          id: String(st.id),
          assignedDays: Math.ceil((Number(st.days) || 1) * 0.7),
          predecessors: (st.predecessors || []).map(String)
        });
      });
    }
  });

  const tasksById = new Map<string, any>();
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  flatNodes.forEach(t => {
    tasksById.set(t.id, t);
    adj.set(t.id, []);
    inDegree.set(t.id, 0);
  });

  // Build graph
  flatNodes.forEach(t => {
    if (t.predecessors) {
      t.predecessors.forEach((pId: string) => {
        if (tasksById.has(pId)) {
          adj.get(pId)!.push(t.id);
          inDegree.set(t.id, inDegree.get(t.id)! + 1);
        }
      });
    }
  });

  // Topo sort
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    topoOrder.push(u);
    adj.get(u)!.forEach(v => {
      inDegree.set(v, inDegree.get(v)! - 1);
      if (inDegree.get(v) === 0) queue.push(v);
    });
  }

  // Forward Pass (ES, EF)
  const ES = new Map<string, number>();
  const EF = new Map<string, number>();

  topoOrder.forEach(u => {
    const task = tasksById.get(u)!;
    const duration = task.assignedDays || 1; // Default to 1 to avoid 0 length critical paths
    let maxES = 0;
    if (task.predecessors) {
      task.predecessors.forEach((pId: string) => {
        if (EF.has(pId)) {
          maxES = Math.max(maxES, EF.get(pId)!);
        }
      });
    }
    ES.set(u, maxES);
    EF.set(u, maxES + duration);
  });

  let projectDuration = 0;
  EF.forEach(val => { projectDuration = Math.max(projectDuration, val); });

  // Backward Pass (LF, LS)
  const LF = new Map<string, number>();
  const LS = new Map<string, number>();

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const u = topoOrder[i];
    const task = tasksById.get(u)!;
    const duration = task.assignedDays || 1;
    let minLF = projectDuration;
    
    const successors = adj.get(u)!;
    if (successors.length > 0) {
      minLF = Infinity;
      successors.forEach(v => {
        if (LS.has(v)) {
          minLF = Math.min(minLF, LS.get(v)!);
        }
      });
    }
    
    LF.set(u, minLF);
    LS.set(u, minLF - duration);
  }

  // Identify Critical vs Feeding
  const chainMap = new Map<string, 'Critical' | 'Feeding'>();
  topoOrder.forEach(u => {
    const ef = EF.get(u)!;
    const lf = LF.get(u)!;
    if (lf === ef) {
      chainMap.set(u, 'Critical');
    } else {
      chainMap.set(u, 'Feeding');
    }
  });

  return chainMap;
};
