import { CombatHistory } from '@/components/player/combat-history';
import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import type { Lane, SoldierType } from '@/types';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const SOLDIER_IMAGES: Record<SoldierType, string> = {
	melee:
		'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153228778.png',
	mage: 'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153223922.png',
	ranged:
		'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153218722.png'
};

const getStars = (value: number): string => {
	if (value < 5) return '';
	return ' ' + '⭐'.repeat(Math.floor(value / 5));
};

export const CommanderView: React.FC = () => {
	const { gold, soldierStats, deployedUnits, hasDeployedDefender, readyBonus, team, evolutionLevel, hasSuperEvolved } = useSnapshot(playerStore.proxy);
	const { players } = useSnapshot(globalStore.proxy);
	const [showLaneSelector, setShowLaneSelector] = React.useState(false);
	const [selectedLane, setSelectedLane] = React.useState<Lane | null>(null);
	const [isDefenderDeployment, setIsDefenderDeployment] = React.useState(false);

	const isReady = players[kmClient.id]?.ready || false;
	const canAffordDeploy = gold >= 100 && !isReady;
	const canAffordEvolve = gold >= 100 && !isReady;

	// Count deployments per lane
	const deploymentCounts = React.useMemo(() => {
		const counts = { top: 0, mid: 0, bot: 0 };
		Object.values(deployedUnits).forEach((unit) => {
			if (unit.lane && !unit.isDefender) {
				counts[unit.lane]++;
			}
		});
		return counts;
	}, [deployedUnits]);

	// Generate deployment indicator (person emojis)
	const getDeploymentIndicator = (lane: Lane) => {
		const count = deploymentCounts[lane];
		if (count === 0) return '';
		if (count <= 3) return ' ' + '👤'.repeat(count);
		return ' 👤👤👤+';
	};

	// Calculate stats with ready bonus
	const effectiveAttack = soldierStats.attack + (readyBonus ? 1 : 0);
	const effectiveDefense = soldierStats.defense + (readyBonus ? 1 : 0);
	const effectiveSpeed = soldierStats.speed + (readyBonus ? 1 : 0);
	const effectiveCriticalHit = soldierStats.criticalHitRate + (readyBonus ? 1 : 0);

	// Calculate level display
	const levelDisplay = `Lvl ${evolutionLevel}${hasSuperEvolved ? '+' : ''}`;

	const handleDeploy = async () => {
		if (!canAffordDeploy) return;
		if (!isDefenderDeployment && !selectedLane) return;

		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.gold -= 100;
			const timestamp = kmClient.serverTimestamp();
			playerState.deployedUnits[timestamp.toString()] = {
				lane: selectedLane,
				timestamp,
				isDefender: isDefenderDeployment
			};
			
			if (isDefenderDeployment) {
				playerState.hasDeployedDefender = true;
			}
		});

		setShowLaneSelector(false);
		setSelectedLane(null);
		setIsDefenderDeployment(false);
	};

	const handleEvolve = async () => {
		if (!canAffordEvolve) return;

		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = 'evolution';
		});
	};

	const handleReady = async () => {
		await kmClient.transact([globalStore, playerStore], ([globalState, playerState]) => {
			if (globalState.players[kmClient.id]) {
				globalState.players[kmClient.id].ready = true;
			}
			// Grant ready bonus
			playerState.readyBonus = true;
		});
	};

	const deployedUnitsArray = Object.values(deployedUnits);

	return (
		<div className="flex w-full max-w-4xl flex-col gap-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">{config.commanderTitle}</h1>
				<div className="text-2xl font-bold text-yellow-600">
					{config.gold}: {gold}
				</div>
			</div>

			{!canAffordDeploy && !canAffordEvolve && (
				<div className="rounded-lg bg-gray-100 p-4 text-center text-gray-700">
					You don't have enough gold to deploy or evolve. Please get ready.
				</div>
			)}

			<div className="rounded-lg border-2 border-gray-300 bg-white p-6">
				<div className="mb-4 flex items-center gap-4">
					<img
						src={soldierStats.sprite || SOLDIER_IMAGES[soldierStats.type]}
						alt={soldierStats.type}
						className={`h-24 w-24 object-contain ${soldierStats.visualEffect || 'effect-default'}`}
					/>
					<div className="flex-1">
						<h2 className="mb-3 text-2xl font-bold text-bark-800">
							{soldierStats.name} <span className="text-lg text-bark-600">{levelDisplay}</span>
						</h2>
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div>
								<strong>{config.type}:</strong> {soldierStats.type === 'melee' ? '⚔️' : soldierStats.type === 'mage' ? '🧙' : '🏹'} {soldierStats.type}
							</div>
							<div>
								<strong>{config.attack}:</strong> {effectiveAttack}{readyBonus && <span className="text-green-600"> (+1)</span>}{getStars(effectiveAttack)}
							</div>
							<div>
								<strong>{config.defense}:</strong> {effectiveDefense}{readyBonus && <span className="text-green-600"> (+1)</span>}{getStars(effectiveDefense)}
							</div>
							<div>
								<strong>{config.speed}:</strong> {effectiveSpeed}{readyBonus && <span className="text-green-600"> (+1)</span>}{getStars(effectiveSpeed)}
							</div>
							<div>
								<strong>{config.criticalHitRate}:</strong> {effectiveCriticalHit}{readyBonus && <span className="text-green-600"> (+1)</span>}{getStars(effectiveCriticalHit)}
							</div>
							<div>
								<strong>{config.goldGeneration}:</strong> {soldierStats.goldGeneration}{getStars(soldierStats.goldGeneration)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				{showLaneSelector ? (
					<div className="rounded-lg border-2 border-blue-600 bg-blue-50 p-4">
						<h3 className="mb-3 text-lg font-bold">{config.selectLane}</h3>
						<div className="grid grid-cols-2 gap-2">
							{team === 'blue' ? (
								<>
									<button
										onClick={() => {
											setSelectedLane('top');
											setIsDefenderDeployment(false);
										}}
										className={`rounded px-4 py-3 font-bold text-white transition ${
											selectedLane === 'top' && !isDefenderDeployment
												? 'bg-fuchsia-700 ring-4 ring-fuchsia-300'
												: 'bg-fuchsia-600 hover:bg-fuchsia-700'
										}`}
									>
										{config.topLane}{getDeploymentIndicator('top')}
									</button>
									<button
										onClick={() => {
											setSelectedLane(null);
											setIsDefenderDeployment(true);
										}}
										disabled={hasDeployedDefender}
										className={`rounded px-4 py-3 font-bold text-white transition ${
											isDefenderDeployment
												? 'bg-blue-700 ring-4 ring-blue-300'
												: 'bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400'
										}`}
									>
										{config.defendCastleButton} {hasDeployedDefender && '✓'}
									</button>
									<button
										onClick={() => {
											setSelectedLane('mid');
											setIsDefenderDeployment(false);
										}}
										className={`rounded px-4 py-3 font-bold text-white transition ${
											selectedLane === 'mid' && !isDefenderDeployment
												? 'bg-yellow-700 ring-4 ring-yellow-300'
												: 'bg-yellow-600 hover:bg-yellow-700'
										}`}
									>
										{config.midLane}{getDeploymentIndicator('mid')}
									</button>
									<button
										onClick={() => {
											setSelectedLane('bot');
											setIsDefenderDeployment(false);
										}}
										className={`rounded px-4 py-3 font-bold text-white transition ${
											selectedLane === 'bot' && !isDefenderDeployment
												? 'bg-teal-700 ring-4 ring-teal-300'
												: 'bg-teal-600 hover:bg-teal-700'
										}`}
									>
										{config.botLane}{getDeploymentIndicator('bot')}
									</button>
								</>
							) : (
								<>
									<button
										onClick={() => {
											setSelectedLane('top');
											setIsDefenderDeployment(false);
										}}
										className={`rounded px-4 py-3 font-bold text-white transition ${
											selectedLane === 'top' && !isDefenderDeployment
												? 'bg-fuchsia-700 ring-4 ring-fuchsia-300'
												: 'bg-fuchsia-600 hover:bg-fuchsia-700'
										}`}
									>
										{config.topLane}{getDeploymentIndicator('top')}
									</button>
									<button
										onClick={() => {
											setSelectedLane('mid');
											setIsDefenderDeployment(false);
										}}
										className={`rounded px-4 py-3 font-bold text-white transition ${
											selectedLane === 'mid' && !isDefenderDeployment
												? 'bg-yellow-700 ring-4 ring-yellow-300'
												: 'bg-yellow-600 hover:bg-yellow-700'
										}`}
									>
										{config.midLane}{getDeploymentIndicator('mid')}
									</button>
									<button
										onClick={() => {
											setSelectedLane(null);
											setIsDefenderDeployment(true);
										}}
										disabled={hasDeployedDefender}
										className={`rounded px-4 py-3 font-bold text-white transition ${
											isDefenderDeployment
												? 'bg-red-700 ring-4 ring-red-300'
												: 'bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400'
										}`}
									>
										{config.defendCastleButton} {hasDeployedDefender && '✓'}
									</button>
									<button
										onClick={() => {
											setSelectedLane('bot');
											setIsDefenderDeployment(false);
										}}
										className={`rounded px-4 py-3 font-bold text-white transition ${
											selectedLane === 'bot' && !isDefenderDeployment
												? 'bg-teal-700 ring-4 ring-teal-300'
												: 'bg-teal-600 hover:bg-teal-700'
										}`}
									>
										{config.botLane}{getDeploymentIndicator('bot')}
									</button>
								</>
							)}
						</div>
						
						<button
							onClick={handleDeploy}
							disabled={(!selectedLane && !isDefenderDeployment) || !canAffordDeploy || (isDefenderDeployment && hasDeployedDefender)}
							className="mt-3 w-full rounded-lg bg-green-600 px-6 py-3 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
						>
							Deploy (100 {config.gold})
						</button>
						<button
							onClick={() => {
								setShowLaneSelector(false);
								setSelectedLane(null);
								setIsDefenderDeployment(false);
							}}
							className="mt-2 w-full rounded bg-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-400"
						>
							{config.backButton}
						</button>
					</div>
				) : (
					<button
						onClick={() => setShowLaneSelector(true)}
						disabled={!canAffordDeploy}
						className="rounded-lg bg-green-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
					>
						{config.deployButton}
					</button>
				)}

				<button
					onClick={handleEvolve}
					disabled={!canAffordEvolve}
					className="rounded-lg bg-purple-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
				>
					{config.evolveButton}
				</button>

				<button
					onClick={handleReady}
					disabled={isReady}
					className={`rounded-lg px-8 py-4 text-xl font-bold text-white transition ${
						isReady
							? 'cursor-not-allowed bg-green-600'
							: 'bg-blue-600 hover:bg-blue-700'
					}`}
				>
					{isReady ? '✓ Ready' : config.readyButton}
				</button>
				
				{isReady && (
					<div className="rounded-lg bg-blue-100 p-4 text-center font-bold text-blue-800">
						Waiting for the host to start the battle...
					</div>
				)}
			</div>

			{deployedUnitsArray.length > 0 && (
				<div className="rounded-lg border-2 border-gray-300 bg-white p-4">
					<h3 className="mb-2 text-lg font-bold">{config.deployedUnits}</h3>
					<div className="space-y-1 text-sm">
						{deployedUnitsArray.map((unit, idx) => (
							<div key={unit.timestamp}>
								#{idx + 1}: {unit.isDefender ? '🛡️ ' + config.defendCastleButton : unit.lane?.toUpperCase() + ' Lane'}
							</div>
						))}
					</div>
				</div>
			)}

			<CombatHistory />
		</div>
	);
};
