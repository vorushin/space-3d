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

    private speed: number = 117; // Units per second (350 / 3 for slower, more visible missiles)
    private turnRate: number = 2.5; // Radians per second - more realistic turning
    private lifetime: number = 6; // Extended lifetime for longer pursuit
    private age: number = 0;
    private lockRange: number = 200; // Extended lock range
    private maxLockAngle: number = Math.PI / 6; // 30 degrees cone - only lock targets player is aiming at
    private trackingDelay: number = 0; // No delay - start tracking immediately
    private targetLocked: boolean = false; // Once locked, stay locked unless target dies
    private color: Color3 = new Color3(1.0, 0.8, 0.2); // Orange-yellow

    // Shared material for all missiles (performance optimization)
    private static sharedMaterial: StandardMaterial | null = null;

    constructor(scene: Scene, position: Vector3, initialDirection: Vector3, damage: number, explosionEffect: ExplosionEffect) {
        this.scene = scene;
        this.position = position.clone();
        this.velocity = initialDirection.normalizeToNew().scale(this.speed);
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
        const direction = this.velocity.normalizeToNew(); // Use normalizeToNew() to avoid modifying velocity!
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
            // Target destroyed - acquire new target in same general direction
            this.target = null;
            this.targetLocked = false;
            this.acquireTarget(enemies);
        }
    }

    private acquireTarget(enemies: Enemy[]): void {
        // Lock onto the enemy most aligned with the missile's current direction
        // This ensures the missile targets what the player was aiming at
        let bestEnemy: Enemy | null = null;
        let bestAlignment = -1; // Track best dot product (ranges from -1 to 1)

        const missileDirection = this.velocity.normalizeToNew();

        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;

            const toEnemy = enemy.position.subtract(this.position);
            const distance = toEnemy.length();

            // Skip enemies outside lock range
            if (distance > this.lockRange) continue;

            // Calculate alignment with missile direction
            const directionToEnemy = toEnemy.normalizeToNew();
            const alignment = Vector3.Dot(missileDirection, directionToEnemy);

            // Calculate angle from dot product: angle = acos(dotProduct)
            const angleToTarget = Math.acos(Math.max(-1, Math.min(1, alignment)));

            // Only consider targets within the lock cone (30 degrees on initial lock)
            if (!this.targetLocked && angleToTarget > this.maxLockAngle) continue;

            // For reacquisition after target death, use wider cone (90 degrees)
            if (this.targetLocked && angleToTarget > Math.PI / 2) continue;

            // Choose the target MOST aligned with current direction
            // This is what the player was aiming at when they fired
            if (alignment > bestAlignment) {
                bestAlignment = alignment;
                bestEnemy = enemy;
            }
        }

        if (bestEnemy) {
            this.target = bestEnemy;
            this.targetLocked = true;
        }
    }

    private trackTarget(deltaTime: number): void {
        if (!this.target) return;

        // Advanced predictive targeting using iterative intercept calculation
        const toTarget = this.target.position.subtract(this.position);
        const distance = toTarget.length();

        // Get target velocity (if available)
        let targetVelocity = Vector3.Zero();
        if ((this.target as any).velocity) {
            targetVelocity = (this.target as any).velocity;
        }

        // Iterative intercept calculation (more accurate than simple prediction)
        // This accounts for the missile's turning limitations
        let interceptTime = distance / this.speed;
        for (let i = 0; i < 3; i++) { // 3 iterations is usually enough
            const predictedPos = this.target.position.add(targetVelocity.scale(interceptTime));
            const newDistance = Vector3.Distance(this.position, predictedPos);
            interceptTime = newDistance / this.speed;
        }

        // Calculate the intercept point
        const interceptPoint = this.target.position.add(targetVelocity.scale(interceptTime));
        const toInterceptPoint = interceptPoint.subtract(this.position);

        // If target is very close or moving slowly, aim directly at it
        const targetSpeed = targetVelocity.length();
        const directAimThreshold = 5.0; // Within 5 units, aim directly
        const desiredDirection = (distance < directAimThreshold || targetSpeed < 1.0)
            ? toTarget.normalizeToNew()
            : toInterceptPoint.normalizeToNew();

        // Current direction
        const currentDirection = this.velocity.normalizeToNew();

        // Calculate how much we can turn this frame
        const maxTurnAngle = this.turnRate * deltaTime;

        // Calculate angle between current direction and desired direction
        const dotProduct = Vector3.Dot(currentDirection, desiredDirection);
        const angleToTarget = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

        // Proportional navigation: turn rate increases when far from target direction
        // This makes missiles more responsive when they need to turn sharply
        const turnUrgency = Math.min(1.0, angleToTarget / (Math.PI / 4)); // 0 to 1 based on 45° reference
        const adaptiveTurnRate = maxTurnAngle * (0.5 + 0.5 * turnUrgency); // 50% to 100% of max turn

        // Calculate turn factor with adaptive turning
        const turnFactor = Math.min(1.0, adaptiveTurnRate / Math.max(angleToTarget, 0.01));

        // Use spherical linear interpolation for smooth, realistic turning
        let newDirection = Vector3.Lerp(currentDirection, desiredDirection, turnFactor);

        // Ensure newDirection is valid before normalizing
        if (newDirection.lengthSquared() > 0.0001) {
            newDirection = newDirection.normalize();
        } else {
            // Fallback to current direction if lerp resulted in near-zero vector
            newDirection = currentDirection;
        }

        // Apply speed - always maintain constant speed
        this.velocity = newDirection.scale(this.speed);
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
