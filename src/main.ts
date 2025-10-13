import { Engine, Scene, Vector3, Color4, PointsCloudSystem } from '@babylonjs/core';
import { Game } from './game/Game';

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
        scene.clearColor = new Color4(0, 0, 0.05, 1);

        // Create starfield background
        this.createStarfield(scene);

        return scene;
    }

    private createStarfield(scene: Scene): void {
        const starCount = 2000;
        const positions: number[] = [];
        const colors: number[] = [];

        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 500;

            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );

            const brightness = 0.5 + Math.random() * 0.5;
            colors.push(brightness, brightness, brightness, 1);
        }

        const starfield = new PointsCloudSystem('starfield', 1, scene);
        starfield.addPoints(starCount, (particle, i) => {
            particle.position = new Vector3(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2]
            );
            particle.color = new Color4(
                colors[i * 4],
                colors[i * 4 + 1],
                colors[i * 4 + 2],
                colors[i * 4 + 3]
            );
        });

        starfield.buildMeshAsync();
    }
}

// Start the application
new App();
