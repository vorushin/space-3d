import { Game } from '../Game';

export class ProgressionManager {
    private game: Game;

    public resources: number = 100; // Start with some resources
    public currentSector: number = 1;

    // Upgrade costs
    private shipGunsCost: number = 50;
    private stationCost: number = 100;
    private defenseCost: number = 75;

    // Upgrade levels
    public shipGunsLevel: number = 1;
    public stationLevel: number = 1;
    public defenseLevel: number = 1;

    private sectorThemes = [
        { name: 'Frontier Space', color: [0, 0, 0.05] },
        { name: 'Nebula Sector', color: [0.05, 0, 0.1] },
        { name: 'Asteroid Belt', color: [0.1, 0.05, 0] },
        { name: 'Alien Territory', color: [0.1, 0, 0] }
    ];

    constructor(game: Game) {
        this.game = game;
    }

    public update(): void {
        // Collect resources from asteroid manager
        const asteroidResources = this.game.asteroidManager.getCollectedResources();
        this.resources += asteroidResources;

        // Collect resources from station generation
        const stationResources = this.game.station.getCollectedResources();
        this.resources += stationResources;

        // Collect resources from destroyed enemies
        const enemyResources = this.game.enemyManager.getCollectedResources();
        this.resources += enemyResources;
    }

    public canUpgradeShipGuns(): boolean {
        return this.resources >= this.shipGunsCost;
    }

    public canUpgradeStation(): boolean {
        return this.resources >= this.stationCost;
    }

    public canUpgradeDefense(): boolean {
        return this.resources >= this.defenseCost;
    }

    public upgradeShipGuns(): boolean {
        if (!this.canUpgradeShipGuns()) return false;

        this.resources -= this.shipGunsCost;
        this.shipGunsLevel++;
        this.game.player.upgradeWeapons();
        this.shipGunsCost = Math.floor(this.shipGunsCost * 1.5);

        return true;
    }

    public upgradeStation(): boolean {
        if (!this.canUpgradeStation()) return false;

        this.resources -= this.stationCost;
        this.stationLevel++;
        this.game.station.upgrade();
        this.stationCost = Math.floor(this.stationCost * 1.5);

        return true;
    }

    public upgradeDefense(): boolean {
        if (!this.canUpgradeDefense()) return false;

        this.resources -= this.defenseCost;
        this.defenseLevel++;

        // Add new turret or upgrade existing
        if (this.game.station.turrets.length < this.defenseLevel) {
            this.game.station.addTurret();
        } else {
            this.game.station.turrets.forEach(turret => turret.upgrade());
        }

        this.defenseCost = Math.floor(this.defenseCost * 1.5);

        return true;
    }

    public canHyperspace(): boolean {
        if (this.currentSector >= 4) return false;

        // Requirements: all systems at level 3 or higher
        return this.shipGunsLevel >= 3 &&
               this.stationLevel >= 3 &&
               this.defenseLevel >= 3;
    }

    public hyperspace(): boolean {
        if (!this.canHyperspace()) return false;

        this.currentSector++;
        this.game.enemyManager.setDifficulty(this.currentSector);

        // Update scene background color
        const theme = this.sectorThemes[this.currentSector - 1];
        const scene = this.game['scene'];
        scene.clearColor.r = theme.color[0];
        scene.clearColor.g = theme.color[1];
        scene.clearColor.b = theme.color[2];

        console.log(`Jumped to ${theme.name}!`);

        // Check victory
        if (this.currentSector === 4 && this.shipGunsLevel >= 10 && this.stationLevel >= 10 && this.defenseLevel >= 10) {
            this.onVictory();
        }

        return true;
    }

    public getDefensiveStrength(): number {
        return this.stationLevel + this.defenseLevel;
    }

    public getSectorName(): string {
        return this.sectorThemes[this.currentSector - 1]?.name || 'Unknown Sector';
    }

    private onVictory(): void {
        console.log('VICTORY! You have conquered all sectors and maxed out all systems!');
        // TODO: Implement victory screen
    }

    public getShipGunsCost(): number {
        return this.shipGunsCost;
    }

    public getStationCost(): number {
        return this.stationCost;
    }

    public getDefenseCost(): number {
        return this.defenseCost;
    }
}
