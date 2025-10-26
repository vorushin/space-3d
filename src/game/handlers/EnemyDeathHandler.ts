import { Vector3, Color3, Color4 } from '@babylonjs/core';
import { Enemy } from '../entities/Enemy';
import { EnemyResourceFragment } from '../entities/EnemyResourceFragment';
import { ExplosionEffect } from '../effects/ExplosionEffect';

export class EnemyDeathHandler {
    private explosionEffect: ExplosionEffect;

    constructor(explosionEffect: ExplosionEffect) {
        this.explosionEffect = explosionEffect;
    }

    /**
     * Handle enemy death: create explosions and resource fragments
     * Returns the fragments created
     */
    public handleDeath(enemy: Enemy): EnemyResourceFragment[] {
        // Create explosions based on enemy type
        this.createExplosions(enemy);

        // Create resource fragments
        const fragments = enemy.breakIntoFragments();

        // Clean up projectiles
        for (const projectile of enemy.projectiles) {
            projectile.dispose();
        }
        enemy.projectiles = [];

        enemy.dispose();

        return fragments;
    }

    private createExplosions(enemy: Enemy): void {
        const color = enemy.getColor();
        const color4 = new Color4(color.r, color.g, color.b, 1);
        const pos = enemy.position;

        // Scale explosions based on ship type
        switch (enemy.type) {
            case 'scout':
                this.explosionEffect.createExplosion(pos, color4, 0.7);
                break;

            case 'fighter':
                this.explosionEffect.createExplosion(pos, color4, 1.0);
                break;

            case 'heavy':
                this.explosionEffect.createExplosion(pos, color4, 1.5);
                break;

            case 'destroyer':
                this.explosionEffect.createLargeExplosion(pos, color4);
                break;

            case 'cruiser':
                this.explosionEffect.createLargeExplosion(pos, color4);
                break;

            case 'battleship':
                // Multi-stage explosion
                this.explosionEffect.createLargeExplosion(pos, color4);
                setTimeout(() => {
                    this.explosionEffect.createExplosion(pos, color4, 2.5);
                }, 100);
                break;

            case 'dreadnought':
                // Massive multi-stage explosion
                this.explosionEffect.createLargeExplosion(pos, color4);
                setTimeout(() => {
                    this.explosionEffect.createLargeExplosion(pos, color4);
                }, 150);
                setTimeout(() => {
                    this.explosionEffect.createExplosion(pos, color4, 3.0);
                }, 300);
                break;

            case 'titan':
                // Apocalyptic explosion sequence
                this.explosionEffect.createLargeExplosion(pos, color4);
                setTimeout(() => {
                    this.explosionEffect.createLargeExplosion(pos, color4);
                }, 100);
                setTimeout(() => {
                    this.explosionEffect.createLargeExplosion(pos, color4);
                }, 200);
                setTimeout(() => {
                    this.explosionEffect.createExplosion(pos, color4, 4.0);
                }, 350);
                setTimeout(() => {
                    this.explosionEffect.createExplosion(pos, color4, 3.5);
                }, 500);
                break;
        }
    }
}
