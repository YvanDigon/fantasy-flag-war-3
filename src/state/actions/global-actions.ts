import { kmClient } from '@/services/km-client';
import type { Lane, Team } from '@/types';
import { globalStore } from '../stores/global-store';

export const globalActions = {
	async startGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.started = true;
			globalState.startTimestamp = kmClient.serverTimestamp();
			globalState.phase = 'intro-preparation';
			globalState.phaseStartTime = kmClient.serverTimestamp();
			
			// Initialize flags
			const lanes: Lane[] = ['top', 'mid', 'bot'];
			const teams: Team[] = ['red', 'blue'];
			
			teams.forEach((team) => {
				lanes.forEach((lane) => {
					const flagId = `${team}-${lane}`;
					globalState.flags[flagId] = {
						id: flagId,
						team,
						lane,
						position: team === 'red' ? 0 : 100,
						status: 'at-castle'
					};
				});
			});
		});
	},

	async stopGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.started = false;
			globalState.startTimestamp = 0;
			globalState.phase = 'intro-preparation';
			globalState.battleUnits = {};
			globalState.flags = {};
			globalState.combatEvents = {};
			globalState.scores = { red: 0, blue: 0 };
		});
	},

	async endPreparationPhase() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.phase = 'battle';
			globalState.phaseStartTime = kmClient.serverTimestamp();
			globalState.lastBattleTick = 0; // Set to 0 to allow immediate first tick

			// Reset ready states
			Object.keys(globalState.players).forEach((playerId) => {
				globalState.players[playerId].ready = false;
			});

			// Balance teams with bots
			const redPlayers = Object.values(globalState.players).filter(p => p.team === 'red').length;
			const bluePlayers = Object.values(globalState.players).filter(p => p.team === 'blue').length;
			
			// Clear existing bots
			globalState.bots = {};
			
			if (redPlayers > bluePlayers) {
				// Add bots to blue team
				const botsNeeded = redPlayers - bluePlayers;
				for (let i = 0; i < botsNeeded; i++) {
					const botId = `bot-blue-${i}`;
					globalState.bots[botId] = { team: 'blue', botNumber: i + 1 };
				}
			} else if (bluePlayers > redPlayers) {
				// Add bots to red team
				const botsNeeded = bluePlayers - redPlayers;
				for (let i = 0; i < botsNeeded; i++) {
					const botId = `bot-red-${i}`;
					globalState.bots[botId] = { team: 'red', botNumber: i + 1 };
				}
			}

			// Spawn bot units
			const soldierTypes = ['melee', 'mage', 'ranged'] as const;
			const lanes: Lane[] = ['top', 'mid', 'bot'];
			
			Object.entries(globalState.bots).forEach(([botId, bot]) => {
				// Random class for this bot (same for all 3 units)
				const botClass = soldierTypes[Math.floor(Math.random() * soldierTypes.length)];
				
				const botSprite = botClass === 'melee'
					? 'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153228778.png'
					: botClass === 'mage'
						? 'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153223922.png'
						: 'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153218722.png';
				
				// Deploy one soldier on each lane
				lanes.forEach((lane) => {
					const unitId = `${botId}-${lane}`;
					
					// Add small random offset to prevent perfect overlap (±2 position units)
					const randomOffset = (Math.random() * 4) - 2;
					const basePosition = bot.team === 'red' ? 0 : 100;
					const startPosition = bot.team === 'red' 
						? Math.max(0, basePosition + randomOffset)
						: Math.min(100, basePosition + randomOffset);
					
					globalState.battleUnits[unitId] = {
						id: unitId,
						playerId: botId,
						team: bot.team,
						lane,
						stats: {
							hp: 100,
							type: botClass,
							name: `Bot ${bot.botNumber} ${botClass}`,
							attack: 5,
							defense: 5,
							speed: 5,
							criticalHitRate: 5,
							goldGeneration: 5
						},
						currentHp: 100,
						position: startPosition,
						movingTowardEnemy: true,
						carryingFlag: false,
						isDead: false,
						sprite: botSprite,
						inCombatWith: undefined,
						isDefender: false
					};
				});
			});

			// Note: Each player will spawn their own units when they detect phase change
		});
	},

	async finishBattlePhase() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.phase = 'preparation';
			globalState.phaseStartTime = kmClient.serverTimestamp();

			// Award points for any units still carrying flags when battle ends
			Object.values(globalState.battleUnits).forEach((unit) => {
				if (unit.carryingFlag) {
					// Find the flag this unit is carrying
					const carriedFlag = Object.values(globalState.flags).find(
						flag => flag.carrierId === unit.id
					);
					
					if (carriedFlag && carriedFlag.team !== unit.team) {
						// Unit is carrying an enemy flag, award point to their team
						if (unit.team === 'red') {
							globalState.scores.red += 1;
						} else {
							globalState.scores.blue += 1;
						}
					}
				}
			});

			// Clear battle state
			globalState.battleUnits = {};
			globalState.combatEvents = {};

			// Return flags to castles
			Object.keys(globalState.flags).forEach((flagId) => {
				const flag = globalState.flags[flagId];
				flag.position = flag.team === 'red' ? 0 : 100;
				flag.status = 'at-castle';
				flag.carrierId = undefined;
			});

			// Reset ready states for new preparation phase
			Object.keys(globalState.players).forEach((playerId) => {
				globalState.players[playerId].ready = false;
			});

			// Note: Each player receives gold when they detect phase change to 'preparation'
		});
	},

	async resetPlayers() {
		await kmClient.transact([globalStore], ([globalState]) => {
			// Clear all players
			globalState.players = {};
		});
	}
};
