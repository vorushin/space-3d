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
        // Level 1: Small central hub sphere - basic command center
        const core = MeshBuilder.CreateSphere('stationCore', { diameter: 3, segments: 12 }, this.scene);
        core.parent = this.rootNode;

        const coreMaterial = new StandardMaterial('stationCoreMaterial', this.scene);
        coreMaterial.diffuseColor = new Color3(0.8, 0.8, 0.9);
        coreMaterial.emissiveColor = new Color3(0.2, 0.3, 0.5); // Moderate blue glow
        coreMaterial.specularColor = new Color3(0.9, 0.9, 1);
        core.material = coreMaterial;

        this.modules.push(core);

        // Add 3 basic light pods
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const radius = 2.5;

            const lightPod = MeshBuilder.CreateSphere('lightPod' + i, { diameter: 0.5, segments: 8 }, this.scene);
            lightPod.parent = this.rootNode;
            lightPod.position = new Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );

            const lightMaterial = new StandardMaterial('lightPodMaterial' + i, this.scene);
            lightMaterial.diffuseColor = new Color3(0.3, 0.6, 1);
            lightMaterial.emissiveColor = new Color3(0.4, 0.7, 0.9);
            lightPod.material = lightMaterial;

            this.modules.push(lightPod);
        }
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

        // Progressive visual upgrades based on level
        if (this.level === 2) {
            this.upgradeToLevel2();
            this.healRate = 5;
            this.gravityRange = 30;
        } else if (this.level === 3) {
            this.upgradeToLevel3();
            this.resourceGeneration = 2;
            this.gravityRange = 40;
        } else if (this.level === 4) {
            this.upgradeToLevel4();
            this.healRate = 10;
            this.resourceGeneration = 5;
            this.gravityRange = 50;
        } else if (this.level > 4) {
            // Level 5+: Add docking modules
            this.addDockingModule();
            this.healRate = 10;
            this.resourceGeneration = 5;
            this.gravityRange = 50;
        }
    }

    private upgradeToLevel2(): void {
        // Scale up core sphere
        const core = this.modules[0];
        core.scaling = new Vector3(1.5, 1.5, 1.5);

        // Increase core brightness
        const coreMat = core.material as StandardMaterial;
        coreMat.emissiveColor = new Color3(0.3, 0.4, 0.6);

        // Add equatorial ring structure
        const ring = MeshBuilder.CreateTorus('stationRing', {
            diameter: 8,
            thickness: 0.6,
            tessellation: 32
        }, this.scene);
        ring.parent = this.rootNode;
        ring.rotation.x = Math.PI / 2;

        const ringMaterial = new StandardMaterial('stationRingMaterial', this.scene);
        ringMaterial.diffuseColor = new Color3(0.7, 0.8, 0.9);
        ringMaterial.emissiveColor = new Color3(0.2, 0.3, 0.5);
        ring.material = ringMaterial;

        this.modules.push(ring);

        // Add 3 more light pods (total 6)
        for (let i = 3; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = 4.5;

            const lightPod = MeshBuilder.CreateSphere('lightPod' + i, { diameter: 0.7, segments: 8 }, this.scene);
            lightPod.parent = this.rootNode;
            lightPod.position = new Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );

            const lightMaterial = new StandardMaterial('lightPodMaterial' + i, this.scene);
            lightMaterial.diffuseColor = new Color3(0.3, 0.6, 1);
            lightMaterial.emissiveColor = new Color3(0.5, 0.8, 1);
            lightPod.material = lightMaterial;

            this.modules.push(lightPod);
        }
    }

    private upgradeToLevel3(): void {
        // Scale up core more
        const core = this.modules[0];
        core.scaling = new Vector3(2, 2, 2);

        // Make core even brighter
        const coreMat = core.material as StandardMaterial;
        coreMat.emissiveColor = new Color3(0.35, 0.45, 0.7);

        // Expand ring
        const ring = this.modules[4]; // Ring was added at level 2
        ring.scaling = new Vector3(1.3, 1.3, 1.3);

        // Add 4 solar panel arrays
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const radius = 7;

            const panel = MeshBuilder.CreateBox('solarPanel' + i, {
                width: 0.2,
                height: 3.5,
                depth: 2.5
            }, this.scene);
            panel.parent = this.rootNode;
            panel.position = new Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            panel.rotation.y = -angle;

            const panelMaterial = new StandardMaterial('solarPanelMaterial' + i, this.scene);
            panelMaterial.diffuseColor = new Color3(0.2, 0.3, 0.5);
            panelMaterial.emissiveColor = new Color3(0.1, 0.2, 0.4);
            panelMaterial.specularColor = new Color3(0.5, 0.6, 0.8);
            panel.material = panelMaterial;

            this.modules.push(panel);
        }
    }

    private upgradeToLevel4(): void {
        // Maximum core size
        const core = this.modules[0];
        core.scaling = new Vector3(2.5, 2.5, 2.5);

        // Maximum brightness
        const coreMat = core.material as StandardMaterial;
        coreMat.emissiveColor = new Color3(0.4, 0.5, 0.8);

        // Add top and bottom antenna spires
        const topSpire = MeshBuilder.CreateCylinder('topSpire', {
            height: 8,
            diameterTop: 0.3,
            diameterBottom: 0.7,
            tessellation: 8
        }, this.scene);
        topSpire.parent = this.rootNode;
        topSpire.position.y = 7;

        const bottomSpire = MeshBuilder.CreateCylinder('bottomSpire', {
            height: 8,
            diameterTop: 0.7,
            diameterBottom: 0.3,
            tessellation: 8
        }, this.scene);
        bottomSpire.parent = this.rootNode;
        bottomSpire.position.y = -7;

        const spireMaterial = new StandardMaterial('spireMaterial', this.scene);
        spireMaterial.diffuseColor = new Color3(0.8, 0.8, 0.9);
        spireMaterial.emissiveColor = new Color3(0.3, 0.5, 0.7);
        spireMaterial.specularColor = new Color3(1, 1, 1);

        topSpire.material = spireMaterial;
        bottomSpire.material = spireMaterial;

        this.modules.push(topSpire);
        this.modules.push(bottomSpire);

        // Antenna tip lights
        const topLight = MeshBuilder.CreateSphere('topLight', { diameter: 1, segments: 8 }, this.scene);
        topLight.parent = this.rootNode;
        topLight.position.y = 11;

        const bottomLight = MeshBuilder.CreateSphere('bottomLight', { diameter: 1, segments: 8 }, this.scene);
        bottomLight.parent = this.rootNode;
        bottomLight.position.y = -11;

        const tipLightMaterial = new StandardMaterial('tipLightMaterial', this.scene);
        tipLightMaterial.diffuseColor = new Color3(1, 0.3, 0.3);
        tipLightMaterial.emissiveColor = new Color3(1, 0.5, 0.5); // Bright red warning lights

        topLight.material = tipLightMaterial;
        bottomLight.material = tipLightMaterial;

        this.modules.push(topLight);
        this.modules.push(bottomLight);
    }

    private addDockingModule(): void {
        // Count docking modules to position them properly (levels 5+)
        const dockingModuleCount = this.level - 4;
        const angle = dockingModuleCount * (Math.PI / 3); // 60 degrees apart
        const distance = 10;

        // Create a docking arm (cylinder + module)
        const arm = MeshBuilder.CreateCylinder('stationArm' + dockingModuleCount, {
            height: 4,
            diameter: 0.5,
            tessellation: 8
        }, this.scene);
        arm.parent = this.rootNode;
        arm.position = new Vector3(
            Math.cos(angle) * (distance - 2),
            0,
            Math.sin(angle) * (distance - 2)
        );
        arm.rotation.z = Math.PI / 2;
        arm.rotation.y = angle;

        const armMaterial = new StandardMaterial('armMaterial' + dockingModuleCount, this.scene);
        armMaterial.diffuseColor = new Color3(0.7, 0.75, 0.8);
        armMaterial.emissiveColor = new Color3(0.2, 0.25, 0.35);
        arm.material = armMaterial;

        this.modules.push(arm);

        // Module pod at the end of the arm
        const module = MeshBuilder.CreateCylinder('stationModule' + dockingModuleCount, {
            height: 3,
            diameter: 2.5,
            tessellation: 16
        }, this.scene);

        module.parent = this.rootNode;
        module.position = new Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );
        module.rotation.x = Math.PI / 2;

        const material = new StandardMaterial('moduleMaterial' + dockingModuleCount, this.scene);
        material.diffuseColor = new Color3(0.8, 0.85, 0.95);
        material.emissiveColor = new Color3(0.25, 0.35, 0.55); // Bright blue-white glow
        material.specularColor = new Color3(0.9, 0.9, 1);
        module.material = material;

        this.modules.push(module);

        // Add a bright light at the tip of the module
        const moduleLight = MeshBuilder.CreateSphere('moduleLight' + dockingModuleCount, {
            diameter: 0.6,
            segments: 8
        }, this.scene);
        moduleLight.parent = this.rootNode;
        moduleLight.position = new Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );
        moduleLight.position.y = 1.8;

        const lightMaterial = new StandardMaterial('moduleLightMaterial' + dockingModuleCount, this.scene);
        lightMaterial.diffuseColor = new Color3(0.4, 0.8, 1);
        lightMaterial.emissiveColor = new Color3(0.6, 1, 1); // Very bright cyan
        moduleLight.material = lightMaterial;

        this.modules.push(moduleLight);
    }

    public addTurret(): void {
        const angle = this.turrets.length * (Math.PI * 2 / 8);
        // Position turrets based on station size - further out at higher levels
        const baseDistance = 7;
        const scaledDistance = baseDistance + (this.level * 0.5);
        const position = new Vector3(
            Math.cos(angle) * scaledDistance,
            2.5,
            Math.sin(angle) * scaledDistance
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
