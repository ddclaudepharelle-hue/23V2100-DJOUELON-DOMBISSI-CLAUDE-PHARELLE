from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
import os

app = Flask(__name__, template_folder='../templates', static_folder='../static')
app.secret_key = '6183f0deffabc799e134c0664aee52ded953845eede9279b30cddf256e4fbb33'

# --- CONFIGURATION DU FICHIER ---
# On définit le chemin du fichier JSON de manière robuste
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'patients.json')

def load_patients():
    """Charge les patients depuis le fichier JSON."""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []

def save_patients(patients):
    """Sauvegarde les patients dans le fichier JSON."""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(patients, f, ensure_ascii=False, indent=2)
    except IOError as e:
        print(f"Erreur d'écriture (normal sur Vercel) : {e}")

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
    if 'user' not in session:
        return redirect(url_for('home'))
    return render_template('dashboard.html', user=session['user'])

@app.route('/patients')
def liste_patients():
    if 'user' not in session:
        return redirect(url_for('home'))
    return render_template('listepatient.html', user=session['user'])

@app.route('/formulaire')
def formulaire():
    if 'user' not in session:
        return redirect(url_for('home'))
    return render_template('formulaire.html', user=session['user'])

# ── API JSON ──────────────────────────────────────────
@app.route('/api/patients', methods=['GET'])
def api_get_patients():
    return jsonify(load_patients())

@app.route('/api/patients', methods=['POST'])
def api_add_patient():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
    patients = load_patients()
    # Génération d'un ID unique
    data['id'] = 'P' + str(len(patients) + 1).zfill(4)
    patients.insert(0, data)
    
    save_patients(patients)
    return jsonify({'success': True, 'id': data['id']})

@app.route('/api/patients/<pid>', methods=['DELETE'])
def api_delete_patient(pid):
    patients = load_patients()
    new_patients = [p for p in patients if p.get('id') != pid]
    
    if len(new_patients) != len(patients):
        save_patients(new_patients)
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Patient not found'}), 404

if __name__ == '__main__':
    # Créer le fichier JSON s'il n'existe pas pour éviter les erreurs au premier lancement
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
            
    app.run(debug=True, port=5000)