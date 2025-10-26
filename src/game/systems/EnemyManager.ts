import { Scene, Vector3, Color3 } from '@babylonjs/core';
import { Enemy } from '../entities/Enemy';
import { EnemyResourceFragment } from '../entities/EnemyResourceFragment';
import { Player } from '../entities/Player';
import { Station } from '../entities/Station';
import { ExplosionEffect } from '../effects/ExplosionEffect';
import { Squad } from '../entities/Squad';
import { EnemyDeathHandler } from '../handlers/EnemyDeathHandler';
import type { EnemyType } from '../config/EnemyTypeConfig';

export class EnemyManager {
    private scene: Scene;
    private player: Player;
    private station: Station;
    private explosionEffect: ExplosionEffect;
    private deathHandler: EnemyDeathHandler;

    public enemies: Enemy[] = [];
    public squads: Squad[] = [];
    public enemyFragments: EnemyResourceFragment[] = [];
    private spawnTimer: number = 0;
    private spawnInterval: number = 12; // Base seconds between squad spawns (increased from 8)
    private spawnDistance: number = 150;
    private difficulty: number = 1;
    public collectedResources: number = 0;

    constructor(scene: Scene, player: Player, station: Station, explosionEffect: ExplosionEffect) {
        this.scene = scene;
        this.player = player;
        this.station = station;
        this.explosionEffect = explosionEffect;
        this.deathHandler = new EnemyDeathHandler(explosionEffect);
    }

    public update(deltaTime: number, defensiveStrength: number): void {
        // Adjust spawn rate based on defensive strength
        const adjustedInterval = Math.max(4, this.spawnInterval - (defensiveStrength * 0.5));

        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= adjustedInterval) {
            this.spawnSquad();
            this.spawnTimer = 0;
        }

        // Update squads
        for (let i = this.squads.length - 1; i >= 0; i--) {
            const squad = this.squads[i];
            squad.update(deltaTime, this.player.position, this.station.position);

            // Remove empty squads
            if (squad.isEmpty()) {
                this.squads.splice(i, 1);
            }
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime);

            // Check collision with player projectiles
            this.checkProjectileCollisions(enemy, this.player.projectiles);

            // Check collision with turret projectiles
            this.station.turrets.forEach(turret => {
                this.checkProjectileCollisions(enemy, turret.projectiles);
            });

            // Check enemy projectile collisions with player and station
            this.checkEnemyProjectileCollisions(enemy);

            // Remove if dead
            if (!enemy.isAlive) {
                // Remove from squad if part of one
                if (enemy.squad) {
                    enemy.squad.removeEnemy(enemy);
                }

                // Handle death: explosions and fragments
                const newFragments = this.deathHandler.handleDeath(enemy);
                this.enemyFragments.push(...newFragments);

                this.enemies.splice(i, 1);
            }
        }

        // Update enemy resource fragments
        for (let i = this.enemyFragments.length - 1; i >= 0; i--) {
            const fragment = this.enemyFragments[i];
            fragment.update(deltaTime, this.player.position, this.station.position, this.station.gravityRange);

            if (fragment.isCollected) {
                this.collectedResources += fragment.value;
                fragment.dispose();
                this.enemyFragments.splice(i, 1);
            } else if (fragment.isLost) {
                // Fragment drifted outside game area - lost forever
                fragment.dispose();
                this.enemyFragments.splice(i, 1);
            }
        }
    }

    public getCollectedResources(): number {
        const amount = this.collectedResources;
        this.collectedResources = 0;
        return amount;
    }

    private checkEnemyProjectileCollisions(enemy: Enemy): void {
        for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
            const projectile = enemy.projectiles[i];

            // Check collision with player
            const playerDist = Vector3.Distance(projectile.position, this.player.position);
            if (playerDist < 2.5) {
                this.player.takeDamage(projectile.damage, projectile.color);
                projectile.isAlive = false;
                continue;
            }

            // Check collision with station
            const stationDist = Vector3.Distance(projectile.position, this.station.position);
            if (stationDist < 5) {
                this.station.takeDamage(projectile.damage, projectile.color);
                projectile.isAlive = false;
            }
        }
    }

    private checkProjectileCollisions(enemy: Enemy, projectiles: any[]): void {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const projectile = projectiles[i];
            if (projectile.owner === 'enemy') continue;

            const distance = Vector3.Distance(enemy.position, projectile.position);

            // Use the enemy's properly scaled collision radius
            const enemyCollisionRadius = enemy.getCollisionRadius();
            const projectileRadius = 0.5; // Small buffer for projectile
            const collisionThreshold = enemyCollisionRadius + projectileRadius;

            if (distance < collisionThreshold) {
                enemy.takeDamage(projectile.damage, projectile.color);

                // Handle penetration
                if (projectile.penetration > 0) {
                    projectile.penetrationCount++;
                    // Only destroy if exceeded penetration limit
                    if (projectile.penetrationCount > projectile.penetration) {
                        projectile.isAlive = false;
                    }
                } else {
                    projectile.isAlive = false;
                }

                // Apply splash damage if projectile has it
                if (projectile.splashRadius > 0) {
                    this.applySplashDamage(projectile.position, projectile.splashRadius, projectile.damage, projectile.color);
                }
            }
        }
    }

    private applySplashDamage(position: Vector3, radius: number, damage: number, color: Color3): void {
        // Check all enemies for splash damage
        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const distance = Vector3.Distance(position, enemy.position);
            // Use the enemy's properly scaled collision radius
            const enemyCollisionRadius = enemy.getCollisionRadius();

            if (distance < radius + enemyCollisionRadius) {
                // Apply splash damage (don't trigger more splashes)
                enemy.takeDamage(damage, color);
            }
        }
    }

    private spawnSquad(): void {
        // Determine squad size based on difficulty
        let squadSize: number;
        if (this.difficulty < 1.5) {
            squadSize = 2 + Math.floor(Math.random() * 2); // 2-3 ships
        } else if (this.difficulty < 2.5) {
            squadSize = 3 + Math.floor(Math.random() * 3); // 3-5 ships
        } else if (this.difficulty < 4.0) {
            squadSize = 4 + Math.floor(Math.random() * 4); // 4-7 ships
        } else {
            squadSize = 5 + Math.floor(Math.random() * 5); // 5-9 ships
        }

        // Spawn position - far from station
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI * 0.3; // Less vertical spread

        const spawnCenter = new Vector3(
            Math.cos(angle) * Math.cos(elevation) * this.spawnDistance,
            Math.sin(elevation) * this.spawnDistance,
            Math.sin(angle) * Math.cos(elevation) * this.spawnDistance
        );

        // Create squad
        const squad = new Squad(spawnCenter);
        this.squads.push(squad);

        // Spawn enemies in loose formation around spawn center
        for (let i = 0; i < squadSize; i++) {
            const offsetAngle = (i / squadSize) * Math.PI * 2;
            const offset = new Vector3(
                Math.cos(offsetAngle) * 15,
                (Math.random() - 0.5) * 5,
                Math.sin(offsetAngle) * 15
            );
            const enemyPos = spawnCenter.add(offset);

            const enemy = new Enemy(
                this.scene,
                enemyPos,
                this.player,
                this.station,
                this.explosionEffect,
                this.difficulty
            );

            this.enemies.push(enemy);
            squad.addEnemy(enemy);
        }
    }

    private spawnEnemy(): void {
        // Legacy method - spawn solo enemy (kept for debug purposes)
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI * 0.5;

        const position = new Vector3(
            Math.cos(angle) * Math.cos(elevation) * this.spawnDistance,
            Math.sin(elevation) * this.spawnDistance,
            Math.sin(angle) * Math.cos(elevation) * this.spawnDistance
        );

        const enemy = new Enemy(this.scene, position, this.player, this.station, this.explosionEffect, this.difficulty);
        this.enemies.push(enemy);
    }

    // Debug method: Spawn a specific enemy type at a given position
    public spawnEnemyOfType(position: Vector3, type: EnemyType): void {
        const enemy = new Enemy(this.scene, position, this.player, this.station, this.explosionEffect, this.difficulty, type);
        this.enemies.push(enemy);
    }

    public setDifficulty(sector: number): void {
        this.difficulty = 1 + (sector * 0.5);
    }
}
