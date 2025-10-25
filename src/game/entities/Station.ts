import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, Color4, TransformNode, DynamicTexture } from '@babylonjs/core';
import { Turret } from './Turret';
import { ExplosionEffect } from '../effects/ExplosionEffect';

export class Station {
    private scene: Scene;
    public position: Vector3;
    public rootNode: TransformNode;
    private modules: Mesh[] = [];
    public turrets: Turret[] = [];
    private explosionEffect: ExplosionEffect;

    public health: number = 100;
    public maxHealth: number = 100;
    public level: number = 1;
    private healRate: number = 0; // HP per second
    private resourceGeneration: number = 0; // Resources per second
    private resourceAccumulator: number = 0;
    public gravityRange: number = 0; // Range for resource attraction (0 = no gravity)

    // Health bar
    private healthBarMesh?: Mesh;
    private healthBarVisible: boolean = false;
    private healthBarHideTimer: number = 0;
    private readonly HEALTH_BAR_DISPLAY_TIME = 3; // Show for 3 seconds after damage

    constructor(scene: Scene, position: Vector3, explosionEffect: ExplosionEffect) {
        this.scene = scene;
        this.position = position.clone();
        this.explosionEffect = explosionEffect;

        this.rootNode = new TransformNode('stationRoot', scene);
        this.rootNode.position = position;

        this.createInitialModule();

        // Create health bar (initially hidden)
        this.healthBarMesh = this.createHealthBar();
        this.healthBarMesh.setEnabled(false);
    }

    private createInitialModule(): void {
        const core = MeshBuilder.CreateBox('stationCore', { size: 4 }, this.scene);
        core.parent = this.rootNode;

        const material = new StandardMaterial('stationMaterial', this.scene);
        material.diffuseColor = new Color3(0.7, 0.7, 0.7);
        material.emissiveColor = new Color3(0.1, 0.1, 0.2);
        material.specularColor = new Color3(0.8, 0.8, 0.8);
        core.material = material;

        this.modules.push(core);
    }

    private createHealthBar(): Mesh {
        // Create a larger health bar for the station
        const barWidth = 12;
        const barHeight = 0.8;
        const bar = MeshBuilder.CreatePlane('stationHealthBar', { width: barWidth, height: barHeight }, this.scene);

        // Create dynamic texture for the health bar
        const texture = new DynamicTexture('stationHealthBarTexture', { width: 512, height: 64 }, this.scene);
        const material = new StandardMaterial('stationHealthBarMaterial', this.scene);
        material.diffuseTexture = texture;
        material.emissiveTexture = texture;
        material.disableLighting = true;
        material.backFaceCulling = false;

        bar.material = material;
        bar.billboardMode = Mesh.BILLBOARDMODE_ALL; // Always face camera

        return bar;
    }

    private updateHealthBar(): void {
        if (!this.healthBarMesh) return;

        const healthPercent = Math.max(0, this.health / this.maxHealth);
        const texture = (this.healthBarMesh.material as StandardMaterial).diffuseTexture as DynamicTexture;
        const ctx = texture.getContext();

        // Clear canvas
        ctx.clearRect(0, 0, 512, 64);

        // Background (dark)
        ctx.fillStyle = '#202020';
        ctx.fillRect(0, 0, 512, 64);

        // Health bar (cyan/blue for station)
        const b = Math.floor(200 + 55 * healthPercent);
        const g = Math.floor(150 * healthPercent);
        ctx.fillStyle = `rgb(100, ${g}, ${b})`;
        ctx.fillRect(0, 0, 512 * healthPercent, 64);

        // Border
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, 506, 58);

        // Station text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('STATION', 256, 40);

        texture.update();

        // Position above station
        const offsetY = 10;
        this.healthBarMesh.position = this.position.add(new Vector3(0, offsetY, 0));
    }

    public update(deltaTime: number): void {
        // Auto-heal if upgraded
        if (this.healRate > 0 && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + this.healRate * deltaTime);
        }

        // Generate resources
        if (this.resourceGeneration > 0) {
            this.resourceAccumulator += this.resourceGeneration * deltaTime;
        }

        // Update turrets
        this.turrets.forEach(turret => turret.update(deltaTime));

        // Slow rotation for visual effect
        this.rootNode.rotation.y += 0.1 * deltaTime;

        // Update health bar visibility
        if (this.healthBarVisible && this.healthBarMesh) {
            this.healthBarHideTimer -= deltaTime;
            if (this.healthBarHideTimer <= 0) {
                this.healthBarVisible = false;
                this.healthBarMesh.setEnabled(false);
            } else {
                this.updateHealthBar();
            }
        }
    }

    public upgrade(): void {
        this.level++;
        this.maxHealth += 50;
        this.health = this.maxHealth;

        // Add visual module
        this.addModule();

        // Unlock and upgrade abilities at certain levels
        if (this.level === 1) {
            // Level 1: No gravity
            this.gravityRange = 0;
        }
        if (this.level === 2) {
            this.healRate = 5; // 5 HP per second
            this.gravityRange = 30; // Start pulling resources
        }
        if (this.level === 3) {
            this.resourceGeneration = 2; // 2 resources per second
            this.gravityRange = 40; // Increased range
        }
        if (this.level >= 4) {
            this.healRate = 10;
            this.resourceGeneration = 5;
            this.gravityRange = 50; // Maximum range
        }
    }

    private addModule(): void {
        const angle = (this.modules.length - 1) * (Math.PI * 2 / 6);
        const distance = 5;

        const module = MeshBuilder.CreateBox('stationModule', {
            width: 2,
            height: 2,
            depth: 3
        }, this.scene);

        module.parent = this.rootNode;
        module.position = new Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );
        module.rotation.y = -angle;

        const material = new StandardMaterial('moduleMaterial', this.scene);
        material.diffuseColor = new Color3(0.6, 0.6, 0.7);
        material.emissiveColor = new Color3(0.1, 0.15, 0.2);
        module.material = material;

        this.modules.push(module);
    }

    public addTurret(): void {
        const angle = this.turrets.length * (Math.PI * 2 / 8);
        const distance = 6;
        const position = new Vector3(
            Math.cos(angle) * distance,
            2,
            Math.sin(angle) * distance
        );

        const turret = new Turret(this.scene, position, this.rootNode);
        this.turrets.push(turret);
    }

    public takeDamage(amount: number, weaponColor: Color3): void {
        this.health = Math.max(0, this.health - amount);

        // Show health bar when damaged
        if (this.healthBarMesh && !this.healthBarVisible) {
            this.healthBarVisible = true;
            this.healthBarMesh.setEnabled(true);
        }
        // Reset hide timer
        this.healthBarHideTimer = this.HEALTH_BAR_DISPLAY_TIME;

        // Update health bar immediately
        this.updateHealthBar();

        // Create hit spark effect blending weapon color with station color (gray/white)
        const stationColor = new Color3(0.7, 0.7, 0.8);
        this.explosionEffect.createHitSpark(this.position, weaponColor, stationColor);

        if (this.health <= 0) {
            this.onDestroyed();
        }
    }

    public getCollectedResources(): number {
        const amount = Math.floor(this.resourceAccumulator);
        this.resourceAccumulator -= amount;
        return amount;
    }

    private onDestroyed(): void {
        console.log('Station destroyed! Game Over');
        // TODO: Implement game over logic
    }
}
