import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, Color4, DynamicTexture } from '@babylonjs/core';
import { Player } from './Player';
import { Station } from './Station';
import { Projectile } from './Projectile';
import { EnemyResourceFragment } from './EnemyResourceFragment';
import { ExplosionEffect } from '../effects/ExplosionEffect';
import type { Squad } from './Squad';

export type EnemyType = 'scout' | 'fighter' | 'heavy' | 'destroyer' | 'cruiser' | 'battleship' | 'dreadnought' | 'titan';

export class Enemy {
    private scene: Scene;
    public mesh: Mesh;
    public position: Vector3;
    private velocity: Vector3;
    private target: 'player' | 'station';
    private player: Player;
    private station: Station;
    private explosionEffect: ExplosionEffect;

    // Squad coordination
    public squad: Squad | null = null;
    public formationTarget: Vector3 | null = null;
    public inFormation: boolean = false;
    public combatTarget: Vector3 | null = null;

    public health: number = 30;
    public maxHealth: number = 30;
    private speed: number = 15;
    private collisionDamage: number = 10;
    public isAlive: boolean = true;
    public resourceValue: number = 5;

    // Ship type and size
    public type: EnemyType;
    private size: number = 1;

    // Weapon system
    public projectiles: Projectile[] = [];
    private canShoot: boolean = false;
    private weaponDamage: number = 0;
    private fireRate: number = 2; // Seconds between shots
    private shootCooldown: number = 0;
    private shootRange: number = 60;
    private weaponAccuracy: number = 0.95; // 1.0 = perfect

    // Movement AI state
    private strafeDirection: number = 1; // 1 or -1
    private strafeChangeTimer: number = 0;
    private strafeChangeDuration: number = 2; // Change strafe direction every 2 seconds

    // Health bar
    private healthBarMesh?: Mesh;
    private healthBarVisible: boolean = false;
    private healthBarHideTimer: number = 0;
    private readonly HEALTH_BAR_DISPLAY_TIME = 3; // Show for 3 seconds after damage

    constructor(scene: Scene, position: Vector3, player: Player, station: Station, explosionEffect: ExplosionEffect, difficulty: number = 1, type?: EnemyType) {
        this.scene = scene;
        this.position = position.clone();
        this.player = player;
        this.station = station;
        this.explosionEffect = explosionEffect;

        // Randomly select type if not specified
        this.type = type || this.selectRandomType(difficulty);

        // Randomly target player or station
        this.target = Math.random() > 0.5 ? 'player' : 'station';

        // Configure stats based on type and difficulty
        this.configureByType(difficulty);

        this.mesh = this.createEnemyMesh();
        this.mesh.position = position;
        this.velocity = Vector3.Zero();

        // Create health bar (initially hidden)
        this.healthBarMesh = this.createHealthBar();
        this.healthBarMesh.setEnabled(false);
    }

    private selectRandomType(difficulty: number): EnemyType {
        const roll = Math.random();

        // More dangerous types appear earlier and more frequently as player upgrades
        if (difficulty < 1.2) {
            // Early game: scouts and fighters (50/50)
            return roll > 0.5 ? 'scout' : 'fighter';
        } else if (difficulty < 1.5) {
            // Early-mid: introduce heavies early (scouts/fighters/heavies)
            if (roll < 0.25) return 'scout';
            if (roll < 0.55) return 'fighter';
            return 'heavy';
        } else if (difficulty < 2.0) {
            // Mid-early: more heavies, introduce destroyers (fighter/heavy/destroyer)
            if (roll < 0.25) return 'fighter';
            if (roll < 0.6) return 'heavy';
            return 'destroyer';
        } else if (difficulty < 2.5) {
            // Mid: introduce cruisers (heavy/destroyer/cruiser)
            if (roll < 0.3) return 'heavy';
            if (roll < 0.65) return 'destroyer';
            return 'cruiser';
        } else if (difficulty < 3.5) {
            // Mid-late: introduce battleships (destroyer/cruiser/battleship)
            if (roll < 0.25) return 'destroyer';
            if (roll < 0.6) return 'cruiser';
            return 'battleship';
        } else if (difficulty < 5.0) {
            // Late: introduce dreadnoughts (cruiser/battleship/dreadnought)
            if (roll < 0.25) return 'cruiser';
            if (roll < 0.6) return 'battleship';
            return 'dreadnought';
        } else if (difficulty < 7.0) {
            // Very late: introduce titans (battleship/dreadnought/titan)
            if (roll < 0.3) return 'battleship';
            if (roll < 0.7) return 'dreadnought';
            return 'titan';
        } else {
            // End game: mostly capital ships (dreadnought/titan dominant)
            if (roll < 0.4) return 'dreadnought';
            return 'titan';
        }
    }

    private configureByType(difficulty: number): void {
        switch (this.type) {
            case 'scout':
                // Fast, weak, light weapons - bigger for better visibility
                this.size = 1.5;
                this.health = 20 * difficulty;
                this.speed = 25 + (difficulty * 3);
                this.collisionDamage = 5 * difficulty;
                this.resourceValue = Math.floor(3 * difficulty);
                this.canShoot = true;
                this.weaponDamage = 5 * difficulty;
                this.fireRate = 1.5;
                this.weaponAccuracy = 0.7;
                this.shootRange = 50;
                break;

            case 'fighter':
                // Balanced, light weapons - bigger
                this.size = 1.8;
                this.health = 40 * difficulty;
                this.speed = 18 + (difficulty * 2);
                this.collisionDamage = 10 * difficulty;
                this.resourceValue = Math.floor(7 * difficulty);
                this.canShoot = true;
                this.weaponDamage = 8 * difficulty;
                this.fireRate = 2;
                this.weaponAccuracy = 0.85;
                break;

            case 'heavy':
                // Slow, tanky, medium weapons - bigger
                this.size = 2.2;
                this.health = 80 * difficulty;
                this.speed = 12 + (difficulty * 1.5);
                this.collisionDamage = 20 * difficulty;
                this.resourceValue = Math.floor(12 * difficulty);
                this.canShoot = true;
                this.weaponDamage = 15 * difficulty;
                this.fireRate = 2.5;
                this.weaponAccuracy = 0.75;
                break;

            case 'destroyer':
                // Very slow, heavily armored, powerful weapons
                this.size = 1.8;
                this.health = 150 * difficulty;
                this.speed = 8 + difficulty;
                this.collisionDamage = 30 * difficulty;
                this.resourceValue = Math.floor(20 * difficulty);
                this.canShoot = true;
                this.weaponDamage = 25 * difficulty;
                this.fireRate = 1.5;
                this.shootRange = 80;
                this.weaponAccuracy = 0.9;
                break;

            case 'cruiser':
                // Large capital ship - balanced powerhouse
                this.size = 2.2;
                this.health = 300 * difficulty;
                this.speed = 6 + difficulty * 0.8;
                this.collisionDamage = 50 * difficulty;
                this.resourceValue = Math.floor(35 * difficulty);
                this.canShoot = true;
                this.weaponDamage = 40 * difficulty;
                this.fireRate = 1.2;
                this.shootRange = 90;
                this.weaponAccuracy = 0.92;
                break;

            case 'battleship':
                // Massive warship - slow but devastating
                this.size = 2.6;
                this.health = 600 * difficulty;
                this.speed = 4 + difficulty * 0.5;
                this.collisionDamage = 80 * difficulty;
                this.resourceValue = Math.floor(60 * difficulty);
                this.canShoot = true;
                this.weaponDamage = 70 * difficulty;
                this.fireRate = 1.0;
                this.shootRange = 100;
                this.weaponAccuracy = 0.94;
                break;

            case 'dreadnought':
                // Colossal fortress - massive enemy
                this.size = 3.0;
                this.health = 1200 * difficulty;
                this.speed = 3 + difficulty * 0.3;
                this.collisionDamage = 150 * difficulty;
                this.resourceValue = Math.floor(100 * difficulty);
                this.canShoot = true;
                this.weaponDamage = 120 * difficulty;
                this.fireRate = 0.8;
                this.shootRange = 120;
                this.weaponAccuracy = 0.96;
                break;

            case 'titan':
                // Apocalyptic mega-fortress - large but manageable
                this.size = 3.5;
                this.health = 3000 * difficulty;
                this.speed = 2 + difficulty * 0.2;
                this.collisionDamage = 300 * difficulty;
                this.resourceValue = Math.floor(250 * difficulty);
                this.canShoot = true;
                this.weaponDamage = 200 * difficulty;
                this.fireRate = 0.6;
                this.shootRange = 150;
                this.weaponAccuracy = 0.98;
                break;
        }

        this.maxHealth = this.health;
    }

    private createEnemyMesh(): Mesh {
        let shipRoot: Mesh;

        // Create different ship shapes based on type
        switch (this.type) {
            case 'scout':
                shipRoot = this.createScoutShip();
                break;
            case 'fighter':
                shipRoot = this.createFighterShip();
                break;
            case 'heavy':
                shipRoot = this.createHeavyShip();
                break;
            case 'destroyer':
                shipRoot = this.createDestroyerShip();
                break;
            case 'cruiser':
                shipRoot = this.createCruiserShip();
                break;
            case 'battleship':
                shipRoot = this.createBattleshipShip();
                break;
            case 'dreadnought':
                shipRoot = this.createDreadnoughtShip();
                break;
            case 'titan':
                shipRoot = this.createTitanShip();
                break;
            default:
                shipRoot = MeshBuilder.CreateIcoSphere('enemy', { radius: this.size, subdivisions: 1 }, this.scene);
        }

        // IMPORTANT: Apply scaling to match player ship scale
        // Problem: Mesh functions use different multipliers (scout uses ~2.5x, titan uses ~10x)
        // Solution: Scale inversely with size, but with a gentler curve to keep small ships visible
        // Formula: scale = 1.0 / (size^0.7) gives good balance across all sizes
        // Scout (1.5): 1.0 / 1.5^0.7 = 0.77 scale
        // Heavy (2.2): 1.0 / 2.2^0.7 = 0.59 scale
        // Titan (3.5): 1.0 / 3.5^0.7 = 0.43 scale
        const scaleFactor = 1.0 / Math.pow(this.size, 0.7);
        shipRoot.scaling.setAll(scaleFactor);

        const material = new StandardMaterial('enemyMaterial', this.scene);

        // Different colors based on type - darker and more menacing for bigger ships
        switch (this.type) {
            case 'scout':
                material.diffuseColor = new Color3(1, 0.5, 0.3);
                material.emissiveColor = new Color3(0.4, 0.2, 0);
                break;
            case 'fighter':
                material.diffuseColor = new Color3(1, 0.2, 0.2);
                material.emissiveColor = new Color3(0.5, 0, 0);
                break;
            case 'heavy':
                material.diffuseColor = new Color3(0.8, 0.1, 0.3);
                material.emissiveColor = new Color3(0.4, 0, 0.1);
                break;
            case 'destroyer':
                material.diffuseColor = new Color3(0.6, 0, 0.2);
                material.emissiveColor = new Color3(0.3, 0, 0.1);
                break;
            case 'cruiser':
                material.diffuseColor = new Color3(0.5, 0, 0.3);
                material.emissiveColor = new Color3(0.25, 0, 0.15);
                break;
            case 'battleship':
                material.diffuseColor = new Color3(0.4, 0, 0.4);
                material.emissiveColor = new Color3(0.2, 0, 0.2);
                break;
            case 'dreadnought':
                material.diffuseColor = new Color3(0.3, 0, 0.5);
                material.emissiveColor = new Color3(0.15, 0, 0.25);
                break;
            case 'titan':
                material.diffuseColor = new Color3(0.2, 0, 0.6);
                material.emissiveColor = new Color3(0.1, 0, 0.35);
                break;
        }

        material.specularColor = new Color3(1, 0.5, 0.5);

        // Apply material to root and all children
        shipRoot.material = material;
        shipRoot.getChildMeshes().forEach(child => {
            child.material = material;
        });

        return shipRoot;
    }


    private createScoutShip(): Mesh {
        // Fast interceptor - sleek dart shape
        const root = new Mesh('scoutRoot', this.scene);

        // Pointed nose cone
        const nose = MeshBuilder.CreateCylinder('scoutNose', {
            diameterTop: 0,
            diameterBottom: 0.5 * this.size,
            height: 1.2 * this.size,
            tessellation: 6
        }, this.scene);
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 1.3 * this.size;
        nose.parent = root;

        // Main body - streamlined
        const body = MeshBuilder.CreateBox('scoutBody', {
            width: 0.6 * this.size,
            height: 0.4 * this.size,
            depth: 1.5 * this.size
        }, this.scene);
        body.position.z = 0.3 * this.size;
        body.parent = root;

        // Cockpit canopy
        const canopy = MeshBuilder.CreateSphere('scoutCanopy', {
            diameter: 0.4 * this.size,
            segments: 8
        }, this.scene);
        canopy.position.set(0, 0.3 * this.size, 0.6 * this.size);
        canopy.scaling.set(0.8, 0.6, 1.2);
        canopy.parent = root;

        // Thin wings
        const wingL = MeshBuilder.CreateBox('wingL', {
            width: 0.8 * this.size,
            height: 0.05 * this.size,
            depth: 0.6 * this.size
        }, this.scene);
        wingL.position.set(-0.5 * this.size, 0, 0);
        wingL.parent = root;

        const wingR = MeshBuilder.CreateBox('wingR', {
            width: 0.8 * this.size,
            height: 0.05 * this.size,
            depth: 0.6 * this.size
        }, this.scene);
        wingR.position.set(0.5 * this.size, 0, 0);
        wingR.parent = root;

        // Twin engines
        const engineL = MeshBuilder.CreateCylinder('engineL', {
            diameter: 0.25 * this.size,
            height: 0.6 * this.size
        }, this.scene);
        engineL.position.set(-0.3 * this.size, 0, -0.6 * this.size);
        engineL.rotation.x = Math.PI / 2;
        engineL.parent = root;

        const engineR = MeshBuilder.CreateCylinder('engineR', {
            diameter: 0.25 * this.size,
            height: 0.6 * this.size
        }, this.scene);
        engineR.position.set(0.3 * this.size, 0, -0.6 * this.size);
        engineR.rotation.x = Math.PI / 2;
        engineR.parent = root;

        return root;
    }

    private createFighterShip(): Mesh {
        // X-wing style space superiority fighter
        const root = new Mesh('fighterRoot', this.scene);

        // Central fuselage - cylindrical
        const fuselage = MeshBuilder.CreateCylinder('fighterFuselage', {
            diameter: 0.5 * this.size,
            height: 2 * this.size,
            tessellation: 8
        }, this.scene);
        fuselage.rotation.x = Math.PI / 2;
        fuselage.parent = root;

        // Nose
        const nose = MeshBuilder.CreateCylinder('fighterNose', {
            diameterTop: 0,
            diameterBottom: 0.5 * this.size,
            height: 0.8 * this.size,
            tessellation: 8
        }, this.scene);
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 1.4 * this.size;
        nose.parent = root;

        // Cockpit bulge
        const cockpit = MeshBuilder.CreateSphere('fighterCockpit', {
            diameter: 0.5 * this.size,
            segments: 8
        }, this.scene);
        cockpit.position.set(0, 0.3 * this.size, 0.4 * this.size);
        cockpit.scaling.set(0.9, 0.7, 1.3);
        cockpit.parent = root;

        // Four wings (X configuration)
        const wingConfigs = [
            { x: -0.6, y: 0.4 },
            { x: 0.6, y: 0.4 },
            { x: -0.6, y: -0.4 },
            { x: 0.6, y: -0.4 }
        ];

        wingConfigs.forEach((config, i) => {
            const wing = MeshBuilder.CreateBox(`wing${i}`, {
                width: 0.8 * this.size,
                height: 0.08 * this.size,
                depth: 1 * this.size
            }, this.scene);
            wing.position.set(config.x * this.size, config.y * this.size, -0.3 * this.size);
            wing.parent = root;

            // Engine pod on each wing
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 0.3 * this.size,
                height: 0.7 * this.size
            }, this.scene);
            engine.position.set(config.x * this.size, config.y * this.size, -0.9 * this.size);
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;
        });

        return root;
    }

    private createHeavyShip(): Mesh {
        // Corvette-class gunship - blocky and armored
        const root = new Mesh('heavyRoot', this.scene);

        // Central hull - rectangular core
        const hull = MeshBuilder.CreateBox('heavyHull', {
            width: 1.2 * this.size,
            height: 0.8 * this.size,
            depth: 2.5 * this.size
        }, this.scene);
        hull.parent = root;

        // Armored prow
        const prow = MeshBuilder.CreateBox('heavyProw', {
            width: 1 * this.size,
            height: 0.6 * this.size,
            depth: 0.8 * this.size
        }, this.scene);
        prow.position.z = 1.65 * this.size;
        prow.parent = root;

        // Command bridge on top
        const bridge = MeshBuilder.CreateBox('heavyBridge', {
            width: 0.8 * this.size,
            height: 0.5 * this.size,
            depth: 0.8 * this.size
        }, this.scene);
        bridge.position.set(0, 0.65 * this.size, 0.4 * this.size);
        bridge.parent = root;

        // Side weapon pods
        const podL = MeshBuilder.CreateBox('podL', {
            width: 0.4 * this.size,
            height: 0.5 * this.size,
            depth: 1.8 * this.size
        }, this.scene);
        podL.position.set(-0.8 * this.size, 0, 0);
        podL.parent = root;

        const podR = MeshBuilder.CreateBox('podR', {
            width: 0.4 * this.size,
            height: 0.5 * this.size,
            depth: 1.8 * this.size
        }, this.scene);
        podR.position.set(0.8 * this.size, 0, 0);
        podR.parent = root;

        // Four engines in square formation
        for (let i = 0; i < 4; i++) {
            const x = (i % 2 === 0 ? -0.5 : 0.5) * this.size;
            const y = (i < 2 ? -0.3 : 0.3) * this.size;

            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 0.4 * this.size,
                height: 0.6 * this.size
            }, this.scene);
            engine.position.set(x, y, -1.5 * this.size);
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;
        }

        // Gun turrets on top
        const turretF = MeshBuilder.CreateSphere('turretF', {
            diameter: 0.4 * this.size
        }, this.scene);
        turretF.position.set(0, 0.6 * this.size, 0.8 * this.size);
        turretF.parent = root;

        const turretR = MeshBuilder.CreateSphere('turretR', {
            diameter: 0.4 * this.size
        }, this.scene);
        turretR.position.set(0, 0.6 * this.size, -0.5 * this.size);
        turretR.parent = root;

        return root;
    }

    private createDestroyerShip(): Mesh {
        // Frigate-class destroyer - sleek capital ship
        const root = new Mesh('destroyerRoot', this.scene);

        // Main hull - elongated hexagonal prism
        const hull = MeshBuilder.CreateCylinder('destroyerHull', {
            diameter: 1 * this.size,
            height: 3 * this.size,
            tessellation: 6
        }, this.scene);
        hull.rotation.x = Math.PI / 2;
        hull.parent = root;

        // Tapered nose
        const nose = MeshBuilder.CreateCylinder('destroyerNose', {
            diameterTop: 0,
            diameterBottom: 1 * this.size,
            height: 1 * this.size,
            tessellation: 6
        }, this.scene);
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 2 * this.size;
        nose.parent = root;

        // Bridge superstructure
        const bridge = MeshBuilder.CreateBox('destroyerBridge', {
            width: 0.7 * this.size,
            height: 0.6 * this.size,
            depth: 0.9 * this.size
        }, this.scene);
        bridge.position.set(0, 0.8 * this.size, 0.5 * this.size);
        bridge.parent = root;

        // Side weapon nacelles
        const nacelleL = MeshBuilder.CreateBox('nacelleL', {
            width: 0.3 * this.size,
            height: 0.5 * this.size,
            depth: 2.2 * this.size
        }, this.scene);
        nacelleL.position.set(-0.65 * this.size, 0, 0);
        nacelleL.parent = root;

        const nacelleR = MeshBuilder.CreateBox('nacelleR', {
            width: 0.3 * this.size,
            height: 0.5 * this.size,
            depth: 2.2 * this.size
        }, this.scene);
        nacelleR.position.set(0.65 * this.size, 0, 0);
        nacelleR.parent = root;

        // Main engine cluster (3 engines)
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const radius = 0.4 * this.size;
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 0.4 * this.size,
                height: 0.7 * this.size
            }, this.scene);
            engine.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                -1.8 * this.size
            );
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;
        }

        // Weapon turrets
        const turretPositions = [
            { x: 0, y: 0.7, z: 1 },
            { x: -0.6, y: 0.3, z: 0 },
            { x: 0.6, y: 0.3, z: 0 }
        ];

        turretPositions.forEach((pos, i) => {
            const turret = MeshBuilder.CreateSphere(`turret${i}`, {
                diameter: 0.35 * this.size
            }, this.scene);
            turret.position.set(pos.x * this.size, pos.y * this.size, pos.z * this.size);
            turret.parent = root;
        });

        return root;
    }

    private createCruiserShip(): Mesh {
        // Heavy cruiser - powerful wedge-shaped warship
        const root = new Mesh('cruiserRoot', this.scene);

        // Main hull - wedge shape front to back
        const hull = MeshBuilder.CreateBox('cruiserHull', {
            width: 1.5 * this.size,
            height: 1 * this.size,
            depth: 4 * this.size
        }, this.scene);
        hull.parent = root;

        // Tapered nose
        const nose = MeshBuilder.CreateCylinder('cruiserNose', {
            diameterTop: 0,
            diameterBottom: 1.5 * this.size,
            height: 1.2 * this.size,
            tessellation: 6
        }, this.scene);
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 2.6 * this.size;
        nose.parent = root;

        // Bridge tower (moderate height)
        const bridge = MeshBuilder.CreateBox('cruiserBridge', {
            width: 1 * this.size,
            height: 0.8 * this.size,
            depth: 1.2 * this.size
        }, this.scene);
        bridge.position.set(0, 0.9 * this.size, 0.6 * this.size);
        bridge.parent = root;

        // Side sponsons with turrets
        for (let side = -1; side <= 1; side += 2) {
            const sponson = MeshBuilder.CreateBox(`sponson${side}`, {
                width: 0.5 * this.size,
                height: 0.7 * this.size,
                depth: 3 * this.size
            }, this.scene);
            sponson.position.set(side * 1 * this.size, -0.2 * this.size, 0);
            sponson.parent = root;

            // Turrets on sponsons
            const turret = MeshBuilder.CreateSphere(`turret${side}`, {
                diameter: 0.5 * this.size
            }, this.scene);
            turret.position.set(side * 1 * this.size, 0.5 * this.size, 0.5 * this.size);
            turret.parent = root;
        }

        // Engine cluster (6 engines)
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = 0.6 * this.size;
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 0.5 * this.size,
                height: 0.8 * this.size
            }, this.scene);
            engine.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                -2.3 * this.size
            );
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;
        }

        return root;
    }

    private createBattleshipShip(): Mesh {
        // Battleship - large capital ship with layered structure
        const root = new Mesh('battleshipRoot', this.scene);

        // Main hull - large rectangular body
        const hull = MeshBuilder.CreateBox('battleshipHull', {
            width: 2 * this.size,
            height: 1.2 * this.size,
            depth: 5 * this.size
        }, this.scene);
        hull.parent = root;

        // Nose section
        const nose = MeshBuilder.CreateCylinder('battleshipNose', {
            diameterTop: 0.5 * this.size,
            diameterBottom: 2 * this.size,
            height: 1.5 * this.size,
            tessellation: 6
        }, this.scene);
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 3.25 * this.size;
        nose.parent = root;

        // Bridge tower (2-level)
        const bridgeBase = MeshBuilder.CreateBox('bridgeBase', {
            width: 1.3 * this.size,
            height: 0.7 * this.size,
            depth: 1.5 * this.size
        }, this.scene);
        bridgeBase.position.set(0, 0.95 * this.size, 0.8 * this.size);
        bridgeBase.parent = root;

        const bridgeTop = MeshBuilder.CreateBox('bridgeTop', {
            width: 1 * this.size,
            height: 0.6 * this.size,
            depth: 1.2 * this.size
        }, this.scene);
        bridgeTop.position.set(0, 1.6 * this.size, 0.8 * this.size);
        bridgeTop.parent = root;

        // Heavy turrets (4 main turrets)
        const turretPositions = [
            { x: 0, y: 0.9, z: 1.8 },
            { x: -0.9, y: 0.5, z: 0 },
            { x: 0.9, y: 0.5, z: 0 },
            { x: 0, y: 0.9, z: -1.5 }
        ];

        turretPositions.forEach((pos, i) => {
            const turret = MeshBuilder.CreateSphere(`turret${i}`, {
                diameter: 0.7 * this.size
            }, this.scene);
            turret.position.set(pos.x * this.size, pos.y * this.size, pos.z * this.size);
            turret.parent = root;
        });

        // Engine array (9 engines in 3x3 grid)
        for (let i = 0; i < 9; i++) {
            const x = (i % 3 - 1) * 0.8 * this.size;
            const y = (Math.floor(i / 3) - 1) * 0.8 * this.size;
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 0.6 * this.size,
                height: 1 * this.size
            }, this.scene);
            engine.position.set(x, y, -3 * this.size);
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;
        }

        return root;
    }

    private createDreadnoughtShip(): Mesh {
        // Dreadnought - massive fortress ship
        const root = new Mesh('dreadnoughtRoot', this.scene);

        // Main hull - very large rectangular core
        const hull = MeshBuilder.CreateBox('dreadnoughtHull', {
            width: 2.5 * this.size,
            height: 1.5 * this.size,
            depth: 6 * this.size
        }, this.scene);
        hull.parent = root;

        // Armored prow
        const prow = MeshBuilder.CreateBox('dreadnoughtProw', {
            width: 2 * this.size,
            height: 1.2 * this.size,
            depth: 1.5 * this.size
        }, this.scene);
        prow.position.z = 3.75 * this.size;
        prow.parent = root;

        // Bridge tower (3-level)
        for (let i = 0; i < 3; i++) {
            const width = (1.5 - i * 0.2) * this.size;
            const tower = MeshBuilder.CreateBox(`tower${i}`, {
                width: width,
                height: 0.6 * this.size,
                depth: 1.3 * this.size
            }, this.scene);
            tower.position.set(0, (1.05 + i * 0.7) * this.size, 1 * this.size);
            tower.parent = root;
        }

        // Side weapon batteries
        for (let side = -1; side <= 1; side += 2) {
            const battery = MeshBuilder.CreateBox(`battery${side}`, {
                width: 0.6 * this.size,
                height: 1 * this.size,
                depth: 4.5 * this.size
            }, this.scene);
            battery.position.set(side * 1.5 * this.size, 0, 0);
            battery.parent = root;

            // Turrets on batteries
            for (let i = 0; i < 3; i++) {
                const turret = MeshBuilder.CreateSphere(`turret${side}_${i}`, {
                    diameter: 0.6 * this.size
                }, this.scene);
                turret.position.set(
                    side * 1.5 * this.size,
                    0.8 * this.size,
                    (i - 1) * 1.8 * this.size
                );
                turret.parent = root;
            }
        }

        // Engine array (12 engines in 4x3 grid)
        for (let i = 0; i < 12; i++) {
            const x = (i % 4 - 1.5) * 0.7 * this.size;
            const y = (Math.floor(i / 4) - 1) * 0.7 * this.size;
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 0.6 * this.size,
                height: 1.2 * this.size
            }, this.scene);
            engine.position.set(x, y, -3.5 * this.size);
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;
        }

        return root;
    }

    private createTitanShip(): Mesh {
        // Titan - ultimate capital ship, largest and most powerful
        const root = new Mesh('titanRoot', this.scene);

        // Main hull - massive rectangular core
        const hull = MeshBuilder.CreateBox('titanHull', {
            width: 3 * this.size,
            height: 1.8 * this.size,
            depth: 7 * this.size
        }, this.scene);
        hull.parent = root;

        // Armored prow section
        const prow = MeshBuilder.CreateBox('titanProw', {
            width: 2.5 * this.size,
            height: 1.5 * this.size,
            depth: 2 * this.size
        }, this.scene);
        prow.position.z = 4.5 * this.size;
        prow.parent = root;

        // Bridge tower (4-level command structure)
        for (let i = 0; i < 4; i++) {
            const width = (1.8 - i * 0.25) * this.size;
            const tower = MeshBuilder.CreateBox(`tower${i}`, {
                width: width,
                height: 0.7 * this.size,
                depth: 1.5 * this.size
            }, this.scene);
            tower.position.set(0, (1.2 + i * 0.8) * this.size, 1.2 * this.size);
            tower.parent = root;
        }

        // Side weapon batteries - massive broadside arrays
        for (let side = -1; side <= 1; side += 2) {
            const battery = MeshBuilder.CreateBox(`battery${side}`, {
                width: 0.7 * this.size,
                height: 1.2 * this.size,
                depth: 5.5 * this.size
            }, this.scene);
            battery.position.set(side * 1.8 * this.size, 0, 0);
            battery.parent = root;

            // Heavy turrets on batteries (4 per side)
            for (let i = 0; i < 4; i++) {
                const turret = MeshBuilder.CreateSphere(`turret${side}_${i}`, {
                    diameter: 0.7 * this.size
                }, this.scene);
                turret.position.set(
                    side * 1.8 * this.size,
                    0.9 * this.size,
                    (i - 1.5) * 1.6 * this.size
                );
                turret.parent = root;
            }
        }

        // Dorsal weapon platforms (main guns)
        const dorsalTurretPositions = [
            { x: 0, y: 1.2, z: 2.5 },
            { x: -1.2, y: 0.8, z: 1 },
            { x: 1.2, y: 0.8, z: 1 },
            { x: 0, y: 1.2, z: -1 }
        ];

        dorsalTurretPositions.forEach((pos, i) => {
            const turret = MeshBuilder.CreateSphere(`dorsalTurret${i}`, {
                diameter: 0.8 * this.size
            }, this.scene);
            turret.position.set(pos.x * this.size, pos.y * this.size, pos.z * this.size);
            turret.parent = root;
        });

        // Engine array (16 engines in 4x4 grid)
        for (let i = 0; i < 16; i++) {
            const x = (i % 4 - 1.5) * 0.8 * this.size;
            const y = (Math.floor(i / 4) - 1.5) * 0.8 * this.size;
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 0.7 * this.size,
                height: 1.3 * this.size
            }, this.scene);
            engine.position.set(x, y, -4.2 * this.size);
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;

            // Engine glow rings
            const glowRing = MeshBuilder.CreateTorus(`engineGlow${i}`, {
                diameter: 0.7 * this.size,
                thickness: 0.08 * this.size
            }, this.scene);
            glowRing.position.set(x, y, -4.9 * this.size);
            glowRing.parent = root;
        }

        // Ventral keel structure
        const keel = MeshBuilder.CreateBox('titanKeel', {
            width: 2 * this.size,
            height: 0.8 * this.size,
            depth: 6.5 * this.size
        }, this.scene);
        keel.position.y = -1.3 * this.size;
        keel.parent = root;

        return root;
    }

    private createHealthBar(): Mesh {
        // Create a plane for the health bar
        // Make it a consistent size regardless of ship size for better visibility
        const barWidth = 5; // Fixed width for all ships
        const barHeight = 0.5;
        const bar = MeshBuilder.CreatePlane('healthBar', { width: barWidth, height: barHeight }, this.scene);

        // Create dynamic texture for the health bar
        const texture = new DynamicTexture('healthBarTexture', { width: 256, height: 64 }, this.scene);
        const material = new StandardMaterial('healthBarMaterial', this.scene);
        material.diffuseTexture = texture;
        material.emissiveTexture = texture;
        material.disableLighting = true;
        material.backFaceCulling = false;

        // IMPORTANT: Make health bar always render on top
        material.zOffset = -10; // Render in front of other objects
        material.depthFunction = 1; // Always pass depth test (LEQUAL)

        bar.material = material;
        bar.billboardMode = Mesh.BILLBOARDMODE_ALL; // Always face camera
        bar.renderingGroupId = 1; // Render after main scene objects (group 0)

        return bar;
    }

    private updateHealthBar(): void {
        if (!this.healthBarMesh) return;

        const healthPercent = Math.max(0, this.health / this.maxHealth);
        const texture = (this.healthBarMesh.material as StandardMaterial).diffuseTexture as DynamicTexture;
        const ctx = texture.getContext();

        // Clear canvas
        ctx.clearRect(0, 0, 256, 64);

        // Background (dark red)
        ctx.fillStyle = '#400000';
        ctx.fillRect(0, 0, 256, 64);

        // Health bar (gradient from green to red based on health)
        const r = Math.floor(255 * (1 - healthPercent));
        const g = Math.floor(255 * healthPercent);
        ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
        ctx.fillRect(0, 0, 256 * healthPercent, 64);

        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 252, 60);

        texture.update();

        // Position above ship with a generous fixed offset that works for all sizes
        // Large ships have tall spires/towers, so we need significant offset
        const offsetY = 5 + (this.size * 2); // Base offset + size-based component
        this.healthBarMesh.position = this.position.add(new Vector3(0, offsetY, 0));
    }

    public update(deltaTime: number): void {
        let targetPos: Vector3;
        let distance: number;

        // Squad-based movement or individual AI
        if (this.inFormation && this.formationTarget) {
            // Follow formation position
            targetPos = this.formationTarget;
            distance = Vector3.Distance(this.position, targetPos);

            const direction = targetPos.subtract(this.position);
            if (distance > 2) {
                direction.normalize();
                const formationSpeed = this.speed * 0.8;
                this.velocity = direction.scale(formationSpeed);
                this.position.addInPlace(this.velocity.scale(deltaTime));
            } else {
                // At formation position, slow down
                this.velocity.scaleInPlace(0.95);
                this.position.addInPlace(this.velocity.scale(deltaTime));
            }

            this.mesh.position = this.position;

            // Face formation direction or nearest threat
            const combatPos = this.target === 'player' ? this.player.position : this.station.position;
            const directionToTarget = combatPos.subtract(this.position).normalize();
            const targetRotation = Math.atan2(directionToTarget.x, directionToTarget.z);
            this.mesh.rotation.y = targetRotation;
        } else if (this.combatTarget) {
            // Individual combat mode (squad engage state)
            targetPos = this.combatTarget;
            distance = Vector3.Distance(this.position, targetPos);
            this.updateCombatMovement(deltaTime, targetPos, distance);
        } else {
            // Standard solo AI (no squad)
            targetPos = this.target === 'player' ? this.player.position : this.station.position;
            distance = Vector3.Distance(this.position, targetPos);
            this.updateCombatMovement(deltaTime, targetPos, distance);
        }

        // Shooting AI
        if (this.canShoot) {
            this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);

            if (this.shootCooldown <= 0 && distance < this.shootRange) {
                this.shoot();
                this.shootCooldown = this.fireRate;
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(deltaTime);
            if (!this.projectiles[i].isAlive) {
                this.projectiles[i].dispose();
                this.projectiles.splice(i, 1);
            }
        }

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

    private updateCombatMovement(deltaTime: number, targetPos: Vector3, distance: number): void {
        // Determine optimal combat range based on ship type
        let optimalRange: number;
        switch (this.type) {
            case 'scout':
                optimalRange = 40;
                break;
            case 'fighter':
                optimalRange = 50;
                break;
            case 'heavy':
                optimalRange = 55;
                break;
            case 'destroyer':
                optimalRange = 60;
                break;
            default:
                optimalRange = 50;
        }

        // Movement AI: maintain optimal shooting distance with smooth transitions
        const rangeDeadzone = 5; // Wider deadzone to prevent jitter
        const distanceError = distance - optimalRange;

        let moveDirection: Vector3;
        let moveSpeed: number;

        if (Math.abs(distanceError) < rangeDeadzone) {
            // Within acceptable range - slow orbit/strafe movement
            this.strafeChangeTimer += deltaTime;
            if (this.strafeChangeTimer >= this.strafeChangeDuration) {
                this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
                this.strafeChangeTimer = 0;
            }

            const toTarget = targetPos.subtract(this.position).normalize();
            const perpendicular = new Vector3(-toTarget.z, 0, toTarget.x);
            moveDirection = perpendicular.scale(this.strafeDirection);
            moveSpeed = this.speed * 0.3; // Slow strafe speed
        } else if (distanceError > rangeDeadzone) {
            // Too far, move closer - smooth approach
            const approachDirection = targetPos.subtract(this.position).normalize();

            // Add slight strafe component for more natural movement
            const perpendicular = new Vector3(-approachDirection.z, 0, approachDirection.x);
            const strafeAmount = 0.2;
            moveDirection = approachDirection.add(perpendicular.scale(this.strafeDirection * strafeAmount)).normalize();

            // Scale speed based on distance error (faster when further away)
            const speedMultiplier = Math.min(1, distanceError / 20);
            moveSpeed = this.speed * speedMultiplier;
        } else {
            // Too close, back away - smooth retreat
            const retreatDirection = this.position.subtract(targetPos).normalize();

            // Add slight strafe component
            const perpendicular = new Vector3(-retreatDirection.z, 0, retreatDirection.x);
            const strafeAmount = 0.2;
            moveDirection = retreatDirection.add(perpendicular.scale(this.strafeDirection * strafeAmount)).normalize();

            // Scale speed based on distance error
            const speedMultiplier = Math.min(1, Math.abs(distanceError) / 20);
            moveSpeed = this.speed * speedMultiplier;
        }

        this.velocity = moveDirection.scale(moveSpeed);
        this.position.addInPlace(this.velocity.scale(deltaTime));
        this.mesh.position = this.position;

        // Rotate to face target
        const directionToTarget = targetPos.subtract(this.position).normalize();
        const targetRotation = Math.atan2(directionToTarget.x, directionToTarget.z);
        this.mesh.rotation.y = targetRotation;
    }

    private shoot(): void {
        const targetPos = this.target === 'player' ? this.player.position : this.station.position;
        const direction = targetPos.subtract(this.position).normalize();

        // Apply accuracy spread
        const spread = 1 - this.weaponAccuracy;
        const spreadX = (Math.random() - 0.5) * spread;
        const spreadY = (Math.random() - 0.5) * spread;
        const spreadZ = (Math.random() - 0.5) * spread;

        const finalDirection = direction.add(new Vector3(spreadX, spreadY, spreadZ)).normalize();

        const spawnOffset = finalDirection.scale(this.size * 2);
        const spawnPosition = this.position.add(spawnOffset);

        const projectile = new Projectile(
            this.scene,
            spawnPosition,
            finalDirection,
            50, // Enemy bullet speed
            this.weaponDamage,
            'enemy'
        );

        this.projectiles.push(projectile);
    }

    private collideWithTarget(): void {
        if (this.target === 'player') {
            this.player.takeDamage(this.collisionDamage);
        } else {
            this.station.takeDamage(this.collisionDamage);
        }
        this.takeDamage(this.health); // Self-destruct on collision
    }

    public takeDamage(amount: number, weaponColor: Color3): void {
        this.health -= amount;

        // Show health bar when damaged
        if (this.healthBarMesh && !this.healthBarVisible) {
            this.healthBarVisible = true;
            this.healthBarMesh.setEnabled(true);
        }
        // Reset hide timer
        this.healthBarHideTimer = this.HEALTH_BAR_DISPLAY_TIME;

        // Update health bar immediately
        this.updateHealthBar();

        // Create hit spark effect blending weapon color with ship color
        const shipColor = this.getColor();
        this.explosionEffect.createHitSpark(this.position, weaponColor, shipColor);

        if (this.health <= 0) {
            this.isAlive = false;
        }
    }

    public getColor(): Color3 {
        // Return the ship's color based on type
        switch (this.type) {
            case 'scout':
                return new Color3(1, 0.5, 0.3);
            case 'fighter':
                return new Color3(1, 0.2, 0.2);
            case 'heavy':
                return new Color3(0.8, 0.1, 0.3);
            case 'destroyer':
                return new Color3(0.6, 0, 0.2);
            case 'cruiser':
                return new Color3(0.5, 0, 0.3);
            case 'battleship':
                return new Color3(0.4, 0, 0.4);
            case 'dreadnought':
                return new Color3(0.3, 0, 0.5);
            case 'titan':
                return new Color3(0.2, 0, 0.6);
            default:
                return new Color3(1, 0, 0);
        }
    }

    public getSize(): number {
        return this.size;
    }

    public getCollisionRadius(): number {
        // Return the actual collision radius based on the scaled mesh
        // The mesh is scaled down by 1.0 / (size^0.7)
        const scaleFactor = 1.0 / Math.pow(this.size, 0.7);
        const visualSize = this.size * scaleFactor;

        // Use a reasonable multiplier based on the actual mesh bounds
        // Most ship meshes extend about 2-3 units from center in their largest dimension
        // After scaling, we need a smaller multiplier to match visual appearance
        return visualSize * 2.0;
    }

    public breakIntoFragments(): EnemyResourceFragment[] {
        const fragmentCount = Math.floor(2 + Math.random() * 4) * this.size;
        const fragments: EnemyResourceFragment[] = [];
        const color = this.getColor();

        for (let i = 0; i < fragmentCount; i++) {
            const offset = new Vector3(
                (Math.random() - 0.5) * 3 * this.size,
                (Math.random() - 0.5) * 3 * this.size,
                (Math.random() - 0.5) * 3 * this.size
            );
            const fragmentPos = this.position.add(offset);
            const fragmentValue = Math.ceil(this.resourceValue / fragmentCount);
            fragments.push(new EnemyResourceFragment(this.scene, fragmentPos, color, fragmentValue));
        }

        return fragments;
    }

    public dispose(): void {
        this.mesh.dispose();
        if (this.healthBarMesh) {
            this.healthBarMesh.dispose();
        }
    }
}
