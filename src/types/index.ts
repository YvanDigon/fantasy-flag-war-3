import type { Config } from '@/config/schema';

export interface HostClientContext {
	mode: 'host';
	playerCode: string;
	presenterCode: string;
}

export interface PresenterClientContext {
	mode: 'presenter';
	playerCode: string;
}

export interface PlayerClientContext {
	mode: 'player';
}

export type ClientContext =
	| HostClientContext
	| PresenterClientContext
	| PlayerClientContext;

export interface KmEnv {
	dev: boolean;
	test: boolean;
	host: string;
	appId: string;
	code?: string;
	clientContext?: string;
	config?: string;
	configObject?: Config;
	base: string;
	assets: string;
}

// Game types
export type Team = 'red' | 'blue';
export type SoldierType = 'melee' | 'mage' | 'ranged';
export type Lane = 'top' | 'mid' | 'bot';
export type GamePhase = 'intro-preparation' | 'preparation' | 'battle';

export interface UnitStats {
	hp: number; // Always 100
	type: SoldierType;
	name: string; // Unit name (e.g., "Berserker Knight", "Void Mage")
	attack: number;
	defense: number;
	speed: number;
	criticalHitRate: number;
	goldGeneration: number;
	sprite?: string; // Custom AI-generated sprite URL (optional)
	visualEffect?: string; // CSS class for sprite visual effects
	superSprites?: { // Super evolution sprites for all classes
		melee?: string;
		mage?: string;
		ranged?: string;
	};
}

export interface BattleUnit {
	id: string; // Unique unit ID
	playerId: string;
	team: Team;
	lane: Lane;
	stats: UnitStats;
	currentHp: number;
	position: number; // 0 to 100 (percentage across lane)
	movingTowardEnemy: boolean; // true = toward enemy, false = toward own castle
	carryingFlag: boolean;
	flagId?: string; // ID of flag being carried
	isDead: boolean;
	sprite: string; // Image URL
	inCombatWith?: string; // ID of enemy unit currently fighting
	isDefender: boolean; // Castle defender (has 2x defense, can't dodge)
}

export interface Flag {
	id: string;
	team: Team; // Which team owns this flag
	lane: Lane;
	position: number; // 0 to 100
	status: 'at-castle' | 'carried' | 'dropped';
	carrierId?: string; // Unit ID carrying this flag
}

export interface EvolutionOption {
	name: string; // AI-generated fantasy name
	type: SoldierType;
	statBoosts: {
		stat1: keyof Omit<UnitStats, 'hp' | 'type'>;
		stat2: keyof Omit<UnitStats, 'hp' | 'type'>;
	};
}

export interface SuperEvolutionOption {
	boostStat: keyof Omit<UnitStats, 'hp' | 'type' | 'name' | 'sprite'>;
	boostAmount: number; // +15
	decreaseStat: keyof Omit<UnitStats, 'hp' | 'type' | 'name' | 'sprite'>;
	decreaseAmount: number; // -3
}

export interface DeployedUnit {
	lane: Lane | null; // null for defenders
	timestamp: number;
	isDefender: boolean;
}

export interface CombatEvent {
	id: string;
	timestamp: number;
	type: 'hit' | 'critical' | 'dodge' | 'death';
	attackerId: string;
	defenderId?: string;
	damage?: number;
}
