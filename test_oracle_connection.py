import cx_Oracle

# Replace with your real Oracle credentials and service name
username = "dw"
password = "abc123"
dsn = "localhost/XE"  # Example: host/service_name

try:
    # Establish connection
    conn = cx_Oracle.connect(username, password, dsn)
    print("Connection successful!")

    # Simple query test
    cursor = conn.cursor()
    cursor.execute("SELECT 'Oracle connection working!' AS status FROM dual")
    for row in cursor:
        print(row[0])

except cx_Oracle.DatabaseError as e:
    print("Connection failed:")
    print(e)

finally:
    try:
        conn.close()
    except:
        pass
