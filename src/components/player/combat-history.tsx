import { playerStore } from '@/state/stores/player-store';
import { useSnapshot } from 'valtio';

export const CombatHistory = () => {
	const { kills, deaths } = useSnapshot(playerStore.proxy);

	if (kills.length === 0 && deaths.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Kills - Enemies your soldiers killed */}
			{kills.length > 0 && (
				<div>
					<h3 className="mb-2 text-center text-sm font-bold text-green-700">
						Your Kills
					</h3>
					<div className="flex flex-wrap justify-center gap-2">
						{kills.map((kill, index) => (
							<div
								key={`kill-${kill.timestamp}-${index}`}
								className="flex flex-col items-center rounded-lg border-2 border-green-600 bg-green-50 p-2"
							>
								<img
									src={kill.opponentSprite}
									alt={kill.opponentName}
									className="h-12 w-12 object-contain"
								/>
								<span className="mt-1 text-xs font-semibold text-green-900">
									{kill.opponentName}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Deaths - Your soldiers killed by enemies */}
			{deaths.length > 0 && (
				<div>
					<h3 className="mb-2 text-center text-sm font-bold text-red-700">
						Your Deaths
					</h3>
					<div className="flex flex-wrap justify-center gap-2">
						{deaths.map((death, index) => (
							<div
								key={`death-${death.timestamp}-${index}`}
								className="flex flex-col items-center rounded-lg border-2 border-red-600 bg-red-50 p-2"
							>
								<img
									src={death.opponentSprite}
									alt={death.opponentName}
									className="h-12 w-12 object-contain"
								/>
								<span className="mt-1 text-xs font-semibold text-red-900">
									{death.opponentName}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
