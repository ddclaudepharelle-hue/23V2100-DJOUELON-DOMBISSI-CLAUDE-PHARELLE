from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import os
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__, template_folder='../templates', static_folder='../static')
app.secret_key = '6183f0deffabc799e134c0664aee52ded953845eede9279b30cddf256e4fbb33'

# --- CONNEXION BASE DE DONNÉES NEON ---
def get_db_connection():
    # Vercel fournit généralement DATABASE_URL ou POSTGRES_URL
    url = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL')
    conn = psycopg2.connect(url, sslmode='require')
    return conn

def init_db():
    """Crée la table patients si elle n'existe pas."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id SERIAL PRIMARY KEY,
            external_id TEXT UNIQUE,
            data JSONB NOT NULL
        );
    ''')
    conn.commit()
    cur.close()
    conn.close()

# Initialisation au démarrage
with app.app_context():
    init_db()

# ── Auth ──────────────────────────────────────────────
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username', '').strip()
    if username:
        session['user'] = username
        return redirect(url_for('dashboard'))
    return redirect(url_for('home'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))

# ── Pages principales ─────────────────────────────────
@app.route('/dashboard')
def dashboard():
    if 'user' not in session: return redirect(url_for('home'))
    return render_template('dashboard.html', user=session['user'])

@app.route('/patients')
def liste_patients():
    if 'user' not in session: return redirect(url_for('home'))
    return render_template('listepatient.html', user=session['user'])

@app.route('/formulaire')
def formulaire():
    if 'user' not in session: return redirect(url_for('home'))
    return render_template('formulaire.html', user=session['user'])

# ── API JSON (Neon DB) ──────────────────────────────────────────
@app.route('/api/patients', methods=['GET'])
def api_get_patients():
    conn = get_db_connection()
    # RealDictCursor permet de récupérer les résultats sous forme de dictionnaire
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('SELECT data FROM patients ORDER BY id DESC;')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    # On extrait le contenu du champ JSONB pour chaque ligne
    patients = [row['data'] for row in rows]
    return jsonify(patients)

@app.route('/api/patients', methods=['POST'])
def api_add_patient():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
    conn = get_db_connection()
    cur = conn.cursor()
    
    # On génère un ID (facultatif car SQL a son propre ID, mais on garde votre logique)
    cur.execute('SELECT count(*) FROM patients;')
    count = cur.fetchone()[0]
    data['id'] = 'P' + str(count + 1).zfill(4)
    
    import json # Import local pour la sérialisation
    cur.execute(
        'INSERT INTO patients (external_id, data) VALUES (%s, %s)',
        (data['id'], json.dumps(data))
    )
    
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'id': data['id']})

@app.route('/api/patients/<pid>', methods=['DELETE'])
def api_delete_patient(pid):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('DELETE FROM patients WHERE external_id = %s', (pid,))
    conn.commit()
    rows_deleted = cur.rowcount
    cur.close()
    conn.close()
    
    if rows_deleted > 0:
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Patient not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)