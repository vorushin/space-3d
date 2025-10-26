import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode } from '@babylonjs/core';
import { Projectile } from './Projectile';
import { Enemy } from './Enemy';

export class Turret {
    private scene: Scene;
    public mesh: Mesh;
    private barrelMesh: Mesh;
    public position: Vector3;
    private parentNode: TransformNode;

    public projectiles: Projectile[] = [];
    private shootCooldown: number = 0;
    private fireRate: number = 1; // Seconds between shots
    private range: number = 80;
    private damage: number = 15;

    public level: number = 1;
    private currentRotation: number = 0;
    private targetRotation: number = 0;
    private rotationSpeed: number = 3; // Radians per second

    constructor(scene: Scene, position: Vector3, parent: TransformNode) {
        this.scene = scene;
        this.position = position.clone();
        this.parentNode = parent;

        this.mesh = this.createTurretMesh();
        this.mesh.parent = parent;
        this.mesh.position = position;

        this.barrelMesh = this.createBarrel();
    }

    private createTurretMesh(): Mesh {
        // Hexagonal base platform
        const base = MeshBuilder.CreateCylinder('turretBase', {
            diameter: 2,
            height: 0.5,
            tessellation: 6
        }, this.scene);

        const baseMaterial = new StandardMaterial('turretBaseMaterial', this.scene);
        baseMaterial.diffuseColor = new Color3(0.7, 0.75, 0.8);
        baseMaterial.emissiveColor = new Color3(0.2, 0.25, 0.35);
        baseMaterial.specularColor = new Color3(0.8, 0.8, 0.9);
        base.material = baseMaterial;

        // Rotating turret head (sphere)
        const head = MeshBuilder.CreateSphere('turretHead', {
            diameter: 1.2,
            segments: 12
        }, this.scene);
        head.parent = base;
        head.position.y = 0.6;

        const headMaterial = new StandardMaterial('turretHeadMaterial', this.scene);
        headMaterial.diffuseColor = new Color3(0.8, 0.85, 0.95);
        headMaterial.emissiveColor = new Color3(0.3, 0.4, 0.6);
        headMaterial.specularColor = new Color3(1, 1, 1);
        head.material = headMaterial;

        // Add glowing sensor eye
        const eye = MeshBuilder.CreateSphere('turretEye', {
            diameter: 0.4,
            segments: 8
        }, this.scene);
        eye.parent = base;
        eye.position = new Vector3(0, 0.6, 0.6);

        const eyeMaterial = new StandardMaterial('turretEyeMaterial', this.scene);
        eyeMaterial.diffuseColor = new Color3(1, 0.3, 0.3);
        eyeMaterial.emissiveColor = new Color3(1, 0.5, 0.5); // Bright red sensor
        eye.material = eyeMaterial;

        return base;
    }

    private createBarrel(): Mesh {
        // Twin barrel assembly
        const barrelGroup = MeshBuilder.CreateBox('barrelMount', {
            width: 0.6,
            height: 0.4,
            depth: 0.3
        }, this.scene);
        barrelGroup.parent = this.mesh;
        barrelGroup.position.y = 0.6;
        barrelGroup.position.z = 0.5;

        const mountMaterial = new StandardMaterial('barrelMountMaterial', this.scene);
        mountMaterial.diffuseColor = new Color3(0.6, 0.65, 0.75);
        mountMaterial.emissiveColor = new Color3(0.15, 0.2, 0.3);
        barrelGroup.material = mountMaterial;

        // Left barrel
        const barrel1 = MeshBuilder.CreateCylinder('turretBarrel1', {
            diameter: 0.25,
            height: 1.8,
            tessellation: 8
        }, this.scene);
        barrel1.rotation.x = Math.PI / 2;
        barrel1.position = new Vector3(-0.2, 0.6, 1.3);
        barrel1.parent = this.mesh;

        // Right barrel
        const barrel2 = MeshBuilder.CreateCylinder('turretBarrel2', {
            diameter: 0.25,
            height: 1.8,
            tessellation: 8
        }, this.scene);
        barrel2.rotation.x = Math.PI / 2;
        barrel2.position = new Vector3(0.2, 0.6, 1.3);
        barrel2.parent = this.mesh;

        const barrelMaterial = new StandardMaterial('barrelMaterial', this.scene);
        barrelMaterial.diffuseColor = new Color3(0.5, 0.55, 0.65);
        barrelMaterial.emissiveColor = new Color3(0.1, 0.15, 0.25);
        barrelMaterial.specularColor = new Color3(0.7, 0.7, 0.8);

        barrel1.material = barrelMaterial;
        barrel2.material = barrelMaterial;

        // Glowing barrel tips
        const tip1 = MeshBuilder.CreateSphere('barrelTip1', {
            diameter: 0.3,
            segments: 8
        }, this.scene);
        tip1.parent = this.mesh;
        tip1.position = new Vector3(-0.2, 0.6, 2.2);

        const tip2 = MeshBuilder.CreateSphere('barrelTip2', {
            diameter: 0.3,
            segments: 8
        }, this.scene);
        tip2.parent = this.mesh;
        tip2.position = new Vector3(0.2, 0.6, 2.2);

        const tipMaterial = new StandardMaterial('barrelTipMaterial', this.scene);
        tipMaterial.diffuseColor = new Color3(0.4, 0.8, 1);
        tipMaterial.emissiveColor = new Color3(0.5, 0.9, 1); // Bright cyan glow

        tip1.material = tipMaterial;
        tip2.material = tipMaterial;

        return barrel1; // Return one barrel as reference
    }

    public update(deltaTime: number): void {
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);

        // Find nearest enemy and aim at it
        const target = this.findNearestEnemy();
        if (target) {
            const worldPos = Vector3.TransformCoordinates(this.mesh.position, this.parentNode.getWorldMatrix());
            const direction = target.position.subtract(worldPos).normalize();
            this.targetRotation = Math.atan2(direction.x, direction.z);
        }

        // Smoothly rotate toward target
        if (target) {
            // Calculate shortest rotation path (handle wrapping at PI/-PI)
            let rotationDiff = this.targetRotation - this.currentRotation;

            // Normalize to [-PI, PI] range
            while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
            while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

            // Interpolate rotation
            const maxRotationThisFrame = this.rotationSpeed * deltaTime;
            if (Math.abs(rotationDiff) < maxRotationThisFrame) {
                this.currentRotation = this.targetRotation;
            } else {
                this.currentRotation += Math.sign(rotationDiff) * maxRotationThisFrame;
            }

            this.mesh.rotation.y = this.currentRotation;

            // Only shoot if roughly aimed at target (within 10 degrees)
            const aimAccuracy = Math.abs(rotationDiff);
            if (this.shootCooldown <= 0 && aimAccuracy < 0.17) { // ~10 degrees
                this.shootAt(target);
                this.shootCooldown = this.fireRate;
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(deltaTime);
            if (!this.projectiles[i].isAlive) {
                this.projectiles[i].dispose();
                this.projectiles.splice(i, 1);
            }
        }
    }

    private findNearestEnemy(): Enemy | null {
        const game = (window as any).game;
        if (!game || !game.enemyManager) return null;

        const enemies = game.enemyManager.enemies;
        if (enemies.length === 0) return null;

        const worldPos = Vector3.TransformCoordinates(this.mesh.position, this.parentNode.getWorldMatrix());

        let nearest: Enemy | null = null;
        let nearestDist = this.range;

        for (const enemy of enemies) {
            const dist = Vector3.Distance(worldPos, enemy.position);
            if (dist < nearestDist) {
                nearest = enemy;
                nearestDist = dist;
            }
        }

        return nearest;
    }

    private shootAt(target: Enemy): void {
        const worldPos = Vector3.TransformCoordinates(this.mesh.position, this.parentNode.getWorldMatrix());
        const direction = target.position.subtract(worldPos).normalize();
        const spawnOffset = direction.scale(2);
        const spawnPosition = worldPos.add(spawnOffset);

        const projectile = new Projectile(
            this.scene,
            spawnPosition,
            direction,
            60,
            this.damage,
            'turret'
        );

        this.projectiles.push(projectile);
    }

    public upgrade(): void {
        this.level++;
        this.fireRate = Math.max(0.3, 1 - (this.level * 0.1));
        this.damage = 15 + (this.level * 5);
        this.range = 80 + (this.level * 10);
    }
}
