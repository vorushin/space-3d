import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';

export class ResourceFragment {
    private scene: Scene;
    public mesh: Mesh;
    public position: Vector3;
    private velocity: Vector3;
    public isCollected: boolean = false;
    public isLost: boolean = false;
    public value: number = 1;

    private playerGravityRange: number = 25; // Always active for player
    private stationGravityRange: number = 0; // Depends on station level
    private playerGravityConstant: number = 500; // G * M for player (larger mass)
    private stationGravityConstant: number = 800; // G * M for station (even larger mass)
    private collectDistance: number = 2;
    private gameAreaRadius: number = 300; // Boundary of playable area

    constructor(scene: Scene, position: Vector3) {
        this.scene = scene;
        this.position = position.clone();

        // Slow random drift velocity (reduced from original)
        this.velocity = new Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );

        this.mesh = this.createFragmentMesh();
        this.mesh.position = position;
    }

    private createFragmentMesh(): Mesh {
        const fragment = MeshBuilder.CreateBox('resource', {
            size: 0.5
        }, this.scene);

        fragment.rotation = new Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        const material = new StandardMaterial('resourceMaterial', this.scene);
        material.diffuseColor = new Color3(0, 0.8, 1);
        material.emissiveColor = new Color3(0, 0.4, 0.5);
        material.specularColor = new Color3(1, 1, 1);
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
        this.mesh.rotation.x += deltaTime * 2;
        this.mesh.rotation.y += deltaTime * 3;

        // Check collection
        if (playerDist < this.collectDistance || stationDist < this.collectDistance) {
            this.isCollected = true;
        }
    }

    public dispose(): void {
        this.mesh.dispose();
    }
}
