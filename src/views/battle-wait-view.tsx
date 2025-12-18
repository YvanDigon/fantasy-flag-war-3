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

export const BattleWaitView: React.FC = () => {
	const { soldierStats, team, readyBonus, evolutionLevel, hasSuperEvolved, superSkill } = useSnapshot(playerStore.proxy);
	
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
				
				{superSkill && (
					<div className="mt-4 rounded-lg bg-purple-100 p-3 border-2 border-purple-600">
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

			{/* Combat History */}
			<CombatHistory />
		</div>
	);
};
