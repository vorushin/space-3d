import { Scene, PointsCloudSystem, Color4, Vector3, Mesh, MeshBuilder, StandardMaterial, Color3, Texture, DynamicTexture } from '@babylonjs/core';

export class BackgroundSystem {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public create(): void {
        this.createColorfulStarfield();
        this.createDistantGalaxies();
        this.createNebulae();
    }

    private createColorfulStarfield(): void {
        const starCount = 3000;
        const positions: number[] = [];
        const colors: number[] = [];

        for (let i = 0; i < starCount; i++) {
            // Distribute stars on a sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 500;

            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );

            // Varied star colors - most white, some colored
            const starType = Math.random();
            let color: Color4;

            if (starType < 0.7) {
                // White/blue-white stars (most common)
                const brightness = 0.6 + Math.random() * 0.4;
                const blueShift = Math.random() * 0.2;
                color = new Color4(brightness, brightness, brightness + blueShift, 1);
            } else if (starType < 0.85) {
                // Blue stars
                const brightness = 0.5 + Math.random() * 0.5;
                color = new Color4(brightness * 0.6, brightness * 0.8, brightness, 1);
            } else if (starType < 0.95) {
                // Yellow/orange stars
                const brightness = 0.7 + Math.random() * 0.3;
                color = new Color4(brightness, brightness * 0.85, brightness * 0.5, 1);
            } else {
                // Red stars
                const brightness = 0.6 + Math.random() * 0.4;
                color = new Color4(brightness, brightness * 0.4, brightness * 0.3, 1);
            }

            colors.push(color.r, color.g, color.b, color.a);
        }

        const starfield = new PointsCloudSystem('starfield', 3, this.scene);
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

    private createDistantGalaxies(): void {
        // Create 5-8 distant galaxies at different positions
        const galaxyCount = 5 + Math.floor(Math.random() * 4);

        for (let i = 0; i < galaxyCount; i++) {
            const theta = (i / galaxyCount) * Math.PI * 2 + Math.random() * 0.5;
            const phi = Math.random() * Math.PI - Math.PI / 2;
            const distance = 480;

            const position = new Vector3(
                distance * Math.cos(phi) * Math.cos(theta),
                distance * Math.sin(phi),
                distance * Math.cos(phi) * Math.sin(theta)
            );

            this.createGalaxy(position, i);
        }
    }

    private createGalaxy(position: Vector3, index: number): void {
        const size = 15 + Math.random() * 25;
        const galaxy = MeshBuilder.CreatePlane(`galaxy${index}`, { size: size }, this.scene);
        galaxy.position = position;

        // Make galaxy face the origin (center of the game world)
        galaxy.lookAt(Vector3.Zero());

        // Create dynamic texture for galaxy
        const texture = new DynamicTexture(`galaxyTexture${index}`, 256, this.scene);
        const ctx = texture.getContext();

        // Choose galaxy color scheme
        const colorScheme = Math.random();
        let coreColor: string;
        let glowColor: string;

        if (colorScheme < 0.3) {
            // Blue galaxy
            coreColor = '#6699FF';
            glowColor = '#3366CC';
        } else if (colorScheme < 0.6) {
            // Purple/magenta galaxy
            coreColor = '#CC66FF';
            glowColor = '#9933CC';
        } else if (colorScheme < 0.8) {
            // Orange/red galaxy
            coreColor = '#FF9966';
            glowColor = '#CC6633';
        } else {
            // Cyan/teal galaxy
            coreColor = '#66FFCC';
            glowColor = '#33CC99';
        }

        // Draw spiral galaxy
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 256, 256);

        // Outer glow
        const outerGradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
        outerGradient.addColorStop(0, glowColor + 'AA');
        outerGradient.addColorStop(0.3, glowColor + '66');
        outerGradient.addColorStop(0.6, glowColor + '22');
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = outerGradient;
        ctx.fillRect(0, 0, 256, 256);

        // Core
        const coreGradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 60);
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(0.2, coreColor);
        coreGradient.addColorStop(0.5, glowColor + 'CC');
        coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGradient;
        ctx.fillRect(0, 0, 256, 256);

        // Add spiral arms
        ctx.globalCompositeOperation = 'lighter';
        for (let arm = 0; arm < 2; arm++) {
            const armOffset = arm * Math.PI;
            for (let t = 0; t < 100; t++) {
                const angle = (t / 100) * Math.PI * 4 + armOffset;
                const radius = (t / 100) * 100;
                const x = 128 + Math.cos(angle) * radius;
                const y = 128 + Math.sin(angle) * radius;

                const armGradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
                armGradient.addColorStop(0, coreColor + '88');
                armGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = armGradient;
                ctx.fillRect(x - 8, y - 8, 16, 16);
            }
        }

        texture.update();

        const material = new StandardMaterial(`galaxyMaterial${index}`, this.scene);
        material.diffuseTexture = texture;
        material.emissiveTexture = texture;
        material.opacityTexture = texture;
        material.disableLighting = true;
        material.backFaceCulling = false;

        galaxy.material = material;
    }

    private createNebulae(): void {
        // Create 3-5 nebulae clouds
        const nebulaCount = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < nebulaCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI * 0.8;
            const distance = 450;

            const position = new Vector3(
                distance * Math.cos(phi) * Math.cos(theta),
                distance * Math.sin(phi),
                distance * Math.cos(phi) * Math.sin(theta)
            );

            this.createNebula(position, i);
        }
    }

    private createNebula(position: Vector3, index: number): void {
        const width = 120 + Math.random() * 150;  // Much larger (was 40-100, now 120-270)
        const height = 90 + Math.random() * 120;   // Much larger (was 30-80, now 90-210)
        const nebula = MeshBuilder.CreatePlane(`nebula${index}`, { width, height }, this.scene);
        nebula.position = position;

        // Face origin
        nebula.lookAt(Vector3.Zero());

        // Random rotation for variation
        nebula.rotate(Vector3.Forward(), Math.random() * Math.PI * 2);

        // Create dynamic texture for nebula with higher resolution
        const texture = new DynamicTexture(`nebulaTexture${index}`, 1024, this.scene);
        const ctx = texture.getContext();

        // Nebula color schemes
        const colorScheme = Math.random();
        let color1: string, color2: string, color3: string;

        if (colorScheme < 0.25) {
            // Purple/pink nebula
            color1 = '#FF66CC';
            color2 = '#9933FF';
            color3 = '#6600CC';
        } else if (colorScheme < 0.5) {
            // Blue/cyan nebula
            color1 = '#66CCFF';
            color2 = '#3399FF';
            color3 = '#0066CC';
        } else if (colorScheme < 0.75) {
            // Red/orange nebula
            color1 = '#FF9966';
            color2 = '#FF6633';
            color3 = '#CC3300';
        } else {
            // Green/teal nebula
            color1 = '#66FFAA';
            color2 = '#33CC88';
            color3 = '#009966';
        }

        // Clear background
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 1024, 1024);

        // Draw multiple overlapping clouds - more clouds for nebulous effect
        ctx.globalCompositeOperation = 'lighter';
        const cloudCount = 20 + Math.floor(Math.random() * 15);  // Much more clouds (was 8-16, now 20-35)

        for (let c = 0; c < cloudCount; c++) {
            const x = 150 + Math.random() * 724;
            const y = 150 + Math.random() * 724;
            const radius = 150 + Math.random() * 250;  // Much larger clouds (was 80-200, now 150-400)

            const colors = [color1, color2, color3];
            const chosenColor = colors[Math.floor(Math.random() * colors.length)];

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            // More diffuse, transparent gradients for wispy effect
            gradient.addColorStop(0, chosenColor + '40');     // More transparent (was 66)
            gradient.addColorStop(0.3, chosenColor + '30');   // Gradual falloff (was 44 at 0.4)
            gradient.addColorStop(0.6, chosenColor + '18');   // Even more gradual (was 22 at 0.7)
            gradient.addColorStop(0.85, chosenColor + '08');  // Extended wispy edges
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add bright spots (stars forming) - more scattered
        ctx.globalCompositeOperation = 'lighter';
        for (let s = 0; s < 40; s++) {  // More bright spots (was 20, now 40)
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = 3 + Math.random() * 10;  // Larger bright spots (was 2-8, now 3-13)

            const starGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            starGradient.addColorStop(0, '#FFFFFF');
            starGradient.addColorStop(0.5, color1 + 'AA');  // Slightly more opaque
            starGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = starGradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        texture.update();

        const material = new StandardMaterial(`nebulaMaterial${index}`, this.scene);
        material.diffuseTexture = texture;
        material.emissiveTexture = texture;
        material.opacityTexture = texture;
        material.disableLighting = true;
        material.backFaceCulling = false;

        nebula.material = material;
    }
}
