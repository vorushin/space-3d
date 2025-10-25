import { Scene, Vector3, Color4, Color3 } from '@babylonjs/core';
import { Missile } from '../entities/Missile';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Asteroid } from '../entities/Asteroid';
import { ResourceFragment } from '../entities/ResourceFragment';
import { ExplosionEffect } from '../effects/ExplosionEffect';

export class MissileManager {
    private scene: Scene;
    private player: Player;
    private explosionEffect: ExplosionEffect;

    public missiles: Missile[] = [];
    public missileCount: number = 10; // Start with 10 missiles
    private fireCooldown: number = 0;
    private fireRate: number = 0.5; // 0.5 seconds between missile launches

    // Purchase system
    private readonly MISSILE_PACK_SIZE = 10;
    private readonly MISSILE_PACK_COST = 100; // Cost per 10-pack

    constructor(scene: Scene, player: Player, explosionEffect: ExplosionEffect) {
        this.scene = scene;
        this.player = player;
        this.explosionEffect = explosionEffect;
    }

    public update(deltaTime: number, enemies: Enemy[]): void {
        this.fireCooldown = Math.max(0, this.fireCooldown - deltaTime);

        // Update all missiles
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];

            // Only update if alive
            if (missile.isAlive) {
                missile.update(deltaTime, enemies);
            }

            // Clean up dead missiles
            if (!missile.isAlive) {
                // Create small explosion effect if missile should explode (timeout or out of bounds)
                if (missile.shouldExplode) {
                    try {
                        const explosionColor = new Color4(1, 0.6, 0.1, 1); // Orange explosion
                        this.explosionEffect.createExplosion(missile.position, explosionColor, 0.5);
                    } catch (e) {
                        console.warn('Missile explosion effect failed:', e);
                    }
                }

                missile.dispose();
                this.missiles.splice(i, 1);
            }
        }
    }

    public fireMissile(): boolean {
        // Check if we can fire
        if (this.missileCount <= 0) {
            console.log('No missiles remaining!');
            return false;
        }

        if (this.fireCooldown > 0) {
            return false;
        }

        // Get player's forward direction
        const forward = this.player.mesh.getDirection(Vector3.Forward());
        const spawnOffset = forward.scale(3); // Spawn in front of player
        const spawnPosition = this.player.position.add(spawnOffset);

        // Calculate missile damage based on weapon level
        // Base damage: 15, scales with weapon level
        // Level 1: 15, Level 5: 45, Level 10: 90
        const baseDamage = 15;
        const weaponLevel = this.player.weaponLevel;
        const missileDamage = baseDamage + (weaponLevel - 1) * 7.5;

        // Create missile with scaled damage and explosion effect
        const missile = new Missile(this.scene, spawnPosition, forward, missileDamage, this.explosionEffect);
        this.missiles.push(missile);

        // Update state
        this.missileCount--;
        this.fireCooldown = this.fireRate;

        console.log(`Missile fired! Damage: ${missileDamage.toFixed(1)}, ${this.missileCount} remaining`);
        return true;
    }

    public checkCollisions(enemies: Enemy[]): number {
        let destroyedCount = 0;

        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];

            for (const enemy of enemies) {
                if (!enemy.isAlive) continue;

                const distance = Vector3.Distance(missile.position, enemy.position);

                // Missile collision radius
                if (distance < 2.5) {
                    // Apply damage
                    enemy.takeDamage(missile.damage, missile.mesh.material ?
                        (missile.mesh.material as any).diffuseColor :
                        new Color4(1, 0.8, 0.2, 1).toColor3()
                    );

                    // Create explosion effect
                    const explosionColor = new Color4(1, 0.6, 0.1, 1); // Orange explosion
                    this.explosionEffect.createExplosion(missile.position, explosionColor, 1.2);

                    // Destroy missile
                    missile.isAlive = false;

                    if (!enemy.isAlive) {
                        destroyedCount++;
                    }

                    break; // Missile hits one target
                }
            }
        }

        return destroyedCount;
    }

    public checkAsteroidCollisions(asteroids: Asteroid[]): ResourceFragment[] {
        const blueFragments: ResourceFragment[] = [];

        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            if (!missile.isAlive) continue;

            for (const asteroid of asteroids) {
                if (!asteroid.isAlive) continue;

                const distance = Vector3.Distance(missile.position, asteroid.position);
                const collisionRadius = asteroid.getCollisionRadius() + 1.5; // Missile collision buffer

                if (distance < collisionRadius) {
                    // Create bright blue explosion at asteroid position (more dramatic)
                    const blueExplosionColor = new Color4(0.3, 0.6, 1.0, 1); // Bright blue
                    const explosionSize = Math.max(2.0, asteroid.getCollisionRadius() * 1.5); // Larger, more visible
                    this.explosionEffect.createExplosion(asteroid.position, blueExplosionColor, explosionSize);

                    // Instantly destroy asteroid - create blue resource fragments
                    const fragmentCount = Math.floor((5 + Math.random() * 8) * (asteroid.sizeType === 'large' ? 3 : asteroid.sizeType === 'medium' ? 2 : 1));

                    for (let f = 0; f < fragmentCount; f++) {
                        const offset = new Vector3(
                            (Math.random() - 0.5) * 6,
                            (Math.random() - 0.5) * 6,
                            (Math.random() - 0.5) * 6
                        );
                        const fragmentPos = asteroid.position.add(offset);
                        const blueFragment = new ResourceFragment(this.scene, fragmentPos);

                        // Make fragment blue by modifying its material
                        if (blueFragment.mesh && blueFragment.mesh.material) {
                            const material = blueFragment.mesh.material as any;
                            material.diffuseColor = new Color3(0.3, 0.6, 1.0); // Bright blue
                            material.emissiveColor = new Color3(0.2, 0.4, 0.8); // Blue glow
                        }

                        blueFragments.push(blueFragment);
                    }

                    // Mark asteroid as destroyed
                    asteroid.isAlive = false;

                    // Destroy missile
                    missile.isAlive = false;

                    break; // Missile hits one asteroid
                }
            }
        }

        return blueFragments;
    }

    public purchaseMissilePack(): boolean {
        // This will be called by ProgressionManager with resource check
        this.missileCount += this.MISSILE_PACK_SIZE;
        console.log(`Purchased missile pack! Now have ${this.missileCount} missiles`);
        return true;
    }

    public getMissileCount(): number {
        return this.missileCount;
    }

    public getMissilePackCost(): number {
        return this.MISSILE_PACK_COST;
    }

    public getMissilePackSize(): number {
        return this.MISSILE_PACK_SIZE;
    }

    public canFire(): boolean {
        return this.missileCount > 0 && this.fireCooldown <= 0;
    }
}
