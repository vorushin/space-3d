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
    spreadAngle: number; // Radians
    splashRadius: number; // 0 = no splash
    resourceMultiplier: number;
    cost: number;
}

export class WeaponSystem {
    private static readonly BASE_COST = 50; // Adjusted for 3D game economy
    private static readonly COST_MULTIPLIER = 1.4;

    // Weapon level names
    private static readonly WEAPON_NAMES = [
        "No Weapon",
        "Basic Gun",
        "Rapid Fire",
        "Heavy Cannons",
        "Triple Shot",
        "Plasma Weapons",
        "Laser Barrage",
        "Ion Pulse",
        "Quantum Cannons",
        "Antimatter Guns",
        "Singularity Weapon"
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
            damage: level, // Simple: damage = level
            lifetime: this.calculateLifetime(level),
            color: this.getBulletColor(level),
            spreadAngle: 0.15, // ~8.6 degrees between bullets
            splashRadius: this.calculateSplashRadius(level),
            resourceMultiplier: this.calculateResourceMultiplier(level),
            cost: this.calculateUpgradeCost(level)
        };

        return config;
    }

    private static calculateFireRate(level: number): number {
        // Convert from frames to seconds (assuming 60fps in original)
        // Level 1: 18.5 frames (~0.308s)
        // Level 10: 5 frames (~0.083s)
        const frames = Math.max(5, 20 - level * 1.5);
        return frames / 60; // Convert frames to seconds
    }

    private static calculateBulletCount(level: number): number {
        if (level >= 8) return 7; // Quantum and beyond
        if (level >= 6) return 5; // Laser Barrage
        if (level >= 4) return 3; // Triple Shot
        return 1; // Single shot
    }

    private static calculateBulletSpeed(level: number): number {
        // Original: 5 + level × 0.5 units/frame
        // Convert to units/second for 3D (multiply by 60)
        return (5 + level * 0.5) * 60;
    }

    private static calculateBulletSize(level: number): number {
        // Scale for 3D visibility (original was 2px radius)
        return 0.2 + level * 0.05; // 0.2 to 0.7 units
    }

    private static calculateLifetime(level: number): number {
        // Original: 60 + level × 10 frames
        // Convert to seconds
        const frames = 60 + level * 10;
        return frames / 60;
    }

    private static getBulletColor(level: number): Color3 {
        switch (level) {
            case 0: return new Color3(0.5, 0.5, 0.5); // No weapon (shouldn't fire)
            case 1:
            case 2:
            case 3:
            case 4: return new Color3(1, 1, 0); // Yellow
            case 5: return new Color3(1, 0, 1); // Magenta (Plasma)
            case 6: return new Color3(0, 1, 1); // Cyan (Laser)
            case 7: return new Color3(0, 0.5, 1); // Blue (Ion)
            case 8: return new Color3(0.8, 0, 1); // Purple (Quantum)
            case 9: return new Color3(1, 0, 0); // Red (Antimatter)
            case 10: return new Color3(1, 1, 1); // White (Singularity)
            default: return new Color3(1, 1, 0);
        }
    }

    private static calculateSplashRadius(level: number): number {
        if (level < 7) return 0; // No splash before Ion Pulse
        // Level 7: 20px → ~2 units
        // Level 10: 50px → ~5 units
        const pixelRadius = 20 + (level - 7) * 10;
        return pixelRadius * 0.1; // Scale to 3D units
    }

    private static calculateResourceMultiplier(level: number): number {
        if (level >= 9) return 3.0; // Antimatter+
        if (level >= 7) return 2.0; // Ion Pulse+
        if (level >= 4) return 1.5; // Triple Shot+
        return 1.0; // Base
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
