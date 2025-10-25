import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';

export class EnemyResourceFragment {
    private scene: Scene;
    public mesh: Mesh;
    public position: Vector3;
    private velocity: Vector3;
    public isCollected: boolean = false;
    public isLost: boolean = false;
    public value: number = 1;

    private playerGravityRange: number = 50; // Increased from 25 - much wider range
    private stationGravityRange: number = 0; // Depends on station level
    private playerGravityConstant: number = 2000; // Increased from 500 - much stronger pull
    private stationGravityConstant: number = 3000; // Increased from 800 - much stronger pull
    private collectDistance: number = 3; // Increased from 2 - easier to collect
    private gameAreaRadius: number = 300; // Boundary of playable area
    private color: Color3;

    constructor(scene: Scene, position: Vector3, color: Color3, value: number = 1) {
        this.scene = scene;
        this.position = position.clone();
        this.color = color;
        this.value = value;

        // Slow random drift velocity (initial explosion effect but slower)
        this.velocity = new Vector3(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3
        );

        this.mesh = this.createFragmentMesh();
        this.mesh.position = position;
    }

    private createFragmentMesh(): Mesh {
        const fragment = MeshBuilder.CreateBox('enemyResource', {
            size: 0.4
        }, this.scene);

        fragment.rotation = new Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        const material = new StandardMaterial('enemyResourceMaterial', this.scene);
        material.diffuseColor = this.color;
        material.emissiveColor = this.color.scale(0.5);
        material.specularColor = new Color3(1, 0.5, 0.5);
        fragment.material = material;

        return fragment;
    }

    public update(deltaTime: number, playerPos: Vector3, stationPos: Vector3, stationGravityRange: number = 0): void {
        this.stationGravityRange = stationGravityRange;

        // Apply constant drift velocity (no damping)
        this.position.addInPlace(this.velocity.scale(deltaTime));

        // Check if outside game area
        const distanceFromOrigin = this.position.length();
        if (distanceFromOrigin > this.gameAreaRadius) {
            this.isLost = true;
            return;
        }

        // Calculate distances
        const toPlayer = playerPos.subtract(this.position);
        const playerDist = toPlayer.length();

        const toStation = stationPos.subtract(this.position);
        const stationDist = toStation.length();

        // Gravitational pull toward player (always active within range)
        // F = G*M/r^2, then a = F/m = G*M/r^2 (mass cancels for acceleration)
        if (playerDist > 0.1 && playerDist < this.playerGravityRange) {
            const accelerationMagnitude = this.playerGravityConstant / (playerDist * playerDist);
            const acceleration = toPlayer.normalize().scale(accelerationMagnitude);
            this.velocity.addInPlace(acceleration.scale(deltaTime));
        }

        // Gravitational pull toward station (only if station has gravity range)
        if (this.stationGravityRange > 0 && stationDist > 0.1 && stationDist < this.stationGravityRange) {
            const accelerationMagnitude = this.stationGravityConstant / (stationDist * stationDist);
            const acceleration = toStation.normalize().scale(accelerationMagnitude);
            this.velocity.addInPlace(acceleration.scale(deltaTime));
        }

        // Update visual
        this.mesh.position = this.position;
        this.mesh.rotation.x += deltaTime * 3;
        this.mesh.rotation.y += deltaTime * 4;

        // Check collection
        if (playerDist < this.collectDistance || stationDist < this.collectDistance) {
            this.isCollected = true;
        }
    }

    public dispose(): void {
        this.mesh.dispose();
    }
}
