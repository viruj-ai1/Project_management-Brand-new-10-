"""
generate_users_sql.py
---------------------
Run this script ONCE to generate the Supabase INSERT statement
with bcrypt-hashed passwords for all users.

Requirements:
    pip install bcrypt

Usage:
    python generate_users_sql.py > users_insert.sql

Then paste the output SQL into your Supabase SQL Editor.
⚠️  Delete or secure this file after use — it contains plain-text passwords.
"""

import bcrypt

# ─── Define your users + passwords here ──────────────────────────────────────
# Set each user's actual password in the 'password' field.
# Plain-text passwords are NEVER stored — only the bcrypt hash goes to Supabase.

USERS = [
    {
        "id":         "u1",
        "name":       "Managing Director",
        "role":       "Managing Director",
        "manager_id": None,
        "password":   "MD@Virujgroup",          # ← set actual password here
    },
    {
        "id":         "u2",
        "name":       "Vice President (R&D)",
        "role":       "Vice President (R&D)",
        "manager_id": "u1",
        "password":   "VP@Virujgroup",
    },
    {
        "id":         "u3",
        "name":       "Project Manager A",
        "role":       "Project Manager",
        "manager_id": "u2",
        "password":   "PMA@Virujgroup",
    },
    {
        "id":         "u4",
        "name":       "Project Manager B",
        "role":       "Project Manager",
        "manager_id": "u2",
        "password":   "PMB@Virujgroup",
    },
    {
        "id":         "u5",
        "name":       "ARD Head",
        "role":       "Department Head",
        "manager_id": "u3",
        "password":   "ARD@Virujgroup",
    },
    {
        "id":         "u6",
        "name":       "CRD Head",
        "role":       "Department Head",
        "manager_id": "u3",
        "password":   "CRD@Virujgroup",
    },
    {
        "id":         "u7",
        "name":       "DQA Head",
        "role":       "Department Head",
        "manager_id": "u4",
        "password":   "DQA@Virujgroup",
    },
    {
        "id":         "u8",
        "name":       "SCM Head (RD)",
        "role":       "Department Head",
        "manager_id": "u4",
        "password":   "SCM@Virujgroup",
    },
    {
        "id":         "u9",
        "name":       "Tech Transfer (TTR) Head",
        "role":       "Department Head",
        "manager_id": "u4",
        "password":   "TTR@Virujgroup",
    },
    {
        "id":         "u10",
        "name":       "Senior Chemist (ARD)",
        "role":       "Analysts/Chemists",
        "manager_id": "u5",
        "password":   "CHM@Virujgroup",
    },
    {
        "id":         "u11",
        "name":       "External Client",
        "role":       "Client",
        "manager_id": None,
        "password":   "Client@Virujgroup",
    },
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Returns a bcrypt hash string for the given plain-text password."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def sql_str(v) -> str:
    """Format a Python value as a SQL literal (NULL-safe, escapes quotes)."""
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    import sys

    print("-- ==============================================================", file=sys.stderr)
    print("-- Hashing passwords (this may take a few seconds)...",           file=sys.stderr)
    print("-- ==============================================================", file=sys.stderr)

    rows = []
    for u in USERS:
        print(f"  [{u['id']}] {u['name']}...", file=sys.stderr, flush=True)
        hashed = hash_password(u["password"])
        rows.append(
            f"  ({sql_str(u['id'])}, {sql_str(u['name'])}, "
            f"{sql_str(u['role'])}, {sql_str(u['manager_id'])}, "
            f"{sql_str(hashed)})"
        )

    print("-- Done. Paste the SQL below into Supabase SQL Editor.\n", file=sys.stderr)

    # ── SQL output (goes to stdout so you can redirect to a file) ──────────
    print("-- ==============================================================")
    print("-- Viruj Pharma - Users with bcrypt-hashed passwords")
    print("-- PASTE THIS INTO SUPABASE SQL EDITOR")
    print("-- ==============================================================\n")

    print("-- Step 1: add the column if it doesn't exist yet")
    print("ALTER TABLE public.users")
    print("  ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';\n")

    print("-- Step 2: insert / update all users")
    print("INSERT INTO public.users (id, name, role, manager_id, password_hash) VALUES")
    print(",\n".join(rows))
    print("ON CONFLICT (id) DO UPDATE SET")
    print("  name          = EXCLUDED.name,")
    print("  role          = EXCLUDED.role,")
    print("  manager_id    = EXCLUDED.manager_id,")
    print("  password_hash = EXCLUDED.password_hash;")

    print("\n-- ==============================================================")
    print("-- WARNING: The plain-text passwords are ONLY in generate_users_sql.py")
    print("--          Delete or secure that file after use.")
    print("-- ==============================================================")


if __name__ == "__main__":
    main()
