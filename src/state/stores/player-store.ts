import { kmClient } from '@/services/km-client';
import type { DeployedUnit, EvolutionOption, Team, UnitStats } from '@/types';

export interface CombatResult {
	opponentName: string;
	opponentSprite: string;
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
	currentEvolutionOptions: EvolutionOption[] | null;
	superEvolutionTitle: string | null;
	hasDeployedDefender: boolean;
	kills: CombatResult[]; // Enemies your soldiers killed
	deaths: CombatResult[]; // Your soldiers killed by enemies
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
	currentEvolutionOptions: null,
	superEvolutionTitle: null,
	hasDeployedDefender: false,
	kills: [],
	deaths: []
};

export const playerStore = kmClient.localStore<PlayerState>(
	'player',
	initialState
);
