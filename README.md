# Space 3D - Six Degrees of Freedom

A 3D space combat and resource management game built with Babylon.js and TypeScript.

## Quick Start

```bash
npm install
npm run dev
```

Open your browser at `http://localhost:3000`

## Controls

- **WASD**: Lateral movement
- **Q/E**: Vertical movement
- **Mouse**: Look around
- **Left Click**: Shoot
- **TAB**: Upgrade menu

## Game Overview

Pilot a spaceship with full six degrees of freedom. Mine asteroids for resources, fight enemies, and upgrade your ship, station, and defenses. Progress through four sectors by reaching Level 3 in all upgrade paths.

**Asteroid System:**
- Large asteroids split into 2-3 medium asteroids
- Medium asteroids split into 2-3 small asteroids
- Small asteroids break into collectible resource fragments
- Asteroids can collide with player/enemies/station for damage (yields 5x fewer resources)

**Resource Physics:**
- Fragments use inverse-square gravity (a = G*M/r²)
- Player has constant magnetic pull (range: 25 units)
- Station gravity unlocks and expands with upgrades

## Development

Built with Babylon.js 7.0, TypeScript 5.3, and Vite 5.0.

For detailed architecture and development guidance, see [CLAUDE.md](CLAUDE.md).

## License

MIT
