from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import time
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

# Initialize Groq client
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

from utils.file_storage import read_data, write_data
from utils.db import fetch_all, fetch_one, execute_query
from psycopg2.extras import Json
import bcrypt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "project-management-backend"}


class User(BaseModel):
    id: Optional[str] = None       # manager-assigned login ID; auto-generated if omitted
    name: str
    role: str
    managerId: Optional[str] = None
    department: Optional[str] = None
    password: Optional[str] = None

class Project(BaseModel):
    name: str
    deadline: str
    pmId: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    businessCase: Optional[List[Dict[str, Any]]] = None
    rmList: Optional[List[Dict[str, Any]]] = None
    clientId: Optional[str] = None
    clientName: Optional[str] = None

class Task(BaseModel):
    title: str
    specs: str
    assignedTo: Any
    projectId: str
    predecessors: Optional[List[str]] = None
    status: Optional[str] = None
    durationValue: Optional[float] = None
    durationUnit: Optional[str] = None
    finalTotalDays: Optional[int] = None
    assignedDays: Optional[int] = None
    bufferDays: Optional[int] = None
    subtasks: Optional[List[Dict[str, Any]]] = None

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    assignedTo: Optional[Any] = None
    subtasks: Optional[List[Dict[str, Any]]] = None
    estimatedDays: Optional[int] = None
    estimateUnit: Optional[str] = None
    originalEstimate: Optional[float] = None
    finalTotalDays: Optional[int] = None
    assignedDays: Optional[int] = None
    bufferDays: Optional[int] = None
    predecessors: Optional[List[str]] = None
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    delegateRequestStatus: Optional[str] = None
    delegatedTo: Optional[str] = None
    delegateRequestedBy: Optional[str] = None
    bufferRequestDays: Optional[int] = None
    bufferRequestStatus: Optional[str] = None
    durationValue: Optional[float] = None
    durationUnit: Optional[str] = None
    delayJustification: Optional[str] = None
    extensionDayLogs: Optional[List[Dict[str, Any]]] = None
    taskDailyLogs: Optional[List[Dict[str, Any]]] = None
    taskDailyLogsCompleted: Optional[int] = None
    prerequisitesChecklist: Optional[List[Dict[str, Any]]] = None

class ProjectUpdate(BaseModel):
    bufferPool: Optional[int] = None
    status: Optional[str] = None
    description: Optional[str] = None
    pmId: Optional[str] = None
    deadline: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    businessCase: Optional[List[Dict[str, Any]]] = None
    rmList: Optional[List[Dict[str, Any]]] = None
    clientId: Optional[str] = None
    clientName: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    managerId: Optional[str] = None

# Helper functions for Task mapping
def map_db_task_to_frontend(t: dict) -> dict:
    if not t:
        return t
    if t.get("started_at"):
        t["startedAt"] = t["started_at"].isoformat() if hasattr(t["started_at"], "isoformat") else str(t["started_at"])
    else:
        t["startedAt"] = None
    t.pop("started_at", None)
        
    if t.get("completed_at"):
        t["completedAt"] = t["completed_at"].isoformat() if hasattr(t["completed_at"], "isoformat") else str(t["completed_at"])
    else:
        t["completedAt"] = None
    t.pop("completed_at", None)
        
    for numeric_field in ["duration_value", "original_estimate"]:
        if t.get(numeric_field) is not None:
            t[numeric_field] = float(t[numeric_field])
            
    t["projectId"] = t.pop("project_id", None)
    t["assignedTo"] = t.pop("assigned_to", None)
    t["durationValue"] = t.pop("duration_value", None)
    t["durationUnit"] = t.pop("duration_unit", None)
    t["estimatedDays"] = t.pop("estimated_days", None)
    t["estimateUnit"] = t.pop("estimate_unit", None)
    t["originalEstimate"] = t.pop("original_estimate", None)
    t["finalTotalDays"] = t.pop("final_total_days", None)
    t["assignedDays"] = t.pop("assigned_days", None)
    t["bufferDays"] = t.pop("buffer_allocated", None)
    t["bufferConsumed"] = t.pop("buffer_consumed", None)
    t["delayJustification"] = t.pop("delay_justification", None)
    t["taskDailyLogsCompleted"] = t.pop("task_daily_logs_completed", None)
    t["subtasks"] = t.pop("subtasks", None)
    t["taskDailyLogs"] = t.pop("task_daily_logs", None)
    t["extensionDayLogs"] = t.pop("extension_day_logs", None)
    t["prerequisitesChecklist"] = t.pop("prerequisites_checklist", None)
    
    t["delegateRequestStatus"] = None
    t["delegatedTo"] = None
    t["delegateRequestedBy"] = None
    t["bufferRequestDays"] = None
    t["bufferRequestStatus"] = None
    return t

def map_frontend_task_to_db(t: dict) -> dict:
    db_t = {}
    key_mapping = {
        "id": "id",
        "projectId": "project_id",
        "assignedTo": "assigned_to",
        "durationValue": "duration_value",
        "durationUnit": "duration_unit",
        "estimatedDays": "estimated_days",
        "estimateUnit": "estimate_unit",
        "originalEstimate": "original_estimate",
        "finalTotalDays": "final_total_days",
        "assignedDays": "assigned_days",
        "startedAt": "started_at",
        "completedAt": "completed_at",
        "bufferDays": "buffer_allocated",
        "bufferConsumed": "buffer_consumed",
        "delayJustification": "delay_justification",
        "taskDailyLogsCompleted": "task_daily_logs_completed",
        "subtasks": "subtasks",
        "taskDailyLogs": "task_daily_logs",
        "extensionDayLogs": "extension_day_logs",
        "prerequisitesChecklist": "prerequisites_checklist",
        "predecessors": "predecessors",
        "title": "title",
        "specs": "specs",
        "status": "status"
    }
    for k, v in t.items():
        if k in key_mapping:
            db_key = key_mapping[k]
            if k in ["subtasks", "taskDailyLogs", "extensionDayLogs", "prerequisitesChecklist"]:
                db_t[db_key] = Json(v) if v is not None else Json([])
            elif k == "assignedTo":
                if isinstance(v, str):
                    db_t[db_key] = [v]
                elif isinstance(v, list):
                    db_t[db_key] = [str(x) for x in v]
                else:
                    db_t[db_key] = []
            elif k == "predecessors":
                if isinstance(v, str):
                    db_t[db_key] = [v]
                elif isinstance(v, list):
                    db_t[db_key] = [str(x) for x in v]
                else:
                    db_t[db_key] = []
            elif k in ["startedAt", "completedAt"] and v == "":
                db_t[db_key] = None
            else:
                db_t[db_key] = v
    return db_t

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
async def login(req: LoginRequest):
    username_normalized = req.username.strip().lower()
    query = """
        SELECT id, name, role, manager_id, password_hash
        FROM public.users
        WHERE id = %s OR LOWER(REPLACE(name, ' ', '_')) = %s;
    """
    user = fetch_one(query, (req.username.strip(), username_normalized))
    if not user:
         raise HTTPException(status_code=401, detail="Invalid username or password.")
    stored_hash = user.get("password_hash")
    if not stored_hash:
         raise HTTPException(status_code=401, detail="Invalid username or password.")
    try:
         if bcrypt.checkpw(req.password.encode("utf-8"), stored_hash.encode("utf-8")):
              return {
                   "id": user["id"],
                   "name": user["name"],
                   "role": user["role"],
                   "managerId": user["manager_id"]
              }
    except Exception as e:
         print(f"Error checking password: {e}")
    raise HTTPException(status_code=401, detail="Invalid username or password.")

@app.get("/api/users")
async def get_users():
    users = fetch_all("SELECT id, name, role, manager_id FROM public.users;")
    for u in users:
        u["managerId"] = u.pop("manager_id")
    return users

@app.post("/api/users")
async def create_user(user: User):
    # Use manager-supplied ID or fall back to auto-generation
    user_id = user.id.strip() if user.id and user.id.strip() else f"u{int(time.time() * 1000)}"

    # Check for duplicate ID
    existing = fetch_one("SELECT id FROM public.users WHERE id = %s;", (user_id,))
    if existing:
        raise HTTPException(status_code=409, detail=f"Login ID '{user_id}' is already taken. Please choose a different ID.")

    # Use admin-supplied password; fall back to name-based default if none provided
    plain_password = user.password if user.password else user.name.lower().replace(" ", "_")
    pwd_hash = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")
    query = """
        INSERT INTO public.users (id, name, role, manager_id, password_hash)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, name, role, manager_id;
    """
    res = execute_query(query, (user_id, user.name, user.role, user.managerId, pwd_hash), returning=True)
    if res:
        res["managerId"] = res.pop("manager_id")
        return res
    raise HTTPException(status_code=500, detail="Failed to create user")


@app.put("/api/users/{user_id}")
async def update_user(user_id: str, update: UserUpdate):
    updates = update.dict(exclude_unset=True)
    if not updates:
        res = fetch_one("SELECT id, name, role, manager_id FROM public.users WHERE id = %s;", (user_id,))
        if res:
            res["managerId"] = res.pop("manager_id")
            return res
        raise HTTPException(status_code=404, detail="User not found")
    set_clauses = []
    params = []
    for k, v in updates.items():
        db_key = "manager_id" if k == "managerId" else k
        set_clauses.append(f"{db_key} = %s")
        params.append(v)
    params.append(user_id)
    query = f"""
        UPDATE public.users
        SET {', '.join(set_clauses)}, updated_at = now()
        WHERE id = %s
        RETURNING id, name, role, manager_id;
    """
    res = execute_query(query, tuple(params), returning=True)
    if res:
        res["managerId"] = res.pop("manager_id")
        return res
    raise HTTPException(status_code=404, detail="User not found")


class ChangePasswordRequest(BaseModel):
    userId: str
    oldPassword: str
    newPassword: str

@app.post("/api/change-password")
async def change_password(req: ChangePasswordRequest):
    # Fetch the stored hash
    row = fetch_one(
        "SELECT id, password_hash FROM public.users WHERE id = %s;",
        (req.userId,)
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")
    stored_hash = row.get("password_hash")
    if not stored_hash:
        raise HTTPException(status_code=400, detail="No password set for this user.")
    # Verify old password
    try:
        if not bcrypt.checkpw(req.oldPassword.encode("utf-8"), stored_hash.encode("utf-8")):
            raise HTTPException(status_code=401, detail="Current password is incorrect.")
    except Exception:
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    # Hash and save new password
    new_hash = bcrypt.hashpw(req.newPassword.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")
    execute_query(
        "UPDATE public.users SET password_hash = %s, updated_at = now() WHERE id = %s;",
        (new_hash, req.userId),
        returning=False
    )
    return {"success": True, "message": "Password changed successfully."}


class AdminResetPasswordRequest(BaseModel):
    targetUserId: str
    newPassword: str

@app.post("/api/admin-reset-password")
async def admin_reset_password(req: AdminResetPasswordRequest):
    """
    Called by a supervisor (R&D Head, MD, PM) to reset a subordinate's password.
    No old password required — admin authority action.
    """
    if len(req.newPassword) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    # Verify target user exists
    row = fetch_one("SELECT id FROM public.users WHERE id = %s;", (req.targetUserId,))
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")
    new_hash = bcrypt.hashpw(req.newPassword.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")
    execute_query(
        "UPDATE public.users SET password_hash = %s, updated_at = now() WHERE id = %s;",
        (new_hash, req.targetUserId),
        returning=False
    )
    return {"success": True, "message": "Password reset successfully."}

@app.get("/api/projects")
async def get_projects():
    projects = fetch_all("""
        SELECT id, name, deadline, pm_id, status, buffer_pool, 
               description, category, priority, client_id, client_name, 
               business_case, rm_list
        FROM public.projects;
    """)
    for p in projects:
        if p.get("deadline"):
            p["deadline"] = p["deadline"].isoformat()
        p["pmId"] = p.pop("pm_id")
        p["bufferPool"] = p.pop("buffer_pool")
        p["clientId"] = p.pop("client_id")
        p["clientName"] = p.pop("client_name")
        p["businessCase"] = p.pop("business_case")
        p["rmList"] = p.pop("rm_list")
    return projects

@app.post("/api/projects")
async def create_project(project: Project):
    proj_id = f"p{int(time.time() * 1000)}"
    query = """
        INSERT INTO public.projects (
            id, name, deadline, pm_id, status, buffer_pool, 
            description, category, priority, client_id, client_name, 
            business_case, rm_list
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, name, deadline, pm_id, status, buffer_pool, 
                  description, category, priority, client_id, client_name, 
                  business_case, rm_list;
    """
    res = execute_query(query, (
        proj_id,
        project.name,
        project.deadline,
        project.pmId,
        "Planning",
        0,
        project.description,
        project.category,
        project.priority,
        project.clientId,
        project.clientName,
        Json(project.businessCase) if project.businessCase is not None else None,
        Json(project.rmList) if project.rmList is not None else None
    ), returning=True)
    if res:
        if res.get("deadline"):
            res["deadline"] = res["deadline"].isoformat()
        res["pmId"] = res.pop("pm_id")
        res["bufferPool"] = res.pop("buffer_pool")
        res["clientId"] = res.pop("client_id")
        res["clientName"] = res.pop("client_name")
        res["businessCase"] = res.pop("business_case")
        res["rmList"] = res.pop("rm_list")
        return res
    raise HTTPException(status_code=500, detail="Failed to create project")

@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, update: ProjectUpdate):
    updates = update.dict(exclude_unset=True)
    if not updates:
        res = fetch_one("SELECT * FROM public.projects WHERE id = %s;", (project_id,))
        if res:
            if res.get("deadline"):
                res["deadline"] = res["deadline"].isoformat()
            res["pmId"] = res.pop("pm_id")
            res["bufferPool"] = res.pop("buffer_pool")
            res["clientId"] = res.pop("client_id")
            res["clientName"] = res.pop("client_name")
            res["businessCase"] = res.pop("business_case")
            res["rmList"] = res.pop("rm_list")
            return res
        raise HTTPException(status_code=404, detail="Project not found")
    set_clauses = []
    params = []
    key_mapping = {
        "pmId": "pm_id",
        "bufferPool": "buffer_pool",
        "clientId": "client_id",
        "clientName": "client_name",
        "businessCase": "business_case",
        "rmList": "rm_list"
    }
    for k, v in updates.items():
        db_key = key_mapping.get(k, k)
        set_clauses.append(f"{db_key} = %s")
        if k in ["businessCase", "rmList"] and v is not None:
            params.append(Json(v))
        else:
            params.append(v)
    params.append(project_id)
    query = f"""
        UPDATE public.projects
        SET {', '.join(set_clauses)}, updated_at = now()
        WHERE id = %s
        RETURNING id, name, deadline, pm_id, status, buffer_pool, 
                  description, category, priority, client_id, client_name, 
                  business_case, rm_list;
    """
    res = execute_query(query, tuple(params), returning=True)
    if res:
        if res.get("deadline"):
            res["deadline"] = res["deadline"].isoformat()
        res["pmId"] = res.pop("pm_id")
        res["bufferPool"] = res.pop("buffer_pool")
        res["clientId"] = res.pop("client_id")
        res["clientName"] = res.pop("client_name")
        res["businessCase"] = res.pop("business_case")
        res["rmList"] = res.pop("rm_list")
        return res
    raise HTTPException(status_code=404, detail="Project not found")

@app.get("/api/tasks")
async def get_tasks():
    tasks = fetch_all("SELECT * FROM public.tasks;")
    return [map_db_task_to_frontend(t) for t in tasks]

class BulkTasks(BaseModel):
    tasks: List[Task]

@app.post("/api/tasks")
async def create_task(task: Task):
    new_task = task.dict()
    new_task["id"] = f"t{int(time.time() * 1000)}"
    if not new_task.get("status"):
        new_task["status"] = "Approved (Work in Progress)"
    db_task = map_frontend_task_to_db(new_task)
    columns = list(db_task.keys())
    placeholders = [f"%s" for _ in columns]
    query = f"""
        INSERT INTO public.tasks ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        RETURNING *;
    """
    res = execute_query(query, tuple(db_task.values()), returning=True)
    if res:
        return map_db_task_to_frontend(res)
    raise HTTPException(status_code=500, detail="Failed to create task")

@app.post("/api/tasks/bulk")
async def create_tasks_bulk(bulk: BulkTasks):
    try:
        created_tasks = []
        base_time = int(time.time() * 1000)
        for idx, task in enumerate(bulk.tasks):
            new_task = task.dict()
            new_task["id"] = f"t{base_time}_{idx}"
            if not new_task.get("status"):
                new_task["status"] = "Approved (Work in Progress)"
            db_task = map_frontend_task_to_db(new_task)
            columns = list(db_task.keys())
            placeholders = [f"%s" for _ in columns]
            query = f"""
                INSERT INTO public.tasks ({', '.join(columns)})
                VALUES ({', '.join(placeholders)})
                RETURNING *;
            """
            res = execute_query(query, tuple(db_task.values()), returning=True)
            if res:
                created_tasks.append(map_db_task_to_frontend(res))
        return created_tasks
    except Exception as e:
        print(f"Error in /api/tasks/bulk: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: str, update: TaskUpdate):
    updates = update.dict(exclude_unset=True)
    if not updates:
        res = fetch_one("SELECT * FROM public.tasks WHERE id = %s;", (task_id,))
        if res:
            return map_db_task_to_frontend(res)
        raise HTTPException(status_code=404, detail="Task not found")
    db_task = map_frontend_task_to_db(updates)
    set_clauses = []
    params = []
    for k, v in db_task.items():
        set_clauses.append(f"{k} = %s")
        params.append(v)
    params.append(task_id)
    query = f"""
        UPDATE public.tasks
        SET {', '.join(set_clauses)}, updated_at = now()
        WHERE id = %s
        RETURNING *;
    """
    res = execute_query(query, tuple(params), returning=True)
    if res:
        return map_db_task_to_frontend(res)
    raise HTTPException(status_code=404, detail="Task not found")

class AIInsightsRequest(BaseModel):
    departmentName: str
    isOverall: bool
    tasks: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]

@app.post("/api/ai-insights")
async def generate_ai_insights(req: AIInsightsRequest):
    try:
        context_str = f"Department/Context: {req.departmentName}\nOverall View: {req.isOverall}\n"
        context_str += f"Total Projects Context: {len(req.projects)}\n"
        context_str += f"Total Tasks Context: {len(req.tasks)}\n\n"
        
        # Classify tasks
        delayed_tasks = []
        early_completed_tasks = []
        in_progress_tasks = []
        pending_tasks = []
        all_task_ids = {str(t.get('id')): t for t in req.tasks}

        from datetime import datetime, timedelta

        def working_days_elapsed(start_str):
            try:
                start = datetime.fromisoformat(start_str.replace('Z',''))
                today = datetime.now()
                count = 0
                cur = start
                while cur < today:
                    if cur.weekday() < 6:  # not Sunday
                        count += 1
                    cur += timedelta(days=1)
                return count
            except:
                return 0

        for t in req.tasks:
            status = t.get('status', '')
            title = t.get('title', 'Untitled')
            assigned_days = t.get('assignedDays') or t.get('finalTotalDays') or 0
            started_at = t.get('startedAt')
            completed_at = t.get('completedAt')
            preds = t.get('predecessors', [])
            successors = []
            for other in req.tasks:
                other_preds = other.get('predecessors', [])
                if str(t.get('id')) in [str(p) for p in other_preds]:
                    successors.append(other.get('title', 'Untitled'))

            if status == 'In Progress' or (started_at and status != 'Completed'):
                elapsed = working_days_elapsed(started_at) if started_at else 0
                overdue_by = elapsed - assigned_days if assigned_days else 0
                in_progress_tasks.append({
                    'title': title,
                    'assigned_days': assigned_days,
                    'elapsed': elapsed,
                    'overdue_by': overdue_by,
                    'successors': successors
                })
                if overdue_by > 0:
                    delayed_tasks.append({
                        'title': title,
                        'overdue_by': round(overdue_by, 1),
                        'successors': successors
                    })

            elif status == 'Completed' and started_at and completed_at and assigned_days:
                try:
                    actual_days = working_days_elapsed(started_at)
                    saved = assigned_days - actual_days
                    if saved > 0:
                        early_completed_tasks.append({
                            'title': title,
                            'saved_days': round(saved, 1),
                            'successors': successors
                        })
                except:
                    pass

            elif status in ('Pending Start', 'Estimated (Pending PM Review)'):
                all_preds_done = True
                for pid in preds:
                    pred_task = all_task_ids.get(str(pid))
                    if pred_task and pred_task.get('status') != 'Completed':
                        all_preds_done = False
                        break
                pending_tasks.append({
                    'title': title,
                    'preds_done': all_preds_done
                })

        context_str += "--- DELAYED TASKS (overdue by N working days) ---\n"
        if delayed_tasks:
            for d in delayed_tasks[:10]:
                succ_str = ', '.join(d['successors'][:3]) if d['successors'] else 'none'
                context_str += f"  DELAYED: \"{d['title']}\" overdue by {d['overdue_by']} days. Successors waiting: {succ_str}.\n"
        else:
            context_str += "  None\n"

        context_str += "\n--- EARLY COMPLETED TASKS (saved N working days) ---\n"
        if early_completed_tasks:
            for e in early_completed_tasks[:10]:
                succ_str = ', '.join(e['successors'][:3]) if e['successors'] else 'none'
                context_str += f"  EARLY DONE: \"{e['title']}\" saved {e['saved_days']} days. Successor tasks ready to start: {succ_str}.\n"
        else:
            context_str += "  None\n"

        context_str += "\n--- PENDING TASKS READY TO START (all predecessors complete) ---\n"
        ready = [p for p in pending_tasks if p['preds_done']]
        if ready:
            for r in ready[:10]:
                context_str += f"  READY: \"{r['title']}\"\n"
        else:
            context_str += "  None\n"

        context_str += "\n--- ALL IN-PROGRESS TASKS ---\n"
        for t in in_progress_tasks[:15]:
            status_note = f"overdue by {t['overdue_by']} days" if t['overdue_by'] > 0 else f"{t['elapsed']}/{t['assigned_days']} days elapsed"
            context_str += f"  - \"{t['title']}\" ({status_note})\n"

        prompt = f"""You are an AI Project Management Assistant for a pharmaceutical R&D company called Viruj Pharma.

Based on the real project data below, generate a professional summary and 4-7 specific, actionable recommendations.

Focus on these types of insights:
1. **Delayed tasks**: If a task is delayed, suggest other teams or departments to come forward and collaborate to get it back on track. Name the specific task and its downstream impact (successors waiting on it).
2. **Early completions**: If a task completed ahead of schedule, proactively recommend the team to begin the next successor task immediately to capitalise on the saved time.
3. **Ready-to-start tasks**: Highlight tasks that are now unblocked and should be started right away to maintain momentum.
4. **Cross-team collaboration**: Suggest where cross-functional teams can pool resources to accelerate delayed critical work.
5. **Risk escalation**: Flag if a delay is likely to cascade to other tasks, and recommend escalation to the project manager or MD.

Context:
{context_str}

Format your response as a JSON object with this EXACT structure:
{{
  "summaryText": "A 1-2 sentence executive summary of the current project health.",
  "actionItems": [
    {{
      "type": "warning",
      "text": "Specific recommendation referencing actual task names."
    }},
    {{
      "type": "success",
      "text": "Positive action to take based on early completion or unblocked tasks."
    }},
    {{
      "type": "info",
      "text": "General cross-team collaboration insight or proactive suggestion."
    }}
  ]
}}

Rules:
- Use "warning" for delays, cascade risks, and escalations
- Use "success" for early completions and opportunities to accelerate
- Use "info" for collaboration suggestions and general improvements
- Reference ACTUAL task names from the data — do not invent names
- Be specific and actionable, not generic
- Output only valid JSON, nothing else."""

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful project management AI assistant for Viruj Pharma. Output only valid JSON.",
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Error generating AI insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI insights")

class AIChatRequest(BaseModel):
    departmentName: str
    isOverall: bool
    tasks: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    messages: List[Dict[str, str]]

@app.post("/api/ai-chat")
async def handle_ai_chat(req: AIChatRequest):
    try:
        context_str = f"Department/Context: {req.departmentName}\nOverall View: {req.isOverall}\n"
        context_str += f"Total Projects Context: {len(req.projects)}\n"
        context_str += f"Total Tasks Context: {len(req.tasks)}\n\n"
        
        context_str += "Recent/Active Tasks:\n"
        for t in req.tasks[:30]:
            status = t.get('status', 'Unknown')
            title = t.get('title', 'Untitled')
            context_str += f"- {title} ({status})\n"
            
        system_prompt = f"""You are an AI Project Management Assistant named Viruj AI. 
Answer the user's questions based on the following context. 
If the user asks something outside the scope of project management or these tasks, politely decline.
Be concise and helpful.

Context:
{context_str}"""
        
        # Prepare messages
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(req.messages)

        chat_completion = groq_client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.5
        )
        
        return {"response": chat_completion.choices[0].message.content}
    except Exception as e:
        print(f"Error in AI chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI response")

if __name__ == "__main__":

    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
