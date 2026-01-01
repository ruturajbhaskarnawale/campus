import sqlite3
import json

def analyze_database():
    conn = sqlite3.connect('campus.db')
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall() if row[0] != 'sqlite_sequence']
    
    schema_report = {}
    
    print(f"Found {len(tables)} tables: {tables}")
    
    for table in tables:
        table_info = {}
        
        # Columns
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        # (cid, name, type, notnull, dflt_value, pk)
        table_info['columns'] = [{
            'name': col[1],
            'type': col[2],
            'notnull': bool(col[3]),
            'default': col[4],
            'pk': bool(col[5])
        } for col in columns]
        
        # Foreign Keys
        cursor.execute(f"PRAGMA foreign_key_list({table})")
        fks = cursor.fetchall()
        # (id, seq, table, from, to, on_update, on_delete, match)
        table_info['foreign_keys'] = [{
            'table': fk[2],
            'from': fk[3],
            'to': fk[4]
        } for fk in fks]
        
        # Indexes
        cursor.execute(f"PRAGMA index_list({table})")
        indexes = cursor.fetchall()
        table_info['indexes'] = [idx[1] for idx in indexes]
        
        # Row Count
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        table_info['row_count'] = cursor.fetchone()[0]
        
        schema_report[table] = table_info
        
        print(f"\n--- Table: {table} ({table_info['row_count']} rows) ---")
        print(f"Columns:")
        for col in table_info['columns']:
            pk_str = " [PK]" if col['pk'] else ""
            notnull_str = " [NOT NULL]" if col['notnull'] else ""
            print(f"  - {col['name']} ({col['type']}){pk_str}{notnull_str}")
        
        if table_info['foreign_keys']:
            print(f"Foreign Keys:")
            for fk in table_info['foreign_keys']:
                print(f"  - {fk['from']} -> {fk['table']}.{fk['to']}")

    conn.close()

if __name__ == "__main__":
    analyze_database()
