import os
import json
import glob
from flask import Flask, jsonify, send_from_directory, abort
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

SETS_DIR = os.getenv('SETS_DIR', 'sets')

# ---- Schema validation ----

VALID_TYPES = {
    'brick-1x1', 'brick-1x2', 'brick-1x3', 'brick-1x4',
    'brick-2x2', 'brick-2x3', 'brick-2x4',
    'plate-1x1', 'plate-1x2', 'plate-1x4', 'plate-2x2', 'plate-2x4',
    'slope-2x1', 'slope-2x2',
}
VALID_ROTATIONS = {0, 90, 180, 270}


def validate_set(data: dict, filepath: str = '') -> list:
    """Return list of validation errors. Empty list = valid."""
    errors = []
    for field in ('schemaVersion', 'id', 'name', 'description', 'pieceCount', 'steps'):
        if field not in data:
            errors.append(f"Missing top-level field: {field}")
    if 'steps' in data:
        for si, step in enumerate(data['steps']):
            for sf in ('stepNumber', 'description', 'pieces'):
                if sf not in step:
                    errors.append(f"Step {si}: missing field {sf}")
            for pi, piece in enumerate(step.get('pieces', [])):
                for pf in ('id', 'type', 'color', 'gridX', 'gridZ', 'layer', 'rotation'):
                    if pf not in piece:
                        errors.append(f"Step {si} piece {pi}: missing field {pf}")
                if piece.get('type') not in VALID_TYPES:
                    errors.append(f"Step {si} piece {pi}: invalid type '{piece.get('type')}'")
                if piece.get('rotation') not in VALID_ROTATIONS:
                    errors.append(f"Step {si} piece {pi}: rotation must be 0, 90, 180, or 270")
                for int_field in ('gridX', 'gridZ', 'layer'):
                    if int_field in piece and not isinstance(piece[int_field], int):
                        errors.append(f"Step {si} piece {pi}: {int_field} must be integer")
    return errors


# ---- Load sets at startup ----

_sets_cache: dict = {}


def _load_sets():
    pattern = os.path.join(SETS_DIR, '*.json')
    for filepath in glob.glob(pattern):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        errors = validate_set(data, filepath)
        if errors:
            raise SystemExit(
                f"Schema validation failed for {filepath}:\n" +
                "\n".join(f"  - {e}" for e in errors)
            )
        _sets_cache[data['id']] = data


_load_sets()


# ---- Routes ----

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/sets')
def list_sets():
    catalogue = [
        {
            'id': s['id'],
            'name': s['name'],
            'description': s['description'],
            'pieceCount': s['pieceCount'],
        }
        for s in _sets_cache.values()
    ]
    return jsonify(catalogue)


@app.route('/api/sets/<set_id>')
def get_set(set_id):
    if set_id not in _sets_cache:
        return jsonify({'error': 'Set not found'}), 404
    return jsonify(_sets_cache[set_id])


if __name__ == '__main__':
    port = int(os.getenv('FLASK_RUN_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(port=port, debug=debug)
