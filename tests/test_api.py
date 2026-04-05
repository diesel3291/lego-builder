"""Pytest suite for the Flask API routes and set schema validator."""
import json
import pytest
import sys
import os

# Ensure the project root is on sys.path so app.py is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as flask_app_module
from app import app, validate_set

# ---- Fixture set used in route tests ----

FIXTURE_SET = {
    "schemaVersion": 1,
    "id": "test-set",
    "name": "Test Set",
    "description": "Fixture for tests",
    "pieceCount": 2,
    "steps": [
        {
            "stepNumber": 1,
            "description": "Place first brick",
            "pieces": [
                {
                    "id": "s1p1",
                    "type": "brick-2x4",
                    "color": "#e3000b",
                    "gridX": 0,
                    "gridZ": 0,
                    "layer": 0,
                    "rotation": 0,
                }
            ],
        },
        {
            "stepNumber": 2,
            "description": "Stack a plate",
            "pieces": [
                {
                    "id": "s2p1",
                    "type": "plate-2x2",
                    "color": "#006db7",
                    "gridX": 0,
                    "gridZ": 0,
                    "layer": 1,
                    "rotation": 0,
                }
            ],
        },
    ],
}


@pytest.fixture
def client():
    """Flask test client with FIXTURE_SET patched into the cache."""
    app.config['TESTING'] = True
    # Patch the sets cache with a known fixture
    original_cache = flask_app_module._sets_cache.copy()
    flask_app_module._sets_cache.clear()
    flask_app_module._sets_cache['test-set'] = FIXTURE_SET
    with app.test_client() as c:
        yield c
    # Restore original cache after each test
    flask_app_module._sets_cache.clear()
    flask_app_module._sets_cache.update(original_cache)


# ---- Route tests ----

def test_list_sets_returns_200_json_list(client):
    """GET /api/sets returns 200, Content-Type application/json, and a list."""
    response = client.get('/api/sets')
    assert response.status_code == 200
    assert 'application/json' in response.content_type
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) >= 1


def test_get_set_valid_id_returns_full_set(client):
    """GET /api/sets/<valid_id> returns 200 and the full set object."""
    response = client.get('/api/sets/test-set')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['id'] == 'test-set'
    assert data['name'] == 'Test Set'
    assert 'steps' in data
    assert len(data['steps']) == 2


def test_get_set_nonexistent_returns_404_json(client):
    """GET /api/sets/nonexistent-set returns 404 and JSON body {"error": "Set not found"}."""
    response = client.get('/api/sets/nonexistent-set')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data == {'error': 'Set not found'}
    assert 'application/json' in response.content_type


# ---- validate_set() unit tests ----

def test_validate_set_accepts_valid_set():
    """Schema validator accepts a fully valid set dict."""
    errors = validate_set(FIXTURE_SET)
    assert errors == []


def test_validate_set_rejects_missing_schema_version():
    """Schema validator rejects a dict missing schemaVersion."""
    bad = {k: v for k, v in FIXTURE_SET.items() if k != 'schemaVersion'}
    errors = validate_set(bad)
    assert any('schemaVersion' in e for e in errors)


def test_validate_set_rejects_invalid_piece_type():
    """Schema validator rejects a piece with type 'brick-9x9' (not in VALID_TYPES)."""
    bad = {
        **FIXTURE_SET,
        'steps': [
            {
                'stepNumber': 1,
                'description': 'Bad step',
                'pieces': [
                    {
                        'id': 's1p1',
                        'type': 'brick-9x9',
                        'color': '#e3000b',
                        'gridX': 0,
                        'gridZ': 0,
                        'layer': 0,
                        'rotation': 0,
                    }
                ],
            }
        ],
    }
    errors = validate_set(bad)
    assert any('invalid type' in e for e in errors)


def test_validate_set_rejects_float_grid_coord():
    """Schema validator rejects a piece with gridX: 1.5 (float, not int)."""
    bad = {
        **FIXTURE_SET,
        'steps': [
            {
                'stepNumber': 1,
                'description': 'Float coord step',
                'pieces': [
                    {
                        'id': 's1p1',
                        'type': 'brick-2x4',
                        'color': '#e3000b',
                        'gridX': 1.5,
                        'gridZ': 0,
                        'layer': 0,
                        'rotation': 0,
                    }
                ],
            }
        ],
    }
    errors = validate_set(bad)
    assert any('gridX must be integer' in e for e in errors)


def test_validate_set_rejects_invalid_rotation():
    """Schema validator rejects a piece with rotation: 45 (not in {0, 90, 180, 270})."""
    bad = {
        **FIXTURE_SET,
        'steps': [
            {
                'stepNumber': 1,
                'description': 'Bad rotation step',
                'pieces': [
                    {
                        'id': 's1p1',
                        'type': 'brick-2x4',
                        'color': '#e3000b',
                        'gridX': 0,
                        'gridZ': 0,
                        'layer': 0,
                        'rotation': 45,
                    }
                ],
            }
        ],
    }
    errors = validate_set(bad)
    assert any('rotation must be 0, 90, 180, or 270' in e for e in errors)
