import { kmClient } from '@/services/km-client';
import type { DeployedUnit, EvolutionOption, Team, UnitStats } from '@/types';

export interface CombatResult {
	opponentName: string;
	opponentSprite: string;
	timestamp: number;
}

export interface GoldPickupResult {
	amount: number;
	timestamp: number;
}

export interface PlayerState {
	name: string;
	currentView:
		| 'team-selection'
		| 'intro-preparation'
		| 'commander'
		| 'evolution'
		| 'super-evolution'
		| 'battle-wait';
	team: Team | null;
	gold: number;
	soldierStats: UnitStats;
	deployedUnits: Record<string, DeployedUnit>; // key: timestamp for tracking
	hasSelectedStartingSoldier: boolean;
	hasSuperEvolved: boolean;
	evolutionLevel: number; // Number of regular evolutions done
	currentEvolutionOptions: EvolutionOption[] | null;
	superEvolutionTitle: string | null;
	hasDeployedDefender: boolean;
	readyBonus: boolean; // +1 bonus to attack, defense, speed, critical hit for pressing Ready early
	kills: CombatResult[]; // Enemies your soldiers killed
	deaths: CombatResult[]; // Your soldiers killed by enemies
	goldPickups: GoldPickupResult[]; // Gold bags collected during battle
}

const initialState: PlayerState = {
	name: '',
	currentView: 'team-selection',
	team: null,
	gold: 200,
	soldierStats: {
		hp: 100,
		type: 'melee',
		name: 'Warrior',
		attack: 5,
		defense: 5,
		speed: 5,
		criticalHitRate: 5,
		goldGeneration: 5
	},
	deployedUnits: {},
	hasSelectedStartingSoldier: false,
	hasSuperEvolved: false,
	evolutionLevel: 0,
	currentEvolutionOptions: null,
	superEvolutionTitle: null,
	hasDeployedDefender: false,
	readyBonus: false,
	kills: [],
	deaths: [],
	goldPickups: []
};

export const playerStore = kmClient.localStore<PlayerState>(
	'player',
	initialState
);
