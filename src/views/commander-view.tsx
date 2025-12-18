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

function getSuperSkillEmoji(skill: string): string {
	const emojis: Record<string, string> = {
		teleport: '🚀',
		'gold-magnet': '🧲',
		'war-economy': '💰',
		fortress: '🏰',
		acrobat: '🤸',
		infiltrator: '🥷',
		'big-net': '🕸️',
		warmaster: '⚔️',
		'solid-stone': '🛡️'
	};
	return emojis[skill] || '✨';
}

function getSuperSkillName(skill: string): string {
	const names: Record<string, string> = {
		teleport: 'Teleport',
		'gold-magnet': 'Gold Magnet',
		'war-economy': 'War Economy',
		fortress: 'Fortress',
		acrobat: 'Acrobat',
		infiltrator: 'Infiltrator',
		'big-net': 'Big Net',
		warmaster: 'Warmaster',
		'solid-stone': 'Solid Stone'
	};
	return names[skill] || skill;
}

function getSuperSkillDescription(skill: string): string {
	const descriptions: Record<string, string> = {
		teleport: 'Spawn 10-50% forward',
		'gold-magnet': 'Gold bags spawn closer',
		'war-economy': '-20% costs, -10% stats',
		fortress: 'Defender +25% attack',
		acrobat: 'Dodge weaker opponents',
		infiltrator: 'Dodge defenders',
		'big-net': 'Prevent enemy dodges',
		warmaster: '+33% type advantage',
		'solid-stone': '-50% type disadvantage'
	};
	return descriptions[skill] || '';
}

const getStars = (value: number): string => {
	const filledStars = Math.min(Math.floor(value / 5), 5);
	const emptyStars = 5 - filledStars;
	return '⭐'.repeat(filledStars) + '★'.repeat(emptyStars);
};

export const CommanderView: React.FC = () => {
	const { name, gold, soldierStats, deployedUnits, hasDeployedDefender, readyBonus, team, evolutionLevel, hasSuperEvolved, superSkill, notification } = useSnapshot(playerStore.proxy);
	const { players } = useSnapshot(globalStore.proxy);
	const [showLaneSelector, setShowLaneSelector] = React.useState(false);
	const [selectedLane, setSelectedLane] = React.useState<Lane | null>(null);
	const [isDefenderDeployment, setIsDefenderDeployment] = React.useState(false);
	const [showStatInfo, setShowStatInfo] = React.useState<string | null>(null);

	const getStatInfo = (stat: string): string => {
		switch (stat) {
			case 'type': {
				const typeMap: Record<SoldierType, { strong: string; weak: string }> = {
					melee: { strong: 'Ranged 🏹', weak: 'Mage 🧙' },
					mage: { strong: 'Melee ⚔️', weak: 'Ranged 🏹' },
					ranged: { strong: 'Mage 🧙', weak: 'Melee ⚔️' }
				};
				const info = typeMap[soldierStats.type];
				return config.typeInfo
					.replace('{type}', soldierStats.type)
					.replace('{strongAgainst}', info.strong)
					.replace('{weakAgainst}', info.weak);
			}
			case 'attack':
				return config.attackInfo.replace('{attackMultiplier}', config.attackMultiplier.toString());
			case 'defense':
				return config.defenseInfo.replace('{defenseDivisor}', config.defenseDivisor.toString());
			case 'speed':
				return config.speedInfo.replace('{dodgeMultiplier}', config.dodgeMultiplier.toString());
			case 'criticalHit':
				return config.criticalHitInfo.replace('{criticalHitMultiplier}', config.criticalHitMultiplier.toString());
			case 'goldGeneration':
				return config.goldGenerationInfo.replace('{goldGenMultiplier}', config.goldGenMultiplier.toString());
			default:
				return '';
		}
	};

	// Calculate War Economy discount
	const warEconomyDiscount = superSkill === 'war-economy' ? config.warEconomyCostReduction / 100 : 0;
	const deployCost = Math.round(config.deploySoldierPrice * (1 - warEconomyDiscount));
	const evolveCost = Math.round(config.evolveSoldierPrice * (1 - warEconomyDiscount));

	const isReady = players[kmClient.id]?.ready || false;
	const canAffordDeploy = gold >= deployCost && !isReady;
	const canAffordEvolve = gold >= evolveCost && !isReady;

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

	// Auto-dismiss notification after 5 seconds
	React.useEffect(() => {
		if (notification) {
			const timer = setTimeout(() => {
				kmClient.transact([playerStore], ([playerState]) => {
					playerState.notification = null;
				});
			}, 5000);
			return () => clearTimeout(timer);
		}
	}, [notification]);

	const handleDeploy = async () => {
		if (!canAffordDeploy) return;
		if (!isDefenderDeployment && !selectedLane) return;

		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.gold -= deployCost;
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
			{notification && (
				<div className="rounded-lg bg-green-100 border-2 border-green-600 p-4 text-center animate-pulse">
					<div className="text-lg font-bold text-green-800">✨ {notification}</div>
				</div>
			)}
			
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">{config.commanderTitle} {name}</h1>
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
				<div className="mb-4 flex flex-col items-center gap-4">
					<h2 className="text-2xl font-bold text-bark-800">
						{soldierStats.name} <span className="text-lg text-bark-600">{levelDisplay}</span>
					</h2>
					<img
						src={soldierStats.sprite || SOLDIER_IMAGES[soldierStats.type]}
						alt={soldierStats.type}
						className={`h-36 w-36 object-contain ${soldierStats.visualEffect || 'effect-default'}`}
					/>
					<div className="w-full">
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1">
									<button
										onClick={() => setShowStatInfo('type')}
										className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white hover:bg-blue-600"
									>
										i
									</button>
									<strong>{config.type}:</strong> {soldierStats.type}
								</div>
								<div className="text-base pl-6">
									{soldierStats.type === 'melee' ? '⚔️' : soldierStats.type === 'mage' ? '🧙' : '🏹'}
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1">
									<button
										onClick={() => setShowStatInfo('attack')}
										className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white hover:bg-blue-600"
									>
										i
									</button>
									<strong>{config.attack}:</strong> {effectiveAttack}{readyBonus && <span className="text-green-600"> (+1)</span>}
								</div>
								<div className="text-base pl-6">
									{getStars(effectiveAttack)}
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1">
									<button
										onClick={() => setShowStatInfo('defense')}
										className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white hover:bg-blue-600"
									>
										i
									</button>
									<strong>{config.defense}:</strong> {effectiveDefense}{readyBonus && <span className="text-green-600"> (+1)</span>}
								</div>
								<div className="text-base pl-6">
									{getStars(effectiveDefense)}
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1">
									<button
										onClick={() => setShowStatInfo('speed')}
										className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white hover:bg-blue-600"
									>
										i
									</button>
									<strong>{config.speed}:</strong> {effectiveSpeed}{readyBonus && <span className="text-green-600"> (+1)</span>}
								</div>
								<div className="text-base pl-6">
									{getStars(effectiveSpeed)}
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1">
									<button
										onClick={() => setShowStatInfo('criticalHit')}
										className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white hover:bg-blue-600"
									>
										i
									</button>
									<strong>{config.criticalHitRate}:</strong> {effectiveCriticalHit}{readyBonus && <span className="text-green-600"> (+1)</span>}
								</div>
								<div className="text-base pl-6">
									{getStars(effectiveCriticalHit)}
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1">
									<button
										onClick={() => setShowStatInfo('goldGeneration')}
										className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white hover:bg-blue-600"
									>
										i
									</button>
									<strong>{config.goldGeneration}:</strong> {soldierStats.goldGeneration}
								</div>
								<div className="text-base pl-6">
									{getStars(soldierStats.goldGeneration)}
								</div>
							</div>
						</div>
						{superSkill && (
							<div className="mt-3 rounded-lg bg-purple-100 p-3 border-2 border-purple-600">
								<div className="flex items-center gap-2">
									<span className="text-2xl">{getSuperSkillEmoji(superSkill)}</span>
									<div className="flex-1 text-left">
										<div className="font-bold text-purple-700">{getSuperSkillName(superSkill)}</div>
										<div className="text-xs text-purple-600">{getSuperSkillDescription(superSkill)}</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="mt-6 flex flex-col gap-4">
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
							className="mt-3 w-full rounded-lg bg-emerald-600 px-6 py-3 text-lg font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
						>
							Deploy ({deployCost} {config.gold})
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
						className="rounded-lg bg-emerald-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
					>
						{config.deployButton}
					</button>
				)}

				<button
					onClick={handleEvolve}
					disabled={!canAffordEvolve}
					className="rounded-lg bg-amber-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-400"
				>
					{config.evolveButton}
				</button>

				<button
					onClick={handleReady}
					disabled={isReady}
					className={`rounded-lg px-8 py-4 text-xl font-bold text-white transition ${
						isReady
							? 'cursor-not-allowed bg-emerald-600'
							: 'bg-crimson-600 hover:bg-crimson-700'
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

		{/* Stat Info Modal */}
		{showStatInfo && (
			<div 
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
				onClick={() => setShowStatInfo(null)}
			>
				<div 
					className="max-w-md rounded-lg border-4 border-bark-700 bg-parchment p-6 shadow-2xl"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="mb-4 flex items-center justify-between">
						<h3 className="text-xl font-bold text-bark-800">
							{showStatInfo === 'type' && config.type}
							{showStatInfo === 'attack' && config.attack}
							{showStatInfo === 'defense' && config.defense}
							{showStatInfo === 'speed' && config.speed}
							{showStatInfo === 'criticalHit' && config.criticalHitRate}
							{showStatInfo === 'goldGeneration' && config.goldGeneration}
						</h3>
						<button
							onClick={() => setShowStatInfo(null)}
							className="text-2xl font-bold text-bark-600 hover:text-bark-800"
						>
							×
						</button>
					</div>
					<p className="text-bark-700 leading-relaxed">
						{getStatInfo(showStatInfo)}
					</p>
				</div>
			</div>
		)}
	</div>
);
};
