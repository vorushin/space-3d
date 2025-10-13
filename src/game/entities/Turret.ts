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
        const base = MeshBuilder.CreateCylinder('turretBase', {
            diameter: 1.5,
            height: 1
        }, this.scene);

        const material = new StandardMaterial('turretMaterial', this.scene);
        material.diffuseColor = new Color3(0.3, 0.3, 0.4);
        material.emissiveColor = new Color3(0.2, 0.1, 0);
        material.specularColor = new Color3(0.5, 0.5, 0.5);
        base.material = material;

        return base;
    }

    private createBarrel(): Mesh {
        const barrel = MeshBuilder.CreateCylinder('turretBarrel', {
            diameter: 0.3,
            height: 2
        }, this.scene);

        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = 1;
        barrel.parent = this.mesh;

        const material = new StandardMaterial('barrelMaterial', this.scene);
        material.diffuseColor = new Color3(0.4, 0.4, 0.5);
        material.emissiveColor = new Color3(0.1, 0.1, 0.2);
        barrel.material = material;

        return barrel;
    }

    public update(deltaTime: number): void {
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);

        // Find nearest enemy and shoot
        const target = this.findNearestEnemy();
        if (target && this.shootCooldown <= 0) {
            this.shootAt(target);
            this.shootCooldown = this.fireRate;
        }

        // Aim at target
        if (target) {
            const worldPos = Vector3.TransformCoordinates(this.mesh.position, this.parentNode.getWorldMatrix());
            const direction = target.position.subtract(worldPos).normalize();
            const targetRotation = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = targetRotation;
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
