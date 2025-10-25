import { Engine, Scene, Vector3, Color4 } from '@babylonjs/core';
import { Game } from './game/Game';
import { BackgroundSystem } from './game/effects/BackgroundSystem';

// Make game available globally for cross-system communication
declare global {
    interface Window {
        game: Game;
    }
}

class App {
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;
    private game: Game;

    constructor() {
        this.canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
        this.engine = new Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true
        });

        this.scene = this.createScene();
        this.game = new Game(this.scene, this.engine);
        (window as any).game = this.game;

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }

    private createScene(): Scene {
        const scene = new Scene(this.engine);
        scene.clearColor = new Color4(0.02, 0.02, 0.08, 1); // Slightly lighter dark blue

        // Create enhanced background with galaxies, nebulae, and colorful stars
        const backgroundSystem = new BackgroundSystem(scene);
        backgroundSystem.create();

        return scene;
    }
}

// Start the application
new App();
