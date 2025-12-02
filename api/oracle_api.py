from fastapi import APIRouter, FastAPI, HTTPException, Body
import cx_Oracle
import os
import time

router = APIRouter()

# -------------------------------------------------------------------------
# Oracle Connection Pool Setup
# -------------------------------------------------------------------------
ORACLE_USER = os.getenv("ORACLE_USER", "dw")
ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD", "abc123")
ORACLE_HOST = os.getenv("ORACLE_HOST", "localhost")
ORACLE_PORT = os.getenv("ORACLE_PORT", "1521")
ORACLE_SERVICE = os.getenv("ORACLE_SERVICE", "XE")

dsn = cx_Oracle.makedsn(ORACLE_HOST, ORACLE_PORT, service_name=ORACLE_SERVICE)

try:
    pool = cx_Oracle.SessionPool(
        user=ORACLE_USER,
        password=ORACLE_PASSWORD,
        dsn=dsn,
        min=1,
        max=5,
        increment=1,
        threaded=True,
        getmode=cx_Oracle.SPOOL_ATTRVAL_WAIT
    )
    print("Oracle connection pool initialized successfully")
except Exception as e:
    raise RuntimeError(f"Failed to initialize Oracle pool: {e}")


def get_connection():
    try:
        return pool.acquire()
    except cx_Oracle.DatabaseError as e:
        raise HTTPException(status_code=500, detail=f"DB Connection Error: {str(e)}")


# -------------------------------------------------------------------------
# GET Endpoints
# -------------------------------------------------------------------------

@router.get("/customer")
def get_customers():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM CUSTOMER")
        rows = [dict(zip([d[0] for d in cursor.description], r)) for r in cursor]
        return rows
    finally:
        cursor.close()
        pool.release(conn)


@router.get("/creditHistory")
def get_credit_history():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM CREDIT_HISTORY")
        rows = [dict(zip([d[0] for d in cursor.description], r)) for r in cursor]
        return rows
    finally:
        cursor.close()
        pool.release(conn)


@router.get("/loanApplication")
def get_loan_application():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM LOAN_APPLICATION")
        rows = [dict(zip([d[0] for d in cursor.description], r)) for r in cursor]
        return rows
    finally:
        cursor.close()
        pool.release(conn)

@router.get("/dashboard/officer/applications")
def get_officer_applications():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT l.LOAN_ID, l.CUSTOMER_ID, l.LOAN_INTENT, l.LOAN_GRADE, l.LOAN_AMNT,
                   l.LOAN_INT_RATE, l.LOAN_PERCENT_INCOME, l.LOAN_STATUS,
                   c.PERSON_AGE, c.PERSON_INCOME, c.PERSON_HOME_OWNERSHIP, c.PERSON_EMP_LENGTH,
                   m.PREDICTED_SCORE, m.PREDICTED_LABEL
            FROM LOAN_APPLICATION l
            JOIN CUSTOMER c ON l.CUSTOMER_ID = c.CUSTOMER_ID
            LEFT JOIN MODEL_OUTPUT m ON l.LOAN_ID = m.LOAN_ID
        """)
        rows = [dict(zip([d[0] for d in cursor.description], r)) for r in cursor]
        return rows
    finally:
        cursor.close()
        pool.release(conn)



# -------------------------------------------------------------------------
# POST Endpoint: Insert Customer Data
# -------------------------------------------------------------------------

@router.post("/insert_customer_data")
def insert_customer_data(data: list = Body(...)):
    # Handle n8n or malformed input
    if isinstance(data, dict):
        if "body" in data and isinstance(data["body"], list):
            data = data["body"]
        else:
            data = [data]

    if not isinstance(data, list) or not data:
        raise HTTPException(status_code=400, detail="Expected a non-empty list of records")

    conn = get_connection()
    cursor = conn.cursor()
    start_total = time.time()

    try:
        customer_rows, credit_rows, loan_rows = [], [], []

        for c in data:
            cb_default = 1 if c.get("cb_person_default_on_file", "N") == "Y" else 0
            loan_status = 1 if c.get("loan_status", 0) == 1 else 0

            # Get sequence PK values
            cursor.execute("SELECT CUSTOMER_SEQ.NEXTVAL FROM DUAL")
            customer_id = cursor.fetchone()[0]

            cursor.execute("SELECT CREDIT_HISTORY_SEQ.NEXTVAL FROM DUAL")
            credit_history_id = cursor.fetchone()[0]

            cursor.execute("SELECT LOAN_APPLICATION_SEQ.NEXTVAL FROM DUAL")
            loan_id = cursor.fetchone()[0]

            customer_rows.append((
                customer_id,
                c.get("person_age", 0),
                c.get("person_income", 0.0),
                c.get("person_home_ownership"),
                c.get("person_emp_length", 0)
            ))

            credit_rows.append((
                credit_history_id,
                customer_id,
                cb_default,
                c.get("cb_person_cred_hist_length", 0)
            ))

            loan_rows.append((
                loan_id,
                customer_id,
                c.get("loan_intent"),
                c.get("loan_grade"),
                c.get("loan_amnt"),
                c.get("loan_int_rate"),
                c.get("loan_percent_income", 0.0),
                loan_status
            ))

        # Insert CUSTOMER
        cursor.executemany("""
            INSERT INTO CUSTOMER 
            (CUSTOMER_ID, PERSON_AGE, PERSON_INCOME, PERSON_HOME_OWNERSHIP, PERSON_EMP_LENGTH)
            VALUES (:1, :2, :3, :4, :5)
        """, customer_rows)

        # Insert CREDIT HISTORY
        cursor.executemany("""
            INSERT INTO CREDIT_HISTORY 
            (CREDIT_HISTORY_ID, CUSTOMER_ID, CB_PERSON_DEFAULT_ON_FILE, CB_PERSON_CRED_HIST_LENGTH)
            VALUES (:1, :2, :3, :4)
        """, credit_rows)

        # Insert LOAN APPLICATION
        cursor.executemany("""
            INSERT INTO LOAN_APPLICATION (
                LOAN_ID, CUSTOMER_ID, LOAN_INTENT, LOAN_GRADE, LOAN_AMNT,
                LOAN_INT_RATE, LOAN_PERCENT_INCOME, LOAN_STATUS, CREATED_AT
            ) VALUES (:1, :2, :3, :4, :5, :6, :7, :8, SYSDATE)
        """, loan_rows)

        # Audit Log
        elapsed = round(time.time() - start_total, 3)
        cursor.execute("""
            INSERT INTO AUDIT_LOG (LOG_ID, PROCESS_NAME, RECORD_COUNT, STATUS, REMARKS)
            VALUES (AUDIT_LOG_SEQ.NEXTVAL, :1, :2, :3, :4)
        """, (
            "InsertCustomerData",
            len(data),
            "SUCCESS",
            f"Inserted {len(data)} records in {elapsed}s"
        ))

        conn.commit()

        return {
            "status": "success",
            "inserted_records": len(data),
            "elapsed_seconds": elapsed
        }

    except Exception as e:
        conn.rollback()

        cursor.execute("""
            INSERT INTO AUDIT_LOG (LOG_ID, PROCESS_NAME, RECORD_COUNT, STATUS, REMARKS)
            VALUES (AUDIT_LOG_SEQ.NEXTVAL, :1, :2, :3, :4)
        """, ("InsertCustomerData", len(data), "FAILED", str(e)[:3900]))

        conn.commit()
        raise HTTPException(status_code=500, detail=f"Insert failed: {e}")

    finally:
        cursor.close()
        pool.release(conn)
