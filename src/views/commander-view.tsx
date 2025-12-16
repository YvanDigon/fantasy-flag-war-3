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

export const CommanderView: React.FC = () => {
	const { gold, soldierStats, deployedUnits, hasDeployedDefender } = useSnapshot(playerStore.proxy);
	const { players } = useSnapshot(globalStore.proxy);
	const [showLaneSelector, setShowLaneSelector] = React.useState(false);
	const [selectedLane, setSelectedLane] = React.useState<Lane | null>(null);
	const [isDefenderDeployment, setIsDefenderDeployment] = React.useState(false);

	const isReady = players[kmClient.id]?.ready || false;
	const canAffordDeploy = gold >= 100 && !isReady;
	const canAffordEvolve = gold >= 100 && !isReady;

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
		await kmClient.transact([globalStore], ([globalState]) => {
			if (globalState.players[kmClient.id]) {
				globalState.players[kmClient.id].ready = true;
			}
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

			{/* Soldier Stats */}
			<div className="rounded-lg border-2 border-gray-300 bg-white p-6">
				<div className="mb-4 flex items-center gap-4">
					<img
						src={soldierStats.sprite || SOLDIER_IMAGES[soldierStats.type]}
						alt={soldierStats.type}
						className={`h-24 w-24 object-contain ${soldierStats.visualEffect || 'effect-default'}`}
					/>
					<div className="flex-1">
						<h2 className="mb-3 text-2xl font-bold text-bark-800">
							{soldierStats.name}
						</h2>
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div>
								<strong>{config.type}:</strong> {soldierStats.type}
							</div>
							<div>
								<strong>{config.hp}:</strong> {soldierStats.hp}
							</div>
							<div>
								<strong>{config.attack}:</strong> {soldierStats.attack}
							</div>
							<div>
								<strong>{config.defense}:</strong> {soldierStats.defense}
							</div>
							<div>
								<strong>{config.speed}:</strong> {soldierStats.speed}
							</div>
							<div>
								<strong>{config.criticalHitRate}:</strong>{' '}
								{soldierStats.criticalHitRate}
							</div>
							<div>
								<strong>{config.goldGeneration}:</strong>{' '}
								{soldierStats.goldGeneration}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="flex flex-col gap-4">
				{showLaneSelector ? (
					<div className="rounded-lg border-2 border-blue-600 bg-blue-50 p-4">
						<h3 className="mb-3 text-lg font-bold">{config.selectLane}</h3>
						<div className="grid grid-cols-2 gap-2">
							<button
								onClick={() => {
									setSelectedLane('top');
									setIsDefenderDeployment(false);
								}}
								className={`rounded px-4 py-3 font-bold text-white transition ${
									selectedLane === 'top' && !isDefenderDeployment
										? 'bg-blue-700 ring-4 ring-blue-300'
										: 'bg-blue-600 hover:bg-blue-700'
								}`}
							>
								{config.topLane}
							</button>
							<button
								onClick={() => {
									setSelectedLane('mid');
									setIsDefenderDeployment(false);
								}}
								className={`rounded px-4 py-3 font-bold text-white transition ${
									selectedLane === 'mid' && !isDefenderDeployment
										? 'bg-blue-700 ring-4 ring-blue-300'
										: 'bg-blue-600 hover:bg-blue-700'
								}`}
							>
								{config.midLane}
							</button>
							<button
								onClick={() => {
									setSelectedLane('bot');
									setIsDefenderDeployment(false);
								}}
								className={`rounded px-4 py-3 font-bold text-white transition ${
									selectedLane === 'bot' && !isDefenderDeployment
										? 'bg-blue-700 ring-4 ring-blue-300'
										: 'bg-blue-600 hover:bg-blue-700'
								}`}
							>
								{config.botLane}
							</button>
							<button
								onClick={() => {
									setSelectedLane(null);
									setIsDefenderDeployment(true);
								}}
								disabled={hasDeployedDefender}
								className={`rounded px-4 py-3 font-bold text-white transition ${
									isDefenderDeployment
										? 'bg-orange-700 ring-4 ring-orange-300'
										: 'bg-orange-600 hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-400'
								}`}
							>
								{config.defendCastleButton} {hasDeployedDefender && '✓'}
							</button>
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

			{/* Deployed Units */}
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

			{/* Combat History */}
			<CombatHistory />

			{!canAffordDeploy && !canAffordEvolve && (
				<div className="rounded-lg bg-red-100 p-4 text-center text-red-700">
					{config.notEnoughGold}
				</div>
			)}
		</div>
	);
};
