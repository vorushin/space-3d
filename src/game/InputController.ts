import { Scene, Camera } from '@babylonjs/core';
import { Player } from './entities/Player';
import { UIManager } from './systems/UIManager';
import { MissileManager } from './systems/MissileManager';

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

            // Fire missile on SPACE key
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                this.missileManager.fireMissile();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    private setupMouseInput(): void {
        const canvas = this.scene.getEngine().getRenderingCanvas();

        canvas?.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouseDown = true;
                this.player.startShooting();
            }
            // Right click fires missile
            if (e.button === 2) {
                e.preventDefault();
                this.missileManager.fireMissile();
            }
        });

        canvas?.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouseDown = false;
                this.player.stopShooting();
            }
        });

        // Prevent context menu on right click
        canvas?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
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
