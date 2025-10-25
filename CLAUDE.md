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
- `Player.ts` - Player ship (cyan), controlled by camera, shoots projectiles based on weapon level
- `Enemy.ts` - Eight types (scout/fighter/heavy/destroyer/cruiser/battleship/dreadnought/titan) with progressive sizes and colors
- `Station.ts` - Central base at (0,0,0), has upgradeable turrets and modules
- `Asteroid.ts` - Three sizes (large→medium→small), split when hit, eventually break into ResourceFragments
- `Projectile.ts` - Bullets with `owner`, `color`, `penetration`, and `splashRadius` properties
- `Missile.ts` - Self-guided homing missiles with predictive targeting and smooth tracking
- `ResourceFragment.ts` / `EnemyResourceFragment.ts` - Collectibles with inverse-square gravity physics

**Managers** (`src/game/systems/`): Handle spawning, updating, and collision detection for entity types
- `AsteroidManager.ts` - Spawns asteroids, handles splitting logic, checks collisions with player/station/enemies
- `EnemyManager.ts` - Spawns enemies based on difficulty, checks projectile hits, creates resource drops
- `MissileManager.ts` - Manages missile inventory, firing, tracking, and collision detection
- `WeaponSystem.ts` - Defines 10 weapon levels with unique stats (damage, fire rate, burst, penetration, splash)
- `ProgressionManager.ts` - Tracks upgrade levels, calculates costs, handles sector transitions, missile purchases
- `UIManager.ts` - Updates HUD elements, manages upgrade menu visibility, missile count, enemy breakdown display

### Key Design Patterns

**Explosion System** (`src/game/effects/ExplosionEffect.ts`):
- `createHitSpark(weaponColor, targetColor)` - Blends two colors for realistic impact sparks
- Uses mesh-based particles (small spheres) instead of texture-based particles
- Called during `takeDamage()` with projectile color + target material color

**Collision Detection**:
- Projectile collisions: Managers iterate projectile arrays and check distances
- Missile collisions: MissileManager checks all missiles vs all enemies each frame
- Physical collisions: AsteroidManager checks asteroid vs player/station/enemies each frame
- Weapon color is passed to `takeDamage()` for proper spark color blending
- Penetrating projectiles survive hits until penetration limit exceeded
- Splash damage applied in separate pass after direct hit (no chain reactions)

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

**Enemy AI & Ship Design**:
- Eight ship types with progressive difficulty and spaceship-like designs
- Power law scaling: `scaleFactor = 1.0 / Math.pow(size, 0.7)` (balanced visibility across sizes)
- Entry ships: Scout (dart shape, size 1.5), Fighter (X-wing style, size 1.8), Heavy (gunship, size 2.2)
- Capital ships: Destroyer (frigate, 1.8), Cruiser (wedge warship, 2.2), Battleship (2.6), Dreadnought (fortress, 3.0), Titan (ultimate capital ship, 3.5)
- Ships rotate to face target only (no mindless spinning)
- Health bars: fixed 5-unit width, renderingGroupId=1, zOffset=-10, always visible on top
- Difficulty progression: heavies at 1.2, cruisers at 2.0, titans at 5.0
- Maintain optimal shooting range per ship type (40-60 units)
- Smooth movement with deadzone (5 units) to prevent jitter
- Strafe perpendicular to target direction
- Speed scales with distance error for smooth approach/retreat
- All ships feature recognizable spaceship designs: sleek fighters, massive capital ships with bridge towers, engine arrays, weapon batteries

### Cross-System Communication

The `Game` instance is exposed globally on `window.game` for systems that need to communicate:
```typescript
declare global {
    interface Window {
        game: Game;
    }
}
```

`InputController` accesses this to call player shooting methods and fire missiles.

### Important Implementation Details

**Weapon System**:
- 10 weapon levels with unique characteristics and balanced combat
- Fire rates balanced: slower for splash weapons to reduce visual overload
- Projectiles spawn 10 units in front of camera to minimize visual impact
- Splash radii capped at 7 units maximum to prevent headache-inducing effects
- Level 1: Kinetic Cannon (0.1s fire rate, 4 damage)
- Level 2: Auto-Cannon (0.05s, 3 damage, extreme fire rate)
- Level 3: Heavy Cannon (0.2s, 15 damage, 5 splash)
- Level 4: Scatter Shotgun (0.3s, 8 pellets × 6 damage, 2 splash per pellet)
- Level 5: Plasma Lance (0.08s, 8 damage, 3 penetration)
- Level 6: Chain Lightning (0.12s, 10 damage, 5 penetration)
- Level 7: Ion Disruptor (0.15s, 12 damage, 7 splash)
- Level 8: Rotary Minigun (0.03s, 3 bullets × 4 damage, 2 penetration)
- Level 9: Vortex Cannon (0.25s, 18 damage, 7 splash, 4 penetration)
- Level 10: Singularity Bomb (0.35s, 35 damage, 7 splash, 8 penetration)
- Projectile colors vary by weapon level (orange→purple→blue→white spectrum)
- Spread angles: shotgun 0.25 rad, minigun 0.05 rad, others 0.02 rad
- Resource multiplier scales with level: 1.0x at level 1 → 2.5x at level 10

**Missile System**:
- Self-guided homing missiles fired with SPACE key
- Purchased in 10-packs for 100 resources
- Damage scales with weapon level: `15 + (level - 1) × 7.5`
- Predictive targeting: aims at intercept point, not current position
- Smart target selection: scores based on alignment (60%) and distance (40%)
- Performance: 350 units/s speed, 6 rad/s turn rate, 4s lifetime
- Visual: Cylinder body + cone tip, orange-yellow glow, rotates to face direction
- Auto-explodes after timeout or reaching 300 unit boundary

**Color System**:
- Enemies: Red projectiles (1, 0, 0)
- Missiles: Orange-yellow (1.0, 0.8, 0.2)
- Spark color = blend of weapon color + target material color
- All hit effects must pass both colors to `ExplosionEffect.createHitSpark()`

**Dependency Injection**:
- `ExplosionEffect` must be passed to: Game → Player (via setter), Station, Asteroid, AsteroidManager, EnemyManager, MissileManager
- Enemies receive ExplosionEffect in their constructor via EnemyManager
- Missiles receive ExplosionEffect in their constructor via MissileManager

**Update Order** (critical for collision detection):
```typescript
player.update()
station.update()
asteroidManager.update(player, station, enemies)  // Needs enemy list for collisions
enemyManager.update(defensiveStrength)
missileManager.update(enemies)                    // Update missiles with enemy list for tracking
missileManager.checkCollisions(enemies)           // Check missile hits after update
progressionManager.update()
uiManager.update()
```

**Projectile Penetration**:
- Projectiles track `penetrationCount` vs `penetration` limit
- Only destroyed if `penetrationCount > penetration`
- Managers must check `penetration > 0` before destroying on hit
- Weapons with penetration: Plasma Lance (3), Chain Lightning (5), Minigun (2), Vortex (4), Singularity (8)

**Material Application to Compound Meshes**:
Enemy ships use mesh parenting. Material must be applied to root AND all children:
```typescript
shipRoot.material = material;
shipRoot.getChildMeshes().forEach(child => {
    child.material = material;
});
```

**Debug Features**:
- "R" key or button: Add 1000 resources
- "T" key or button: Spawn one of each enemy type (scout→titan) in circle around station
- Debug panel in top center with both keyboard shortcuts and clickable buttons
- Enemy breakdown display: Shows count by type (e.g., "2 scouts, 3 fighters, 1 heavy")
- UIManager implements spawn logic for debug enemies via keyboard and button
- Debug enemies spawned at 40 unit radius in evenly-spaced circle pattern

### TypeScript Configuration

- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled
- DOM lib included for browser APIs

### File Naming Conventions

- PascalCase for classes and files: `EnemyManager.ts`, `ResourceFragment.ts`
- Entity files go in `entities/`, system files in `systems/`, effects in `effects/`
- don't start the dev server - I do it myself