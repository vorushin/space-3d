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
- `Enemy.ts` - Eight types (scout/fighter/heavy/destroyer/cruiser/battleship/dreadnought/titan), uses EnemyTypeConfig for stats
- `Squad.ts` - Coordinates groups of enemies with formation flying and tactical states (approaching/engaging/retreating/regrouping)
- `Station.ts` - Central space station at (0,0,0) with complex geometry (sphere hub, equatorial ring, solar panels, antenna spires), bright blue/cyan emissive lighting, upgradeable turrets and docking modules
- `Asteroid.ts` - Three sizes (large→medium→small), split when hit, eventually break into ResourceFragments. Procedurally generated rocky textures with varied colors (brown/gray/red/ice), emissive glow (0.35 scale) for visibility
- `Projectile.ts` - Bullets with `owner`, `color`, `penetration`, and `splashRadius` properties
- `Missile.ts` - Self-guided homing missiles with predictive targeting and smooth tracking
- `ResourceFragment.ts` / `EnemyResourceFragment.ts` - Collectibles with inverse-square gravity physics

**Managers** (`src/game/systems/`): Handle spawning, updating, and collision detection for entity types
- `AsteroidManager.ts` - Spawns asteroids, handles splitting logic, checks collisions with player/station/enemies
- `EnemyManager.ts` - Spawns enemy squads, manages squad lifecycle, delegates death handling to EnemyDeathHandler
- `MissileManager.ts` - Manages missile inventory, firing, tracking, and collision detection
- `WeaponSystem.ts` - Defines 10 weapon levels with unique stats (damage, fire rate, burst, penetration, splash)
- `ProgressionManager.ts` - Tracks upgrade levels, calculates costs, handles sector transitions, missile purchases
- `UIManager.ts` - Corner-based HUD (displays ship/station health and levels, resources, enemies, missiles), toggleable upgrade menu, quick upgrade hints ([1][2][3][4]), station direction indicator when off-screen

**Configuration** (`src/game/config/`): Data-driven configuration separated from logic
- `EnemyTypeConfig.ts` - Centralized enemy stats, scaling formulas, collision radius calculation, type selection

**Handlers** (`src/game/handlers/`): Specialized behavior handlers with single responsibility
- `EnemyDeathHandler.ts` - Handles enemy death: explosions (scaled by ship type), resource fragments, cleanup

### Key Design Patterns

**Explosion System** (`src/game/effects/ExplosionEffect.ts`):
- `createHitSpark(weaponColor, targetColor)` - Blends two colors for realistic impact sparks
- Uses mesh-based particles (small spheres) instead of texture-based particles
- Called during `takeDamage()` with projectile color + target material color

**Collision Detection**:
- Uses properly scaled collision radius via `enemy.getCollisionRadius()` for accurate hit detection
- Collision radius calculated as: `EnemyTypeConfig.getCollisionRadius(size)` which accounts for visual scaling
- Projectile collisions: Managers iterate projectile arrays and check distances against scaled radius
- Missile collisions: MissileManager checks all missiles vs all enemies each frame
- Physical collisions: AsteroidManager checks asteroid vs player/station/enemies with proper radii
- Weapon color is passed to `takeDamage()` for proper spark color blending
- Penetrating projectiles survive hits until penetration limit exceeded
- Splash damage applied in separate pass after direct hit (no chain reactions)
- Splash radius calculation also uses `enemy.getCollisionRadius()` for consistency

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
- All stats centralized in `EnemyTypeConfig.ts` (health, speed, damage, colors, optimal range, etc.)
- Power law scaling: `scaleFactor = EnemyTypeConfig.getScaleFactor(size)` = `1.0 / Math.pow(size, 0.7)` (balanced visibility)
- Entry ships: Scout (dart shape, size 1.5), Fighter (X-wing style, size 1.8), Heavy (gunship, size 2.2)
- Capital ships: Destroyer (frigate, 1.8), Cruiser (wedge warship, 2.2), Battleship (2.6), Dreadnought (fortress, 3.0), Titan (ultimate capital ship, 3.5)
- Ships rotate to face target only (no mindless spinning)
- Health bars: fixed 5-unit width, renderingGroupId=1, zOffset=-10, always visible on top
- Difficulty progression: heavies at 1.2, cruisers at 2.0, titans at 5.0
- Maintain optimal shooting range per ship type (configured in EnemyTypeConfig)
- Smooth movement with deadzone (5 units) to prevent jitter
- Strafe perpendicular to target direction
- Speed scales with distance error for smooth approach/retreat
- All ships feature recognizable spaceship designs: sleek fighters, massive capital ships with bridge towers, engine arrays, weapon batteries

**Station Design** (`src/game/entities/Station.ts`):
- Progressive visual evolution from small outpost to massive orbital complex
- **Level 1**: Small 3-unit sphere core with 3 light pods (basic outpost)
- **Level 2**: Core scales to 1.5x (4.5 units), adds equatorial ring (8-unit diameter), 3 more light pods (total 6), brighter glow (0.3, 0.4, 0.6)
- **Level 3**: Core scales to 2x (6 units), ring expands 1.3x, adds 4 solar panel arrays, even brighter (0.35, 0.45, 0.7)
- **Level 4**: Core scales to 2.5x (7.5 units), maximum brightness (0.4, 0.5, 0.8), adds vertical antenna spires (8 units tall) with bright red warning lights (1, 0.5, 0.5)
- **Level 5+**: Adds docking modules - extending arms with cylindrical habitat pods and extremely bright cyan lights (0.6, 1, 1)
- **Slow Rotation**: 0.1 rad/s for visual interest
- **Health Bar**: 12-unit width, cyan border, appears for 3s after damage, positioned 10 units above station
- **Turrets**: Hexagonal base, spherical head with bright red sensor eye (1, 0.5, 0.5), twin barrels with glowing cyan tips (0.5, 0.9, 1), matches station aesthetic. Positioned dynamically based on station level: `distance = 7 + (level × 0.5)`. Smoothly rotate toward targets at 3 rad/s, only fire when aimed within ~10 degrees for realistic tracking behavior

**Squad System** (`src/game/entities/Squad.ts`):
- Enemies spawn in coordinated squads of 2-9 ships (size scales with difficulty)
- Squad states: `approaching` → `engaging` → `retreating` → `regrouping` (cycle repeats)
- **Approaching**: Fly in formation (V/wedge/circle based on squad size), move toward target together
- **Engaging** (8s): Break formation, attack individually with optimal combat tactics
- **Retreating** (3s): Pull back to rally point (100 units away), reform loose formation
- **Regrouping** (4s): Tighten formation, prepare for next attack run
- Formation types: Small squads (≤3) use V-formation, Medium (4-6) use wedge, Large (7+) use circle
- Each enemy tracks: `squad`, `formationTarget`, `inFormation`, `combatTarget`
- Squads dynamically switch targets between player and station
- When enemy dies, automatically removed from squad; empty squads cleaned up
- Individual AI falls back to solo combat mode if not in squad

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
- Purchased in 10-packs, cost scales with weapon level: `80 × (1 + level × 0.15)` (80 at lvl 1, ~200 at lvl 10)
- Damage scales with weapon level: `15 + (level - 1) × 7.5`
- Predictive targeting: aims at intercept point, not current position
- Smart target selection: scores based on alignment (60%) and distance (40%)
- Performance: 350 units/s speed, 6 rad/s turn rate, 4s lifetime
- Visual: Cylinder body + cone tip, orange-yellow glow, rotates to face direction
- Auto-explodes after timeout or reaching 300 unit boundary

**Color System**:
- Enemies: Orange/amber projectiles (1, 0.4, 0) - distinct from player and missiles
- Missiles: Orange-yellow (1.0, 0.8, 0.2)
- Player/Turrets: Vary by weapon level (orange→purple→blue→white spectrum)
- Spark color = blend of weapon color + target material color
- All hit effects must pass both colors to `ExplosionEffect.createHitSpark()`

**Game Economy**:
- **Starting resources**: 50
- **Resource sources**:
  - Asteroids: 2 per fragment (small asteroids → ~6-10 fragments)
  - Enemies: Based on ship type (scales with difficulty)
    - Scout: 8 × difficulty (e.g., 8 at difficulty 1, 16 at difficulty 2)
    - Fighter: 15 × difficulty
    - Heavy: 25 × difficulty
    - Destroyer: 45 × difficulty
    - Cruiser: 80 × difficulty
    - Battleship: 140 × difficulty
    - Dreadnought: 250 × difficulty
    - Titan: 600 × difficulty
  - Resource multiplier: Weapon level increases collection by 15% per level (1.0x → 2.5x)
- **Upgrade costs**:
  - Weapons: 50 × 1.4^(level-1) (0→70→98→137→192→269→376→527→738→1033)
  - Station: 150 × 1.4^(level-1) (150→210→294→412→576→807→1130...)
  - Defense: 100 × 1.4^(level-1) (100→140→196→274→384→538→753...)
  - Missiles: 80 × (1 + level × 0.15) (80→92→104→116→128→140→152→164→176→188→200)

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

**Station Direction Indicator**:
- Appears at screen edge when station is not visible in main view (beyond 100px margin)
- Minimalist solid cyan triangle arrow that pulses and points toward station
- CSS-based triangle (25px × 30px), clean design without glow effects
- Uses Vector3.Project() to convert station world position to screen space
- Calculates shortest path to screen edge and positions arrow accordingly
- Handles cases where station is behind camera (inverts direction)
- Rotates arrow using CSS transform to point in correct direction
- Helps players navigate back to station in 6DoF movement

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