import { Scene, Engine, UniversalCamera, Vector3, HemisphericLight, Color3 } from '@babylonjs/core';
import { InputController } from './InputController';
import { Player } from './entities/Player';
import { Station } from './entities/Station';
import { AsteroidManager } from './systems/AsteroidManager';
import { EnemyManager } from './systems/EnemyManager';
import { ProgressionManager } from './systems/ProgressionManager';
import { UIManager } from './systems/UIManager';
import { ExplosionEffect } from './effects/ExplosionEffect';

export class Game {
    private scene: Scene;
    private engine: Engine;
    private camera: UniversalCamera;
    private inputController: InputController;

    public player: Player;
    public station: Station;
    public asteroidManager: AsteroidManager;
    public enemyManager: EnemyManager;
    public progressionManager: ProgressionManager;
    public uiManager: UIManager;
    public explosionEffect: ExplosionEffect;

    private lastTime: number = 0;

    constructor(scene: Scene, engine: Engine) {
        this.scene = scene;
        this.engine = engine;

        this.setupCamera();
        this.setupLighting();

        // Initialize effects
        this.explosionEffect = new ExplosionEffect(this.scene);

        // Initialize game systems
        this.station = new Station(this.scene, new Vector3(0, 0, 0), this.explosionEffect);
        this.player = new Player(this.scene, new Vector3(50, 0, 0), this.camera);
        this.player.setExplosionEffect(this.explosionEffect);
        this.asteroidManager = new AsteroidManager(this.scene, this.explosionEffect);
        this.enemyManager = new EnemyManager(this.scene, this.player, this.station, this.explosionEffect);
        this.progressionManager = new ProgressionManager(this);
        this.uiManager = new UIManager(this);

        this.inputController = new InputController(this.scene, this.player, this.camera, this.uiManager);

        // Start game loop
        this.scene.onBeforeRenderObservable.add(() => {
            const currentTime = performance.now();
            const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0;
            this.lastTime = currentTime;

            this.update(deltaTime);
        });

        console.log('Game initialized! Controls: WASD (lateral), Q/E (vertical), Mouse (look), LMB (shoot), TAB (upgrades)');
    }

    private setupCamera(): void {
        this.camera = new UniversalCamera('playerCamera', new Vector3(50, 0, 0), this.scene);
        this.camera.attachControl(this.engine.getRenderingCanvas(), true);
        this.camera.speed = 0;
        this.camera.angularSensibility = 1000;
        this.camera.minZ = 0.1;
        this.camera.maxZ = 1000;
    }

    private setupLighting(): void {
        const light = new HemisphericLight('mainLight', new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;
        light.diffuse = new Color3(0.9, 0.9, 1);
        light.specular = new Color3(0.5, 0.5, 0.8);
    }

    private update(deltaTime: number): void {
        if (deltaTime > 0.1) deltaTime = 0.1; // Cap delta time

        this.player.update(deltaTime);
        this.station.update(deltaTime);
        this.asteroidManager.update(deltaTime, this.player, this.station, this.enemyManager.enemies);
        this.enemyManager.update(deltaTime, this.progressionManager.getDefensiveStrength());
        this.progressionManager.update();
        this.uiManager.update();
    }
}
