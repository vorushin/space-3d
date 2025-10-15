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
        "Burst Rifle",         // Level 4: 3-round burst
        "Plasma Lance",        // Level 5: Fast, penetrating shots
        "Rail Gun",            // Level 6: High velocity piercing
        "Ion Disruptor",       // Level 7: Splash damage
        "Fusion Repeater",     // Level 8: Fast burst fire
        "Antimatter Beam",     // Level 9: Continuous damage beam (simulated)
        "Singularity Cannon"   // Level 10: Massive splash + penetration
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
            spreadAngle: 0.02, // Minimal spread for accuracy
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
        // Different fire rates per weapon type
        switch (level) {
            case 0: return 1.0;
            case 1: return 0.35;  // Kinetic: moderate
            case 2: return 0.15;  // Auto-Cannon: fast
            case 3: return 0.6;   // Heavy: slow but powerful
            case 4: return 0.5;   // Burst: moderate (between bursts)
            case 5: return 0.2;   // Plasma Lance: fast
            case 6: return 0.4;   // Rail Gun: moderate
            case 7: return 0.3;   // Ion: moderate splash
            case 8: return 0.4;   // Fusion: moderate (between bursts)
            case 9: return 0.08;  // Antimatter: very fast beam
            case 10: return 0.5;  // Singularity: slow but devastating
            default: return 0.35;
        }
    }

    private static calculateBulletCount(level: number): number {
        // Always single shot - use burst for multi-shot
        return 1;
    }

    private static calculateBulletSpeed(level: number): number {
        // Different speeds for different weapon types
        switch (level) {
            case 0: return 300;
            case 1: return 400;   // Kinetic: moderate
            case 2: return 450;   // Auto-Cannon: fast
            case 3: return 350;   // Heavy: slower
            case 4: return 500;   // Burst: fast
            case 5: return 600;   // Plasma: very fast
            case 6: return 800;   // Rail Gun: extreme speed
            case 7: return 450;   // Ion: moderate
            case 8: return 550;   // Fusion: fast
            case 9: return 700;   // Antimatter: very fast
            case 10: return 400;  // Singularity: slower but massive
            default: return 400;
        }
    }

    private static calculateBulletSize(level: number): number {
        // Smaller, more refined projectiles
        switch (level) {
            case 0: return 0.15;
            case 1: return 0.15;  // Kinetic: small
            case 2: return 0.12;  // Auto-Cannon: tiny rapid fire
            case 3: return 0.3;   // Heavy: large
            case 4: return 0.15;  // Burst: small
            case 5: return 0.1;   // Plasma: thin lance
            case 6: return 0.08;  // Rail Gun: needle-thin
            case 7: return 0.2;   // Ion: medium
            case 8: return 0.12;  // Fusion: small rapid
            case 9: return 0.15;  // Antimatter: thin beam
            case 10: return 0.4;  // Singularity: massive
            default: return 0.15;
        }
    }

    private static calculateDamage(level: number): number {
        // Balanced damage progression
        switch (level) {
            case 0: return 0;
            case 1: return 1;     // Kinetic: baseline
            case 2: return 0.8;   // Auto-Cannon: lower per shot but fast
            case 3: return 3;     // Heavy: high damage
            case 4: return 1.2;   // Burst: moderate per shot
            case 5: return 1.5;   // Plasma: good damage
            case 6: return 2.5;   // Rail Gun: high damage
            case 7: return 2;     // Ion: moderate + splash
            case 8: return 1.8;   // Fusion: moderate burst
            case 9: return 1.5;   // Antimatter: lower per shot, very fast
            case 10: return 5;    // Singularity: massive damage
            default: return 1;
        }
    }

    private static calculateLifetime(level: number): number {
        // Longer lifetime for faster projectiles
        return 3.0; // Fixed 3 seconds for all weapons
    }

    private static getBulletColor(level: number): Color3 {
        // More subtle, less bright colors
        switch (level) {
            case 0: return new Color3(0.3, 0.3, 0.3); // Gray
            case 1: return new Color3(0.8, 0.6, 0.2); // Orange-yellow (Kinetic)
            case 2: return new Color3(0.9, 0.7, 0.3); // Bright orange (Auto)
            case 3: return new Color3(1.0, 0.4, 0.1); // Red-orange (Heavy)
            case 4: return new Color3(0.7, 0.8, 0.3); // Yellow-green (Burst)
            case 5: return new Color3(0.8, 0.2, 0.8); // Purple (Plasma)
            case 6: return new Color3(0.2, 0.6, 1.0); // Bright blue (Rail)
            case 7: return new Color3(0.3, 0.8, 1.0); // Cyan (Ion)
            case 8: return new Color3(1.0, 0.5, 0.2); // Orange (Fusion)
            case 9: return new Color3(0.9, 0.2, 0.3); // Red (Antimatter)
            case 10: return new Color3(0.7, 0.9, 1.0); // Pale blue-white (Singularity)
            default: return new Color3(0.8, 0.6, 0.2);
        }
    }

    private static calculateSplashRadius(level: number): number {
        // Only specific weapons have splash
        switch (level) {
            case 7: return 8;   // Ion: medium splash
            case 10: return 15; // Singularity: huge splash
            default: return 0;  // No splash
        }
    }

    private static calculateBurstCount(level: number): number {
        // Number of shots per trigger pull
        switch (level) {
            case 4: return 3;  // Burst Rifle: 3-round burst
            case 8: return 5;  // Fusion Repeater: 5-round burst
            default: return 1; // Single shot
        }
    }

    private static calculateBurstDelay(level: number): number {
        // Delay between shots in a burst
        switch (level) {
            case 4: return 0.08;  // Burst Rifle: 80ms between shots
            case 8: return 0.06;  // Fusion Repeater: 60ms between shots
            default: return 0;    // No burst
        }
    }

    private static calculatePenetration(level: number): number {
        // Number of targets projectile can pass through
        switch (level) {
            case 5: return 1;  // Plasma Lance: penetrates 1 target
            case 6: return 2;  // Rail Gun: penetrates 2 targets
            case 9: return 1;  // Antimatter: penetrates 1 target
            case 10: return 3; // Singularity: penetrates 3 targets
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
