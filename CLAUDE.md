# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm run dev
```
Opens at `http://localhost:3000` (or next available port). Hot reload is enabled.

**Build for production:**
```bash
npm run build
```
Output goes to `dist/` directory.

**Preview production build:**
```bash
npm run preview
```

## Architecture Overview

This is a 3D space combat game built with Babylon.js 7.0, TypeScript, and Vite. The game uses a hybrid Entity-Manager architecture.

### Core Game Loop

`src/main.ts` → Creates Babylon.js Engine/Scene → Instantiates `Game` class → Starts render loop

The `Game` class (`src/game/Game.ts`) is the central coordinator that:
- Owns all managers and entities
- Runs the main `update(deltaTime)` loop via `scene.onBeforeRenderObservable`
- Passes dependencies between systems (e.g., enemies list to AsteroidManager for collisions)

### Entity vs Manager Pattern

**Entities** (`src/game/entities/`): Individual game objects with their own state, mesh, and behavior
- `Player.ts` - Player ship (cyan), controlled by camera, shoots green projectiles
- `Enemy.ts` - Four types (scout/fighter/heavy/destroyer) with different colors, shoot red projectiles
- `Station.ts` - Central base at (0,0,0), has upgradeable turrets and modules
- `Asteroid.ts` - Three sizes (large→medium→small), split when hit, eventually break into ResourceFragments
- `Projectile.ts` - Bullets with `owner` property and `color` property for spark effects
- `ResourceFragment.ts` / `EnemyResourceFragment.ts` - Collectibles with inverse-square gravity physics

**Managers** (`src/game/systems/`): Handle spawning, updating, and collision detection for entity types
- `AsteroidManager.ts` - Spawns asteroids, handles splitting logic, checks collisions with player/station/enemies
- `EnemyManager.ts` - Spawns enemies based on difficulty, checks projectile hits, creates resource drops
- `ProgressionManager.ts` - Tracks upgrade levels, calculates costs, handles sector transitions
- `UIManager.ts` - Updates HUD elements, manages upgrade menu visibility

### Key Design Patterns

**Explosion System** (`src/game/effects/ExplosionEffect.ts`):
- `createHitSpark(weaponColor, targetColor)` - Blends two colors for realistic impact sparks
- Uses mesh-based particles (small spheres) instead of texture-based particles
- Called during `takeDamage()` with projectile color + target material color

**Collision Detection**:
- Projectile collisions: Managers iterate projectile arrays and check distances
- Physical collisions: AsteroidManager checks asteroid vs player/station/enemies each frame
- Weapon color is passed to `takeDamage()` for proper spark color blending

**Resource Physics**:
- Fragments use inverse-square gravity: `a = G*M/r²`
- Player gravity: always active (range 25, constant 500)
- Station gravity: level-dependent (0→30→40→50 range, constant 800)
- Fragments drift out of bounds (300 units) and are marked `isLost`

**Asteroid Lifecycle**:
1. Large asteroids (30 HP) → split into 2-3 medium
2. Medium asteroids (15 HP) → split into 2-3 small
3. Small asteroids (10 HP) → break into ResourceFragments
4. Collision with entities → `crashIntoFragments()` (5x fewer resources)

**Enemy AI**:
- Maintain optimal shooting range per ship type (40-60 units)
- Smooth movement with deadzone (5 units) to prevent jitter
- Strafe perpendicular to target direction
- Speed scales with distance error for smooth approach/retreat

### Cross-System Communication

The `Game` instance is exposed globally on `window.game` for systems that need to communicate:
```typescript
declare global {
    interface Window {
        game: Game;
    }
}
```

`InputController` accesses this to call player shooting methods and toggle UI.

### Important Implementation Details

**Color System**:
- Player/turrets: Green projectiles (0, 1, 0)
- Enemies: Red projectiles (1, 0, 0)
- Spark color = blend of weapon color + target material color
- All hit effects must pass both colors to `ExplosionEffect.createHitSpark()`

**Dependency Injection**:
- `ExplosionEffect` must be passed to: Game → Player (via setter), Station, Asteroid, AsteroidManager, EnemyManager
- Enemies receive ExplosionEffect in their constructor via EnemyManager

**Update Order** (critical for collision detection):
```typescript
player.update()
station.update()
asteroidManager.update(player, station, enemies)  // Needs enemy list for collisions
enemyManager.update(defensiveStrength)
progressionManager.update()
uiManager.update()
```

**Material Application to Compound Meshes**:
Enemy ships use mesh parenting. Material must be applied to root AND all children:
```typescript
shipRoot.material = material;
shipRoot.getChildMeshes().forEach(child => {
    child.material = material;
});
```

### TypeScript Configuration

- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled
- DOM lib included for browser APIs

### File Naming Conventions

- PascalCase for classes and files: `EnemyManager.ts`, `ResourceFragment.ts`
- Entity files go in `entities/`, system files in `systems/`, effects in `effects/`
