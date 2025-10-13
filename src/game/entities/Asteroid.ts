import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, Color4 } from '@babylonjs/core';
import { ResourceFragment } from './ResourceFragment';
import { ExplosionEffect } from '../effects/ExplosionEffect';

export type AsteroidSize = 'large' | 'medium' | 'small';

export class Asteroid {
    private scene: Scene;
    public mesh: Mesh;
    public position: Vector3;
    private velocity: Vector3;
    private rotationSpeed: Vector3;
    private explosionEffect: ExplosionEffect;

    public health: number = 50;
    private size: number;
    public sizeType: AsteroidSize;
    public isAlive: boolean = true;
    public shouldSplit: boolean = false; // True when hit but not destroyed

    constructor(scene: Scene, position: Vector3, explosionEffect: ExplosionEffect, sizeType: AsteroidSize = 'large', velocity?: Vector3) {
        this.scene = scene;
        this.position = position.clone();
        this.explosionEffect = explosionEffect;
        this.sizeType = sizeType;

        // Configure based on size type
        switch (sizeType) {
            case 'large':
                this.size = 3.0;
                this.health = 30; // Takes multiple hits
                break;
            case 'medium':
                this.size = 1.8;
                this.health = 15; // Takes 1-2 hits
                break;
            case 'small':
                this.size = 1.0;
                this.health = 10; // Dies quickly
                break;
        }

        const baseSpeed = sizeType === 'large' ? 3 : sizeType === 'medium' ? 5 : 8;

        // Use provided velocity or generate random drift
        if (velocity) {
            this.velocity = velocity.clone();
        } else {
            this.velocity = new Vector3(
                (Math.random() - 0.5) * baseSpeed,
                (Math.random() - 0.5) * baseSpeed,
                (Math.random() - 0.5) * baseSpeed
            );
        }

        this.rotationSpeed = new Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        );

        this.mesh = this.createAsteroidMesh();
        this.mesh.position = position;
    }

    private createAsteroidMesh(): Mesh {
        const asteroid = MeshBuilder.CreateIcoSphere('asteroid', {
            radius: 2 * this.size,
            subdivisions: 2,
            flat: true
        }, this.scene);

        // Deform vertices for irregular shape
        const positions = asteroid.getVerticesData('position');
        if (positions) {
            for (let i = 0; i < positions.length; i += 3) {
                const deform = 0.3 + Math.random() * 0.4;
                positions[i] *= deform;
                positions[i + 1] *= deform;
                positions[i + 2] *= deform;
            }
            asteroid.setVerticesData('position', positions);
        }

        const material = new StandardMaterial('asteroidMaterial', this.scene);
        material.diffuseColor = new Color3(0.4, 0.3, 0.2);
        material.specularColor = new Color3(0.2, 0.2, 0.2);
        asteroid.material = material;

        return asteroid;
    }

    public update(deltaTime: number): void {
        this.position.addInPlace(this.velocity.scale(deltaTime));
        this.mesh.position = this.position;

        this.mesh.rotation.x += this.rotationSpeed.x * deltaTime;
        this.mesh.rotation.y += this.rotationSpeed.y * deltaTime;
        this.mesh.rotation.z += this.rotationSpeed.z * deltaTime;
    }

    public takeDamage(amount: number, weaponColor: Color3): void {
        this.health -= amount;

        // Create hit spark effect blending weapon color with asteroid color (brown/orange)
        const asteroidColor = new Color3(0.8, 0.6, 0.3);
        this.explosionEffect.createHitSpark(this.position, weaponColor, asteroidColor);

        if (this.health <= 0) {
            // Large and medium asteroids split, small ones are destroyed
            if (this.sizeType === 'large' || this.sizeType === 'medium') {
                this.shouldSplit = true;
            }
            this.isAlive = false;
        }
    }

    public splitIntoSmaller(): Asteroid[] {
        const splitAsteroids: Asteroid[] = [];
        const newSizeType: AsteroidSize = this.sizeType === 'large' ? 'medium' : 'small';
        const splitCount = this.sizeType === 'large' ? (2 + Math.floor(Math.random() * 2)) : (2 + Math.floor(Math.random() * 2)); // 2-3 pieces

        for (let i = 0; i < splitCount; i++) {
            // Random velocity away from impact point
            const splitVelocity = new Vector3(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15
            );

            const offset = new Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );

            const newAsteroid = new Asteroid(
                this.scene,
                this.position.add(offset),
                this.explosionEffect,
                newSizeType,
                splitVelocity
            );

            splitAsteroids.push(newAsteroid);
        }

        return splitAsteroids;
    }

    public crashIntoFragments(): ResourceFragment[] {
        // Crashing produces 5x less resources than normal destruction
        const fragmentCount = Math.max(1, Math.floor((3 + Math.random() * 5) * this.size / 5));
        const fragments: ResourceFragment[] = [];

        for (let i = 0; i < fragmentCount; i++) {
            const offset = new Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4
            );
            const fragmentPos = this.position.add(offset);
            fragments.push(new ResourceFragment(this.scene, fragmentPos));
        }

        return fragments;
    }

    public breakIntoFragments(): ResourceFragment[] {
        // Only small asteroids break into fragments directly
        const fragmentCount = Math.floor((3 + Math.random() * 5) * this.size);
        const fragments: ResourceFragment[] = [];

        for (let i = 0; i < fragmentCount; i++) {
            const offset = new Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4
            );
            const fragmentPos = this.position.add(offset);
            fragments.push(new ResourceFragment(this.scene, fragmentPos));
        }

        return fragments;
    }

    public getCollisionRadius(): number {
        return 2 * this.size;
    }

    public getCollisionDamage(): number {
        // Damage based on size and velocity
        const speed = this.velocity.length();
        return Math.floor(this.size * speed * 2);
    }

    public dispose(): void {
        this.mesh.dispose();
    }
}
