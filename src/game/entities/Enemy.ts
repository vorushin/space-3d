import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, Color4 } from '@babylonjs/core';
import { Player } from './Player';
import { Station } from './Station';
import { Projectile } from './Projectile';
import { EnemyResourceFragment } from './EnemyResourceFragment';
import { ExplosionEffect } from '../effects/ExplosionEffect';

export type EnemyType = 'scout' | 'fighter' | 'heavy' | 'destroyer';

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
    }

    private selectRandomType(difficulty: number): EnemyType {
        const roll = Math.random();

        // More dangerous types appear with higher difficulty
        if (difficulty < 1.5) {
            return roll > 0.3 ? 'scout' : 'fighter';
        } else if (difficulty < 2.5) {
            if (roll < 0.3) return 'scout';
            if (roll < 0.7) return 'fighter';
            return 'heavy';
        } else {
            if (roll < 0.2) return 'scout';
            if (roll < 0.5) return 'fighter';
            if (roll < 0.8) return 'heavy';
            return 'destroyer';
        }
    }

    private configureByType(difficulty: number): void {
        switch (this.type) {
            case 'scout':
                // Fast, weak, light weapons
                this.size = 0.7;
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
                // Balanced, light weapons
                this.size = 1;
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
                // Slow, tanky, medium weapons
                this.size = 1.5;
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
                this.size = 2;
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
            default:
                shipRoot = MeshBuilder.CreateIcoSphere('enemy', { radius: this.size, subdivisions: 1 }, this.scene);
        }

        const material = new StandardMaterial('enemyMaterial', this.scene);

        // Different colors based on type
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
            default:
                return new Color3(1, 0, 0);
        }
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
    }
}
