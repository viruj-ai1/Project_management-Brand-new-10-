import os
import json
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager

DATABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("DATABASE_URL")

pool = None

def init_pool():
    global pool
    db_url = os.environ.get("SUPABASE_URL") or os.environ.get("DATABASE_URL")
    if db_url and not pool:
        try:
            pool = ThreadedConnectionPool(1, 15, db_url, connect_timeout=4)
            print("Database connection pool initialized successfully")
        except Exception as e:
            print(f"Error initializing connection pool: {e}")

try:
    init_pool()
except Exception as e:
    print(f"Pool init error: {e}")

@contextmanager
def get_db_connection():
    global pool
    if not pool:
        init_pool()
    if not pool:
        raise Exception("Database connection pool unavailable.")
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)

def fetch_all(query: str, params=None):
    """Executes a query and returns all rows as a list of dicts."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                if cur.description:
                    colnames = [desc[0] for desc in cur.description]
                    rows = cur.fetchall()
                    return [dict(zip(colnames, row)) for row in rows]
                return []
    except Exception as e:
        print(f"fetch_all DB error: {e}. Falling back to local data.")
        import db_adapter as dba
        if "users" in query.lower():
            users = dba.get_users()
            return [{"id": u["id"], "name": u["name"], "role": u["role"], "manager_id": u.get("managerId"), "password_hash": u.get("password_hash")} for u in users]
        elif "projects" in query.lower():
            projs = dba.get_projects()
            return [{"id": p["id"], "name": p["name"], "deadline": p.get("deadline"), "pm_id": p.get("pmId"), "status": p.get("status"), "buffer_pool": p.get("bufferPool"), "description": p.get("description"), "category": p.get("category"), "priority": p.get("priority"), "client_id": p.get("clientId"), "client_name": p.get("clientName"), "business_case": p.get("businessCase"), "rm_list": p.get("rmList")} for p in projs]
        elif "tasks" in query.lower():
            tasks = dba.get_tasks()
            return [{"id": t["id"], "title": t["title"], "specs": t.get("specs"), "assigned_to": t.get("assignedTo"), "project_id": t.get("projectId"), "status": t.get("status"), "duration_value": t.get("durationValue"), "duration_unit": t.get("durationUnit"), "final_total_days": t.get("finalTotalDays"), "assigned_days": t.get("assignedDays"), "buffer_days": t.get("bufferDays"), "predecessors": t.get("predecessors"), "subtasks": t.get("subtasks"), "started_at": t.get("startedAt"), "completed_at": t.get("completedAt"), "delay_justification": t.get("delayJustification"), "delegated_to": t.get("delegatedTo"), "delegate_requested_by": t.get("delegateRequestedBy"), "delegate_request_status": t.get("delegateRequestStatus"), "buffer_request_days": t.get("bufferRequestDays"), "buffer_request_status": t.get("bufferRequestStatus"), "extension_day_logs": t.get("extensionDayLogs"), "task_daily_logs": t.get("taskDailyLogs"), "prerequisites_checklist": t.get("prerequisitesChecklist")} for t in tasks]
        return []

def fetch_one(query: str, params=None):
    """Executes a query and returns a single row as a dict, or None."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                if cur.description:
                    colnames = [desc[0] for desc in cur.description]
                    row = cur.fetchone()
                    return dict(zip(colnames, row)) if row else None
                return None
    except Exception as e:
        print(f"fetch_one DB error: {e}. Falling back.")
        rows = fetch_all(query, params)
        return rows[0] if rows else None

def execute_query(query: str, params=None, returning=False):
    """Executes a query and commits the transaction."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                conn.commit()
                if returning and cur.description:
                    colnames = [desc[0] for desc in cur.description]
                    row = cur.fetchone()
                    return dict(zip(colnames, row)) if row else None
                return None
    except Exception as e:
        print(f"execute_query DB error: {e}")
        return None

