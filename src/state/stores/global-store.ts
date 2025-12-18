import { kmClient } from '@/services/km-client';
import type {
	BattleUnit,
	CombatEvent,
	Flag,
	GamePhase,
	GoldPickup,
	Team
} from '@/types';

export interface GlobalState {
	controllerConnectionId: string;
	started: boolean;
	startTimestamp: number;
	players: Record<
		string,
		{ name: string; team: Team | null; ready: boolean; isGeneratingSprite: boolean }
	>;
	bots: Record<string, { team: Team; botNumber: number }>; // key: bot ID
	playerDeployments: Record<string, { team: Team; units: BattleUnit[] }>; // Track player deployments for bot copying
	goldMagnetCount: { red: number; blue: number }; // Count of players with Gold Magnet skill per team
	// Game state
	phase: GamePhase;
	phaseStartTime: number;
	scores: { red: number; blue: number };
	lastScoreEvent: {
		playerName: string;
		soldierName: string;
		team: Team;
		sprite: string;
		timestamp: number;
	} | null;
	// Battle state
	battleUnits: Record<string, BattleUnit>; // key: unit ID
	flags: Record<string, Flag>; // key: flag ID
	goldPickups: Record<string, GoldPickup>; // key: gold ID
	combatEvents: Record<string, CombatEvent>; // key: timestamp for auto-sort
	lastBattleTick: number;
}

const initialState: GlobalState = {
	controllerConnectionId: '',
	started: false,
	startTimestamp: 0,
	players: {},
	bots: {},
	playerDeployments: {},
	goldMagnetCount: { red: 0, blue: 0 },
	phase: 'intro-preparation',
	phaseStartTime: 0,
	scores: { red: 0, blue: 0 },
	lastScoreEvent: null,
	battleUnits: {},
	flags: {},
	goldPickups: {},
	combatEvents: {},
	lastBattleTick: 0
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
