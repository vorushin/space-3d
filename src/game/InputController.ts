import { Scene, Camera, Vector3 } from '@babylonjs/core';
import { Player } from './entities/Player';
import { UIManager } from './systems/UIManager';
import { MissileManager } from './systems/MissileManager';
import { EnemyType } from './entities/Enemy';

export class InputController {
    private scene: Scene;
    private player: Player;
    private camera: Camera;
    private uiManager: UIManager;
    private missileManager: MissileManager;

    public keys: { [key: string]: boolean } = {};
    public mouseDown: boolean = false;

    constructor(scene: Scene, player: Player, camera: Camera, uiManager: UIManager, missileManager: MissileManager) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.uiManager = uiManager;
        this.missileManager = missileManager;

        this.setupKeyboardInput();
        this.setupMouseInput();
    }

    private setupKeyboardInput(): void {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            if (e.key.toLowerCase() === 'tab') {
                e.preventDefault();
                this.uiManager.toggleUpgradeMenu();
            }

            // Fire missile on SPACE or Backspace key
            if (e.key === ' ' || e.code === 'Space' || e.key === 'Backspace') {
                e.preventDefault();
                this.missileManager.fireMissile();
            }

            // Debug: Spawn one of each enemy type with 'E' key
            if (e.key.toLowerCase() === 'e') {
                e.preventDefault();
                this.spawnDebugEnemies();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    private spawnDebugEnemies(): void {
        // Access the global game instance to spawn enemies
        if (window.game && window.game.enemyManager) {
            const enemyTypes: EnemyType[] = ['scout', 'fighter', 'heavy', 'destroyer', 'cruiser', 'battleship', 'dreadnought', 'titan'];

            const stationPos = new Vector3(0, 0, 0); // Station is at origin
            const radius = 40; // Spawn distance from station

            enemyTypes.forEach((type, index) => {
                // Arrange enemies in a circle around the station
                const angle = (index / enemyTypes.length) * Math.PI * 2;
                const spawnPos = new Vector3(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                );

                // Spawn enemy of specific type
                window.game.enemyManager.spawnEnemyOfType(spawnPos, type);
            });

            console.log('Debug: Spawned one of each enemy type near station');
        }
    }

    private setupMouseInput(): void {
        const canvas = this.scene.getEngine().getRenderingCanvas();

        canvas?.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouseDown = true;
                this.player.startShooting();
            }
        });

        canvas?.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouseDown = false;
                this.player.stopShooting();
            }
        });

        // Lock pointer on click
        canvas?.addEventListener('click', () => {
            canvas.requestPointerLock();
        });
    }

    public isKeyPressed(key: string): boolean {
        return this.keys[key.toLowerCase()] || false;
    }
}
