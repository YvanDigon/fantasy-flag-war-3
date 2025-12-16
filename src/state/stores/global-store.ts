import { kmClient } from '@/services/km-client';
import type {
	BattleUnit,
	CombatEvent,
	Flag,
	GamePhase,
	Team
} from '@/types';

export interface GlobalState {
	controllerConnectionId: string;
	started: boolean;
	startTimestamp: number;
	players: Record<
		string,
		{ name: string; team: Team | null; ready: boolean }
	>;
	bots: Record<string, { team: Team; botNumber: number }>; // key: bot ID
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
	combatEvents: Record<string, CombatEvent>; // key: timestamp for auto-sort
	lastBattleTick: number;
}

const initialState: GlobalState = {
	controllerConnectionId: '',
	started: false,
	startTimestamp: 0,
	players: {},
	bots: {},
	phase: 'intro-preparation',
	phaseStartTime: 0,
	scores: { red: 0, blue: 0 },
	lastScoreEvent: null,
	battleUnits: {},
	flags: {},
	combatEvents: {},
	lastBattleTick: 0
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
