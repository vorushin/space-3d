# Space 3D - Six Degrees of Freedom

A 3D space combat and resource management game built with Babylon.js and TypeScript.

## Game Description

Pilot a spaceship in full 3D space with six degrees of freedom while managing resource harvesting and combat. Navigate through four distinct sectors, each with increasing difficulty and unique environments.

### Core Mechanics

**Movement & Controls**
- WASD: Lateral movement (forward/back/left/right)
- Q/E: Vertical movement (down/up)
- Mouse: Free-look orientation
- Left Mouse Button: Shoot
- TAB: Toggle upgrade menu

**Resource Harvesting**
- Shoot asteroids to break them into collectible fragments
- Fragments are magnetically pulled toward your ship and station
- Resources are used for upgrades

**Combat System**
- Enemies spawn at increasing rates based on defensive strength
- Enemies target either your ship or station
- Destroy enemies before they collide with their targets

**Progression**
- Three upgrade paths: Ship Weapons, Station, Defense Turrets
- Each upgrade increases capabilities and visual representation
- Unlock hyperspace travel by reaching Level 3 in all systems
- Four sectors to explore: Frontier Space → Nebula Sector → Asteroid Belt → Alien Territory

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn package manager

### Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Start the development server:**
```bash
npm run dev
```

3. **Open your browser:**
The game will automatically open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
space-3d/
├── index.html              # Main HTML entry point
├── package.json            # Project dependencies
├── vite.config.js          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
└── src/
    ├── main.ts             # Application entry point
    └── game/
        ├── Game.ts         # Main game controller
        ├── InputController.ts
        ├── entities/
        │   ├── Player.ts
        │   ├── Station.ts
        │   ├── Turret.ts
        │   ├── Enemy.ts
        │   ├── Asteroid.ts
        │   ├── ResourceFragment.ts
        │   └── Projectile.ts
        └── systems/
            ├── AsteroidManager.ts
            ├── EnemyManager.ts
            ├── ProgressionManager.ts
            └── UIManager.ts
```

## Gameplay Tips

1. **Start by mining asteroids** - You begin with 100 resources, but you'll need more
2. **Balance your upgrades** - You need all three systems at level 3 to progress to the next sector
3. **Station placement** - Your station is at (0, 0, 0) - use it as a safe zone reference
4. **Magnetic collection** - Stay near fragments or your station to collect resources automatically
5. **Defense scaling** - Higher defensive strength attracts more enemies (risk vs reward)
6. **Turret power** - Station turrets automatically target and shoot enemies
7. **Health management** - Station upgrades unlock auto-healing at higher levels

## Victory Condition

Reach Sector 4 (Alien Territory) and max out all systems to Level 10 to achieve victory!

## Development

Built with:
- **Babylon.js 7.0** - 3D engine
- **TypeScript 5.3** - Type-safe development
- **Vite 5.0** - Fast build tool and dev server

## Troubleshooting

**Black screen or errors?**
- Check browser console for errors
- Ensure WebGL is supported in your browser
- Try clearing browser cache

**Performance issues?**
- Lower browser window size
- Close other applications
- Check that hardware acceleration is enabled in browser settings

**Controls not working?**
- Click on the game canvas to capture pointer lock
- Ensure the game window has focus

## License

MIT
