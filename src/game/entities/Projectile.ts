import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';

export class Projectile {
    private scene: Scene;
    public mesh: Mesh;
    public position: Vector3;
    private velocity: Vector3;
    public damage: number;
    public isAlive: boolean = true;
    public owner: string; // 'player', 'enemy', or 'turret'
    public color: Color3; // Color of the projectile
    public splashRadius: number = 0; // Splash damage radius
    public penetration: number = 0; // Number of targets it can pass through
    public penetrationCount: number = 0; // Targets already penetrated

    private lifetime: number = 5; // seconds
    private age: number = 0;
    private size: number = 0.3; // Default size

    constructor(
        scene: Scene,
        position: Vector3,
        direction: Vector3,
        speed: number,
        damage: number,
        owner: string,
        color?: Color3,
        size?: number,
        lifetime?: number,
        splashRadius?: number,
        penetration?: number
    ) {
        this.scene = scene;
        this.position = position.clone();
        this.velocity = direction.scale(speed);
        this.damage = damage;
        this.owner = owner;
        this.size = size || 0.3;
        this.lifetime = lifetime || 5;
        this.splashRadius = splashRadius || 0;
        this.penetration = penetration || 0;

        // Use provided color or default based on owner
        if (color) {
            this.color = color;
        } else {
            this.color = (owner === 'player' || owner === 'turret') ? new Color3(0, 1, 0) : new Color3(1, 0, 0);
        }

        this.mesh = this.createProjectileMesh();
        this.mesh.position = position;
    }

    private createProjectileMesh(): Mesh {
        const projectile = MeshBuilder.CreateSphere('projectile', { diameter: this.size * 2 }, this.scene);

        const material = new StandardMaterial('projectileMaterial', this.scene);
        material.emissiveColor = this.color.scale(1.2); // Brighter glow
        material.diffuseColor = this.color;
        material.disableLighting = true; // Make it glow
        material.specularColor = this.color;

        // Extra intensity for large projectiles (heavy weapons)
        if (this.size > 0.3) {
            material.emissiveColor = this.color.scale(1.5);
        }

        // Extreme glow for white/bright bullets (singularity, vortex)
        if (this.color.r > 0.9 && this.color.g > 0.9 && this.color.b > 0.9) {
            material.emissiveColor = this.color.scale(2.0);
        }

        // Extra glow for purple weapons (vortex, plasma)
        if (this.color.r > 0.5 && this.color.b > 0.7 && this.color.g < 0.4) {
            material.emissiveColor = this.color.scale(1.8);
        }

        projectile.material = material;
        return projectile;
    }

    public update(deltaTime: number): void {
        this.age += deltaTime;

        if (this.age >= this.lifetime) {
            this.isAlive = false;
            return;
        }

        this.position.addInPlace(this.velocity.scale(deltaTime));
        this.mesh.position = this.position;

        // Check if too far from origin
        if (this.position.length() > 500) {
            this.isAlive = false;
        }
    }

    public dispose(): void {
        this.mesh.dispose();
    }
}
