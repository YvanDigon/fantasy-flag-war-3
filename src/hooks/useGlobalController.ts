import { kmClient } from '@/services/km-client';
import { BattleSimulation } from '@/state/battle-simulation';
import { globalStore } from '@/state/stores/global-store';
import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { useServerTimer } from './useServerTime';

export function useGlobalController() {
	const { controllerConnectionId, phase, phaseStartTime } =
		useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(500); // tick every 0.5 seconds for battle
	const isHost = kmClient.clientContext.mode === 'host';
	const botsSpawned = useRef<number>(0); // Track last phase when bots were spawned

	// Maintain connection that is assigned to be the global controller
	// CRITICAL: Only host should be controller for reliable battle simulation
	useEffect(() => {
		// Only host can assign itself as controller
		if (!isHost) {
			return;
		}
		
		const connectionIdsArray = Array.from(connectionIds);
		
		console.log('🎮 Controller check (HOST):', {
			currentController: controllerConnectionId,
			myConnectionId: kmClient.connectionId,
			allConnectionIds: connectionIdsArray,
			isControllerOnline: connectionIds.has(controllerConnectionId)
		});
		
		// Check if controller is this host
		if (controllerConnectionId === kmClient.connectionId) {
			console.log('✅ I am the controller (HOST)');
			return;
		}
		
		// Host always takes over as controller
		console.log('🔄 HOST taking over as controller');
		
		kmClient
			.transact([globalStore], ([globalState]) => {
				globalState.controllerConnectionId = kmClient.connectionId;
			})
			.then(() => {
				console.log('✅ Controller assigned to HOST:', kmClient.connectionId);
			})
			.catch((err) => {
				console.error('❌ Failed to assign controller:', err);
			});
	}, [connectionIds, controllerConnectionId, isHost]);

	// Spawn bots after players have had time to spawn (2 seconds after battle phase starts)
	useEffect(() => {
		if (!isGlobalController) {
			return;
		}
		
		if (phase !== 'battle') {
			return;
		}
		
		// Check if we already spawned bots for this battle phase
		if (botsSpawned.current === phaseStartTime) {
			return;
		}
		
		// Wait 2 seconds after phase start to let players spawn first
		const timeSincePhaseStart = serverTime - phaseStartTime;
		if (timeSincePhaseStart < 2000) {
			return;
		}
		
		// Mark bots as spawned for this phase
		botsSpawned.current = phaseStartTime;
		
		console.log('🤖 Spawning bot units based on player deployments');
		
		// Call the spawn bot function from global actions
		// Note: This is a module-level function, not exported in globalActions
		kmClient.transact([globalStore], ([globalState]) => {
			console.log('🤖 Bots to spawn:', Object.keys(globalState.bots));
			console.log('🤖 Player deployments available:', Object.keys(globalState.playerDeployments));
			
			// Check if bots need to spawn units
			if (Object.keys(globalState.bots).length === 0) {
				console.log('⏸️ No bots to spawn');
				return; // No bots to spawn
			}
			
			// For each bot, copy a random player's deployment from their team
			Object.entries(globalState.bots).forEach(([botId, bot]) => {
				// Get all player deployments from bot's team
				let teamDeployments = Object.entries(globalState.playerDeployments)
					.filter(([_, deployment]) => deployment.team === bot.team);
				
				// If no deployments from bot's team, try to copy from enemy team
				if (teamDeployments.length === 0) {
					console.log(`⚠️ Bot ${botId}: No ${bot.team} team deployments found, copying from enemy team`);
					teamDeployments = Object.entries(globalState.playerDeployments)
						.filter(([_, deployment]) => deployment.team !== bot.team);
					
					if (teamDeployments.length === 0) {
						console.log(`⚠️ Bot ${botId}: No deployments at all, skipping`);
						return;
					}
				}
				
				console.log(`✅ Bot ${botId}: Found ${teamDeployments.length} deployments to copy from`);
				
				// Pick a random player's deployment to copy
				const [_, playerDeployment] = teamDeployments[
					Math.floor(Math.random() * teamDeployments.length)
				];
				
				// Get available lanes (top, mid, bot) and shuffle them
				const availableLanes: ('top' | 'mid' | 'bot')[] = ['top', 'mid', 'bot'];
				const shuffledLanes = availableLanes.sort(() => Math.random() - 0.5);
				
				let defenderSpawned = false;
				let laneIndex = 0;
				
				// Copy each unit from the player's deployment
				playerDeployment.units.forEach((playerUnit, unitIndex) => {
					// Determine lane for this bot unit
					let lane: 'top' | 'mid' | 'bot';
					let isDefender = false;
					
					if (playerUnit.isDefender && !defenderSpawned) {
						// This is a defender, spawn at castle (max 1 defender)
						lane = 'mid'; // Defenders use mid lane for positioning
						isDefender = true;
						defenderSpawned = true;
					} else {
						// Regular unit, assign to different lane
						lane = shuffledLanes[laneIndex % shuffledLanes.length];
						laneIndex++;
					}
					
					const unitId = `${botId}-${unitIndex}`;
					
					// Add small random offset to prevent perfect overlap (±2 position units)
					const randomOffset = (Math.random() * 4) - 2;
					const basePosition = bot.team === 'red' ? 0 : 100;
					const startPosition = bot.team === 'red' 
						? Math.max(0, basePosition + randomOffset)
						: Math.min(100, basePosition + randomOffset);
					
// Copy the unit with same stats but different lane and bot-prefixed name
				const botUnit = {
					id: unitId,
					playerId: botId,
					team: bot.team,
					lane,
					stats: { 
						...playerUnit.stats,
						name: `Bot ${bot.botNumber} ${playerUnit.stats.name}` // Prefix with bot number
					},
						currentHp: playerUnit.stats.hp,
						position: startPosition,
						movingTowardEnemy: !isDefender,
						carryingFlag: false,
						isDead: false,
						sprite: playerUnit.sprite,
						inCombatWith: undefined,
						isDefender
					};
					
					globalState.battleUnits[unitId] = botUnit;
				});
			});
		});
	}, [isGlobalController, phase, serverTime, phaseStartTime]);

	// Battle simulation logic
	useEffect(() => {
		if (!isGlobalController) {
			console.log('⏸️ Not global controller, skipping tick');
			return;
		}
		
		if (phase !== 'battle') {
			console.log('⏸️ Not in battle phase, skipping tick. Phase:', phase);
			return;
		}

		const lastBattleTick = globalStore.proxy.lastBattleTick;
		
		console.log('⚔️ Battle tick check:', {
			serverTime,
			lastBattleTick,
			diff: serverTime - lastBattleTick,
			shouldRun: serverTime - lastBattleTick >= 500
		});

		// Check if enough time has passed since last tick (0.5 seconds)
		if (serverTime - lastBattleTick < 500) {
			console.log('⏸️ Not enough time passed, skipping tick');
			return;
		}

		console.log('✅ Running battle tick');

		// Process battle tick
		kmClient
			.transact([globalStore], ([globalState]) => {
				console.log('🎮 Processing tick. Units:', Object.keys(globalState.battleUnits).length);
				BattleSimulation.tick(globalState);
				globalState.lastBattleTick = kmClient.serverTimestamp();
			})
			.catch((err) => {
				console.error('💥 Battle tick error:', err);
			});
	}, [isGlobalController, serverTime, phase]);

	return isGlobalController;
}
