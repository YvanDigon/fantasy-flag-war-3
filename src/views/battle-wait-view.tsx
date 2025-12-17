import { CombatHistory } from '@/components/player/combat-history';
import { config } from '@/config';
import { playerStore } from '@/state/stores/player-store';
import type { SoldierType } from '@/types';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { useSnapshot } from 'valtio';

const SOLDIER_IMAGES: Record<SoldierType, string> = {
	melee:
		'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153228778.png',
	mage: 'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153223922.png',
	ranged:
		'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153218722.png'
};

export const BattleWaitView: React.FC = () => {
	const { soldierStats, team, readyBonus, evolutionLevel, hasSuperEvolved } = useSnapshot(playerStore.proxy);
	
	const getUnitEmoji = (type: SoldierType) => {
		return type === 'melee' ? '⚔️' : type === 'mage' ? '🧙' : '🏹';
	};

	// Calculate effective stats with ready bonus
	const effectiveAttack = soldierStats.attack + (readyBonus ? 1 : 0);
	const effectiveDefense = soldierStats.defense + (readyBonus ? 1 : 0);
	const effectiveSpeed = soldierStats.speed + (readyBonus ? 1 : 0);
	const effectiveCriticalHit = soldierStats.criticalHitRate + (readyBonus ? 1 : 0);

	// Calculate level display
	const levelDisplay = `Lvl ${evolutionLevel}${hasSuperEvolved ? '+' : ''}`;

	return (
		<div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
			<h1 className="text-3xl font-bold">{config.battleWaitTitle}</h1>
			<div className="prose prose-lg">
				<ReactMarkdown>{config.battleWaitMd}</ReactMarkdown>
			</div>
			
			{/* Unit Profile Card */}
			<div className={`w-full max-w-md rounded-lg border-4 p-6 shadow-lg ${
				team === 'red' 
					? 'border-crimson-600 bg-crimson-50' 
					: 'border-sapphire-600 bg-sapphire-50'
			}`}>
				<div className="mb-4 flex flex-col items-center gap-3">
					<img
						src={soldierStats.sprite || SOLDIER_IMAGES[soldierStats.type]}
						alt={soldierStats.type}
						className={`h-32 w-32 object-contain ${soldierStats.visualEffect || 'effect-default'}`}
					/>
					<h2 className="text-2xl font-bold text-bark-800">
						{getUnitEmoji(soldierStats.type)} {soldierStats.name} <span className="text-lg text-bark-600">{levelDisplay}</span>
					</h2>
					<p className="text-sm text-bark-600">{soldierStats.type.charAt(0).toUpperCase() + soldierStats.type.slice(1)}</p>
				</div>
				
				<div className="grid grid-cols-2 gap-3 text-sm">
					<div className="rounded bg-white p-2">
						<div className="font-semibold text-bark-700">{config.hp}</div>
						<div className="text-lg font-bold">{soldierStats.hp}</div>
					</div>
					<div className="rounded bg-white p-2">
						<div className="font-semibold text-bark-700">{config.attack}</div>
						<div className="text-lg font-bold">
							{effectiveAttack}
							{readyBonus && <span className="ml-1 text-sm text-green-600">(+1)</span>}
						</div>
					</div>
					<div className="rounded bg-white p-2">
						<div className="font-semibold text-bark-700">{config.defense}</div>
						<div className="text-lg font-bold">
							{effectiveDefense}
							{readyBonus && <span className="ml-1 text-sm text-green-600">(+1)</span>}
						</div>
					</div>
					<div className="rounded bg-white p-2">
						<div className="font-semibold text-bark-700">{config.speed}</div>
						<div className="text-lg font-bold">
							{effectiveSpeed}
							{readyBonus && <span className="ml-1 text-sm text-green-600">(+1)</span>}
						</div>
					</div>
					<div className="rounded bg-white p-2">
						<div className="font-semibold text-bark-700">{config.criticalHitRate}</div>
						<div className="text-lg font-bold">
							{effectiveCriticalHit}%
							{readyBonus && <span className="ml-1 text-sm text-green-600">(+1)</span>}
						</div>
					</div>
					<div className="rounded bg-white p-2">
						<div className="font-semibold text-bark-700">{config.goldGeneration}</div>
						<div className="text-lg font-bold">{soldierStats.goldGeneration}</div>
					</div>
				</div>
			</div>

			{/* Combat History */}
			<CombatHistory />
		</div>
	);
};
