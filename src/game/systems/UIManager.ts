import { Game } from '../Game';
import { WeaponSystem } from './WeaponSystem';
import { Vector3, Matrix } from '@babylonjs/core';

export class UIManager {
    private game: Game;
    private upgradeMenuVisible: boolean = false;

    constructor(game: Game) {
        this.game = game;
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    private toggleUpgradeMenu(): void {
        this.upgradeMenuVisible = !this.upgradeMenuVisible;
        const menu = document.getElementById('upgrade-menu');
        const hint = document.getElementById('upgrade-hint');
        if (menu) {
            if (this.upgradeMenuVisible) {
                menu.classList.add('visible');
            } else {
                menu.classList.remove('visible');
            }
        }
        if (hint) {
            hint.style.display = this.upgradeMenuVisible ? 'none' : 'block';
        }
    }

    private setupEventListeners(): void {
        // Ship weapons upgrade
        const shipBtn = document.getElementById('upgrade-ship-btn');
        shipBtn?.addEventListener('click', () => {
            this.game.progressionManager.upgradeShipGuns();
        });

        // Station upgrade
        const stationBtn = document.getElementById('upgrade-station-btn');
        stationBtn?.addEventListener('click', () => {
            this.game.progressionManager.upgradeStation();
        });

        // Defense upgrade
        const defenseBtn = document.getElementById('upgrade-defense-btn');
        defenseBtn?.addEventListener('click', () => {
            this.game.progressionManager.upgradeDefense();
        });

        // Buy missiles
        const missilesBtn = document.getElementById('buy-missiles-btn');
        missilesBtn?.addEventListener('click', () => {
            this.game.progressionManager.purchaseMissiles();
        });
    }

    private spawnDebugEnemies(): void {
        // Access the enemy manager to spawn enemies
        if (this.game && this.game.enemyManager) {
            const enemyTypes: Array<'scout' | 'fighter' | 'heavy' | 'destroyer' | 'cruiser' | 'battleship' | 'dreadnought' | 'titan'> =
                ['scout', 'fighter', 'heavy', 'destroyer', 'cruiser', 'battleship', 'dreadnought', 'titan'];

            const stationPos = { x: 0, y: 0, z: 0 }; // Station is at origin
            const radius = 40; // Spawn distance from station

            enemyTypes.forEach((type, index) => {
                // Arrange enemies in a circle around the station
                const angle = (index / enemyTypes.length) * Math.PI * 2;
                const spawnPos = {
                    x: Math.cos(angle) * radius,
                    y: 0,
                    z: Math.sin(angle) * radius
                };

                // Spawn enemy of specific type
                const position = new Vector3(spawnPos.x, spawnPos.y, spawnPos.z);
                this.game.enemyManager.spawnEnemyOfType(position, type);
            });

            console.log('Debug: Spawned one of each enemy type near station');
        }
    }

    private setupKeyboardShortcuts(): void {
        window.addEventListener('keydown', (e) => {
            // Toggle upgrade menu
            if (e.key === 'u' || e.key === 'U') {
                this.toggleUpgradeMenu();
            }
            // Keyboard shortcuts: 1, 2, 3, 4 for upgrades
            else if (e.key === '1' && this.game.progressionManager.canUpgradeShipGuns()) {
                this.game.progressionManager.upgradeShipGuns();
            } else if (e.key === '2' && this.game.progressionManager.canUpgradeStation()) {
                this.game.progressionManager.upgradeStation();
            } else if (e.key === '3' && this.game.progressionManager.canUpgradeDefense() && this.game.progressionManager.stationLevel > 0) {
                this.game.progressionManager.upgradeDefense();
            } else if (e.key === '4' && this.game.progressionManager.canPurchaseMissiles()) {
                this.game.progressionManager.purchaseMissiles();
            }
            // Debug shortcuts
            else if (e.key === 'r' || e.key === 'R') {
                this.game.progressionManager.addResources(1000);
            } else if (e.key === 't' || e.key === 'T') {
                this.spawnDebugEnemies();
            }
            // Close upgrade menu with Escape
            else if (e.key === 'Escape' && this.upgradeMenuVisible) {
                this.toggleUpgradeMenu();
            }
        });
    }

    public update(): void {
        const pm = this.game.progressionManager;
        const playerHealth = Math.round(this.game.player.health);
        const stationHealth = Math.round(this.game.station.health);

        // Update corner HUD elements
        this.updateHealthDisplay('health', playerHealth);
        this.updateHealthDisplay('station-health', stationHealth);
        this.updateElement('station-level-hud', pm.stationLevel);
        this.updateElement('resources', pm.resources);
        this.updateElement('enemies', this.game.enemyManager.enemies.length);
        this.updateElement('missile-count', this.game.missileManager.getMissileCount());

        // Update weapon info in bottom left corner
        const weaponConfig = WeaponSystem.getWeaponConfig(pm.shipGunsLevel);
        this.updateElement('weapon-name', weaponConfig.name);
        this.updateElement('ship-guns-lvl', pm.shipGunsLevel);

        // Update sector info
        this.updateElement('sector', pm.currentSector);
        this.updateElement('sector-name', pm.getSectorName().toUpperCase());

        // Update enemy breakdown by type
        this.updateEnemyBreakdown();

        // Update mission objectives in bottom right
        this.updateMissionObjectives();

        // Update quick upgrade hints
        this.updateQuickUpgradeHints();

        // Update station direction indicator
        this.updateStationIndicator();

        // Update all upgrade panels (in menu)
        this.updateShipWeaponsPanel();
        this.updateStationPanel();
        this.updateDefensePanel();
        this.updateMissilesPanel();
    }

    private updateQuickUpgradeHints(): void {
        const pm = this.game.progressionManager;

        // Show [1] hint if ship guns can be upgraded
        const hintShip = document.getElementById('hint-ship');
        if (hintShip) {
            if (pm.canUpgradeShipGuns()) {
                hintShip.classList.add('visible');
            } else {
                hintShip.classList.remove('visible');
            }
        }

        // Show [2] hint if station can be upgraded
        const hintStation = document.getElementById('hint-station');
        if (hintStation) {
            if (pm.canUpgradeStation()) {
                hintStation.classList.add('visible');
            } else {
                hintStation.classList.remove('visible');
            }
        }

        // Show [3] hint if defense can be upgraded (and station exists)
        const hintDefense = document.getElementById('hint-defense');
        if (hintDefense) {
            if (pm.stationLevel > 0 && pm.canUpgradeDefense()) {
                hintDefense.classList.add('visible');
            } else {
                hintDefense.classList.remove('visible');
            }
        }

        // Show [4] hint if missiles can be purchased
        const hintMissiles = document.getElementById('hint-missiles');
        if (hintMissiles) {
            if (pm.canPurchaseMissiles()) {
                hintMissiles.classList.add('visible');
            } else {
                hintMissiles.classList.remove('visible');
            }
        }
    }

    private updateHealthDisplay(id: string, value: number): void {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value.toString();
            element.classList.remove('warning', 'critical');
            if (value <= 25) {
                element.classList.add('critical');
            } else if (value <= 50) {
                element.classList.add('warning');
            }
        }
    }

    private updateShipWeaponsPanel(): void {
        const pm = this.game.progressionManager;
        const level = pm.shipGunsLevel;

        // Get weapon config from WeaponSystem
        const weaponConfig = WeaponSystem.getWeaponConfig(level);

        // Update weapon name and level in upgrade menu panel
        this.updateElement('weapon-name-panel', weaponConfig.name);
        this.updateElement('ship-guns-lvl-panel', level);

        // Calculate progress
        const currentResources = pm.resources;
        const nextLevelCost = pm.getShipGunsCost();
        const progress = Math.min(100, (currentResources / nextLevelCost) * 100);

        // Update progress bar
        const progressBar = document.getElementById('ship-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Update progress text
        this.updateElement('ship-progress-text', `${currentResources} / ${nextLevelCost}`);

        // Update button state and text
        const button = document.getElementById('upgrade-ship-btn') as HTMLButtonElement;
        const buttonText = document.getElementById('ship-btn-text');

        if (button && buttonText) {
            if (level >= 10) {
                button.disabled = true;
                button.classList.remove('ready');
                buttonText.textContent = 'MAX LEVEL';
            } else if (pm.canUpgradeShipGuns()) {
                button.disabled = false;
                button.classList.add('ready');
                buttonText.textContent = '+1';
            } else {
                button.disabled = true;
                button.classList.remove('ready');
                const needed = nextLevelCost - currentResources;
                buttonText.textContent = `Need ${needed} more`;
            }
        }
    }

    private updateStationPanel(): void {
        const pm = this.game.progressionManager;
        const level = pm.stationLevel;

        // Get panel and update state
        const panel = document.getElementById('station-panel');
        const nameElement = panel?.querySelector('.upgrade-name');

        if (panel && nameElement) {
            if (level === 0) {
                panel.classList.add('disabled');
                nameElement.textContent = 'No Station';
            } else {
                panel.classList.remove('disabled');
                nameElement.textContent = 'Station';
            }
        }

        // Update level
        this.updateElement('station-lvl', level);

        // Calculate progress
        const currentResources = pm.resources;
        const cost = pm.getStationCost();
        const progress = Math.min(100, (currentResources / cost) * 100);

        // Update progress bar
        const progressBar = document.getElementById('station-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Update progress text
        this.updateElement('station-progress-text', `${currentResources} / ${cost}`);

        // Update button state
        const button = document.getElementById('upgrade-station-btn') as HTMLButtonElement;

        if (button) {
            if (pm.canUpgradeStation()) {
                button.disabled = false;
                button.classList.add('ready');
                button.innerHTML = '<span class="shortcut-key">2</span><span>+1</span>';
            } else {
                button.disabled = true;
                button.classList.remove('ready');
                const needed = cost - currentResources;
                button.innerHTML = `<span class="shortcut-key">2</span><span>Need ${needed} more</span>`;
            }
        }
    }

    private updateDefensePanel(): void {
        const pm = this.game.progressionManager;
        const level = pm.defenseLevel;
        const stationLevel = pm.stationLevel;

        // Get panel and update state
        const panel = document.getElementById('defense-panel');
        const nameElement = panel?.querySelector('.upgrade-name');

        if (panel && nameElement) {
            if (level === 0) {
                panel.classList.add('disabled');
                nameElement.textContent = 'No Defense';
            } else {
                panel.classList.remove('disabled');
                nameElement.textContent = `Defense Turrets`;
            }
        }

        // Update level
        this.updateElement('defense-lvl', level);

        // Calculate progress
        const currentResources = pm.resources;
        const cost = pm.getDefenseCost();
        const progress = Math.min(100, (currentResources / cost) * 100);

        // Update progress bar
        const progressBar = document.getElementById('defense-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Update progress text
        this.updateElement('defense-progress-text', `${currentResources} / ${cost}`);

        // Update button state
        const button = document.getElementById('upgrade-defense-btn') as HTMLButtonElement;

        if (button) {
            if (stationLevel === 0) {
                // No station built yet
                button.disabled = true;
                button.classList.remove('ready');
                button.innerHTML = '<span class="shortcut-key">3</span><span>BUILD STATION FIRST</span>';
            } else if (pm.canUpgradeDefense()) {
                button.disabled = false;
                button.classList.add('ready');
                button.innerHTML = '<span class="shortcut-key">3</span><span>+1</span>';
            } else {
                button.disabled = true;
                button.classList.remove('ready');
                const needed = cost - currentResources;
                button.innerHTML = `<span class="shortcut-key">3</span><span>Need ${needed} more</span>`;
            }
        }
    }

    private updateMissilesPanel(): void {
        const pm = this.game.progressionManager;
        const missileCount = this.game.missileManager.getMissileCount();
        const cost = this.game.missileManager.getMissilePackCost();
        const packSize = this.game.missileManager.getMissilePackSize();

        // Update missile count in panel
        this.updateElement('missile-count-panel', missileCount);

        // Calculate progress
        const currentResources = pm.resources;
        const progress = Math.min(100, (currentResources / cost) * 100);

        // Update progress bar
        const progressBar = document.getElementById('missile-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Update progress text
        this.updateElement('missile-progress-text', `${currentResources} / ${cost}`);

        // Update button state
        const button = document.getElementById('buy-missiles-btn') as HTMLButtonElement;
        const buttonText = document.getElementById('missile-btn-text');

        if (button && buttonText) {
            if (pm.canPurchaseMissiles()) {
                button.disabled = false;
                button.classList.add('ready');
                buttonText.textContent = `Buy ${packSize} Pack`;
            } else {
                button.disabled = true;
                button.classList.remove('ready');
                const needed = cost - currentResources;
                buttonText.textContent = `Need ${needed} more`;
            }
        }
    }

    private updateMissionObjectives(): void {
        const pm = this.game.progressionManager;

        // Determine objectives based on current sector
        let stationReq = 3;
        let gunsReq = 3;
        let defenseReq = 3;

        if (pm.currentSector === 2) {
            stationReq = 5;
            gunsReq = 5;
            defenseReq = 5;
        } else if (pm.currentSector === 3) {
            stationReq = 7;
            gunsReq = 7;
            defenseReq = 7;
        } else if (pm.currentSector === 4) {
            stationReq = 10;
            gunsReq = 10;
            defenseReq = 10;
        }

        // Update compact objective items
        this.updateObjectiveItem('obj-ship', `Ship: ${pm.shipGunsLevel}/${gunsReq}`, pm.shipGunsLevel >= gunsReq);
        this.updateObjectiveItem('obj-station', `Station: ${pm.stationLevel}/${stationReq}`, pm.stationLevel >= stationReq);
        this.updateObjectiveItem('obj-guns', `Defense: ${pm.defenseLevel}/${defenseReq}`, pm.defenseLevel >= defenseReq);
    }

    private updateObjectiveItem(id: string, text: string, completed: boolean): void {
        const element = document.getElementById(id);
        if (element) {
            if (completed) {
                element.classList.add('completed');
                element.innerHTML = `✓ ${text}`;
            } else {
                element.classList.remove('completed');
                element.innerHTML = `○ ${text}`;
            }
        }
    }

    private updateEnemyBreakdown(): void {
        const enemies = this.game.enemyManager.enemies;

        // Count enemies by type
        const counts: { [key: string]: number } = {};
        for (const enemy of enemies) {
            counts[enemy.type] = (counts[enemy.type] || 0) + 1;
        }

        // Build display string
        const parts: string[] = [];
        const typeOrder = ['scout', 'fighter', 'heavy', 'destroyer', 'cruiser', 'battleship', 'dreadnought', 'titan'];

        for (const type of typeOrder) {
            if (counts[type]) {
                parts.push(`${counts[type]} ${type}${counts[type] > 1 ? 's' : ''}`);
            }
        }

        const element = document.getElementById('enemy-breakdown');
        if (element) {
            element.textContent = parts.length > 0 ? parts.join(', ') : '';
        }
    }

    private updateElement(id: string, value: any): void {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value.toString();
        }
    }

    private updateStationIndicator(): void {
        const indicator = document.getElementById('station-indicator');
        if (!indicator) return;

        const camera = this.game.scene.activeCamera;
        if (!camera) return;

        const stationPos = this.game.station.position;
        const engine = this.game.scene.getEngine();

        // Get matrices for projection
        const worldMatrix = Matrix.Identity(); // Station position is already in world space
        const transformMatrix = camera.getViewMatrix().multiply(camera.getProjectionMatrix());
        const viewport = camera.viewport.toGlobal(
            engine.getRenderWidth(),
            engine.getRenderHeight()
        );

        // Project station position to screen space
        const screenPos = Vector3.Project(
            stationPos,
            worldMatrix,
            transformMatrix,
            viewport
        );

        // Check if station is behind camera or on screen
        const margin = 100; // Distance from edge
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();

        const isOnScreen =
            screenPos.z > 0 &&
            screenPos.z < 1 &&
            screenPos.x > margin &&
            screenPos.x < width - margin &&
            screenPos.y > margin &&
            screenPos.y < height - margin;

        if (isOnScreen) {
            // Station is visible, hide indicator
            indicator.style.display = 'none';
        } else {
            // Station is off-screen, show indicator at edge
            indicator.style.display = 'block';

            // Calculate direction from center to station (screen space)
            const centerX = width / 2;
            const centerY = height / 2;

            let dirX = screenPos.x - centerX;
            let dirY = screenPos.y - centerY;

            // If station is behind camera, invert direction
            if (screenPos.z <= 0 || screenPos.z > 1) {
                dirX = -dirX;
                dirY = -dirY;
            }

            // Calculate angle for arrow rotation
            const angle = Math.atan2(dirY, dirX);

            // Clamp position to screen edges with margin
            const edgeMargin = 50;
            let posX = centerX + dirX;
            let posY = centerY + dirY;

            // Find intersection with screen bounds
            const maxX = width - edgeMargin;
            const maxY = height - edgeMargin;
            const minX = edgeMargin;
            const minY = edgeMargin;

            // Scale to edge of screen
            const scaleX = dirX > 0 ? (maxX - centerX) / dirX : (minX - centerX) / dirX;
            const scaleY = dirY > 0 ? (maxY - centerY) / dirY : (minY - centerY) / dirY;
            const scale = Math.min(Math.abs(scaleX), Math.abs(scaleY));

            posX = centerX + dirX * scale;
            posY = centerY + dirY * scale;

            // Position and rotate indicator
            indicator.style.left = `${posX}px`;
            indicator.style.top = `${posY}px`;
            indicator.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
        }
    }
}
