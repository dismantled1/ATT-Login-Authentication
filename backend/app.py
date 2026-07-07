import os
import base64
import jwt
import uuid
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import bcrypt

# Try importing psycopg2, set fallback flag if not installed
try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    print("[WARNING] psycopg2 is not installed. PostgreSQL integration disabled. Running in fallback memory mode.")
    HAS_PSYCOPG2 = False

# Load env variables from .env
load_dotenv()

app = Flask(__name__)
# Enable CORS to allow requests from frontend (usually http://localhost:5173)
CORS(app)

ENCRYPTION_KEY = 'SDLC-AUTH-KEY-2026-SECURE-V1'
JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'sdlc_jwt_key')

# Decrypt incoming password that has been XORed and base64-encoded on client side
def decrypt_data(encrypted_data):
    try:
        decoded = base64.b64decode(encrypted_data).decode('latin-1')
        decrypted = ''.join(
            chr(ord(char) ^ ord(ENCRYPTION_KEY[i % len(ENCRYPTION_KEY)]))
            for i, char in enumerate(decoded)
        )
        return decrypted
    except Exception as e:
        print(f"[DECRYPTION ERROR] Failed to decrypt data: {e}")
        # Return raw value as fallback if it's already decrypted
        return encrypted_data

# DB Connection helper
def get_db_connection():
    if not HAS_PSYCOPG2:
        raise RuntimeError("psycopg2 is not installed")
    return psycopg2.connect(
        dbname=os.getenv('DB_NAME', 'att_db'),
        user=os.getenv('DB_USER_NAME', 'postgres'),
        password=os.getenv('DOC_DB_PASSWORD', 'postgres'),
        host=os.getenv('DB_HOSTNAME', 'localhost'),
        port=os.getenv('DB_PORT', '5432')
    )

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

# ---------------------------------------------------------------------------
# Fallback memory database for smooth out-of-the-box local testing
# Tenants: AT&T, Verizon, T-Mobile, Vodafone
# ---------------------------------------------------------------------------
FALLBACK_USERS = [
    # ── Super Admin ────────────────────────────────────────────────────────
    {
        'uid': 'super-admin',
        'email': 'superadmin@att.com',
        'pw': 'admin123',
        'password': hash_password('admin123'),
        'role': 'super_admin',
        'name': 'Super Admin',
        'created': '2026-01-01',
        'first_name': 'Super',
        'last_name': 'Admin',
        'tenant_id': 'all',
        'tenant_name': 'Global',
        'status': 'active',
        'department': 'Administration',
        'project_ids': []
    },
    # ── AT&T Tenant ────────────────────────────────────────────────────────
    {
        'uid': 'admin-att',
        'email': 'admin.att@att.com',
        'pw': 'admin123',
        'password': hash_password('admin123'),
        'role': 'tenant_admin',
        'name': 'AT&T Tenant Admin',
        'created': '2026-01-04',
        'first_name': 'AT&T',
        'last_name': 'Tenant Admin',
        'tenant_id': 'tenant-att',
        'tenant_name': 'AT&T',
        'status': 'active',
        'department': 'Administration',
        'project_ids': ['att-network-ops', 'att-fiber-rollout']
    },
    {
        'uid': 'tm-att-1',
        'email': 'tm.att.1@att.com',
        'pw': 'manager123',
        'password': hash_password('manager123'),
        'role': 'manager',
        'name': 'Alex Morgan',
        'created': '2026-01-10',
        'first_name': 'Alex',
        'last_name': 'Morgan',
        'tenant_id': 'tenant-att',
        'tenant_name': 'AT&T',
        'status': 'active',
        'department': 'Network Operations',
        'project_ids': ['att-network-ops', 'att-fiber-rollout']
    },
    {
        'uid': 'usr-att-1',
        'email': 'usr.att.1@att.com',
        'pw': 'demo123',
        'password': hash_password('demo123'),
        'role': 'user',
        'name': 'Jordan Rivera',
        'created': '2026-02-01',
        'first_name': 'Jordan',
        'last_name': 'Rivera',
        'tenant_id': 'tenant-att',
        'tenant_name': 'AT&T',
        'status': 'active',
        'department': 'Engineering',
        'project_ids': ['att-network-ops']
    },
    {
        'uid': 'usr-att-2',
        'email': 'usr.att.2@att.com',
        'pw': 'demo123',
        'password': hash_password('demo123'),
        'role': 'user',
        'name': 'Casey Kim',
        'created': '2026-02-05',
        'first_name': 'Casey',
        'last_name': 'Kim',
        'tenant_id': 'tenant-att',
        'tenant_name': 'AT&T',
        'status': 'active',
        'department': 'Engineering',
        'project_ids': ['att-fiber-rollout']
    },
    # ── Verizon Tenant ─────────────────────────────────────────────────────
    {
        'uid': 'admin-verizon',
        'email': 'admin.verizon@att.com',
        'pw': 'admin123',
        'password': hash_password('admin123'),
        'role': 'tenant_admin',
        'name': 'Verizon Tenant Admin',
        'created': '2026-01-04',
        'first_name': 'Verizon',
        'last_name': 'Tenant Admin',
        'tenant_id': 'tenant-verizon',
        'tenant_name': 'Verizon',
        'status': 'active',
        'department': 'Administration',
        'project_ids': ['vzw-5g-expansion', 'vzw-iot-platform']
    },
    {
        'uid': 'tm-verizon-1',
        'email': 'tm.verizon.1@att.com',
        'pw': 'manager123',
        'password': hash_password('manager123'),
        'role': 'manager',
        'name': 'Taylor Brooks',
        'created': '2026-01-15',
        'first_name': 'Taylor',
        'last_name': 'Brooks',
        'tenant_id': 'tenant-verizon',
        'tenant_name': 'Verizon',
        'status': 'active',
        'department': '5G Infrastructure',
        'project_ids': ['vzw-5g-expansion', 'vzw-iot-platform']
    },
    {
        'uid': 'usr-verizon-1',
        'email': 'usr.verizon.1@att.com',
        'pw': 'demo123',
        'password': hash_password('demo123'),
        'role': 'user',
        'name': 'Morgan Chen',
        'created': '2026-02-10',
        'first_name': 'Morgan',
        'last_name': 'Chen',
        'tenant_id': 'tenant-verizon',
        'tenant_name': 'Verizon',
        'status': 'active',
        'department': 'Engineering',
        'project_ids': ['vzw-5g-expansion']
    },
    {
        'uid': 'usr-verizon-2',
        'email': 'usr.verizon.2@att.com',
        'pw': 'demo123',
        'password': hash_password('demo123'),
        'role': 'user',
        'name': 'Sam Patel',
        'created': '2026-02-12',
        'first_name': 'Sam',
        'last_name': 'Patel',
        'tenant_id': 'tenant-verizon',
        'tenant_name': 'Verizon',
        'status': 'active',
        'department': 'IoT Solutions',
        'project_ids': ['vzw-iot-platform']
    },
    # ── T-Mobile Tenant ────────────────────────────────────────────────────
    {
        'uid': 'admin-tmobile',
        'email': 'admin.tmobile@att.com',
        'pw': 'admin123',
        'password': hash_password('admin123'),
        'role': 'tenant_admin',
        'name': 'T-Mobile Tenant Admin',
        'created': '2026-01-06',
        'first_name': 'T-Mobile',
        'last_name': 'Tenant Admin',
        'tenant_id': 'tenant-tmobile',
        'tenant_name': 'T-Mobile',
        'status': 'active',
        'department': 'Administration',
        'project_ids': ['tmo-uncarrier', 'tmo-home-internet']
    },
    {
        'uid': 'tm-tmobile-1',
        'email': 'tm.tmobile.1@att.com',
        'pw': 'manager123',
        'password': hash_password('manager123'),
        'role': 'manager',
        'name': 'Riley Santos',
        'created': '2026-01-20',
        'first_name': 'Riley',
        'last_name': 'Santos',
        'tenant_id': 'tenant-tmobile',
        'tenant_name': 'T-Mobile',
        'status': 'active',
        'department': 'Customer Experience',
        'project_ids': ['tmo-uncarrier', 'tmo-home-internet']
    },
    {
        'uid': 'usr-tmobile-1',
        'email': 'usr.tmobile.1@att.com',
        'pw': 'demo123',
        'password': hash_password('demo123'),
        'role': 'user',
        'name': 'Quinn Nakamura',
        'created': '2026-02-15',
        'first_name': 'Quinn',
        'last_name': 'Nakamura',
        'tenant_id': 'tenant-tmobile',
        'tenant_name': 'T-Mobile',
        'status': 'active',
        'department': 'Engineering',
        'project_ids': ['tmo-uncarrier']
    },
    {
        'uid': 'usr-tmobile-2',
        'email': 'usr.tmobile.2@att.com',
        'pw': 'demo123',
        'password': hash_password('demo123'),
        'role': 'user',
        'name': 'Avery Liu',
        'created': '2026-02-18',
        'first_name': 'Avery',
        'last_name': 'Liu',
        'tenant_id': 'tenant-tmobile',
        'tenant_name': 'T-Mobile',
        'status': 'active',
        'department': 'Home Internet',
        'project_ids': ['tmo-home-internet']
    },
    # ── Vodafone Tenant ────────────────────────────────────────────────────
    {
        'uid': 'admin-vodafone',
        'email': 'admin.vodafone@att.com',
        'pw': 'admin123',
        'password': hash_password('admin123'),
        'role': 'tenant_admin',
        'name': 'Vodafone Tenant Admin',
        'created': '2026-01-08',
        'first_name': 'Vodafone',
        'last_name': 'Tenant Admin',
        'tenant_id': 'tenant-vodafone',
        'tenant_name': 'Vodafone',
        'status': 'active',
        'department': 'Administration',
        'project_ids': ['voda-eu-migration', 'voda-digital-hub']
    },
    {
        'uid': 'tm-vodafone-1',
        'email': 'tm.vodafone.1@att.com',
        'pw': 'manager123',
        'password': hash_password('manager123'),
        'role': 'manager',
        'name': 'Jamie O\'Brien',
        'created': '2026-01-22',
        'first_name': 'Jamie',
        'last_name': "O'Brien",
        'tenant_id': 'tenant-vodafone',
        'tenant_name': 'Vodafone',
        'status': 'active',
        'department': 'EU Migration',
        'project_ids': ['voda-eu-migration', 'voda-digital-hub']
    },
    {
        'uid': 'usr-vodafone-1',
        'email': 'usr.vodafone.1@att.com',
        'pw': 'demo123',
        'password': hash_password('demo123'),
        'role': 'user',
        'name': 'Devon Müller',
        'created': '2026-02-20',
        'first_name': 'Devon',
        'last_name': 'Müller',
        'tenant_id': 'tenant-vodafone',
        'tenant_name': 'Vodafone',
        'status': 'active',
        'department': 'Digital Hub',
        'project_ids': ['voda-digital-hub']
    },
    {
        'uid': 'usr-vodafone-2',
        'email': 'usr.vodafone.2@att.com',
        'pw': 'demo123',
        'password': hash_password('demo123'),
        'role': 'user',
        'name': 'Reese Gupta',
        'created': '2026-02-22',
        'first_name': 'Reese',
        'last_name': 'Gupta',
        'tenant_id': 'tenant-vodafone',
        'tenant_name': 'Vodafone',
        'status': 'active',
        'department': 'Engineering',
        'project_ids': ['voda-eu-migration']
    },
]

# In-memory tenants registry (mirrors FALLBACK_USERS tenant_id values)
FALLBACK_TENANTS = [
    {'id': 'tenant-att',      'name': 'AT&T',     'created': '2026-01-01'},
    {'id': 'tenant-verizon',  'name': 'Verizon',   'created': '2026-01-01'},
    {'id': 'tenant-tmobile',  'name': 'T-Mobile',  'created': '2026-01-01'},
    {'id': 'tenant-vodafone', 'name': 'Vodafone',  'created': '2026-01-01'},
]

# ---------------------------------------------------------------------------
# RBAC helper – extract the current user from the JWT Bearer token
# ---------------------------------------------------------------------------
def get_current_user_from_token():
    """Decode the JWT from the Authorization header and return user info dict.

    Returns a dict with keys: uid, role, tenant_id, email, etc.
    Returns None when the token is missing, malformed, or expired.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ', 1)[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])

        return {
            'uid': payload.get('username'),
            'email': payload.get('email'),
            'role': payload.get('roles', ['user'])[0] if isinstance(payload.get('roles'), list) else payload.get('roles', 'user'),
            'tenant_id': payload.get('tenant_id'),
            'tenant_url': payload.get('tenant_url'),
            'first_name': payload.get('first_name'),
            'last_name': payload.get('last_name'),
            'project_ids': payload.get('project_ids', []),
        }
    except jwt.ExpiredSignatureError:
        print("[RBAC] Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"[RBAC] Invalid token: {e}")
        return None
    except Exception as e:
        print(f"[RBAC] Unexpected error decoding token: {e}")
        return None

# ---------------------------------------------------------------------------
# DB query helper
# ---------------------------------------------------------------------------
def query_user_from_db(username):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Exact PostgreSQL query from New Project (mgmt-twb) specification
        query = """
        SELECT um.user_name, um.email, um.password, tm.id, tm.tenant_url,
        array_agg(rm.role_name), um.first_name, um.last_name
        FROM user_master_2 um
        JOIN relations r ON um.id = r.user_id
        JOIN tenant_master tm ON r.tenant_id = tm.id
        JOIN role_master_2 rm ON r.role_id = rm.id
        WHERE um.user_name = %s
        GROUP BY um.id, tm.id, um.user_name, um.email, um.password, um.first_name, 
        um.last_name
        """
        cur.execute(query, (username,))
        row = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if row:
            return {
                'user_name': row[0],
                'email': row[1],
                'password': row[2],
                'tenant_id': row[3],
                'tenant_url': row[4],
                'roles': row[5],
                'first_name': row[6],
                'last_name': row[7]
            }
        return None
    except Exception as e:
        print(f"[DB LOG] PostgreSQL Connection/Query failed: {e}")
        print("[DB LOG] Falling back to memory database simulation.")
        # If DB connection failed, check fallback local list
        match = next((u for u in FALLBACK_USERS if u['uid'] == username), None)
        if match:
            return {
                'user_name': match['uid'],
                'email': match['email'],
                'password': match['password'],
                'tenant_id': match.get('tenant_id', 1),
                'tenant_url': match.get('tenant_name', 'att-tenant-alpha.att.com'),
                'roles': [match['role']],
                'first_name': match['first_name'],
                'last_name': match['last_name'],
                'project_ids': match.get('project_ids', []),
                'status': match.get('status', 'active')
            }
        return None

# ---------------------------------------------------------------------------
# Login API Endpoint handling login requests
# ---------------------------------------------------------------------------
@app.route('/api/v1/login', methods=['POST'])
@app.route('/twb_ml/auth/login', methods=['POST'])
def login():
    print("[LOGIN] Endpoint called")
    
    data = request.get_json() or {}
    username = data.get('username')
    encrypted_password = data.get('password')
    
    if not username or not encrypted_password:
        return jsonify({"message": "Invalid username or password"}), 401

    # 1. Decrypt credentials if encrypted
    password = decrypt_data(encrypted_password)

    # 2. Query Database
    user_record = query_user_from_db(username)
    if not user_record:
        print(f"[LOGIN ERROR] User '{username}' not found")
        return jsonify({"message": "Invalid username or password"}), 401

    print("[LOGIN] User found")

    # 3. Verify Password Hash using verify_password
    hashed_password = user_record['password']
    if not verify_password(password, hashed_password):
        print("[LOGIN ERROR] Password verification failed")
        return jsonify({"message": "Invalid username or password"}), 401

    print("[LOGIN] Password verified")

    # 3.5 Check if account is suspended
    if user_record.get('status') == 'suspended':
        print(f"[LOGIN ERROR] User '{username}' account is suspended")
        return jsonify({"message": "Account has been suspended. Contact the administrator for further details."}), 403

    # 4. Generate JWT Token
    # Matching exact token_data dictionary payload structure from mgmt-twb specs
    token_data = {
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(minutes=30),
        'username': user_record['user_name'],
        'email': user_record['email'],
        'tenant_id': user_record['tenant_id'],
        'tenant_url': user_record['tenant_url'],
        'roles': user_record['roles'],
        'first_name': user_record['first_name'],
        'last_name': user_record['last_name'],
        'project_ids': user_record.get('project_ids', [])
    }

    # Encode JWT using PyJWT
    encoded_jwt = jwt.encode(
        token_data,
        JWT_SECRET,
        algorithm='HS256'
    )
    
    print("[LOGIN] JWT created")
    print("[LOGIN] Login successful")

    # Response format: Access token + metadata
    return jsonify({
        "access_token": encoded_jwt,
        "metadata": {
            "uid": user_record['user_name'],
            "name": f"{user_record['first_name']} {user_record['last_name']}",
            "role": user_record['roles'][0] if user_record['roles'] else 'user',
            "email": user_record['email'],
            "tenant_url": user_record['tenant_url'],
            "tenantId": user_record['tenant_id'],
            "projectIds": user_record.get('project_ids', [])
        }
    }), 200

# ---------------------------------------------------------------------------
# User Management APIs
# ---------------------------------------------------------------------------

# GET /api/v1/users — list users
@app.route('/api/v1/users', methods=['GET'])
def get_users():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        query = """
        SELECT um.user_name, um.first_name, um.last_name, rm.role_name, um.email, um.created
        FROM user_master_2 um
        JOIN relations r ON um.id = r.user_id
        JOIN role_master_2 rm ON r.role_id = rm.id
        ORDER BY um.id ASC
        """
        cur.execute(query)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        users_list = []
        for row in rows:
            users_list.append({
                'uid': row[0],
                'name': f"{row[1]} {row[2]}" if row[2] else row[1],
                'role': row[3],
                'email': row[4],
                'created': str(row[5]) if row[5] else ''
            })
        return jsonify(users_list), 200
    except Exception as e:
        print(f"[API WARNING] Database fetch users failed: {e}. Returning fallback users.")
        # Return fallback users list clean of sensitive variables (like hashed password)
        clean_fallback = [{
            'uid': u['uid'],
            'name': u['name'],
            'role': u['role'],
            'email': u['email'],
            'created': u['created'],
            'status': u.get('status', 'active'),
            'department': u.get('department', ''),
            'tenantId': u.get('tenant_id'),
            'tenantName': u.get('tenant_name'),
            'projectIds': u.get('project_ids', [])
        } for u in FALLBACK_USERS]
        return jsonify(clean_fallback), 200

# POST /api/v1/users — create user
@app.route('/api/v1/users', methods=['POST'])
def create_user():
    data = request.get_json() or {}
    uid = data.get('uid')
    name = data.get('name', '')
    role = data.get('role', 'user')
    pw = data.get('pw', 'demo123')
    
    if not uid or not name:
        return jsonify({"message": "User ID and Name are required"}), 400
        
    # Split name into first and last name
    name_parts = name.split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    email = f"{uid}@att.com"
    hashed_pw = hash_password(pw)
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if username exists
        cur.execute("SELECT 1 FROM user_master_2 WHERE user_name = %s", (uid,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"message": "User ID already exists"}), 409
            
        # Get default tenant id
        cur.execute("SELECT id FROM tenant_master LIMIT 1")
        tenant_row = cur.fetchone()
        tenant_id = tenant_row[0] if tenant_row else 1
        
        # Get role id
        cur.execute("SELECT id FROM role_master_2 WHERE role_name = %s", (role,))
        role_row = cur.fetchone()
        role_id = role_row[0] if role_row else 4 # user role default id
        
        # Insert user
        cur.execute("""
            INSERT INTO user_master_2 (user_name, email, password, first_name, last_name)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (uid, email, hashed_pw, first_name, last_name))
        user_id = cur.fetchone()[0]
        
        # Insert relation
        cur.execute("""
            INSERT INTO relations (user_id, tenant_id, role_id)
            VALUES (%s, %s, %s)
        """, (user_id, tenant_id, role_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        print(f"[API WARNING] Database create user failed: {e}. Saving to fallback list.")
        # Check fallback user duplication
        if any(u['uid'] == uid for u in FALLBACK_USERS):
            return jsonify({"message": "User ID already exists"}), 409
            
        new_fallback_user = {
            'uid': uid,
            'email': email,
            'pw': pw,
            'password': hashed_pw,
            'role': role,
            'name': name,
            'created': datetime.now().strftime('%Y-%m-%d'),
            'first_name': first_name,
            'last_name': last_name,
            'tenant_id': data.get('tenantId', 'tenant-att'),
            'tenant_name': data.get('tenantName', 'AT&T'),
            'status': 'active',
            'department': data.get('department', ''),
            'project_ids': data.get('projectIds', [])
        }
        FALLBACK_USERS.append(new_fallback_user)
        return jsonify({"message": "User created successfully (In-Memory Fallback)"}), 201

# DELETE /api/v1/users/<uid> — delete (revoke) user
@app.route('/api/v1/users/<uid>', methods=['DELETE'])
def delete_user(uid):
    # Guard: Block deleting Super Admin username 'super-admin'
    if uid == 'super-admin':
        return jsonify({"message": "Access denied — Cannot revoke Super Admin"}), 403

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Guard: Check target user's role in DB
        cur.execute("""
            SELECT rm.role_name FROM user_master_2 um
            JOIN relations r ON um.id = r.user_id
            JOIN role_master_2 rm ON r.role_id = rm.id
            WHERE um.user_name = %s
        """, (uid,))
        role_row = cur.fetchone()
        if role_row and role_row[0] == 'super_admin':
            cur.close()
            conn.close()
            return jsonify({"message": "Access denied — Cannot revoke Super Admin"}), 403
            
        # Delete user (will cascade delete relations)
        cur.execute("DELETE FROM user_master_2 WHERE user_name = %s RETURNING id", (uid,))
        deleted = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        if not deleted:
            return jsonify({"message": "User not found"}), 404
            
        return jsonify({"message": "User revoked successfully"}), 200
    except Exception as e:
        print(f"[API WARNING] Database delete user failed: {e}. Removing from fallback list.")
        global FALLBACK_USERS
        
        # Guard: check fallback role
        target = next((u for u in FALLBACK_USERS if u['uid'] == uid), None)
        if target and target['role'] == 'super_admin':
            return jsonify({"message": "Access denied — Cannot revoke Super Admin"}), 403

        initial_len = len(FALLBACK_USERS)
        FALLBACK_USERS = [u for u in FALLBACK_USERS if u['uid'] != uid]
        if len(FALLBACK_USERS) == initial_len:
            return jsonify({"message": "User not found"}), 404
        return jsonify({"message": "User revoked successfully (In-Memory Fallback)"}), 200

# ---------------------------------------------------------------------------
# PUT /api/v1/users/<uid> — update user
# ---------------------------------------------------------------------------
@app.route('/api/v1/users/<uid>', methods=['PUT'])
def update_user(uid):
    # RBAC check
    caller = get_current_user_from_token()
    if not caller:
        return jsonify({"message": "Unauthorized — valid token required"}), 401

    caller_role = caller.get('role', '')
    caller_tenant = caller.get('tenant_id', '')

    # Only super_admin and tenant_admin may update users
    if caller_role not in ('super_admin', 'tenant_admin'):
        return jsonify({"message": "Forbidden — insufficient permissions"}), 403

    # Find target user
    target = next((u for u in FALLBACK_USERS if u['uid'] == uid), None)
    if not target:
        return jsonify({"message": "User not found"}), 404

    # Tenant admin can only edit users within their own tenant
    if caller_role == 'tenant_admin' and target.get('tenant_id') != caller_tenant:
        return jsonify({"message": "Forbidden — cannot edit users outside your tenant"}), 403

    data = request.get_json() or {}
    allowed_fields = ('name', 'role', 'status', 'department', 'projectIds')

    for field in allowed_fields:
        if field in data:
            if field == 'projectIds':
                target['project_ids'] = data['projectIds']
            elif field == 'name':
                target['name'] = data['name']
                parts = data['name'].split(' ', 1)
                target['first_name'] = parts[0]
                target['last_name'] = parts[1] if len(parts) > 1 else ''
            else:
                target[field] = data[field]

    return jsonify({"message": "User updated successfully", "uid": uid}), 200

# ---------------------------------------------------------------------------
# POST /api/v1/users/<uid>/suspend — suspend a user
# ---------------------------------------------------------------------------
@app.route('/api/v1/users/<uid>/suspend', methods=['POST'])
def suspend_user(uid):
    caller = get_current_user_from_token()
    if not caller:
        return jsonify({"message": "Unauthorized — valid token required"}), 401

    caller_role = caller.get('role', '')
    caller_tenant = caller.get('tenant_id', '')

    if caller_role not in ('super_admin', 'tenant_admin'):
        return jsonify({"message": "Forbidden — insufficient permissions"}), 403

    target = next((u for u in FALLBACK_USERS if u['uid'] == uid), None)
    if not target:
        return jsonify({"message": "User not found"}), 404

    if target.get('role') == 'super_admin':
        return jsonify({"message": "Forbidden — cannot suspend Super Admin"}), 403

    if caller_role == 'tenant_admin' and target.get('tenant_id') != caller_tenant:
        return jsonify({"message": "Forbidden — cannot suspend users outside your tenant"}), 403

    target['status'] = 'suspended'
    return jsonify({"message": f"User '{uid}' has been suspended"}), 200

# ---------------------------------------------------------------------------
# POST /api/v1/users/<uid>/resume — resume a suspended user
# ---------------------------------------------------------------------------
@app.route('/api/v1/users/<uid>/resume', methods=['POST'])
def resume_user(uid):
    caller = get_current_user_from_token()
    if not caller:
        return jsonify({"message": "Unauthorized — valid token required"}), 401

    caller_role = caller.get('role', '')
    caller_tenant = caller.get('tenant_id', '')

    if caller_role not in ('super_admin', 'tenant_admin'):
        return jsonify({"message": "Forbidden — insufficient permissions"}), 403

    target = next((u for u in FALLBACK_USERS if u['uid'] == uid), None)
    if not target:
        return jsonify({"message": "User not found"}), 404

    if caller_role == 'tenant_admin' and target.get('tenant_id') != caller_tenant:
        return jsonify({"message": "Forbidden — cannot resume users outside your tenant"}), 403

    target['status'] = 'active'
    return jsonify({"message": f"User '{uid}' has been resumed"}), 200

# ---------------------------------------------------------------------------
# POST /api/v1/users/<uid>/promote — promote a user to a new role
# ---------------------------------------------------------------------------
@app.route('/api/v1/users/<uid>/promote', methods=['POST'])
def promote_user(uid):
    caller = get_current_user_from_token()
    if not caller:
        return jsonify({"message": "Unauthorized — valid token required"}), 401

    caller_role = caller.get('role', '')
    caller_tenant = caller.get('tenant_id', '')

    if caller_role not in ('super_admin', 'tenant_admin'):
        return jsonify({"message": "Forbidden — insufficient permissions"}), 403

    data = request.get_json() or {}
    new_role = data.get('newRole')
    if not new_role:
        return jsonify({"message": "newRole is required"}), 400

    # Nobody can promote to super_admin
    if new_role == 'super_admin':
        return jsonify({"message": "Forbidden — cannot promote to super_admin"}), 403

    # Tenant admin can promote up to 'manager' only (not to tenant_admin)
    if caller_role == 'tenant_admin' and new_role not in ('user', 'manager'):
        return jsonify({"message": "Forbidden — tenant admin can only promote up to manager"}), 403

    target = next((u for u in FALLBACK_USERS if u['uid'] == uid), None)
    if not target:
        return jsonify({"message": "User not found"}), 404

    if caller_role == 'tenant_admin' and target.get('tenant_id') != caller_tenant:
        return jsonify({"message": "Forbidden — cannot promote users outside your tenant"}), 403

    old_role = target['role']
    target['role'] = new_role
    return jsonify({
        "message": f"User '{uid}' promoted from '{old_role}' to '{new_role}'",
        "uid": uid,
        "oldRole": old_role,
        "newRole": new_role
    }), 200

# ---------------------------------------------------------------------------
# Tenant Management APIs
# ---------------------------------------------------------------------------

# POST /api/v1/tenants — create a new tenant (super_admin only)
@app.route('/api/v1/tenants', methods=['POST'])
def create_tenant():
    caller = get_current_user_from_token()
    if not caller:
        return jsonify({"message": "Unauthorized — valid token required"}), 401

    if caller.get('role') != 'super_admin':
        return jsonify({"message": "Forbidden — only super_admin can create tenants"}), 403

    data = request.get_json() or {}
    tenant_name = data.get('name')
    if not tenant_name:
        return jsonify({"message": "Tenant name is required"}), 400

    # Generate a slug-style tenant id
    tenant_slug = tenant_name.lower().replace(' ', '-').replace('&', 'and')
    tenant_id = f"tenant-{tenant_slug}"

    # Check for duplicate
    if any(t['id'] == tenant_id for t in FALLBACK_TENANTS):
        return jsonify({"message": "Tenant already exists"}), 409

    new_tenant = {
        'id': tenant_id,
        'name': tenant_name,
        'created': datetime.now().strftime('%Y-%m-%d')
    }
    FALLBACK_TENANTS.append(new_tenant)

    # Optionally assign an existing user as the tenant admin
    admin_uid = data.get('adminUid')
    if admin_uid:
        admin_user = next((u for u in FALLBACK_USERS if u['uid'] == admin_uid), None)
        if admin_user:
            admin_user['role'] = 'tenant_admin'
            admin_user['tenant_id'] = tenant_id
            admin_user['tenant_name'] = tenant_name

    return jsonify({
        "message": "Tenant created successfully",
        "tenant": new_tenant
    }), 201

# GET /api/v1/tenants — list all tenants (super_admin & tenant_admin)
@app.route('/api/v1/tenants', methods=['GET'])
def list_tenants():
    caller = get_current_user_from_token()
    if not caller:
        return jsonify({"message": "Unauthorized — valid token required"}), 401

    caller_role = caller.get('role', '')
    if caller_role not in ('super_admin', 'tenant_admin'):
        return jsonify({"message": "Forbidden — insufficient permissions"}), 403

    # Tenant admin sees only their own tenant
    if caller_role == 'tenant_admin':
        caller_tenant = caller.get('tenant_id', '')
        filtered = [t for t in FALLBACK_TENANTS if t['id'] == caller_tenant]
        return jsonify(filtered), 200

    # Super admin sees all tenants
    return jsonify(FALLBACK_TENANTS), 200

if __name__ == '__main__':
    # Start on port 5001 as specified in verification instructions
    print("Starting Flask Auth Server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
