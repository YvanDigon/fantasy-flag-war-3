import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { useSnapshot } from 'valtio';

export const DebugView = () => {
	const { 
		controllerConnectionId, 
		phase, 
		battleUnits, 
		lastBattleTick,
		players,
		bots
	} = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = Array.from(connections.connectionIds);
	
	const isController = controllerConnectionId === kmClient.connectionId;
	
	const unitCount = Object.keys(battleUnits).length;
	const aliveUnits = Object.values(battleUnits).filter(u => !u.isDead);
	
	return (
		<div className="rounded-lg border border-gray-300 bg-white p-4 text-sm">
			<h3 className="mb-2 font-bold">Debug Info</h3>
			
			<div className="space-y-1">
				<div><strong>Phase:</strong> {phase}</div>
				<div><strong>My Connection ID:</strong> {kmClient.connectionId}</div>
				<div><strong>Controller ID:</strong> {controllerConnectionId || '(none)'}</div>
				<div><strong>Am I Controller?</strong> {isController ? 'YES' : 'NO'}</div>
				<div><strong>All Connections:</strong> {connectionIds.join(', ')}</div>
				<div><strong>Players:</strong> {Object.keys(players).length}</div>
				<div><strong>Bots:</strong> {Object.keys(bots).length}</div>
				<div><strong>Last Battle Tick:</strong> {lastBattleTick}</div>
				<div><strong>Server Time:</strong> {kmClient.serverTimestamp()}</div>
				<div><strong>Time Since Tick:</strong> {kmClient.serverTimestamp() - lastBattleTick}ms</div>
				<div><strong>Total Units:</strong> {unitCount}</div>
				<div><strong>Alive Units:</strong> {aliveUnits.length}</div>
				
				{aliveUnits.length > 0 && (
					<div className="mt-2 border-t pt-2">
						<strong>Units:</strong>
						{aliveUnits.slice(0, 5).map(unit => (
							<div key={unit.id} className="ml-4 text-xs">
								{unit.id}: pos={unit.position.toFixed(1)}, 
								team={unit.team}, 
								lane={unit.lane || 'defender'},
								moving={unit.movingTowardEnemy ? '→' : '←'},
								combat={unit.inCombatWith || 'none'}
							</div>
						))}
						{aliveUnits.length > 5 && <div className="ml-4 text-xs">...and {aliveUnits.length - 5} more</div>}
					</div>
				)}
			</div>
		</div>
	);
};
