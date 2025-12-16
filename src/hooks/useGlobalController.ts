import { kmClient } from '@/services/km-client';
import { BattleSimulation } from '@/state/battle-simulation';
import { globalStore } from '@/state/stores/global-store';
import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { useServerTimer } from './useServerTime';

export function useGlobalController() {
	const { controllerConnectionId, phase } =
		useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(500); // tick every 0.5 seconds for battle
	const isHost = kmClient.clientContext.mode === 'host';

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
