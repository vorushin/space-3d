import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';
import { Enemy } from './Enemy';
import { ExplosionEffect } from '../effects/ExplosionEffect';

export class Missile {
    private scene: Scene;
    public mesh: Mesh;
    public position: Vector3;
    private velocity: Vector3;
    public damage: number;
    public isAlive: boolean = true;
    private target: Enemy | null = null;
    private explosionEffect: ExplosionEffect;
    public shouldExplode: boolean = false; // Flag to trigger explosion on removal

    private speed: number = 350; // Units per second - increased for better interception
    private turnRate: number = 6.0; // Radians per second - doubled for tighter turns
    private lifetime: number = 4; // Increased to 4 seconds for longer pursuit
    private age: number = 0;
    private lockRange: number = 150; // Increased range to acquire targets further away
    private trackingDelay: number = 0.2; // Reduced delay for faster tracking
    private color: Color3 = new Color3(1.0, 0.8, 0.2); // Orange-yellow

    // Shared material for all missiles (performance optimization)
    private static sharedMaterial: StandardMaterial | null = null;

    constructor(scene: Scene, position: Vector3, initialDirection: Vector3, damage: number, explosionEffect: ExplosionEffect) {
        this.scene = scene;
        this.position = position.clone();
        this.velocity = initialDirection.normalize().scale(this.speed);
        this.damage = damage;
        this.explosionEffect = explosionEffect;
        this.mesh = this.createMissileMesh();
        this.mesh.position = position;
    }

    private createMissileMesh(): Mesh {
        // Create a missile shape (elongated cylinder with cone tip)
        const body = MeshBuilder.CreateCylinder('missileBody', {
            diameterTop: 0.3,
            diameterBottom: 0.3,
            height: 1.5,
            tessellation: 8  // Low poly for performance
        }, this.scene);

        const tip = MeshBuilder.CreateCylinder('missileTip', {
            diameterTop: 0,
            diameterBottom: 0.3,
            height: 0.5,
            tessellation: 8  // Low poly for performance
        }, this.scene);
        tip.position.y = 1.0;

        // Merge into single mesh
        body.addChild(tip);
        body.rotation.x = Math.PI / 2; // Point forward

        // Create or reuse shared material
        if (!Missile.sharedMaterial) {
            Missile.sharedMaterial = new StandardMaterial('missileMaterial', this.scene);
            Missile.sharedMaterial.diffuseColor = this.color;
            Missile.sharedMaterial.emissiveColor = this.color.scale(0.5);
            Missile.sharedMaterial.specularColor = new Color3(1, 1, 1);
        }

        body.material = Missile.sharedMaterial;
        tip.material = Missile.sharedMaterial;

        return body;
    }

    public update(deltaTime: number, enemies: Enemy[]): void {
        this.age += deltaTime;

        // Early exit if lifetime exceeded - don't do any other calculations
        if (this.age >= this.lifetime) {
            this.shouldExplode = true;
            this.isAlive = false;
            return;
        }

        // Update position first
        this.position.addInPlace(this.velocity.scale(deltaTime));

        // Check distance - use squared distance to avoid expensive sqrt
        const distanceSquared = this.position.lengthSquared();
        if (distanceSquared > 90000) { // 300^2 = 90000
            this.shouldExplode = true;
            this.isAlive = false;
            return;
        }

        this.mesh.position = this.position;

        // Update rotation to face velocity direction
        const direction = this.velocity.normalize();
        const targetPosition = this.position.add(direction);
        this.mesh.lookAt(targetPosition, 0, Math.PI / 2, 0);

        // Acquire target if we don't have one and tracking delay has passed
        if (!this.target && this.age >= this.trackingDelay) {
            this.acquireTarget(enemies);
        }

        // Track target if we have one
        if (this.target && this.target.isAlive) {
            this.trackTarget(deltaTime);
        } else if (this.target && !this.target.isAlive) {
            // Target destroyed, try to acquire new target
            this.target = null;
            this.acquireTarget(enemies);
        }
    }

    private acquireTarget(enemies: Enemy[]): void {
        let bestEnemy: Enemy | null = null;
        let bestScore = 0;
        const missileDirection = this.velocity.normalize();

        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;

            const toEnemy = enemy.position.subtract(this.position);
            const distance = toEnemy.length();

            // Only consider enemies within lock range
            if (distance > this.lockRange) continue;

            // Check if enemy is in front hemisphere
            const directionToEnemy = toEnemy.normalize();
            const dotProduct = Vector3.Dot(missileDirection, directionToEnemy);

            if (dotProduct > 0) { // In front hemisphere
                // Score based on both distance and alignment
                // Closer enemies and enemies more aligned with missile direction score higher
                const distanceScore = 1.0 - (distance / this.lockRange); // 0 to 1, higher is closer
                const alignmentScore = dotProduct; // 0 to 1, higher is more aligned

                // Weighted score - favor alignment slightly over distance
                const score = (alignmentScore * 0.6) + (distanceScore * 0.4);

                if (score > bestScore) {
                    bestScore = score;
                    bestEnemy = enemy;
                }
            }
        }

        this.target = bestEnemy;
    }

    private trackTarget(deltaTime: number): void {
        if (!this.target) return;

        // Predictive targeting - aim where the target will be, not where it is
        const toTarget = this.target.position.subtract(this.position);
        const distance = toTarget.length();

        // Estimate time to intercept
        const timeToIntercept = distance / this.speed;

        // Get target velocity (if available)
        let targetVelocity = Vector3.Zero();
        if ((this.target as any).velocity) {
            targetVelocity = (this.target as any).velocity;
        }

        // Calculate predicted intercept position
        const predictedPosition = this.target.position.add(targetVelocity.scale(timeToIntercept));
        const toInterceptPoint = predictedPosition.subtract(this.position);
        const desiredDirection = toInterceptPoint.normalize();

        // Current direction
        const currentDirection = this.velocity.normalize();

        // Calculate turn factor - more aggressive turning
        const maxTurnSpeed = this.turnRate * deltaTime;
        const turnFactor = Math.min(1.0, maxTurnSpeed * 2.0); // 2x multiplier for tighter tracking

        // Use lerp for smooth turning
        const newDirection = Vector3.Lerp(currentDirection, desiredDirection, turnFactor);

        // Normalize and apply speed
        this.velocity = newDirection.normalize().scale(this.speed);
    }

    public getTarget(): Enemy | null {
        return this.target;
    }

    public dispose(): void {
        try {
            if (this.mesh) {
                this.mesh.dispose();
            }
        } catch (e) {
            console.warn('Missile dispose failed:', e);
        }
    }
}
