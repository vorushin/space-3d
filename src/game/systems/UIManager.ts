import { Game } from '../Game';

export class UIManager {
    private game: Game;
    private upgradeMenuVisible: boolean = false;

    constructor(game: Game) {
        this.game = game;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Ship guns upgrade
        const shipGunsBtn = document.getElementById('upgrade-ship-guns');
        shipGunsBtn?.addEventListener('click', () => {
            this.game.progressionManager.upgradeShipGuns();
        });

        // Station upgrade
        const stationBtn = document.getElementById('upgrade-station');
        stationBtn?.addEventListener('click', () => {
            this.game.progressionManager.upgradeStation();
        });

        // Defense upgrade
        const defenseBtn = document.getElementById('upgrade-defense');
        defenseBtn?.addEventListener('click', () => {
            this.game.progressionManager.upgradeDefense();
        });

        // Hyperspace button
        const hyperspaceBtn = document.getElementById('hyperspace-btn');
        hyperspaceBtn?.addEventListener('click', () => {
            this.game.progressionManager.hyperspace();
        });
    }

    public update(): void {
        const pm = this.game.progressionManager;

        // Update stats
        this.updateElement('health', Math.round(this.game.player.health));
        this.updateElement('resources', pm.resources);
        this.updateElement('enemies', this.game.enemyManager.enemies.length);
        this.updateElement('station-health', Math.round(this.game.station.health));

        // Update sector info
        this.updateElement('sector', pm.currentSector);
        this.updateElement('ship-guns', pm.shipGunsLevel);
        this.updateElement('station-level', pm.stationLevel);
        this.updateElement('defense-level', pm.defenseLevel);

        // Update upgrade costs
        this.updateElement('ship-guns-cost', pm.getShipGunsCost());
        this.updateElement('station-cost', pm.getStationCost());
        this.updateElement('defense-cost', pm.getDefenseCost());

        // Update button states
        this.updateButtonState('upgrade-ship-guns', pm.canUpgradeShipGuns());
        this.updateButtonState('upgrade-station', pm.canUpgradeStation());
        this.updateButtonState('upgrade-defense', pm.canUpgradeDefense());
        this.updateButtonState('hyperspace-btn', pm.canHyperspace());

        // Update hyperspace button text
        const hyperspaceBtn = document.getElementById('hyperspace-btn');
        if (hyperspaceBtn) {
            if (pm.currentSector >= 4) {
                hyperspaceBtn.textContent = 'MAX SECTOR REACHED';
            } else if (pm.canHyperspace()) {
                hyperspaceBtn.textContent = `HYPERSPACE JUMP → SECTOR ${pm.currentSector + 1}`;
            } else {
                hyperspaceBtn.textContent = 'LOCKED (Need Lvl 3 All Systems)';
            }
        }
    }

    private updateElement(id: string, value: any): void {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value.toString();
        }
    }

    private updateButtonState(id: string, enabled: boolean): void {
        const button = document.getElementById(id) as HTMLButtonElement;
        if (button) {
            button.disabled = !enabled;
        }
    }

    public toggleUpgradeMenu(): void {
        this.upgradeMenuVisible = !this.upgradeMenuVisible;
        const menu = document.getElementById('upgrade-menu');
        if (menu) {
            menu.style.display = this.upgradeMenuVisible ? 'block' : 'none';
        }
    }
}
