import { Vector3 } from '@babylonjs/core';
import { Enemy } from './Enemy';

export type SquadState = 'approaching' | 'engaging' | 'retreating' | 'regrouping';
export type TargetType = 'player' | 'station';

export interface FormationPosition {
    offset: Vector3;
    enemy: Enemy | null;
}

export class Squad {
    public enemies: Enemy[] = [];
    public state: SquadState = 'approaching';
    public targetType: TargetType = 'player';
    public rallyPoint: Vector3;
    public formationCenter: Vector3;
    private formationPositions: FormationPosition[] = [];
    private stateTimer: number = 0;
    private engageDuration: number = 8; // seconds in combat
    private retreatDuration: number = 3; // seconds retreating
    private regroupDuration: number = 4; // seconds regrouping

    constructor(position: Vector3) {
        this.rallyPoint = position.clone();
        this.formationCenter = position.clone();
    }

    public addEnemy(enemy: Enemy): void {
        this.enemies.push(enemy);
        enemy.squad = this;
        this.updateFormation();
    }

    public removeEnemy(enemy: Enemy): void {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            enemy.squad = null;
            this.updateFormation();
        }
    }

    public isEmpty(): boolean {
        return this.enemies.length === 0;
    }

    private updateFormation(): void {
        this.formationPositions = [];
        const squadSize = this.enemies.length;

        if (squadSize === 0) return;

        // Create formation based on squad size
        // V-formation for small squads, wedge for medium, spread for large
        if (squadSize <= 3) {
            // V-formation
            for (let i = 0; i < squadSize; i++) {
                const side = i % 2 === 0 ? 1 : -1;
                const row = Math.floor(i / 2);
                this.formationPositions.push({
                    offset: new Vector3(side * row * 8, 0, -row * 12),
                    enemy: this.enemies[i]
                });
            }
        } else if (squadSize <= 6) {
            // Wedge formation
            const rows = Math.ceil(squadSize / 2);
            let enemyIndex = 0;
            for (let row = 0; row < rows; row++) {
                const shipsInRow = Math.min(2 + row, squadSize - enemyIndex);
                for (let col = 0; col < shipsInRow; col++) {
                    const offset = (col - (shipsInRow - 1) / 2) * 10;
                    this.formationPositions.push({
                        offset: new Vector3(offset, 0, -row * 15),
                        enemy: this.enemies[enemyIndex]
                    });
                    enemyIndex++;
                    if (enemyIndex >= squadSize) break;
                }
            }
        } else {
            // Spread formation (circle)
            const radius = 20;
            for (let i = 0; i < squadSize; i++) {
                const angle = (i / squadSize) * Math.PI * 2;
                this.formationPositions.push({
                    offset: new Vector3(
                        Math.cos(angle) * radius,
                        0,
                        Math.sin(angle) * radius
                    ),
                    enemy: this.enemies[i]
                });
            }
        }
    }

    public update(deltaTime: number, playerPos: Vector3, stationPos: Vector3): void {
        if (this.isEmpty()) return;

        this.stateTimer += deltaTime;

        // Get target position
        const targetPos = this.targetType === 'player' ? playerPos : stationPos;

        // State machine
        switch (this.state) {
            case 'approaching':
                this.updateApproaching(targetPos, deltaTime);
                break;
            case 'engaging':
                this.updateEngaging(targetPos, deltaTime);
                break;
            case 'retreating':
                this.updateRetreating(targetPos, deltaTime);
                break;
            case 'regrouping':
                this.updateRegrouping(deltaTime);
                break;
        }

        // Periodically switch target between player and station
        if (Math.random() < 0.002) {
            this.targetType = Math.random() < 0.5 ? 'player' : 'station';
        }
    }

    private updateApproaching(targetPos: Vector3, deltaTime: number): void {
        // Move formation center toward target
        const direction = targetPos.subtract(this.formationCenter);
        const distance = direction.length();

        if (distance > 60) {
            // Still approaching
            direction.normalize();
            this.formationCenter.addInPlace(direction.scale(deltaTime * 25));
        } else {
            // Close enough, engage!
            this.state = 'engaging';
            this.stateTimer = 0;
        }

        // Update formation positions
        for (const formation of this.formationPositions) {
            if (formation.enemy) {
                formation.enemy.formationTarget = this.formationCenter.add(formation.offset);
                formation.enemy.inFormation = true;
            }
        }
    }

    private updateEngaging(targetPos: Vector3, deltaTime: number): void {
        // Break formation and attack individually
        for (const enemy of this.enemies) {
            enemy.inFormation = false;
            enemy.combatTarget = targetPos;
        }

        // After engage duration, retreat
        if (this.stateTimer > this.engageDuration) {
            this.state = 'retreating';
            this.stateTimer = 0;
            // Set rally point away from target
            const retreatDirection = this.formationCenter.subtract(targetPos).normalize();
            this.rallyPoint = targetPos.add(retreatDirection.scale(100));
        }
    }

    private updateRetreating(targetPos: Vector3, deltaTime: number): void {
        // Move formation center to rally point
        const direction = this.rallyPoint.subtract(this.formationCenter);
        const distance = direction.length();

        if (distance > 5) {
            direction.normalize();
            this.formationCenter.addInPlace(direction.scale(deltaTime * 35));
        }

        // Reform in loose formation while retreating
        for (const formation of this.formationPositions) {
            if (formation.enemy) {
                formation.enemy.formationTarget = this.formationCenter.add(formation.offset);
                formation.enemy.inFormation = true;
            }
        }

        if (this.stateTimer > this.retreatDuration) {
            this.state = 'regrouping';
            this.stateTimer = 0;
        }
    }

    private updateRegrouping(deltaTime: number): void {
        // Tighten formation at rally point
        for (const formation of this.formationPositions) {
            if (formation.enemy) {
                formation.enemy.formationTarget = this.formationCenter.add(formation.offset);
                formation.enemy.inFormation = true;
            }
        }

        if (this.stateTimer > this.regroupDuration) {
            // Pick new target and approach again
            this.state = 'approaching';
            this.stateTimer = 0;
        }
    }

    public getFormationTarget(enemy: Enemy): Vector3 | null {
        const formation = this.formationPositions.find(f => f.enemy === enemy);
        if (formation) {
            return this.formationCenter.add(formation.offset);
        }
        return null;
    }
}
