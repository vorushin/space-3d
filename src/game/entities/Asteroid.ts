import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, Color4, VertexData, DynamicTexture } from '@babylonjs/core';
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
    private color: Color3;
    private subdivisions: number;

    constructor(scene: Scene, position: Vector3, explosionEffect: ExplosionEffect, sizeType: AsteroidSize = 'large', velocity?: Vector3, parentColor?: Color3) {
        this.scene = scene;
        this.position = position.clone();
        this.explosionEffect = explosionEffect;
        this.sizeType = sizeType;

        // Configure based on size type with random variation
        switch (sizeType) {
            case 'large':
                this.size = 2.5 + Math.random() * 1.5; // 2.5-4.0
                this.health = 30; // Takes multiple hits
                this.subdivisions = 2 + Math.floor(Math.random() * 2); // 2-3
                break;
            case 'medium':
                this.size = 1.3 + Math.random() * 1.0; // 1.3-2.3
                this.health = 15; // Takes 1-2 hits
                this.subdivisions = 2;
                break;
            case 'small':
                this.size = 0.6 + Math.random() * 0.7; // 0.6-1.3
                this.health = 10; // Dies quickly
                this.subdivisions = 1;
                break;
        }

        // Use parent color if provided, otherwise generate random color
        if (parentColor) {
            // Inherit parent color with slight variation
            this.color = new Color3(
                Math.max(0, Math.min(1, parentColor.r + (Math.random() - 0.5) * 0.1)),
                Math.max(0, Math.min(1, parentColor.g + (Math.random() - 0.5) * 0.1)),
                Math.max(0, Math.min(1, parentColor.b + (Math.random() - 0.5) * 0.1))
            );
        } else {
            // Varied asteroid colors - browns, grays, reds, with some ice asteroids
            const colorType = Math.random();
            if (colorType < 0.4) {
                // Brown/rocky asteroids (most common)
                this.color = new Color3(
                    0.5 + Math.random() * 0.4,  // 0.5-0.9 red
                    0.35 + Math.random() * 0.3, // 0.35-0.65 green
                    0.2 + Math.random() * 0.2   // 0.2-0.4 blue
                );
            } else if (colorType < 0.7) {
                // Gray/metallic asteroids
                const brightness = 0.4 + Math.random() * 0.3;
                this.color = new Color3(brightness, brightness, brightness * 0.95);
            } else if (colorType < 0.85) {
                // Reddish asteroids (iron-rich)
                this.color = new Color3(
                    0.6 + Math.random() * 0.3,  // 0.6-0.9 red
                    0.3 + Math.random() * 0.2,  // 0.3-0.5 green
                    0.2 + Math.random() * 0.15  // 0.2-0.35 blue
                );
            } else {
                // Ice asteroids (bright, bluish)
                const brightness = 0.6 + Math.random() * 0.3;
                this.color = new Color3(
                    brightness * 0.8,
                    brightness * 0.9,
                    brightness
                );
            }
        }

        // Variable speed based on size (smaller = faster) with random variation
        const baseSizeSpeed = sizeType === 'large' ? 2 : sizeType === 'medium' ? 4 : 7;
        const speedVariation = 0.5 + Math.random() * 1.0; // 0.5x to 1.5x variation
        const baseSpeed = baseSizeSpeed * speedVariation;

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
        // Create a polyhedron base for rocky appearance
        const asteroid = MeshBuilder.CreatePolyhedron('asteroid', {
            type: Math.floor(Math.random() * 4), // Random polyhedron type (0-3)
            size: 2 * this.size,
            flat: false // Use smooth shading to avoid gaps
        }, this.scene);

        // Heavily deform vertices for jagged rock/metal appearance
        const positions = asteroid.getVerticesData('position');

        if (positions) {
            for (let i = 0; i < positions.length; i += 3) {
                // Extreme random deformation for each vertex
                const deformX = 0.3 + Math.random() * 0.9; // 0.3-1.2
                const deformY = 0.3 + Math.random() * 0.9;
                const deformZ = 0.3 + Math.random() * 0.9;

                positions[i] *= deformX;
                positions[i + 1] *= deformY;
                positions[i + 2] *= deformZ;

                // Add random bumps and craters
                const bumpChance = Math.random();
                if (bumpChance < 0.3) {
                    // Create crater (indent)
                    const craterDepth = 0.7 + Math.random() * 0.2;
                    positions[i] *= craterDepth;
                    positions[i + 1] *= craterDepth;
                    positions[i + 2] *= craterDepth;
                } else if (bumpChance < 0.5) {
                    // Create protrusion (bump out)
                    const bumpHeight = 1.2 + Math.random() * 0.3;
                    positions[i] *= bumpHeight;
                    positions[i + 1] *= bumpHeight;
                    positions[i + 2] *= bumpHeight;
                }
            }

            asteroid.setVerticesData('position', positions);

            // Recalculate normals for proper lighting on jagged surface
            const indices = asteroid.getIndices();
            if (indices) {
                const normals: number[] = [];
                VertexData.ComputeNormals(positions, indices, normals);
                asteroid.setVerticesData('normal', normals);
            }
        }

        const material = new StandardMaterial('asteroidMaterial', this.scene);

        // Create procedural texture for the asteroid
        const texture = this.createProceduralTexture();
        material.diffuseTexture = texture;

        // Use the varied color as tint
        material.diffuseColor = this.color;

        // Brighter, more visible with rough surface
        material.emissiveColor = this.color.scale(0.35); // Brighter glow for better visibility

        // Ensure material is opaque
        material.alpha = 1.0;
        material.backFaceCulling = true; // Cull back faces for solid appearance

        // Specular highlights based on material type
        const isMetallic = this.color.r === this.color.g && this.color.g === this.color.b; // Gray asteroids
        const isIce = this.color.b > this.color.r && this.color.b > this.color.g; // Blueish asteroids

        if (isMetallic) {
            // Metallic - high specular
            material.specularColor = new Color3(0.7, 0.7, 0.7);
            material.specularPower = 50 + Math.random() * 30;
        } else if (isIce) {
            // Ice - very shiny
            material.specularColor = new Color3(0.9, 0.9, 1.0);
            material.specularPower = 60 + Math.random() * 40;
        } else {
            // Rocky - low specular, rough
            material.specularColor = new Color3(0.2, 0.2, 0.2);
            material.specularPower = 10 + Math.random() * 20;
        }

        asteroid.material = material;

        return asteroid;
    }

    private createProceduralTexture(): DynamicTexture {
        // Create a texture with highly detailed rocky/cratered surface
        const textureSize = 256;
        const texture = new DynamicTexture('asteroidTexture', textureSize, this.scene, false);
        const ctx = texture.getContext();

        // Brighter base color (grayscale variation)
        const baseGray = 120 + Math.random() * 80; // 120-200 (much brighter)
        ctx.fillStyle = `rgb(${baseGray}, ${baseGray}, ${baseGray})`;
        ctx.fillRect(0, 0, textureSize, textureSize);

        // Add intense multi-layered noise for highly realistic rocky texture
        const imageData = ctx.getImageData(0, 0, textureSize, textureSize);
        const data = imageData.data;

        // Layer 1: High-frequency noise (small details)
        for (let i = 0; i < data.length; i += 4) {
            const variation = (Math.random() - 0.5) * 120; // -60 to +60 variation (more intense)
            data[i] = Math.max(0, Math.min(255, data[i] + variation));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + variation)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + variation)); // B
        }

        // Layer 2: Medium-frequency noise (rocky patches)
        for (let y = 0; y < textureSize; y += 2) {
            for (let x = 0; x < textureSize; x += 2) {
                const i = (y * textureSize + x) * 4;
                const patchNoise = (Math.random() - 0.5) * 60;

                // Apply to 2x2 block for medium-scale features
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const idx = ((y + dy) * textureSize + (x + dx)) * 4;
                        if (idx < data.length) {
                            data[idx] = Math.max(0, Math.min(255, data[idx] + patchNoise));
                            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + patchNoise));
                            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + patchNoise));
                        }
                    }
                }
            }
        }

        // Layer 3: Low-frequency noise (large formations)
        for (let y = 0; y < textureSize; y += 8) {
            for (let x = 0; x < textureSize; x += 8) {
                const formationNoise = (Math.random() - 0.5) * 40;

                // Apply to 8x8 block for large-scale features
                for (let dy = 0; dy < 8; dy++) {
                    for (let dx = 0; dx < 8; dx++) {
                        const idx = ((y + dy) * textureSize + (x + dx)) * 4;
                        if (idx < data.length) {
                            data[idx] = Math.max(0, Math.min(255, data[idx] + formationNoise));
                            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + formationNoise));
                            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + formationNoise));
                        }
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Add MORE craters with varied sizes
        const craterCount = 15 + Math.floor(Math.random() * 25); // More craters
        for (let i = 0; i < craterCount; i++) {
            const x = Math.random() * textureSize;
            const y = Math.random() * textureSize;
            const radius = 3 + Math.random() * 30; // Wider size range

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            const craterDarkness = 40 + Math.random() * 50; // Varied darkness
            gradient.addColorStop(0, `rgba(${craterDarkness}, ${craterDarkness}, ${craterDarkness}, 0.9)`);
            gradient.addColorStop(0.7, `rgba(${craterDarkness + 30}, ${craterDarkness + 30}, ${craterDarkness + 30}, 0.4)`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }

        // Add MORE bright spots (mineral deposits, ice, crystals)
        const spotCount = 10 + Math.floor(Math.random() * 20); // More spots
        for (let i = 0; i < spotCount; i++) {
            const x = Math.random() * textureSize;
            const y = Math.random() * textureSize;
            const radius = 2 + Math.random() * 12; // Varied sizes

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            const spotBrightness = 200 + Math.random() * 55; // Brighter spots
            gradient.addColorStop(0, `rgba(${spotBrightness}, ${spotBrightness}, ${spotBrightness}, 0.7)`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }

        // Add MORE cracks/fissures with varied opacity
        const lineCount = 10 + Math.floor(Math.random() * 20); // More cracks

        for (let i = 0; i < lineCount; i++) {
            const opacity = 0.3 + Math.random() * 0.4; // Varied opacity
            const darkness = 20 + Math.random() * 40;
            ctx.strokeStyle = `rgba(${darkness}, ${darkness}, ${darkness}, ${opacity})`;
            ctx.lineWidth = 0.5 + Math.random() * 2.5; // Varied thickness

            ctx.beginPath();
            const startX = Math.random() * textureSize;
            const startY = Math.random() * textureSize;
            ctx.moveTo(startX, startY);

            // Draw more complex jagged lines
            const segments = 5 + Math.floor(Math.random() * 10); // More segments
            for (let j = 0; j < segments; j++) {
                const x = startX + (Math.random() - 0.5) * 120;
                const y = startY + (Math.random() - 0.5) * 120;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Add small surface details (pebbles, ridges)
        const detailCount = 30 + Math.floor(Math.random() * 50);
        for (let i = 0; i < detailCount; i++) {
            const x = Math.random() * textureSize;
            const y = Math.random() * textureSize;
            const size = 1 + Math.random() * 3;
            const brightness = 100 + Math.random() * 100;

            ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.5)`;
            ctx.fillRect(x, y, size, size);
        }

        texture.update();
        return texture;
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

        // Create hit spark effect blending weapon color with asteroid's actual color
        // Brighten the asteroid color for better spark visibility
        const brightAsteroidColor = new Color3(
            Math.min(1, this.color.r * 1.5),
            Math.min(1, this.color.g * 1.5),
            Math.min(1, this.color.b * 1.5)
        );
        this.explosionEffect.createHitSpark(this.position, weaponColor, brightAsteroidColor);

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
                splitVelocity,
                this.color // Pass parent color to children
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
