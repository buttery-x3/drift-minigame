# Drift Minigame

A browser-based drifting racing prototype built with Three.js and Rapier. The project is evolving from an earlier Solar2D/Lua drift prototype into a flat, low-poly 3D web game with procedural circuits, arcade drifting, surface effects, and physics-driven obstacles.

## Current Prototype

- Procedurally generated closed circuit
- Top-down track workshop with seeded segment generation
- Configurable corner angles, radii, and long straights
- Three.js low-poly scene rendering
- Rapier physics world
- Custom arcade drift vehicle controller
- Road, grass, and oil surface behavior
- Dynamic cone obstacles
- High chase camera with alternate camera modes
- Basic lap/checkpoint state
- Live tuning panel via `lil-gui`

## Controls

- `W` / `ArrowUp`: throttle
- `S` / `ArrowDown`: brake
- `A` / `ArrowLeft`: steer left
- `D` / `ArrowRight`: steer right
- `R`: reset car
- `T`: generate the next seed in the track workshop / return to the workshop while racing
- `C`: cycle camera mode
- `Enter`: race the previewed track
- `Escape`: return to the track workshop

## Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Technical Direction

The first pass intentionally uses a custom arcade driving model on top of Rapier rigid bodies instead of a full raycast vehicle simulation. This keeps the drift feel tunable while still using Rapier for collisions, cones, barriers, and future surface interactions.

Tracks are assembled from exact straight and constant-radius corner segments. The generator tracks accumulated heading, reserves a tangent-continuous closing section, and rejects candidates that overlap or cannot reconnect cleanly. The resulting circuit is sampled into reusable data for road mesh generation, checkpoint placement, surface zones, and physics boundaries.

## Near-Term Ideas

- Save and share track recipes
- Add start/finish line handling
- Improve drift scoring and combo logic
- Add skid marks, tire smoke, and sound
- Add better wall/barrier visuals
- Tune camera smoothing and car handling
