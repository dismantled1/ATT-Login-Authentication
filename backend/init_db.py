import os
import psycopg2
import bcrypt
from dotenv import load_dotenv

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

# Load env variables from .env
load_dotenv()

DB_NAME = os.getenv('DB_NAME', 'att_db')
DB_USER = os.getenv('DB_USER_NAME', 'postgres')
DB_PASSWORD = os.getenv('DOC_DB_PASSWORD', 'postgres')
DB_HOST = os.getenv('DB_HOSTNAME', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')

def get_connection(db_name=None):
    return psycopg2.connect(
        dbname=db_name or DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

def init_database():
    # Connect to postgres server to create database if it doesn't exist
    print("Connecting to PostgreSQL to check database...")
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
        exists = cur.fetchone()
        if not exists:
            print(f"Database '{DB_NAME}' does not exist. Creating...")
            cur.execute(f"CREATE DATABASE {DB_NAME}")
            print(f"Database '{DB_NAME}' created successfully.")
        else:
            print(f"Database '{DB_NAME}' already exists.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error checking/creating database: {e}")
        print("Will attempt to connect directly to the target database...")

    # Connect to the target database and build schema
    print(f"Connecting to database '{DB_NAME}'...")
    try:
        conn = get_connection()
        conn.autocommit = True
        cur = conn.cursor()

        # Drop tables if they exist
        print("Dropping existing tables to refresh schema...")
        cur.execute("DROP TABLE IF EXISTS relations CASCADE")
        cur.execute("DROP TABLE IF EXISTS user_master_2 CASCADE")
        cur.execute("DROP TABLE IF EXISTS tenant_master CASCADE")
        cur.execute("DROP TABLE IF EXISTS role_master_2 CASCADE")

        # Create tenant_master table
        print("Creating table: tenant_master...")
        cur.execute("""
            CREATE TABLE tenant_master (
                id SERIAL PRIMARY KEY,
                tenant_url VARCHAR(255) NOT NULL,
                tenant_name VARCHAR(100) NOT NULL
            )
        """)

        # Create role_master_2 table
        print("Creating table: role_master_2...")
        cur.execute("""
            CREATE TABLE role_master_2 (
                id SERIAL PRIMARY KEY,
                role_name VARCHAR(50) NOT NULL UNIQUE
            )
        """)

        # Create user_master_2 table
        print("Creating table: user_master_2...")
        cur.execute("""
            CREATE TABLE user_master_2 (
                id SERIAL PRIMARY KEY,
                user_name VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                created DATE DEFAULT CURRENT_DATE
            )
        """)

        # Create relations table
        print("Creating table: relations...")
        cur.execute("""
            CREATE TABLE relations (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES user_master_2(id) ON DELETE CASCADE,
                tenant_id INT REFERENCES tenant_master(id) ON DELETE CASCADE,
                role_id INT REFERENCES role_master_2(id) ON DELETE CASCADE
            )
        """)

        # Insert seed data
        print("Inserting seed data...")

        # 1. Tenants
        cur.execute("INSERT INTO tenant_master (tenant_url, tenant_name) VALUES ('att-tenant-alpha.att.com', 'Makers Lab Main Tenant') RETURNING id")
        tenant_id = cur.fetchone()[0]

        # 2. Roles
        cur.execute("INSERT INTO role_master_2 (role_name) VALUES ('super_admin') RETURNING id")
        super_admin_role_id = cur.fetchone()[0]
        cur.execute("INSERT INTO role_master_2 (role_name) VALUES ('tenant_admin') RETURNING id")
        tenant_admin_role_id = cur.fetchone()[0]
        cur.execute("INSERT INTO role_master_2 (role_name) VALUES ('manager') RETURNING id")
        manager_role_id = cur.fetchone()[0]
        cur.execute("INSERT INTO role_master_2 (role_name) VALUES ('user') RETURNING id")
        user_role_id = cur.fetchone()[0]

        # 3. Users and Relations
        users_to_seed = [
            ('super-admin', 'superadmin@att.com', 'admin123', 'Super', 'Admin', super_admin_role_id, '2026-01-01'),
            ('admin-001', 'admin@att.com', 'admin123', 'Tenant', 'Administrator', tenant_admin_role_id, '2026-01-04'),
            ('vg-0210', 'varsha.g@att.com', 'manager123', 'Varsha', 'Gaikwad', manager_role_id, '2026-02-11'),
            ('cs-1187', 'chetan.s@att.com', 'manager123', 'Chetan', 'Sethi', manager_role_id, '2026-02-11'),
            ('aps-0142', 'aayushman@att.com', 'demo123', 'Aayushman', 'Pratap Singh', user_role_id, '2026-03-02')
        ]

        for username, email, password, first_name, last_name, role_id, created_date in users_to_seed:
            hashed_pw = hash_password(password)
            cur.execute("""
                INSERT INTO user_master_2 (user_name, email, password, first_name, last_name, created)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (username, email, hashed_pw, first_name, last_name, created_date))
            user_id = cur.fetchone()[0]

            cur.execute("""
                INSERT INTO relations (user_id, tenant_id, role_id)
                VALUES (%s, %s, %s)
            """, (user_id, tenant_id, role_id))

        print("Database schema built and updated seed records successfully inserted!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error during schema build/seed: {e}")

if __name__ == "__main__":
    init_database()
