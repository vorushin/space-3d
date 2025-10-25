import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, Color4, DynamicTexture } from '@babylonjs/core';
import { Player } from './Player';
import { Station } from './Station';
import { Projectile } from './Projectile';
import { EnemyResourceFragment } from './EnemyResourceFragment';
import { ExplosionEffect } from '../effects/ExplosionEffect';

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
        // The mesh creation code uses multipliers that are too large, so we scale down the entire mesh
        // Use inverse scaling: smaller ships get less reduction, larger ships get more reduction
        // This makes small ships visible while keeping large ships at reasonable size
        const scaleFactor = 0.3 / this.size; // Scout (1.0) → 0.3, Titan (3.5) → 0.086
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
        // Fast interceptor design - sleek and narrow
        const root = new Mesh('scoutRoot', this.scene);

        // Main fuselage - elongated cone
        const fuselage = MeshBuilder.CreateCylinder('scoutBody', {
            diameterTop: 0.2 * this.size,
            diameterBottom: 0.8 * this.size,
            height: 2.5 * this.size,
            tessellation: 8
        }, this.scene);
        fuselage.rotation.x = Math.PI / 2;
        fuselage.parent = root;

        // Cockpit
        const cockpit = MeshBuilder.CreateSphere('scoutCockpit', {
            diameter: 0.6 * this.size,
            segments: 8
        }, this.scene);
        cockpit.position.z = 0.8 * this.size;
        cockpit.scaling.z = 1.3;
        cockpit.parent = root;

        // Wings - small swept wings
        const wingLeft = MeshBuilder.CreateBox('wingL', {
            width: 1.2 * this.size,
            height: 0.1 * this.size,
            depth: 0.8 * this.size
        }, this.scene);
        wingLeft.position.x = -0.6 * this.size;
        wingLeft.position.z = -0.3 * this.size;
        wingLeft.rotation.y = -0.3;
        wingLeft.parent = root;

        const wingRight = MeshBuilder.CreateBox('wingR', {
            width: 1.2 * this.size,
            height: 0.1 * this.size,
            depth: 0.8 * this.size
        }, this.scene);
        wingRight.position.x = 0.6 * this.size;
        wingRight.position.z = -0.3 * this.size;
        wingRight.rotation.y = 0.3;
        wingRight.parent = root;

        // Engine nozzles
        const engineL = MeshBuilder.CreateCylinder('engineL', {
            diameter: 0.3 * this.size,
            height: 0.4 * this.size
        }, this.scene);
        engineL.position.set(-0.4 * this.size, 0, -1.1 * this.size);
        engineL.rotation.x = Math.PI / 2;
        engineL.parent = root;

        const engineR = MeshBuilder.CreateCylinder('engineR', {
            diameter: 0.3 * this.size,
            height: 0.4 * this.size
        }, this.scene);
        engineR.position.set(0.4 * this.size, 0, -1.1 * this.size);
        engineR.rotation.x = Math.PI / 2;
        engineR.parent = root;

        return root;
    }

    private createFighterShip(): Mesh {
        // Balanced combat fighter - angular and aggressive
        const root = new Mesh('fighterRoot', this.scene);

        // Main body - angular fuselage
        const body = MeshBuilder.CreateBox('fighterBody', {
            width: 1.2 * this.size,
            height: 0.8 * this.size,
            depth: 2.8 * this.size
        }, this.scene);
        body.parent = root;

        // Nose cone
        const nose = MeshBuilder.CreateCylinder('fighterNose', {
            diameterTop: 0,
            diameterBottom: 0.9 * this.size,
            height: 1 * this.size,
            tessellation: 4
        }, this.scene);
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 1.9 * this.size;
        nose.parent = root;

        // Cockpit canopy
        const canopy = MeshBuilder.CreateSphere('fighterCanopy', {
            diameter: 0.7 * this.size,
            segments: 8
        }, this.scene);
        canopy.position.y = 0.5 * this.size;
        canopy.position.z = 0.5 * this.size;
        canopy.scaling.set(0.8, 0.6, 1.2);
        canopy.parent = root;

        // Wings - swept delta wings
        const wingL = MeshBuilder.CreateBox('wingL', {
            width: 1.5 * this.size,
            height: 0.15 * this.size,
            depth: 1.5 * this.size
        }, this.scene);
        wingL.position.set(-1.1 * this.size, 0, -0.5 * this.size);
        wingL.rotation.y = -0.4;
        wingL.parent = root;

        const wingR = MeshBuilder.CreateBox('wingR', {
            width: 1.5 * this.size,
            height: 0.15 * this.size,
            depth: 1.5 * this.size
        }, this.scene);
        wingR.position.set(1.1 * this.size, 0, -0.5 * this.size);
        wingR.rotation.y = 0.4;
        wingR.parent = root;

        // Engines
        const engineL = MeshBuilder.CreateCylinder('engineL', {
            diameter: 0.5 * this.size,
            height: 0.8 * this.size
        }, this.scene);
        engineL.position.set(-0.6 * this.size, 0, -1.6 * this.size);
        engineL.rotation.x = Math.PI / 2;
        engineL.parent = root;

        const engineR = MeshBuilder.CreateCylinder('engineR', {
            diameter: 0.5 * this.size,
            height: 0.8 * this.size
        }, this.scene);
        engineR.position.set(0.6 * this.size, 0, -1.6 * this.size);
        engineR.rotation.x = Math.PI / 2;
        engineR.parent = root;

        return root;
    }

    private createHeavyShip(): Mesh {
        // Bulky gunship - armored and imposing
        const root = new Mesh('heavyRoot', this.scene);

        // Main hull - thick central body
        const hull = MeshBuilder.CreateBox('heavyHull', {
            width: 2.5 * this.size,
            height: 1.8 * this.size,
            depth: 3.5 * this.size
        }, this.scene);
        hull.parent = root;

        // Armored nose section
        const nose = MeshBuilder.CreateBox('heavyNose', {
            width: 1.8 * this.size,
            height: 1.4 * this.size,
            depth: 1.2 * this.size
        }, this.scene);
        nose.position.z = 2.3 * this.size;
        nose.parent = root;

        // Bridge tower
        const bridge = MeshBuilder.CreateBox('heavyBridge', {
            width: 1.2 * this.size,
            height: 1 * this.size,
            depth: 1 * this.size
        }, this.scene);
        bridge.position.y = 1.4 * this.size;
        bridge.position.z = 0.5 * this.size;
        bridge.parent = root;

        // Side armor plates
        const armorL = MeshBuilder.CreateBox('armorL', {
            width: 0.4 * this.size,
            height: 1.2 * this.size,
            depth: 3 * this.size
        }, this.scene);
        armorL.position.x = -1.4 * this.size;
        armorL.parent = root;

        const armorR = MeshBuilder.CreateBox('armorR', {
            width: 0.4 * this.size,
            height: 1.2 * this.size,
            depth: 3 * this.size
        }, this.scene);
        armorR.position.x = 1.4 * this.size;
        armorR.parent = root;

        // Engine cluster - 4 large engines
        const enginePositions = [
            { x: -0.8 * this.size, y: -0.3 * this.size },
            { x: 0.8 * this.size, y: -0.3 * this.size },
            { x: -0.8 * this.size, y: 0.3 * this.size },
            { x: 0.8 * this.size, y: 0.3 * this.size }
        ];

        enginePositions.forEach((pos, i) => {
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 0.6 * this.size,
                height: 1 * this.size
            }, this.scene);
            engine.position.set(pos.x, pos.y, -2.2 * this.size);
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;
        });

        // Gun turrets
        const turretL = MeshBuilder.CreateSphere('turretL', {
            diameter: 0.6 * this.size
        }, this.scene);
        turretL.position.set(-1 * this.size, 0.5 * this.size, 1 * this.size);
        turretL.parent = root;

        const turretR = MeshBuilder.CreateSphere('turretR', {
            diameter: 0.6 * this.size
        }, this.scene);
        turretR.position.set(1 * this.size, 0.5 * this.size, 1 * this.size);
        turretR.parent = root;

        return root;
    }

    private createDestroyerShip(): Mesh {
        // Capital ship - massive and intimidating
        const root = new Mesh('destroyerRoot', this.scene);

        // Main hull - long central spine
        const spine = MeshBuilder.CreateBox('destroyerSpine', {
            width: 2 * this.size,
            height: 2 * this.size,
            depth: 5 * this.size
        }, this.scene);
        spine.parent = root;

        // Forward section - command tower
        const command = MeshBuilder.CreateBox('destroyerCommand', {
            width: 1.5 * this.size,
            height: 2.5 * this.size,
            depth: 2 * this.size
        }, this.scene);
        command.position.y = 2 * this.size;
        command.position.z = 1 * this.size;
        command.parent = root;

        // Prow - armored front
        const prow = MeshBuilder.CreateBox('destroyerProw', {
            width: 1.5 * this.size,
            height: 1.5 * this.size,
            depth: 1.5 * this.size
        }, this.scene);
        prow.position.z = 3.2 * this.size;
        prow.parent = root;

        // Side sections - cargo/hangar bays
        const bayL = MeshBuilder.CreateBox('bayL', {
            width: 1.5 * this.size,
            height: 1.5 * this.size,
            depth: 3 * this.size
        }, this.scene);
        bayL.position.set(-1.7 * this.size, -0.3 * this.size, 0);
        bayL.parent = root;

        const bayR = MeshBuilder.CreateBox('bayR', {
            width: 1.5 * this.size,
            height: 1.5 * this.size,
            depth: 3 * this.size
        }, this.scene);
        bayR.position.set(1.7 * this.size, -0.3 * this.size, 0);
        bayR.parent = root;

        // Engine array - massive propulsion
        const mainEngine = MeshBuilder.CreateCylinder('mainEngine', {
            diameter: 2.5 * this.size,
            height: 1.5 * this.size
        }, this.scene);
        mainEngine.position.z = -3.2 * this.size;
        mainEngine.rotation.x = Math.PI / 2;
        mainEngine.parent = root;

        // Secondary engines
        const secEngineL = MeshBuilder.CreateCylinder('secEngL', {
            diameter: 1 * this.size,
            height: 0.8 * this.size
        }, this.scene);
        secEngineL.position.set(-1.7 * this.size, 0, -1.8 * this.size);
        secEngineL.rotation.x = Math.PI / 2;
        secEngineL.parent = root;

        const secEngineR = MeshBuilder.CreateCylinder('secEngR', {
            diameter: 1 * this.size,
            height: 0.8 * this.size
        }, this.scene);
        secEngineR.position.set(1.7 * this.size, 0, -1.8 * this.size);
        secEngineR.rotation.x = Math.PI / 2;
        secEngineR.parent = root;

        // Weapon batteries
        for (let i = 0; i < 3; i++) {
            const batteryL = MeshBuilder.CreateBox(`batteryL${i}`, {
                width: 0.3 * this.size,
                height: 0.4 * this.size,
                depth: 0.6 * this.size
            }, this.scene);
            batteryL.position.set(-1 * this.size, 0.7 * this.size, 1.5 * this.size - i * 1.5 * this.size);
            batteryL.parent = root;

            const batteryR = MeshBuilder.CreateBox(`batteryR${i}`, {
                width: 0.3 * this.size,
                height: 0.4 * this.size,
                depth: 0.6 * this.size
            }, this.scene);
            batteryR.position.set(1 * this.size, 0.7 * this.size, 1.5 * this.size - i * 1.5 * this.size);
            batteryR.parent = root;
        }

        return root;
    }

    private createCruiserShip(): Mesh {
        // Large capital warship - heavily armed
        const root = new Mesh('cruiserRoot', this.scene);

        // Central hull - massive box
        const mainHull = MeshBuilder.CreateBox('cruiserHull', {
            width: 3 * this.size,
            height: 2.5 * this.size,
            depth: 6 * this.size
        }, this.scene);
        mainHull.parent = root;

        // Multi-deck superstructure
        for (let i = 0; i < 3; i++) {
            const deck = MeshBuilder.CreateBox(`deck${i}`, {
                width: 2 * this.size,
                height: 0.8 * this.size,
                depth: 3 * this.size
            }, this.scene);
            deck.position.y = (2.5 + i * 0.9) * this.size;
            deck.position.z = 0.5 * this.size;
            deck.parent = root;
        }

        // Forward prow blades
        const prowL = MeshBuilder.CreateBox('prowL', {
            width: 0.5 * this.size,
            height: 2 * this.size,
            depth: 3 * this.size
        }, this.scene);
        prowL.position.set(-1.5 * this.size, 0, 4 * this.size);
        prowL.rotation.z = 0.3;
        prowL.parent = root;

        const prowR = MeshBuilder.CreateBox('prowR', {
            width: 0.5 * this.size,
            height: 2 * this.size,
            depth: 3 * this.size
        }, this.scene);
        prowR.position.set(1.5 * this.size, 0, 4 * this.size);
        prowR.rotation.z = -0.3;
        prowR.parent = root;

        // Engine array - 6 massive engines
        for (let i = 0; i < 6; i++) {
            const x = (i % 3 - 1) * 1.2 * this.size;
            const y = (Math.floor(i / 3) - 0.5) * 1.5 * this.size;
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 0.9 * this.size,
                height: 1.5 * this.size
            }, this.scene);
            engine.position.set(x, y, -3.5 * this.size);
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;
        }

        return root;
    }

    private createBattleshipShip(): Mesh {
        // Colossal warship - maximum firepower
        const root = new Mesh('battleshipRoot', this.scene);

        // Central spine - ultra-massive
        const spine = MeshBuilder.CreateBox('battleshipSpine', {
            width: 4 * this.size,
            height: 3 * this.size,
            depth: 8 * this.size
        }, this.scene);
        spine.parent = root;

        // Tower superstructure - multiple levels
        for (let i = 0; i < 4; i++) {
            const tower = MeshBuilder.CreateBox(`tower${i}`, {
                width: (3.5 - i * 0.3) * this.size,
                height: 1.5 * this.size,
                depth: 2.5 * this.size
            }, this.scene);
            tower.position.y = (3 + i * 1.6) * this.size;
            tower.position.z = 1 * this.size;
            tower.parent = root;
        }

        // Wing sections with gun batteries
        const wingL = MeshBuilder.CreateBox('wingL', {
            width: 2 * this.size,
            height: 2 * this.size,
            depth: 6 * this.size
        }, this.scene);
        wingL.position.set(-3 * this.size, 0, 0);
        wingL.parent = root;

        const wingR = MeshBuilder.CreateBox('wingR', {
            width: 2 * this.size,
            height: 2 * this.size,
            depth: 6 * this.size
        }, this.scene);
        wingR.position.set(3 * this.size, 0, 0);
        wingR.parent = root;

        // Main gun turrets - 8 massive turrets
        for (let i = 0; i < 8; i++) {
            const xPos = (i % 2 === 0 ? -2 : 2) * this.size;
            const zPos = (Math.floor(i / 2) - 1.5) * 2 * this.size;
            const turret = MeshBuilder.CreateSphere(`turret${i}`, {
                diameter: 1.2 * this.size
            }, this.scene);
            turret.position.set(xPos, 1.8 * this.size, zPos);
            turret.parent = root;
        }

        // Engine cluster - 9 gigantic engines
        for (let i = 0; i < 9; i++) {
            const x = (i % 3 - 1) * 1.5 * this.size;
            const y = (Math.floor(i / 3) - 1) * 1.5 * this.size;
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 1.2 * this.size,
                height: 2 * this.size
            }, this.scene);
            engine.position.set(x, y, -5 * this.size);
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;
        }

        return root;
    }

    private createDreadnoughtShip(): Mesh {
        // Ultimate fortress - planet killer
        const root = new Mesh('dreadnoughtRoot', this.scene);

        // Central citadel - absolutely massive
        const citadel = MeshBuilder.CreateBox('dreadnoughtCitadel', {
            width: 6 * this.size,
            height: 4 * this.size,
            depth: 10 * this.size
        }, this.scene);
        citadel.parent = root;

        // Command spire - towering structure
        for (let i = 0; i < 6; i++) {
            const spireLevel = MeshBuilder.CreateBox(`spire${i}`, {
                width: (5 - i * 0.4) * this.size,
                height: 2 * this.size,
                depth: 3 * this.size
            }, this.scene);
            spireLevel.position.y = (4 + i * 2.1) * this.size;
            spireLevel.position.z = 2 * this.size;
            spireLevel.parent = root;
        }

        // Broadside sections - flanking armor
        for (let side = -1; side <= 1; side += 2) {
            const broadside = MeshBuilder.CreateBox(`broadside${side}`, {
                width: 2.5 * this.size,
                height: 3 * this.size,
                depth: 8 * this.size
            }, this.scene);
            broadside.position.set(side * 4 * this.size, 0, 0);
            broadside.parent = root;

            // Gun decks on each broadside
            for (let i = 0; i < 5; i++) {
                const gun = MeshBuilder.CreateBox(`gun${side}_${i}`, {
                    width: 0.5 * this.size,
                    height: 0.5 * this.size,
                    depth: 1 * this.size
                }, this.scene);
                gun.position.set(
                    side * 5 * this.size,
                    1 * this.size,
                    (i - 2) * 1.8 * this.size
                );
                gun.parent = root;
            }
        }

        // Prow ram - devastating frontal structure
        const prow = MeshBuilder.CreateBox('prow', {
            width: 4 * this.size,
            height: 3 * this.size,
            depth: 3 * this.size
        }, this.scene);
        prow.position.z = 6.5 * this.size;
        prow.parent = root;

        // Engine array - 12 titanic engines
        for (let i = 0; i < 12; i++) {
            const x = (i % 4 - 1.5) * 1.5 * this.size;
            const y = (Math.floor(i / 4) - 1) * 1.8 * this.size;
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 1.5 * this.size,
                height: 2.5 * this.size
            }, this.scene);
            engine.position.set(x, y, -6 * this.size);
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;
        }

        // Anti-capital turrets - 12 massive weapon platforms
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 3.5 * this.size;
            const turret = MeshBuilder.CreateSphere(`capitalTurret${i}`, {
                diameter: 1.8 * this.size
            }, this.scene);
            turret.position.set(
                Math.cos(angle) * radius,
                2.5 * this.size,
                Math.sin(angle) * radius
            );
            turret.parent = root;
        }

        return root;
    }

    private createTitanShip(): Mesh {
        // Apocalyptic mega-fortress - screen-filling monstrosity beyond comprehension
        const root = new Mesh('titanRoot', this.scene);

        // Central mega-citadel - absolutely gargantuan core
        const megaCitadel = MeshBuilder.CreateBox('titanCitadel', {
            width: 10 * this.size,
            height: 6 * this.size,
            depth: 15 * this.size
        }, this.scene);
        megaCitadel.parent = root;

        // Primary command spire - towering cathedral-like structure (8 levels)
        for (let i = 0; i < 8; i++) {
            const spireLevel = MeshBuilder.CreateBox(`primarySpire${i}`, {
                width: (7 - i * 0.5) * this.size,
                height: 2.5 * this.size,
                depth: 4 * this.size
            }, this.scene);
            spireLevel.position.y = (6 + i * 2.6) * this.size;
            spireLevel.position.z = 3 * this.size;
            spireLevel.parent = root;

            // Add antenna/sensor arrays on top levels
            if (i >= 5) {
                for (let j = 0; j < 4; j++) {
                    const antenna = MeshBuilder.CreateCylinder(`antenna${i}_${j}`, {
                        diameterTop: 0.1 * this.size,
                        diameterBottom: 0.2 * this.size,
                        height: 1.5 * this.size
                    }, this.scene);
                    const angle = (j / 4) * Math.PI * 2;
                    antenna.position.set(
                        Math.cos(angle) * 2 * this.size,
                        (6 + i * 2.6 + 1.8) * this.size,
                        3 * this.size + Math.sin(angle) * 2 * this.size
                    );
                    antenna.parent = root;
                }
            }
        }

        // Secondary spire towers - flanking the main spire
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 5; i++) {
                const tower = MeshBuilder.CreateBox(`secTower${side}_${i}`, {
                    width: (3 - i * 0.3) * this.size,
                    height: 2 * this.size,
                    depth: 2.5 * this.size
                }, this.scene);
                tower.position.set(
                    side * 4 * this.size,
                    (6 + i * 2.2) * this.size,
                    1 * this.size
                );
                tower.parent = root;
            }
        }

        // Massive wing sections - cathedral buttresses extending outward
        for (let side = -1; side <= 1; side += 2) {
            const megaWing = MeshBuilder.CreateBox(`megaWing${side}`, {
                width: 4 * this.size,
                height: 5 * this.size,
                depth: 12 * this.size
            }, this.scene);
            megaWing.position.set(side * 7 * this.size, 0, 0);
            megaWing.parent = root;

            // Wing armor plating
            const armorPlate = MeshBuilder.CreateBox(`armorPlate${side}`, {
                width: 1 * this.size,
                height: 4 * this.size,
                depth: 10 * this.size
            }, this.scene);
            armorPlate.position.set(side * 9 * this.size, 0, 0);
            armorPlate.parent = root;
        }

        // Broadside weapon arrays - multiple decks of devastating firepower
        for (let side = -1; side <= 1; side += 2) {
            const broadside = MeshBuilder.CreateBox(`broadside${side}`, {
                width: 3 * this.size,
                height: 5 * this.size,
                depth: 14 * this.size
            }, this.scene);
            broadside.position.set(side * 6.5 * this.size, -1 * this.size, 0);
            broadside.parent = root;

            // Three decks of gun batteries per side
            for (let deck = 0; deck < 3; deck++) {
                for (let i = 0; i < 8; i++) {
                    const gun = MeshBuilder.CreateBox(`gun${side}_${deck}_${i}`, {
                        width: 0.6 * this.size,
                        height: 0.6 * this.size,
                        depth: 1.2 * this.size
                    }, this.scene);
                    gun.position.set(
                        side * 8 * this.size,
                        (-1 + deck * 2) * this.size,
                        (i - 3.5) * 1.7 * this.size
                    );
                    gun.parent = root;
                }
            }
        }

        // Forward prow - devastating ram structure
        const megaProw = MeshBuilder.CreateBox('megaProw', {
            width: 7 * this.size,
            height: 5 * this.size,
            depth: 5 * this.size
        }, this.scene);
        megaProw.position.z = 10 * this.size;
        megaProw.parent = root;

        // Prow blades - cutting edges
        for (let side = -1; side <= 1; side += 2) {
            const blade = MeshBuilder.CreateBox(`prowBlade${side}`, {
                width: 1 * this.size,
                height: 4 * this.size,
                depth: 4 * this.size
            }, this.scene);
            blade.position.set(side * 4 * this.size, 0, 11 * this.size);
            blade.rotation.y = side * 0.4;
            blade.parent = root;
        }

        // Engine array - 20 colossal engines in organized formation
        for (let i = 0; i < 20; i++) {
            const x = (i % 5 - 2) * 2 * this.size;
            const y = (Math.floor(i / 5) - 1.5) * 2 * this.size;
            const engine = MeshBuilder.CreateCylinder(`engine${i}`, {
                diameter: 1.8 * this.size,
                height: 3 * this.size
            }, this.scene);
            engine.position.set(x, y, -9 * this.size);
            engine.rotation.x = Math.PI / 2;
            engine.parent = root;

            // Engine glow rings
            const glowRing = MeshBuilder.CreateTorus(`engineGlow${i}`, {
                diameter: 1.8 * this.size,
                thickness: 0.15 * this.size
            }, this.scene);
            glowRing.position.set(x, y, -10.5 * this.size);
            glowRing.parent = root;
        }

        // Capital-class turret installations - 24 massive weapon platforms
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            const radius = 5.5 * this.size;
            const turret = MeshBuilder.CreateSphere(`capitalTurret${i}`, {
                diameter: 2.2 * this.size
            }, this.scene);
            turret.position.set(
                Math.cos(angle) * radius,
                3 * this.size,
                Math.sin(angle) * radius
            );
            turret.parent = root;

            // Gun barrels on turrets
            const barrel = MeshBuilder.CreateCylinder(`turretBarrel${i}`, {
                diameter: 0.4 * this.size,
                height: 2 * this.size
            }, this.scene);
            barrel.position.set(
                Math.cos(angle) * (radius + 1.5 * this.size),
                3 * this.size,
                Math.sin(angle) * (radius + 1.5 * this.size)
            );
            barrel.rotation.y = -angle + Math.PI / 2;
            barrel.rotation.z = Math.PI / 2;
            barrel.parent = root;
        }

        // Defensive shield emitter pylons - 6 massive structures
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = 7 * this.size;
            const pylon = MeshBuilder.CreateCylinder(`pylon${i}`, {
                diameterTop: 0.5 * this.size,
                diameterBottom: 1 * this.size,
                height: 6 * this.size
            }, this.scene);
            pylon.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            pylon.parent = root;

            // Emitter sphere at top
            const emitter = MeshBuilder.CreateSphere(`emitter${i}`, {
                diameter: 1.5 * this.size
            }, this.scene);
            emitter.position.set(
                Math.cos(angle) * radius,
                3 * this.size,
                Math.sin(angle) * radius
            );
            emitter.parent = root;
        }

        // Lower hull reinforcement structures
        const lowerHull = MeshBuilder.CreateBox('lowerHull', {
            width: 8 * this.size,
            height: 3 * this.size,
            depth: 13 * this.size
        }, this.scene);
        lowerHull.position.y = -4.5 * this.size;
        lowerHull.parent = root;

        // Keel ridge - structural spine underneath
        const keel = MeshBuilder.CreateBox('keel', {
            width: 2 * this.size,
            height: 2 * this.size,
            depth: 14 * this.size
        }, this.scene);
        keel.position.y = -6 * this.size;
        keel.parent = root;

        return root;
    }

    private createHealthBar(): Mesh {
        // Create a plane for the health bar
        const barWidth = this.size * 3;
        const barHeight = 0.3;
        const bar = MeshBuilder.CreatePlane('healthBar', { width: barWidth, height: barHeight }, this.scene);

        // Create dynamic texture for the health bar
        const texture = new DynamicTexture('healthBarTexture', { width: 256, height: 64 }, this.scene);
        const material = new StandardMaterial('healthBarMaterial', this.scene);
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

        // Position above ship
        const offsetY = this.size * 2.5;
        this.healthBarMesh.position = this.position.add(new Vector3(0, offsetY, 0));
    }

    public update(deltaTime: number): void {
        const targetPos = this.target === 'player' ? this.player.position : this.station.position;
        const distance = Vector3.Distance(this.position, targetPos);

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
        this.mesh.rotation.x += deltaTime * 0.5;

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
