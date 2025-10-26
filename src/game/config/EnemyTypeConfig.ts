import { Color3 } from '@babylonjs/core';

export interface EnemyStats {
    size: number;
    health: number;
    speed: number;
    collisionDamage: number;
    resourceValue: number;
    canShoot: boolean;
    weaponDamage: number;
    fireRate: number;
    weaponAccuracy: number;
    shootRange: number;
    optimalRange: number;
    color: Color3;
    emissiveColor: Color3;
}

export type EnemyType = 'scout' | 'fighter' | 'heavy' | 'destroyer' | 'cruiser' | 'battleship' | 'dreadnought' | 'titan';

// Base stats for each enemy type (before difficulty scaling)
const BASE_ENEMY_STATS: Record<EnemyType, Omit<EnemyStats, 'health' | 'speed' | 'collisionDamage' | 'resourceValue' | 'weaponDamage'>> = {
    scout: {
        size: 1.5,
        canShoot: true,
        fireRate: 1.5,
        weaponAccuracy: 0.7,
        shootRange: 50,
        optimalRange: 40,
        color: new Color3(1, 0.5, 0.3),
        emissiveColor: new Color3(0.4, 0.2, 0)
    },
    fighter: {
        size: 1.8,
        canShoot: true,
        fireRate: 2,
        weaponAccuracy: 0.85,
        shootRange: 60,
        optimalRange: 50,
        color: new Color3(1, 0.2, 0.2),
        emissiveColor: new Color3(0.5, 0, 0)
    },
    heavy: {
        size: 2.2,
        canShoot: true,
        fireRate: 2.5,
        weaponAccuracy: 0.75,
        shootRange: 60,
        optimalRange: 55,
        color: new Color3(0.8, 0.1, 0.3),
        emissiveColor: new Color3(0.4, 0, 0.1)
    },
    destroyer: {
        size: 1.8,
        canShoot: true,
        fireRate: 1.5,
        weaponAccuracy: 0.9,
        shootRange: 80,
        optimalRange: 60,
        color: new Color3(0.6, 0, 0.2),
        emissiveColor: new Color3(0.3, 0, 0.1)
    },
    cruiser: {
        size: 2.2,
        canShoot: true,
        fireRate: 1.2,
        weaponAccuracy: 0.92,
        shootRange: 90,
        optimalRange: 50,
        color: new Color3(0.5, 0, 0.3),
        emissiveColor: new Color3(0.25, 0, 0.15)
    },
    battleship: {
        size: 2.6,
        canShoot: true,
        fireRate: 1.0,
        weaponAccuracy: 0.94,
        shootRange: 100,
        optimalRange: 50,
        color: new Color3(0.4, 0, 0.4),
        emissiveColor: new Color3(0.2, 0, 0.2)
    },
    dreadnought: {
        size: 3.0,
        canShoot: true,
        fireRate: 0.8,
        weaponAccuracy: 0.96,
        shootRange: 120,
        optimalRange: 50,
        color: new Color3(0.3, 0, 0.5),
        emissiveColor: new Color3(0.15, 0, 0.25)
    },
    titan: {
        size: 3.5,
        canShoot: true,
        fireRate: 0.6,
        weaponAccuracy: 0.98,
        shootRange: 150,
        optimalRange: 50,
        color: new Color3(0.2, 0, 0.6),
        emissiveColor: new Color3(0.1, 0, 0.35)
    }
};

// Difficulty-scaled stats
const DIFFICULTY_SCALARS: Record<EnemyType, {
    health: number;
    speed: number;
    speedBonus: number;
    collisionDamage: number;
    resourceValue: number;
    weaponDamage: number;
}> = {
    scout: {
        health: 20,
        speed: 25,
        speedBonus: 3,
        collisionDamage: 5,
        resourceValue: 8, // Increased from 3
        weaponDamage: 5
    },
    fighter: {
        health: 40,
        speed: 18,
        speedBonus: 2,
        collisionDamage: 10,
        resourceValue: 15, // Increased from 7
        weaponDamage: 8
    },
    heavy: {
        health: 80,
        speed: 12,
        speedBonus: 1.5,
        collisionDamage: 20,
        resourceValue: 25, // Increased from 12
        weaponDamage: 15
    },
    destroyer: {
        health: 150,
        speed: 8,
        speedBonus: 1,
        collisionDamage: 30,
        resourceValue: 45, // Increased from 20
        weaponDamage: 25
    },
    cruiser: {
        health: 300,
        speed: 6,
        speedBonus: 0.8,
        collisionDamage: 50,
        resourceValue: 80, // Increased from 35
        weaponDamage: 40
    },
    battleship: {
        health: 600,
        speed: 4,
        speedBonus: 0.5,
        collisionDamage: 80,
        resourceValue: 140, // Increased from 60
        weaponDamage: 70
    },
    dreadnought: {
        health: 1200,
        speed: 3,
        speedBonus: 0.3,
        collisionDamage: 150,
        resourceValue: 250, // Increased from 100
        weaponDamage: 120
    },
    titan: {
        health: 3000,
        speed: 2,
        speedBonus: 0.2,
        collisionDamage: 300,
        resourceValue: 600, // Increased from 250
        weaponDamage: 200
    }
};

export class EnemyTypeConfig {
    /**
     * Get complete enemy stats for a given type and difficulty
     */
    public static getStats(type: EnemyType, difficulty: number): EnemyStats {
        const base = BASE_ENEMY_STATS[type];
        const scalars = DIFFICULTY_SCALARS[type];

        return {
            ...base,
            health: scalars.health * difficulty,
            speed: scalars.speed + (difficulty * scalars.speedBonus),
            collisionDamage: scalars.collisionDamage * difficulty,
            resourceValue: Math.floor(scalars.resourceValue * difficulty),
            weaponDamage: scalars.weaponDamage * difficulty
        };
    }

    /**
     * Get visual scaling factor for enemy size
     */
    public static getScaleFactor(size: number): number {
        // Formula: scale = 1.0 / (size^0.7) gives good balance across all sizes
        // Scout (1.5): 1.0 / 1.5^0.7 = 0.77 scale
        // Heavy (2.2): 1.0 / 2.2^0.7 = 0.59 scale
        // Titan (3.5): 1.0 / 3.5^0.7 = 0.43 scale
        return 1.0 / Math.pow(size, 0.7);
    }

    /**
     * Get collision radius based on scaled visual size
     */
    public static getCollisionRadius(size: number): number {
        const scaleFactor = this.getScaleFactor(size);
        const visualSize = size * scaleFactor;
        // Multiplier of 2.0 matches most ship mesh bounds
        return visualSize * 2.0;
    }

    /**
     * Select random enemy type based on difficulty
     * Rebalanced for new economy with higher resource values
     */
    public static selectRandomType(difficulty: number): EnemyType {
        const roll = Math.random();

        // Difficulty 1.0-1.5: Early game (Sector 1)
        // Focus: Scouts (8) and Fighters (15), occasional Heavy (25)
        // Player needs ~70 resources for first weapon upgrade
        if (difficulty < 1.5) {
            if (roll < 0.50) return 'scout';      // 50% - Common cannon fodder
            if (roll < 0.85) return 'fighter';    // 35% - Main threat
            return 'heavy';                        // 15% - Challenging enemy
        }

        // Difficulty 1.5-2.0: Mid-early game (Sector 2 transition)
        // Introduce Heavies and Destroyers, reduce Scouts
        else if (difficulty < 2.0) {
            if (roll < 0.20) return 'scout';      // 20% - Still some easy targets
            if (roll < 0.50) return 'fighter';    // 30% - Common
            if (roll < 0.80) return 'heavy';      // 30% - Common
            return 'destroyer';                    // 20% - New threat
        }

        // Difficulty 2.0-2.5: Mid game (Sector 2)
        // Heavies and Destroyers dominate, introduce Cruisers
        else if (difficulty < 2.5) {
            if (roll < 0.15) return 'fighter';    // 15% - Occasional easy kill
            if (roll < 0.40) return 'heavy';      // 25% - Common
            if (roll < 0.75) return 'destroyer';  // 35% - Common
            return 'cruiser';                      // 25% - Tough enemy
        }

        // Difficulty 2.5-3.5: Mid-late game (Sector 3)
        // Destroyers, Cruisers, Battleships
        else if (difficulty < 3.5) {
            if (roll < 0.15) return 'heavy';      // 15% - Occasional easier kill
            if (roll < 0.40) return 'destroyer';  // 25% - Common
            if (roll < 0.70) return 'cruiser';    // 30% - Common
            return 'battleship';                   // 30% - Major threat
        }

        // Difficulty 3.5-5.0: Late game (Sector 4 transition)
        // Cruisers, Battleships, Dreadnoughts
        else if (difficulty < 5.0) {
            if (roll < 0.15) return 'destroyer';  // 15% - Occasional easier kill
            if (roll < 0.35) return 'cruiser';    // 20% - Common
            if (roll < 0.65) return 'battleship'; // 30% - Common
            return 'dreadnought';                  // 35% - Major threat
        }

        // Difficulty 5.0-7.0: End game (Sector 4)
        // Battleships, Dreadnoughts, Titans
        else if (difficulty < 7.0) {
            if (roll < 0.15) return 'cruiser';    // 15% - Occasional easier kill
            if (roll < 0.35) return 'battleship'; // 20% - Common
            if (roll < 0.70) return 'dreadnought';// 35% - Common
            return 'titan';                        // 30% - Boss-tier
        }

        // Difficulty 7.0+: Ultra late game
        // Dreadnoughts and Titans dominate
        else {
            if (roll < 0.20) return 'battleship'; // 20% - Easier kills
            if (roll < 0.55) return 'dreadnought';// 35% - Common
            return 'titan';                        // 45% - Boss-tier
        }
    }
}
