import { Scene, Vector3, ParticleSystem, Color4, Texture, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';

export class ExplosionEffect {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    // Small hit spark effect - blends weapon color with target color
    public createHitSpark(position: Vector3, weaponColor: Color3, targetColor: Color3): void {
        // Create multiple small glowing spheres that expand and fade
        const sparkCount = 20;
        for (let i = 0; i < sparkCount; i++) {
            const spark = MeshBuilder.CreateSphere(`spark_${Date.now()}_${i}`, {
                diameter: 0.3
            }, this.scene);

            spark.position = position.clone();

            // Blend weapon and target colors (50/50 mix with slight brightness boost)
            const blendedColor = new Color3(
                (weaponColor.r + targetColor.r) * 0.6,
                (weaponColor.g + targetColor.g) * 0.6,
                (weaponColor.b + targetColor.b) * 0.6
            );

            // Create bright emissive material with blended color
            const material = new StandardMaterial(`sparkMat_${Date.now()}_${i}`, this.scene);
            material.emissiveColor = blendedColor;
            material.disableLighting = true;
            spark.material = material;

            // Random velocity
            const velocity = new Vector3(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15
            );

            // Animate
            let life = 0;
            const maxLife = 0.4;
            const observer = this.scene.onBeforeRenderObservable.add(() => {
                life += this.scene.getEngine().getDeltaTime() / 1000;

                if (life < maxLife) {
                    spark.position.addInPlace(velocity.scale(0.016));
                    const scale = 1 - (life / maxLife);
                    spark.scaling.setAll(scale);
                } else {
                    this.scene.onBeforeRenderObservable.remove(observer);
                    spark.dispose();
                }
            });
        }
    }

    // Medium explosion for ship destruction
    public createExplosion(position: Vector3, color: Color4, size: number = 1): void {
        // Create mesh-based explosion particles (more visible than texture-based)
        const particleCount = Math.floor(15 * Math.min(size, 2)); // Cap particles for performance

        for (let i = 0; i < particleCount; i++) {
            const particle = MeshBuilder.CreateSphere(`explosion_${Date.now()}_${i}`, {
                diameter: 0.4 * size + Math.random() * 0.6 * size
            }, this.scene);

            particle.position = position.clone();

            // Create bright emissive material with explosion color
            const material = new StandardMaterial(`explosionMat_${Date.now()}_${i}`, this.scene);
            material.emissiveColor = new Color3(color.r, color.g, color.b);
            material.disableLighting = true;
            particle.material = material;

            // Random explosive velocity (outward burst)
            const velocity = new Vector3(
                (Math.random() - 0.5) * 30 * size,
                (Math.random() - 0.5) * 30 * size,
                (Math.random() - 0.5) * 30 * size
            );

            // Animate
            let life = 0;
            const maxLife = 0.5 + Math.random() * 0.3;
            const observer = this.scene.onBeforeRenderObservable.add(() => {
                const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
                life += deltaTime;

                if (life < maxLife) {
                    // Move particle
                    particle.position.addInPlace(velocity.scale(deltaTime));
                    // Fade out and shrink
                    const progress = life / maxLife;
                    const scale = 1 - progress;
                    particle.scaling.setAll(scale);
                    // Dim the color
                    material.emissiveColor = new Color3(
                        color.r * (1 - progress * 0.7),
                        color.g * (1 - progress * 0.7),
                        color.b * (1 - progress * 0.7)
                    );
                } else {
                    this.scene.onBeforeRenderObservable.remove(observer);
                    particle.dispose();
                }
            });
        }
    }

    // Large explosion for capital ships
    public createLargeExplosion(position: Vector3, color: Color4): void {
        // Create multiple explosion waves
        this.createExplosion(position, color, 2);

        setTimeout(() => {
            const offset1 = new Vector3(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3
            );
            this.createExplosion(position.add(offset1), color, 1.5);
        }, 150);

        setTimeout(() => {
            const offset2 = new Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4
            );
            this.createExplosion(position.add(offset2), color, 1.5);
        }, 300);
    }

    // Asteroid destruction - debris effect
    public createDebrisExplosion(position: Vector3): void {
        const particleSystem = new ParticleSystem('debris', 80, this.scene);

        particleSystem.particleTexture = null;

        particleSystem.emitter = position;
        particleSystem.minEmitBox = new Vector3(-0.5, -0.5, -0.5);
        particleSystem.maxEmitBox = new Vector3(0.5, 0.5, 0.5);

        // Rock colors - brown/gray
        particleSystem.color1 = new Color4(0.6, 0.5, 0.4, 1);
        particleSystem.color2 = new Color4(0.4, 0.3, 0.2, 1);
        particleSystem.colorDead = new Color4(0.2, 0.2, 0.2, 0);

        // Size
        particleSystem.minSize = 0.2;
        particleSystem.maxSize = 0.6;

        // Life time
        particleSystem.minLifeTime = 0.4;
        particleSystem.maxLifeTime = 1.0;

        // Emission
        particleSystem.emitRate = 300;
        particleSystem.manualEmitCount = 80;

        // Speed
        particleSystem.minEmitPower = 8;
        particleSystem.maxEmitPower = 15;
        particleSystem.updateSpeed = 0.01;

        // Gravity
        particleSystem.gravity = new Vector3(0, -1, 0);

        // Start and stop
        particleSystem.start();

        setTimeout(() => {
            particleSystem.stop();
            setTimeout(() => particleSystem.dispose(), 1200);
        }, 100);
    }
}
