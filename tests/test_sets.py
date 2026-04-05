"""
Integration tests using real set files on disk.
Unlike test_api.py (which uses in-memory fixtures), these tests require the three
authored JSON files to exist in sets/ and pass Flask startup validation.
"""
import json
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import app, _sets_cache, validate_set


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as c:
        yield c


class TestRealSetFiles:
    def test_list_sets_returns_all_three(self, client):
        resp = client.get('/api/sets')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)
        ids = {s['id'] for s in data}
        assert 'mini-rocket' in ids
        assert 'starter-tower' in ids
        assert 'color-steps' in ids

    def test_list_sets_response_shape(self, client):
        resp = client.get('/api/sets')
        data = resp.get_json()
        for item in data:
            assert 'id' in item
            assert 'name' in item
            assert 'description' in item
            assert 'pieceCount' in item

    def test_get_mini_rocket_full_data(self, client):
        resp = client.get('/api/sets/mini-rocket')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['id'] == 'mini-rocket'
        assert data['schemaVersion'] == 1
        assert isinstance(data['steps'], list)
        assert len(data['steps']) > 0

    def test_color_steps_has_100_pieces(self, client):
        resp = client.get('/api/sets/color-steps')
        assert resp.status_code == 200
        data = resp.get_json()
        total = sum(len(s['pieces']) for s in data['steps'])
        assert total == 100

    def test_all_pieces_have_integer_coords(self, client):
        resp = client.get('/api/sets')
        for item in resp.get_json():
            data = client.get(f'/api/sets/{item["id"]}').get_json()
            for step in data['steps']:
                for piece in step['pieces']:
                    assert isinstance(piece['gridX'], int), \
                        f"{item['id']}: gridX is not int: {piece['gridX']!r}"
                    assert isinstance(piece['gridZ'], int), \
                        f"{item['id']}: gridZ is not int: {piece['gridZ']!r}"
                    assert isinstance(piece['layer'], int), \
                        f"{item['id']}: layer is not int: {piece['layer']!r}"

    def test_all_rotations_valid(self, client):
        valid = {0, 90, 180, 270}
        resp = client.get('/api/sets')
        for item in resp.get_json():
            data = client.get(f'/api/sets/{item["id"]}').get_json()
            for step in data['steps']:
                for piece in step['pieces']:
                    assert piece['rotation'] in valid, \
                        f"{item['id']}: invalid rotation {piece['rotation']}"

    def test_piece_counts_match_metadata(self, client):
        resp = client.get('/api/sets')
        catalogue = {s['id']: s['pieceCount'] for s in resp.get_json()}
        for set_id, expected_count in catalogue.items():
            data = client.get(f'/api/sets/{set_id}').get_json()
            actual = sum(len(s['pieces']) for s in data['steps'])
            assert actual == expected_count, \
                f"{set_id}: pieceCount={expected_count} but actual pieces={actual}"

    def test_step_numbers_sequential(self, client):
        resp = client.get('/api/sets')
        for item in resp.get_json():
            data = client.get(f'/api/sets/{item["id"]}').get_json()
            nums = [s['stepNumber'] for s in data['steps']]
            assert nums == list(range(1, len(nums) + 1)), \
                f"{item['id']}: step numbers not sequential: {nums}"

    def test_all_responses_are_json(self, client):
        r1 = client.get('/api/sets')
        assert 'application/json' in r1.content_type
        r2 = client.get('/api/sets/mini-rocket')
        assert 'application/json' in r2.content_type
        r3 = client.get('/api/sets/nonexistent')
        assert 'application/json' in r3.content_type
