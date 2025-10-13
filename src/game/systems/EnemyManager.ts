import { Scene, Vector3, Color4 } from '@babylonjs/core';
import { Enemy } from '../entities/Enemy';
import { EnemyResourceFragment } from '../entities/EnemyResourceFragment';
import { Player } from '../entities/Player';
import { Station } from '../entities/Station';
import { ExplosionEffect } from '../effects/ExplosionEffect';

export class EnemyManager {
    private scene: Scene;
    private player: Player;
    private station: Station;
    private explosionEffect: ExplosionEffect;

    public enemies: Enemy[] = [];
    public enemyFragments: EnemyResourceFragment[] = [];
    private spawnTimer: number = 0;
    private spawnInterval: number = 8; // Base seconds between spawns
    private spawnDistance: number = 150;
    private difficulty: number = 1;
    public collectedResources: number = 0;

    constructor(scene: Scene, player: Player, station: Station, explosionEffect: ExplosionEffect) {
        this.scene = scene;
        this.player = player;
        this.station = station;
        this.explosionEffect = explosionEffect;
    }

    public update(deltaTime: number, defensiveStrength: number): void {
        // Adjust spawn rate based on defensive strength
        const adjustedInterval = Math.max(2, this.spawnInterval - (defensiveStrength * 0.3));

        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= adjustedInterval) {
            this.spawnEnemy();
            this.spawnTimer = 0;
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
                // Create explosion effect based on ship size
                const color = enemy.getColor();
                const color4 = new Color4(color.r, color.g, color.b, 1);

                if (enemy.type === 'destroyer') {
                    this.explosionEffect.createLargeExplosion(enemy.position, color4);
                } else {
                    // Scout, fighter, heavy use regular explosion with size scaling
                    let size = 1;
                    if (enemy.type === 'scout') size = 0.7;
                    else if (enemy.type === 'fighter') size = 1.0;
                    else if (enemy.type === 'heavy') size = 1.5;
                    this.explosionEffect.createExplosion(enemy.position, color4, size);
                }

                // Create resource fragments
                const newFragments = enemy.breakIntoFragments();
                this.enemyFragments.push(...newFragments);

                // Clean up all projectiles from this enemy
                for (const projectile of enemy.projectiles) {
                    projectile.dispose();
                }
                enemy.projectiles = [];

                enemy.dispose();
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

            if (distance < 2) {
                enemy.takeDamage(projectile.damage, projectile.color);
                projectile.isAlive = false;
            }
        }
    }

    private spawnEnemy(): void {
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

    public setDifficulty(sector: number): void {
        this.difficulty = 1 + (sector * 0.5);
    }
}
