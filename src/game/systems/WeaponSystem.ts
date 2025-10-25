import { Color3 } from '@babylonjs/core';

export interface WeaponConfig {
    level: number;
    name: string;
    fireRate: number; // Seconds between shots
    bulletCount: number;
    bulletSpeed: number;
    bulletSize: number;
    damage: number;
    lifetime: number; // Seconds
    color: Color3;
    spreadAngle: number; // Radians (for burst patterns)
    splashRadius: number; // 0 = no splash
    resourceMultiplier: number;
    cost: number;
    burstCount: number; // Number of shots per trigger pull
    burstDelay: number; // Delay between burst shots (seconds)
    penetration: number; // Number of targets projectile can pass through (0 = none)
}

export class WeaponSystem {
    private static readonly BASE_COST = 50; // Adjusted for 3D game economy
    private static readonly COST_MULTIPLIER = 1.4;

    // Weapon level names and descriptions
    private static readonly WEAPON_NAMES = [
        "No Weapon",
        "Kinetic Cannon",      // Level 1: Basic single shot
        "Auto-Cannon",         // Level 2: Faster fire rate
        "Heavy Cannon",        // Level 3: High damage, slower
        "Scatter Shotgun",     // Level 4: Multi-projectile spread
        "Plasma Lance",        // Level 5: Fast, penetrating shots
        "Chain Lightning",     // Level 6: Arcs between targets
        "Ion Disruptor",       // Level 7: Splash damage
        "Rotary Minigun",      // Level 8: Extreme fire rate
        "Vortex Cannon",       // Level 9: Pulls enemies + massive damage
        "Singularity Bomb"     // Level 10: Black hole effect
    ];

    public static getWeaponConfig(level: number): WeaponConfig {
        // Clamp level to valid range
        level = Math.max(0, Math.min(10, level));

        const config: WeaponConfig = {
            level,
            name: this.WEAPON_NAMES[level],
            fireRate: this.calculateFireRate(level),
            bulletCount: this.calculateBulletCount(level),
            bulletSpeed: this.calculateBulletSpeed(level),
            bulletSize: this.calculateBulletSize(level),
            damage: this.calculateDamage(level),
            lifetime: this.calculateLifetime(level),
            color: this.getBulletColor(level),
            spreadAngle: this.calculateSpreadAngle(level),
            splashRadius: this.calculateSplashRadius(level),
            resourceMultiplier: this.calculateResourceMultiplier(level),
            cost: this.calculateUpgradeCost(level),
            burstCount: this.calculateBurstCount(level),
            burstDelay: this.calculateBurstDelay(level),
            penetration: this.calculatePenetration(level)
        };

        return config;
    }

    private static calculateFireRate(level: number): number {
        // Much faster fire rates for exciting, action-packed combat
        switch (level) {
            case 0: return 1.0;
            case 1: return 0.1;   // Kinetic: rapid fire
            case 2: return 0.05;  // Auto-Cannon: extremely fast
            case 3: return 0.15;  // Heavy: fast with power
            case 4: return 0.25;  // Shotgun: faster reload
            case 5: return 0.08;  // Plasma Lance: very fast
            case 6: return 0.12;  // Chain Lightning: fast
            case 7: return 0.1;   // Ion: fast splash
            case 8: return 0.03;  // Minigun: INSANELY fast
            case 9: return 0.15;  // Vortex: fast and devastating
            case 10: return 0.2;  // Singularity: fast and cataclysmic
            default: return 0.15;
        }
    }

    private static calculateBulletCount(level: number): number {
        // Multi-shot for shotgun and other weapons
        switch (level) {
            case 4: return 8;  // Shotgun: 8 pellets for devastating close range
            case 8: return 3;  // Minigun: 3 bullets per shot for sustained DPS
            default: return 1; // Single shot
        }
    }

    private static calculateBulletSpeed(level: number): number {
        // Faster, more intense projectile speeds
        switch (level) {
            case 0: return 300;
            case 1: return 450;   // Kinetic: moderate
            case 2: return 500;   // Auto-Cannon: fast
            case 3: return 400;   // Heavy: slower but massive
            case 4: return 550;   // Shotgun: fast pellets
            case 5: return 700;   // Plasma: very fast
            case 6: return 900;   // Lightning: extreme speed
            case 7: return 600;   // Ion: fast
            case 8: return 650;   // Minigun: fast rapid fire
            case 9: return 500;   // Vortex: slower but pulls
            case 10: return 450;  // Singularity: slower but devastating
            default: return 450;
        }
    }

    private static calculateBulletSize(level: number): number {
        // More dramatic size differences
        switch (level) {
            case 0: return 0.15;
            case 1: return 0.2;   // Kinetic: small
            case 2: return 0.15;  // Auto-Cannon: tiny rapid fire
            case 3: return 0.5;   // Heavy: very large
            case 4: return 0.18;  // Shotgun: medium pellets
            case 5: return 0.12;  // Plasma: thin lance
            case 6: return 0.1;   // Lightning: needle-thin
            case 7: return 0.25;  // Ion: medium-large
            case 8: return 0.15;  // Minigun: small rapid
            case 9: return 0.35;  // Vortex: large
            case 10: return 0.6;  // Singularity: massive
            default: return 0.2;
        }
    }

    private static calculateDamage(level: number): number {
        // Powerful damage progression - much higher values for fun gameplay
        switch (level) {
            case 0: return 0;
            case 1: return 4;     // Kinetic: solid baseline
            case 2: return 3;     // Auto-Cannon: rapid fire
            case 3: return 15;    // Heavy: massive single hits
            case 4: return 6;     // Shotgun: 6 dmg × 8 pellets = 48 total at point blank!
            case 5: return 8;     // Plasma: strong piercing damage
            case 6: return 10;    // Chain Lightning: powerful multi-target
            case 7: return 12;    // Ion: high damage + splash
            case 8: return 4;     // Minigun: 4 × 3 bullets = 12 per shot at insane fire rate
            case 9: return 18;    // Vortex: massive damage + splash
            case 10: return 35;   // Singularity: absolutely devastating
            default: return 4;
        }
    }

    private static calculateLifetime(level: number): number {
        // Longer lifetime for faster projectiles
        return 3.0; // Fixed 3 seconds for all weapons
    }

    private static getBulletColor(level: number): Color3 {
        // More vibrant, distinct colors per weapon
        switch (level) {
            case 0: return new Color3(0.3, 0.3, 0.3); // Gray
            case 1: return new Color3(0.8, 0.6, 0.2); // Orange-yellow (Kinetic)
            case 2: return new Color3(0.9, 0.7, 0.3); // Bright orange (Auto)
            case 3: return new Color3(1.0, 0.4, 0.1); // Red-orange (Heavy)
            case 4: return new Color3(0.9, 0.6, 0.1); // Gold (Shotgun)
            case 5: return new Color3(0.8, 0.2, 0.8); // Purple (Plasma)
            case 6: return new Color3(0.2, 0.8, 1.0); // Electric blue (Lightning)
            case 7: return new Color3(0.3, 0.8, 1.0); // Cyan (Ion)
            case 8: return new Color3(1.0, 0.5, 0.2); // Orange (Minigun)
            case 9: return new Color3(0.6, 0.2, 0.9); // Deep purple (Vortex)
            case 10: return new Color3(0.9, 0.9, 1.0); // White-blue (Singularity)
            default: return new Color3(0.8, 0.6, 0.2);
        }
    }

    private static calculateSpreadAngle(level: number): number {
        // Spread angle for multi-shot weapons
        switch (level) {
            case 4: return 0.25;  // Shotgun: wide spread for close combat devastation
            case 8: return 0.05;  // Minigun: slight spread for area coverage
            default: return 0.02; // Minimal spread for accuracy
        }
    }

    private static calculateSplashRadius(level: number): number {
        // Multiple weapons with splash damage for epic destruction
        switch (level) {
            case 3: return 8;   // Heavy: medium splash
            case 4: return 4;   // Shotgun: small splash per pellet for extra carnage
            case 7: return 15;  // Ion: large splash
            case 9: return 22;  // Vortex: massive splash
            case 10: return 30; // Singularity: screen-clearing splash
            default: return 0;  // No splash
        }
    }

    private static calculateBurstCount(level: number): number {
        // No burst mechanics - using multi-shot instead
        return 1;
    }

    private static calculateBurstDelay(level: number): number {
        // No burst mechanics
        return 0;
    }

    private static calculatePenetration(level: number): number {
        // Number of targets projectile can pass through
        switch (level) {
            case 5: return 3;  // Plasma Lance: penetrates 3 targets
            case 6: return 5;  // Chain Lightning: penetrates 5 targets
            case 8: return 2;  // Minigun: penetrates 2 targets
            case 9: return 4;  // Vortex: penetrates 4 targets
            case 10: return 8; // Singularity: penetrates everything
            default: return 0; // No penetration
        }
    }

    private static calculateResourceMultiplier(level: number): number {
        // Progressive resource collection bonus
        return 1.0 + (level * 0.15); // 1.0x at level 1, 2.5x at level 10
    }

    public static calculateUpgradeCost(level: number): number {
        if (level === 0) return 0; // Can't upgrade from nothing (shouldn't happen)
        if (level === 1) return 0; // Free first upgrade

        // cost = 50 × 1.4^(level - 1)
        return Math.floor(this.BASE_COST * Math.pow(this.COST_MULTIPLIER, level - 1));
    }

    public static getTotalCost(targetLevel: number): number {
        let total = 0;
        for (let i = 1; i <= targetLevel; i++) {
            total += this.calculateUpgradeCost(i);
        }
        return total;
    }

    // Get visual scale multiplier for ship size
    public static getShipScaleMultiplier(level: number): number {
        // Progressive scale: 1.0 at level 1 → 1.5 at level 10
        return 1.0 + (level * 0.05);
    }

    // Get glow intensity for ship
    public static getGlowIntensity(level: number): number {
        if (level < 2) return 0;
        // 0 at level 1, increasing to 1.0 at level 10
        return Math.min(1.0, (level - 1) * 0.12);
    }

    // Check if weapon has special effects
    public static hasPlasmaEffect(level: number): boolean {
        return level >= 5;
    }

    public static hasIonEffect(level: number): boolean {
        return level >= 7;
    }

    public static hasQuantumEffect(level: number): boolean {
        return level >= 8;
    }

    public static hasSingularityEffect(level: number): boolean {
        return level === 10;
    }
}
