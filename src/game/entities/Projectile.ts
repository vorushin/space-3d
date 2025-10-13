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

    private lifetime: number = 5; // seconds
    private age: number = 0;

    constructor(scene: Scene, position: Vector3, direction: Vector3, speed: number, damage: number, owner: string) {
        this.scene = scene;
        this.position = position.clone();
        this.velocity = direction.scale(speed);
        this.damage = damage;
        this.owner = owner;

        this.mesh = this.createProjectileMesh();
        this.mesh.position = position;
    }

    private createProjectileMesh(): Mesh {
        const projectile = MeshBuilder.CreateSphere('projectile', { diameter: 0.3 }, this.scene);

        const material = new StandardMaterial('projectileMaterial', this.scene);

        if (this.owner === 'player' || this.owner === 'turret') {
            this.color = new Color3(0, 1, 0); // Green
            material.emissiveColor = this.color;
        } else {
            this.color = new Color3(1, 0, 0); // Red
            material.emissiveColor = this.color;
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
