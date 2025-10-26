import { Scene, Vector3, Color3 } from '@babylonjs/core';
import { Asteroid, AsteroidSize } from '../entities/Asteroid';
import { ResourceFragment } from '../entities/ResourceFragment';
import { Player } from '../entities/Player';
import { Station } from '../entities/Station';
import { ExplosionEffect } from '../effects/ExplosionEffect';

export class AsteroidManager {
    private scene: Scene;
    private explosionEffect: ExplosionEffect;
    public asteroids: Asteroid[] = [];
    public fragments: ResourceFragment[] = [];

    private spawnTimer: number = 0;
    private spawnInterval: number = 8; // Seconds between spawns
    private spawnDistance: number = 100;
    private maxAsteroids: number = 25; // Increased to account for splits

    public collectedResources: number = 0;

    constructor(scene: Scene, explosionEffect: ExplosionEffect) {
        this.scene = scene;
        this.explosionEffect = explosionEffect;
        this.spawnInitialAsteroids();
    }

    private spawnInitialAsteroids(): void {
        for (let i = 0; i < 5; i++) {
            this.spawnAsteroid('large');
        }
        for (let i = 0; i < 3; i++) {
            this.spawnAsteroid('medium');
        }
    }

    public update(deltaTime: number, player: Player, station: Station, enemies: any[]): void {
        // Spawn new asteroids
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval && this.asteroids.length < this.maxAsteroids) {
            // Randomly spawn large or medium
            const sizeType: AsteroidSize = Math.random() > 0.6 ? 'large' : 'medium';
            this.spawnAsteroid(sizeType);
            this.spawnTimer = 0;
        }

        // Update asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            asteroid.update(deltaTime);

            // Check collision with player
            const playerDist = Vector3.Distance(asteroid.position, player.position);
            if (playerDist < asteroid.getCollisionRadius()) {
                player.takeDamage(asteroid.getCollisionDamage(), new Color3(0.6, 0.5, 0.4));

                // Asteroid crashes into fragments (reduced yield)
                const crashFragments = asteroid.crashIntoFragments();
                this.fragments.push(...crashFragments);
                this.explosionEffect.createDebrisExplosion(asteroid.position);

                asteroid.dispose();
                this.asteroids.splice(i, 1);
                continue;
            }

            // Check collision with station
            const stationDist = Vector3.Distance(asteroid.position, station.position);
            if (stationDist < asteroid.getCollisionRadius() + 5) {
                station.takeDamage(asteroid.getCollisionDamage(), new Color3(0.6, 0.5, 0.4));

                // Asteroid crashes into fragments (reduced yield)
                const crashFragments = asteroid.crashIntoFragments();
                this.fragments.push(...crashFragments);
                this.explosionEffect.createDebrisExplosion(asteroid.position);

                asteroid.dispose();
                this.asteroids.splice(i, 1);
                continue;
            }

            // Check collision with enemies
            let asteroidDestroyed = false;
            for (const enemy of enemies) {
                const enemyDist = Vector3.Distance(asteroid.position, enemy.position);
                const enemyCollisionRadius = enemy.getCollisionRadius();
                if (enemyDist < asteroid.getCollisionRadius() + enemyCollisionRadius) {
                    enemy.takeDamage(asteroid.getCollisionDamage(), new Color3(0.6, 0.5, 0.4));

                    // Asteroid crashes into fragments (reduced yield)
                    const crashFragments = asteroid.crashIntoFragments();
                    this.fragments.push(...crashFragments);
                    this.explosionEffect.createDebrisExplosion(asteroid.position);

                    asteroid.dispose();
                    this.asteroids.splice(i, 1);
                    asteroidDestroyed = true;
                    break;
                }
            }

            if (asteroidDestroyed) continue;

            // Check collision with player projectiles
            this.checkProjectileCollisions(asteroid, player.projectiles);

            // Check collision with turret projectiles
            station.turrets.forEach(turret => {
                this.checkProjectileCollisions(asteroid, turret.projectiles);
            });

            // Handle destroyed asteroids
            if (!asteroid.isAlive) {
                // Create debris explosion effect
                this.explosionEffect.createDebrisExplosion(asteroid.position);

                if (asteroid.shouldSplit) {
                    // Split into smaller asteroids
                    const splitAsteroids = asteroid.splitIntoSmaller();
                    this.asteroids.push(...splitAsteroids);
                } else {
                    // Small asteroids break into fragments
                    const newFragments = asteroid.breakIntoFragments();
                    this.fragments.push(...newFragments);
                }

                asteroid.dispose();
                this.asteroids.splice(i, 1);
            }
        }

        // Update fragments
        for (let i = this.fragments.length - 1; i >= 0; i--) {
            const fragment = this.fragments[i];
            fragment.update(deltaTime, player.position, station.position, station.gravityRange);

            if (fragment.isCollected) {
                this.collectedResources += fragment.value;
                fragment.dispose();
                this.fragments.splice(i, 1);
            } else if (fragment.isLost) {
                // Fragment drifted outside game area - lost forever
                fragment.dispose();
                this.fragments.splice(i, 1);
            }
        }
    }

    private checkProjectileCollisions(asteroid: Asteroid, projectiles: any[]): void {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const projectile = projectiles[i];
            const distance = Vector3.Distance(asteroid.position, projectile.position);

            if (distance < 2.5) {
                asteroid.takeDamage(projectile.damage, projectile.color);

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
        // Check all asteroids for splash damage
        for (const asteroid of this.asteroids) {
            if (!asteroid.isAlive) continue;

            const distance = Vector3.Distance(position, asteroid.position);
            if (distance < radius + asteroid.getCollisionRadius()) {
                // Apply splash damage (don't trigger more splashes)
                asteroid.takeDamage(damage, color);
            }
        }
    }

    private spawnAsteroid(sizeType: AsteroidSize): void {
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI * 0.5;

        const position = new Vector3(
            Math.cos(angle) * Math.cos(elevation) * this.spawnDistance,
            Math.sin(elevation) * this.spawnDistance,
            Math.sin(angle) * Math.cos(elevation) * this.spawnDistance
        );

        const asteroid = new Asteroid(this.scene, position, this.explosionEffect, sizeType);
        this.asteroids.push(asteroid);
    }

    public getCollectedResources(): number {
        const amount = this.collectedResources;
        this.collectedResources = 0;
        return amount;
    }
}
