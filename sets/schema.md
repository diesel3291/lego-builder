# Set JSON Schema (v1)

## Overview

Each set is defined by a single JSON file in the `sets/` directory. The filename (without `.json`) must match the `id` field. These files are the authoritative data contract for all set authors and are validated by Flask at startup. Changing field names after Phase 2 begins cascades across set files, state.js, and geometry lookups — treat this schema as immutable within v1.

---

## Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | integer | yes | Schema version; currently `1`. Bump on any breaking change to field names or types. |
| `id` | string | yes | Kebab-case identifier matching the filename (e.g., `small-house` for `small-house.json`). |
| `name` | string | yes | Display name shown on the set selection screen. |
| `description` | string | yes | Short description shown on the set selection screen. |
| `pieceCount` | integer | yes | Total number of pieces across all steps. |
| `steps` | array | yes | Ordered list of build steps (see Step Fields below). |

---

## Step Fields

Each element of the `steps` array represents one build step shown in the instruction panel.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stepNumber` | integer | yes | 1-indexed, sequential, no gaps. Step 1 is always first. |
| `description` | string | yes | Human-readable instruction shown in the step panel (e.g., "Place the 2x4 red brick"). |
| `pieces` | array | yes | List of pieces to place in this step (see Piece Fields below). |

---

## Piece Fields

Each element of the `pieces` array defines a single brick or plate to be placed.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier within the set (e.g., `step1-piece1`). |
| `type` | string | yes | Piece shape — must be one of the 13 v1 valid types listed below. |
| `color` | string | yes | CSS hex color string (e.g., `#e3000b`). |
| `gridX` | integer | yes | Stud column position. Positive = right. |
| `gridZ` | integer | yes | Stud row position. Positive = away from viewer. |
| `layer` | integer | yes | Stack height. `0` = resting on baseplate surface. See coordinate system for height increments. |
| `rotation` | integer | yes | Y-axis rotation in degrees. Must be exactly `0`, `90`, `180`, or `270`. |

---

## Valid Piece Types (v1)

The following 13 piece type strings are valid for the `type` field. Any other string will cause Flask to reject the set file at startup.

**Bricks** (standard height, ~9.6 world units tall):

- `brick-1x1`
- `brick-1x2`
- `brick-1x3`
- `brick-1x4`
- `brick-2x2`
- `brick-2x3`
- `brick-2x4`

**Plates** (flat, ~3.2 world units tall — one-third of a brick):

- `plate-1x1`
- `plate-1x2`
- `plate-1x4`
- `plate-2x2`
- `plate-2x4`

**Slopes**:

- `slope-2x1`
- `slope-2x2`

---

## Coordinate System

All positions are integer stud-grid coordinates. **Never use floating-point positions in set files** — float drift makes equality checks unreliable and is rejected by the schema validator.

### Grid Axes

- **gridX** — stud column. Positive values go right. Negative values go left.
- **gridZ** — stud row. Positive values go away from the viewer. Negative values come toward the viewer.
- **layer** — vertical stack position. `0` is the baseplate surface. Each increment is one piece-height up.

### World-Space Conversion

The renderer converts integer grid coordinates to Three.js world units using these formulas:

```
World X = gridX * 8
World Z = gridZ * 8
World Y = layer * 9.6   (bricks and slopes)
World Y = layer * 3.2   (plates)
```

Constants:
- 1 stud = 8 world units (8mm Lego standard)
- Standard brick height = 9.6 world units
- Plate height = 3.2 world units (one-third of a brick)

### Rotation

The `rotation` field specifies Y-axis rotation in degrees. Valid values: `0`, `90`, `180`, `270`.

- `0` — default orientation
- `90` — rotated 90 degrees clockwise (viewed from above)
- `180` — rotated 180 degrees (reversed)
- `270` — rotated 270 degrees clockwise (or 90 degrees counter-clockwise)

---

## Schema Versioning

- `schemaVersion` starts at `1` for all v1 sets.
- Bump `schemaVersion` on any breaking change: renamed fields, changed types, removed fields, or reinterpreted coordinate meanings.
- Additive changes (new optional fields) do not require a version bump.
- The Flask validator checks `schemaVersion` is present but does not currently reject unknown versions — this is reserved for future tooling.

---

## Example: Minimal 2-Step Set

```json
{
  "schemaVersion": 1,
  "id": "example-tower",
  "name": "Example Tower",
  "description": "A minimal two-step example showing the schema structure.",
  "pieceCount": 3,
  "steps": [
    {
      "stepNumber": 1,
      "description": "Place the base brick",
      "pieces": [
        {
          "id": "step1-piece1",
          "type": "brick-2x4",
          "color": "#e3000b",
          "gridX": 0,
          "gridZ": 0,
          "layer": 0,
          "rotation": 0
        }
      ]
    },
    {
      "stepNumber": 2,
      "description": "Stack two plates on top",
      "pieces": [
        {
          "id": "step2-piece1",
          "type": "plate-2x2",
          "color": "#006db7",
          "gridX": 0,
          "gridZ": 0,
          "layer": 1,
          "rotation": 0
        },
        {
          "id": "step2-piece2",
          "type": "plate-1x2",
          "color": "#f5cd2f",
          "gridX": -1,
          "gridZ": 0,
          "layer": 1,
          "rotation": 90
        }
      ]
    }
  ]
}
```

In this example:
- The `brick-2x4` sits at grid position (0, 0) on the baseplate (`layer: 0`).
- The two plates sit at `layer: 1` directly above — in world space, `Y = 1 * 3.2 = 3.2` units up from the baseplate.
- All coordinate values are integers. No floats.
