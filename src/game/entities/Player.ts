import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, Camera, Ray, ParticleSystem, Texture } from '@babylonjs/core';
import { Projectile } from './Projectile';
import { ExplosionEffect } from '../effects/ExplosionEffect';

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
    private fireRate: number = 0.15; // Time between shots
    public projectiles: Projectile[] = [];

    // Ship weapon stats
    public weaponLevel: number = 1;
    private damage: number = 10;
    private bulletSpeed: number = 100;
    private bulletSpread: number = 0.02;

    constructor(scene: Scene, position: Vector3, camera: Camera) {
        this.scene = scene;
        this.position = position.clone();
        this.camera = camera;

        this.mesh = this.createShipMesh();
        this.mesh.position = position;
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

        if (this.isShooting && this.shootCooldown <= 0) {
            this.shoot();
            this.shootCooldown = this.fireRate;
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
        const spawnOffset = forward.scale(2);
        const spawnPosition = this.camera.position.add(spawnOffset);

        // Add slight random spread
        const spread = this.bulletSpread;
        const spreadX = (Math.random() - 0.5) * spread;
        const spreadY = (Math.random() - 0.5) * spread;

        const right = this.camera.getDirection(Vector3.Right());
        const up = this.camera.getDirection(Vector3.Up());

        const direction = forward
            .add(right.scale(spreadX))
            .add(up.scale(spreadY))
            .normalize();

        const projectile = new Projectile(
            this.scene,
            spawnPosition,
            direction,
            this.bulletSpeed,
            this.damage,
            'player'
        );

        this.projectiles.push(projectile);
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
        this.weaponLevel++;
        this.fireRate = Math.max(0.05, 0.15 - (this.weaponLevel * 0.01));
        this.damage = 10 + (this.weaponLevel * 5);
        this.bulletSpread = Math.max(0.005, 0.02 - (this.weaponLevel * 0.001));
    }

    private onDeath(): void {
        console.log('Player destroyed! Game Over');
        // TODO: Implement game over logic
    }
}
