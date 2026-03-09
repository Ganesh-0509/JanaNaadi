"""
One-time script to promote a Supabase user to admin role.
Run from d:\\JanaNaadi\\backend:

    python set_admin_role.py your@email.com
"""

import sys
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    sys.exit(1)

email = sys.argv[1] if len(sys.argv) > 1 else None
if not email:
    print("Usage: python set_admin_role.py your@email.com")
    sys.exit(1)

from supabase import create_client

sb = create_client(SUPABASE_URL, SERVICE_KEY)

# List all users to find the one matching the email
response = sb.auth.admin.list_users()
users = response if isinstance(response, list) else getattr(response, "users", [])

target = next((u for u in users if getattr(u, "email", None) == email), None)
if not target:
    print(f"No user found with email: {email}")
    print("Existing users:")
    for u in users:
        print(f"  {u.email}  (role: {(u.app_metadata or {}).get('role', 'not set')})")
    sys.exit(1)

# Update app_metadata to set role=admin
sb.auth.admin.update_user_by_id(
    target.id,
    {"app_metadata": {"role": "admin"}},
)

print(f"✓ User '{email}' is now role=admin")
print("  Log out and log back in for the change to take effect.")
