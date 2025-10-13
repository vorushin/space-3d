import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, Camera, Ray, ParticleSystem, Texture } from '@babylonjs/core';
import { Projectile } from './Projectile';
import { ExplosionEffect } from '../effects/ExplosionEffect';
import { WeaponSystem, WeaponConfig } from '../systems/WeaponSystem';

export class Player {
    private scene: Scene;
    public mesh: Mesh;
    public position: Vector3;
    private camera: Camera;
    private explosionEffect?: ExplosionEffect;

    public health: number = 100;
    public maxHealth: number = 100;
    private speed: number = 20;
    private rotationSpeed: number = 2;

    private isShooting: boolean = false;
    private shootCooldown: number = 0;
    public projectiles: Projectile[] = [];

    // Weapon system
    public weaponLevel: number = 1;
    private weaponConfig: WeaponConfig;
    public resourceMultiplier: number = 1.0;

    constructor(scene: Scene, position: Vector3, camera: Camera) {
        this.scene = scene;
        this.position = position.clone();
        this.camera = camera;

        // Initialize weapon config
        this.weaponConfig = WeaponSystem.getWeaponConfig(this.weaponLevel);
        this.resourceMultiplier = this.weaponConfig.resourceMultiplier;

        this.mesh = this.createShipMesh();
        this.mesh.position = position;
        this.updateShipVisuals();
    }

    private createShipMesh(): Mesh {
        // Simple triangular ship
        const ship = MeshBuilder.CreateCylinder('playerShip', {
            diameterTop: 0,
            diameterBottom: 2,
            height: 3,
            tessellation: 3
        }, this.scene);

        ship.rotation.x = Math.PI / 2;

        const material = new StandardMaterial('shipMaterial', this.scene);
        material.diffuseColor = new Color3(0.2, 0.8, 1);
        material.emissiveColor = new Color3(0.1, 0.4, 0.5);
        material.specularColor = new Color3(1, 1, 1);
        ship.material = material;

        return ship;
    }

    public update(deltaTime: number): void {
        this.handleMovement(deltaTime);
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);

        if (this.isShooting && this.shootCooldown <= 0 && this.weaponLevel > 0) {
            this.shoot();
            this.shootCooldown = this.weaponConfig.fireRate;
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(deltaTime);
            if (!this.projectiles[i].isAlive) {
                this.projectiles[i].dispose();
                this.projectiles.splice(i, 1);
            }
        }

        // Update camera and ship to follow rotation
        this.mesh.position = this.camera.position.clone();
        this.mesh.rotation = this.camera.rotation.clone();
    }

    private handleMovement(deltaTime: number): void {
        const canvas = this.scene.getEngine().getRenderingCanvas();
        const keys = (window as any).game?.inputController?.keys || {};

        const forward = this.camera.getDirection(Vector3.Forward());
        const right = this.camera.getDirection(Vector3.Right());
        const up = this.camera.getDirection(Vector3.Up());

        const velocity = Vector3.Zero();

        // WASD for lateral movement
        if (keys['w']) velocity.addInPlace(forward.scale(this.speed * deltaTime));
        if (keys['s']) velocity.addInPlace(forward.scale(-this.speed * deltaTime));
        if (keys['a']) velocity.addInPlace(right.scale(-this.speed * deltaTime));
        if (keys['d']) velocity.addInPlace(right.scale(this.speed * deltaTime));

        // Q/E for vertical movement
        if (keys['q']) velocity.addInPlace(up.scale(-this.speed * deltaTime));
        if (keys['e']) velocity.addInPlace(up.scale(this.speed * deltaTime));

        this.camera.position.addInPlace(velocity);
        this.position = this.camera.position.clone();
    }

    private shoot(): void {
        const forward = this.camera.getDirection(Vector3.Forward());
        const right = this.camera.getDirection(Vector3.Right());
        const up = this.camera.getDirection(Vector3.Up());
        const spawnOffset = forward.scale(2);
        const spawnPosition = this.camera.position.add(spawnOffset);

        const bulletCount = this.weaponConfig.bulletCount;
        const spreadAngle = this.weaponConfig.spreadAngle;

        // Create multiple bullets in spread pattern
        for (let i = 0; i < bulletCount; i++) {
            // Calculate spread offset for this bullet
            let angleOffset = 0;
            if (bulletCount > 1) {
                // Center the spread around the forward direction
                const spreadIndex = i - (bulletCount - 1) / 2;
                angleOffset = spreadIndex * spreadAngle;
            }

            // Apply spread in a horizontal arc (rotate around up axis)
            const cosAngle = Math.cos(angleOffset);
            const sinAngle = Math.sin(angleOffset);

            const spreadForward = forward.scale(cosAngle).add(right.scale(sinAngle));
            const direction = spreadForward.normalize();

            // Add vertical spread for 3D (smaller)
            const verticalSpread = (Math.random() - 0.5) * 0.03;
            const finalDirection = direction.add(up.scale(verticalSpread)).normalize();

            const projectile = new Projectile(
                this.scene,
                spawnPosition,
                finalDirection,
                this.weaponConfig.bulletSpeed,
                this.weaponConfig.damage,
                'player',
                this.weaponConfig.color,
                this.weaponConfig.bulletSize,
                this.weaponConfig.lifetime,
                this.weaponConfig.splashRadius
            );

            this.projectiles.push(projectile);
        }
    }

    public startShooting(): void {
        this.isShooting = true;
    }

    public stopShooting(): void {
        this.isShooting = false;
    }

    public setExplosionEffect(explosionEffect: ExplosionEffect): void {
        this.explosionEffect = explosionEffect;
    }

    public takeDamage(amount: number, weaponColor: Color3): void {
        this.health = Math.max(0, this.health - amount);

        // Create hit spark effect blending weapon color with player ship color (cyan)
        if (this.explosionEffect) {
            const playerColor = new Color3(0.2, 0.8, 1);
            this.explosionEffect.createHitSpark(this.position, weaponColor, playerColor);
        }

        if (this.health <= 0) {
            this.onDeath();
        }
    }

    public upgradeWeapons(): void {
        if (this.weaponLevel >= 10) return; // Max level

        this.weaponLevel++;
        this.weaponConfig = WeaponSystem.getWeaponConfig(this.weaponLevel);
        this.resourceMultiplier = this.weaponConfig.resourceMultiplier;
        this.updateShipVisuals();

        console.log(`Weapon upgraded to Level ${this.weaponLevel}: ${this.weaponConfig.name}`);
    }

    private updateShipVisuals(): void {
        // Update ship scale based on weapon level
        const scale = WeaponSystem.getShipScaleMultiplier(this.weaponLevel);
        this.mesh.scaling.setAll(scale);

        // Update ship material with glow
        const material = this.mesh.material as StandardMaterial;
        if (material) {
            const glowIntensity = WeaponSystem.getGlowIntensity(this.weaponLevel);

            // Add weapon-level-appropriate glow color
            if (WeaponSystem.hasSingularityEffect(this.weaponLevel)) {
                material.emissiveColor = new Color3(0.5, 0.5, 1).scale(glowIntensity);
            } else if (WeaponSystem.hasQuantumEffect(this.weaponLevel)) {
                material.emissiveColor = new Color3(0.5, 0, 0.8).scale(glowIntensity);
            } else if (WeaponSystem.hasIonEffect(this.weaponLevel)) {
                material.emissiveColor = new Color3(0, 0.3, 0.8).scale(glowIntensity);
            } else if (WeaponSystem.hasPlasmaEffect(this.weaponLevel)) {
                material.emissiveColor = new Color3(0.6, 0, 0.6).scale(glowIntensity);
            } else {
                material.emissiveColor = new Color3(0.1, 0.4, 0.5).scale(1 + glowIntensity);
            }
        }
    }

    public getWeaponConfig(): WeaponConfig {
        return this.weaponConfig;
    }

    public getUpgradeCost(): number {
        return WeaponSystem.calculateUpgradeCost(this.weaponLevel + 1);
    }

    private onDeath(): void {
        console.log('Player destroyed! Game Over');
        // TODO: Implement game over logic
    }
}
