import os
import json
import time
import bcrypt
import streamlit as st
from typing import List, Dict, Any, Optional

# PostgreSQL connection pool attempt
def get_db_url():
    # Priority: st.secrets -> os.environ
    try:
        if "SUPABASE_URL" in st.secrets:
            return st.secrets["SUPABASE_URL"]
        if "DATABASE_URL" in st.secrets:
            return st.secrets["DATABASE_URL"]
    except Exception:
        pass
    return os.environ.get("SUPABASE_URL") or os.environ.get("DATABASE_URL")

def get_connection():
    db_url = get_db_url()
    if not db_url:
        return None
    try:
        import psycopg2
        conn = psycopg2.connect(db_url, connect_timeout=4)
        return conn
    except Exception as e:
        print(f"PostgreSQL connection failed, using local JSON fallback: {e}")
        return None

# Local JSON Storage Helpers
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def load_json(filename: str) -> list:
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return []

def save_json(filename: str, data: list):
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        print(f"Error writing {filename}: {e}")

# ---------------- USER OPERATIONS ----------------

def get_users() -> List[Dict[str, Any]]:
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, role, manager_id, password_hash FROM public.users;")
                rows = cur.fetchall()
                users = []
                for r in rows:
                    users.append({
                        "id": r[0],
                        "name": r[1],
                        "role": r[2],
                        "managerId": r[3],
                        "password_hash": r[4]
                    })
                return users
        except Exception as e:
            print(f"DB Error get_users: {e}")
        finally:
            conn.close()
    return load_json("users.json")

def create_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    user_id = user_data.get("id")
    if not user_id or not user_id.strip():
        user_id = f"u{int(time.time() * 1000)}"
    else:
        user_id = user_id.strip()

    plain_pw = user_data.get("password") or user_data.get("name", "").lower().replace(" ", "_")
    pwd_hash = bcrypt.hashpw(plain_pw.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")
    
    name = user_data.get("name")
    role = user_data.get("role")
    manager_id = user_data.get("managerId")

    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO public.users (id, name, role, manager_id, password_hash)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, name, role, manager_id;
                """, (user_id, name, role, manager_id, pwd_hash))
                r = cur.fetchone()
                conn.commit()
                return {"id": r[0], "name": r[1], "role": r[2], "managerId": r[3]}
        except Exception as e:
            print(f"DB Error create_user: {e}")
        finally:
            conn.close()

    users = load_json("users.json")
    new_user = {
        "id": user_id,
        "name": name,
        "role": role,
        "managerId": manager_id,
        "password_hash": pwd_hash
    }
    users.append(new_user)
    save_json("users.json", users)
    return new_user

def update_user(user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                clauses = []
                params = []
                if "name" in updates:
                    clauses.append("name = %s")
                    params.append(updates["name"])
                if "role" in updates:
                    clauses.append("role = %s")
                    params.append(updates["role"])
                if "managerId" in updates:
                    clauses.append("manager_id = %s")
                    params.append(updates["managerId"])
                
                if clauses:
                    params.append(user_id)
                    query = f"UPDATE public.users SET {', '.join(clauses)} WHERE id = %s RETURNING id, name, role, manager_id;"
                    cur.execute(query, tuple(params))
                    r = cur.fetchone()
                    conn.commit()
                    if r:
                        return {"id": r[0], "name": r[1], "role": r[2], "managerId": r[3]}
        except Exception as e:
            print(f"DB Error update_user: {e}")
        finally:
            conn.close()

    users = load_json("users.json")
    for u in users:
        if u["id"] == user_id:
            u.update(updates)
            save_json("users.json", users)
            return u
    return None

def verify_login(username_or_id: str, plain_password: str) -> Optional[Dict[str, Any]]:
    users = get_users()
    target_id = username_or_id.strip()
    target_norm = username_or_id.strip().lower()

    for u in users:
        name_norm = u["name"].lower().replace(" ", "_")
        if u["id"] == target_id or name_norm == target_norm:
            stored_hash = u.get("password_hash")
            if stored_hash and bcrypt.checkpw(plain_password.encode("utf-8"), stored_hash.encode("utf-8")):
                return {
                    "id": u["id"],
                    "name": u["name"],
                    "role": u["role"],
                    "managerId": u.get("managerId") or u.get("manager_id")
                }
    return None

def change_password(user_id: str, old_pw: str, new_pw: str) -> bool:
    users = get_users()
    target = next((u for u in users if u["id"] == user_id), None)
    if not target:
        return False
    
    stored_hash = target.get("password_hash")
    if not stored_hash or not bcrypt.checkpw(old_pw.encode("utf-8"), stored_hash.encode("utf-8")):
        return False

    new_hash = bcrypt.hashpw(new_pw.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")
    
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE public.users SET password_hash = %s WHERE id = %s;", (new_hash, user_id))
                conn.commit()
                return True
        except Exception as e:
            print(f"DB Error change_password: {e}")
        finally:
            conn.close()

    local_users = load_json("users.json")
    for u in local_users:
        if u["id"] == user_id:
            u["password_hash"] = new_hash
            save_json("users.json", local_users)
            return True
    return False

def admin_reset_password(target_user_id: str, new_pw: str) -> bool:
    new_hash = bcrypt.hashpw(new_pw.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE public.users SET password_hash = %s WHERE id = %s;", (new_hash, target_user_id))
                conn.commit()
                return True
        except Exception as e:
            print(f"DB Error admin_reset_password: {e}")
        finally:
            conn.close()

    local_users = load_json("users.json")
    for u in local_users:
        if u["id"] == target_user_id:
            u["password_hash"] = new_hash
            save_json("users.json", local_users)
            return True
    return False


# ---------------- PROJECT OPERATIONS ----------------

def get_projects() -> List[Dict[str, Any]]:
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, deadline, pm_id, status, buffer_pool, 
                           description, category, priority, client_id, client_name, 
                           business_case, rm_list
                    FROM public.projects;
                """)
                rows = cur.fetchall()
                projects = []
                for r in rows:
                    projects.append({
                        "id": r[0],
                        "name": r[1],
                        "deadline": r[2].isoformat() if r[2] else "",
                        "pmId": r[3],
                        "status": r[4],
                        "bufferPool": r[5],
                        "description": r[6],
                        "category": r[7],
                        "priority": r[8],
                        "clientId": r[9],
                        "clientName": r[10],
                        "businessCase": r[11] if r[11] is not None else [],
                        "rmList": r[12] if r[12] is not None else []
                    })
                return projects
        except Exception as e:
            print(f"DB Error get_projects: {e}")
        finally:
            conn.close()

    return load_json("projects.json")

def create_project(project: Dict[str, Any]) -> Dict[str, Any]:
    proj_id = f"p{int(time.time() * 1000)}"
    project_record = {
        "id": proj_id,
        "name": project.get("name"),
        "deadline": project.get("deadline"),
        "pmId": project.get("pmId"),
        "status": "Planning",
        "bufferPool": 0,
        "description": project.get("description", ""),
        "category": project.get("category", ""),
        "priority": project.get("priority", "Medium"),
        "clientId": project.get("clientId", ""),
        "clientName": project.get("clientName", ""),
        "businessCase": project.get("businessCase", []),
        "rmList": project.get("rmList", [])
    }

    conn = get_connection()
    if conn:
        try:
            import psycopg2.extras
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO public.projects (
                        id, name, deadline, pm_id, status, buffer_pool, 
                        description, category, priority, client_id, client_name, 
                        business_case, rm_list
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    proj_id, project_record["name"], project_record["deadline"],
                    project_record["pmId"], project_record["status"], project_record["bufferPool"],
                    project_record["description"], project_record["category"], project_record["priority"],
                    project_record["clientId"], project_record["clientName"],
                    psycopg2.extras.Json(project_record["businessCase"]),
                    psycopg2.extras.Json(project_record["rmList"])
                ))
                conn.commit()
                return project_record
        except Exception as e:
            print(f"DB Error create_project: {e}")
        finally:
            conn.close()

    projects = load_json("projects.json")
    projects.append(project_record)
    save_json("projects.json", projects)
    return project_record

def update_project(project_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    if conn:
        try:
            import psycopg2.extras
            key_map = {
                "pmId": "pm_id",
                "bufferPool": "buffer_pool",
                "clientId": "client_id",
                "clientName": "client_name",
                "businessCase": "business_case",
                "rmList": "rm_list"
            }
            clauses = []
            params = []
            for k, v in updates.items():
                db_k = key_map.get(k, k)
                clauses.append(f"{db_k} = %s")
                if k in ["businessCase", "rmList"]:
                    params.append(psycopg2.extras.Json(v))
                else:
                    params.append(v)
            if clauses:
                params.append(project_id)
                query = f"UPDATE public.projects SET {', '.join(clauses)} WHERE id = %s;"
                with conn.cursor() as cur:
                    cur.execute(query, tuple(params))
                    conn.commit()
        except Exception as e:
            print(f"DB Error update_project: {e}")
        finally:
            conn.close()

    projects = load_json("projects.json")
    for p in projects:
        if p["id"] == project_id:
            p.update(updates)
            save_json("projects.json", projects)
            return p
    return None


# ---------------- TASK OPERATIONS ----------------

def get_tasks() -> List[Dict[str, Any]]:
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, title, specs, assigned_to, project_id, status, 
                           duration_value, duration_unit, final_total_days, 
                           assigned_days, buffer_days, predecessors, subtasks, 
                           started_at, completed_at, delay_justification,
                           delegated_to, delegate_requested_by, delegate_request_status,
                           buffer_request_days, buffer_request_status,
                           extension_day_logs, task_daily_logs, prerequisites_checklist
                    FROM public.tasks;
                """)
                rows = cur.fetchall()
                tasks = []
                for r in rows:
                    tasks.append({
                        "id": r[0],
                        "title": r[1],
                        "specs": r[2],
                        "assignedTo": r[3],
                        "projectId": r[4],
                        "status": r[5],
                        "durationValue": float(r[6]) if r[6] is not None else None,
                        "durationUnit": r[7],
                        "finalTotalDays": r[8],
                        "assignedDays": r[9],
                        "bufferDays": r[10],
                        "predecessors": r[11] or [],
                        "subtasks": r[12] or [],
                        "startedAt": r[13].isoformat() if r[13] else None,
                        "completedAt": r[14].isoformat() if r[14] else None,
                        "delayJustification": r[15],
                        "delegatedTo": r[16],
                        "delegateRequestedBy": r[17],
                        "delegateRequestStatus": r[18],
                        "bufferRequestDays": r[19],
                        "bufferRequestStatus": r[20],
                        "extensionDayLogs": r[21] or [],
                        "taskDailyLogs": r[22] or [],
                        "prerequisitesChecklist": r[23] or []
                    })
                return tasks
        except Exception as e:
            print(f"DB Error get_tasks: {e}")
        finally:
            conn.close()

    return load_json("tasks.json")

def create_task(task_data: Dict[str, Any]) -> Dict[str, Any]:
    new_id = task_data.get("id") or f"t{int(time.time() * 1000)}"
    task_record = {
        "id": new_id,
        "title": task_data.get("title", ""),
        "specs": task_data.get("specs", ""),
        "assignedTo": task_data.get("assignedTo"),
        "projectId": task_data.get("projectId"),
        "status": task_data.get("status", "Approved (Work in Progress)"),
        "durationValue": task_data.get("durationValue", 1.0),
        "durationUnit": task_data.get("durationUnit", "days"),
        "finalTotalDays": task_data.get("finalTotalDays", 1),
        "assignedDays": task_data.get("assignedDays", 1),
        "bufferDays": task_data.get("bufferDays", 0),
        "predecessors": task_data.get("predecessors", []),
        "subtasks": task_data.get("subtasks", []),
        "prerequisitesChecklist": task_data.get("prerequisitesChecklist", []),
        "startedAt": None,
        "completedAt": None
    }

    conn = get_connection()
    if conn:
        try:
            import psycopg2.extras
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO public.tasks (
                        id, title, specs, assigned_to, project_id, status,
                        duration_value, duration_unit, final_total_days, assigned_days,
                        buffer_days, predecessors, subtasks, prerequisites_checklist
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    task_record["id"], task_record["title"], task_record["specs"],
                    task_record["assignedTo"], task_record["projectId"], task_record["status"],
                    task_record["durationValue"], task_record["durationUnit"],
                    task_record["finalTotalDays"], task_record["assignedDays"], task_record["bufferDays"],
                    psycopg2.extras.Json(task_record["predecessors"]),
                    psycopg2.extras.Json(task_record["subtasks"]),
                    psycopg2.extras.Json(task_record["prerequisitesChecklist"])
                ))
                conn.commit()
                return task_record
        except Exception as e:
            print(f"DB Error create_task: {e}")
        finally:
            conn.close()

    tasks = load_json("tasks.json")
    tasks.append(task_record)
    save_json("tasks.json", tasks)
    return task_record

def create_tasks_bulk(tasks_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    created = []
    base_time = int(time.time() * 1000)
    for idx, t in enumerate(tasks_list):
        t_copy = dict(t)
        t_copy["id"] = f"t{base_time}_{idx}"
        res = create_task(t_copy)
        created.append(res)
    return created

def update_task(task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    if conn:
        try:
            import psycopg2.extras
            key_map = {
                "assignedTo": "assigned_to",
                "projectId": "project_id",
                "durationValue": "duration_value",
                "durationUnit": "duration_unit",
                "finalTotalDays": "final_total_days",
                "assignedDays": "assigned_days",
                "bufferDays": "buffer_days",
                "startedAt": "started_at",
                "completedAt": "completed_at",
                "delayJustification": "delay_justification",
                "delegatedTo": "delegated_to",
                "delegateRequestedBy": "delegate_requested_by",
                "delegateRequestStatus": "delegate_request_status",
                "bufferRequestDays": "buffer_request_days",
                "bufferRequestStatus": "buffer_request_status",
                "extensionDayLogs": "extension_day_logs",
                "taskDailyLogs": "task_daily_logs",
                "prerequisitesChecklist": "prerequisites_checklist"
            }
            clauses = []
            params = []
            for k, v in updates.items():
                db_k = key_map.get(k, k)
                clauses.append(f"{db_k} = %s")
                if k in ["predecessors", "subtasks", "extensionDayLogs", "taskDailyLogs", "prerequisitesChecklist"]:
                    params.append(psycopg2.extras.Json(v) if v is not None else None)
                else:
                    params.append(v)

            if clauses:
                params.append(task_id)
                query = f"UPDATE public.tasks SET {', '.join(clauses)}, updated_at = now() WHERE id = %s;"
                with conn.cursor() as cur:
                    cur.execute(query, tuple(params))
                    conn.commit()
        except Exception as e:
            print(f"DB Error update_task: {e}")
        finally:
            conn.close()

    tasks = load_json("tasks.json")
    for t in tasks:
        if t["id"] == task_id:
            t.update(updates)
            save_json("tasks.json", tasks)
            return t
    return None
