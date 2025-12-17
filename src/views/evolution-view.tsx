import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { playerStore } from '@/state/stores/player-store';
import type { EvolutionOption, SoldierType, UnitStats } from '@/types';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const SOLDIER_IMAGES: Record<SoldierType, string> = {
	melee:
		'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153228778.png',
	mage: 'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153223922.png',
	ranged:
		'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153218722.png'
};

function getVisualEffectForName(name: string): string {
	const lowerName = name.toLowerCase();
	
	if (lowerName.includes('fire') || lowerName.includes('crimson') || lowerName.includes('hell') || lowerName.includes('berserker')) {
		return 'effect-fire';
	}
	if (lowerName.includes('frost') || lowerName.includes('ice') || lowerName.includes('crystal')) {
		return 'effect-frost';
	}
	if (lowerName.includes('shadow') || lowerName.includes('void') || lowerName.includes('dark')) {
		return 'effect-shadow';
	}
	if (lowerName.includes('storm') || lowerName.includes('lightning') || lowerName.includes('thunder')) {
		return 'effect-storm';
	}
	if (lowerName.includes('poison') || lowerName.includes('venom') || lowerName.includes('toxic')) {
		return 'effect-poison';
	}
	if (lowerName.includes('holy') || lowerName.includes('divine') || lowerName.includes('mystic') || lowerName.includes('arcane')) {
		return 'effect-holy';
	}
	if (lowerName.includes('iron') || lowerName.includes('steel') || lowerName.includes('dreadnought')) {
		return 'effect-metal';
	}
	
	return 'effect-default';
}

const FANTASY_NAMES: Record<SoldierType, string[]> = {
	melee: [
		'Swiss Pikeman',
		'2-Handed Super Swordsman',
		'Berserker Knight',
		'Iron Vanguard',
		'Crimson Crusader',
		'Dreadnought Warrior'
	],
	mage: [
		'Daughters of Gandalf',
		'Arcane Invoker',
		'Crystal Sorceress',
		'Storm Caller',
		'Void Mage',
		'Mystic Enchanter'
	],
	ranged: [
		'Hell Crossbowman',
		'Shadow Archer',
		'Eagle-Eye Marksman',
		'Poison Dart Master',
		'Longbow Champion',
		'Frost Ranger'
	]
};

function generateEvolutionOptions(): EvolutionOption[] {
	const types: SoldierType[] = ['melee', 'mage', 'ranged'];
	const statOptions: Array<keyof Omit<UnitStats, 'hp' | 'type'>> = [
		'attack',
		'defense',
		'speed',
		'criticalHitRate',
		'goldGeneration'
	];

	return types.map((type) => {
		const names = FANTASY_NAMES[type];
		const name = names[Math.floor(Math.random() * names.length)];

		// Pick 2 random different stats
		const shuffled = [...statOptions].sort(() => Math.random() - 0.5);
		const stat1 = shuffled[0];
		const stat2 = shuffled[1];

		return {
			name,
			type,
			statBoosts: { stat1, stat2 }
		};
	});
}

export const EvolutionView: React.FC = () => {
	const { gold, soldierStats, currentEvolutionOptions } = useSnapshot(playerStore.proxy);
	
	// Generate options if they don't exist yet
	React.useEffect(() => {
		if (!currentEvolutionOptions) {
			kmClient.transact([playerStore], ([playerState]) => {
				playerState.currentEvolutionOptions = generateEvolutionOptions();
			});
		}
	}, [currentEvolutionOptions]);
	
	const options = currentEvolutionOptions || [];

	const handleBack = async () => {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = 'commander';
		});
	};

	const handleConfirm = async (option: EvolutionOption) => {
		if (gold < 100) return;

		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.gold -= 100;
			playerState.soldierStats.type = option.type;
			// Prefix with super evolution title if it exists
			playerState.soldierStats.name = playerState.superEvolutionTitle 
				? `${playerState.superEvolutionTitle} ${option.name}`
				: option.name;
			
			// Always set visual effect based on the new name
			playerState.soldierStats.visualEffect = getVisualEffectForName(option.name);
			
			// If super evolution was done, use super sprites
			if (playerState.soldierStats.superSprites) {
				playerState.soldierStats.sprite = playerState.soldierStats.superSprites[option.type];
			} else {
				// Use base sprite for the new type
				playerState.soldierStats.sprite = SOLDIER_IMAGES[option.type];
			}
			
// Apply stat boosts
		const stat1 = option.statBoosts.stat1;
		const stat2 = option.statBoosts.stat2;
		playerState.soldierStats[stat1] = (playerState.soldierStats[stat1] as number) + 3;
		playerState.soldierStats[stat2] = (playerState.soldierStats[stat2] as number) + 3;
		
		// Increment evolution level
		playerState.evolutionLevel = playerState.evolutionLevel + 1;
			
			// Regenerate evolution options for next time
			playerState.currentEvolutionOptions = generateEvolutionOptions();
			
			playerState.currentView = 'commander';
		});
	};

	const getStatLabel = (stat: keyof Omit<UnitStats, 'hp' | 'type'>): string => {
		const labels: Record<string, string> = {
			attack: config.attack,
			defense: config.defense,
			speed: config.speed,
			criticalHitRate: config.criticalHitRate,
			goldGeneration: config.goldGeneration
		};
		return labels[stat] || stat;
	};

	return (
		<div className="flex w-full max-w-4xl flex-col gap-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">{config.evolutionTitle}</h1>
				<div className="text-2xl font-bold text-yellow-600">
					{config.gold}: {gold}
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{options.map((option, idx) => {
					// Use super sprite if available, otherwise use base sprite
					const spriteUrl = soldierStats.superSprites?.[option.type] || SOLDIER_IMAGES[option.type];
					// Always show the visual effect for this specific evolution option
					const visualEffect = getVisualEffectForName(option.name);
					
					return (
						<div
							key={idx}
							className="flex flex-col gap-3 rounded-lg border-2 border-gray-300 bg-white p-4"
						>
							<img
								src={spriteUrl}
								alt={option.type}
								className={`h-32 w-32 self-center object-contain ${visualEffect}`}
							/>
							<h3 className="text-center text-lg font-bold">{option.name}</h3>
							<div className="text-sm">
								<div>
									<strong>{config.type}:</strong> {option.type}
								</div>
								<div className="text-green-600">
									<strong>+3</strong> {getStatLabel(option.statBoosts.stat1)}
								</div>
								<div className="text-green-600">
									<strong>+3</strong> {getStatLabel(option.statBoosts.stat2)}
								</div>
							</div>
							<div className="text-center font-bold text-yellow-600">
								{config.evolutionCost}
							</div>
							<button
								onClick={() => handleConfirm(option)}
								disabled={gold < 100}
								className="rounded bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
							>
								{config.confirmChoice}
							</button>
						</div>
					);
				})}
			</div>

			{!playerStore.proxy.hasSuperEvolved && (
				<button
					onClick={() => {
						kmClient.transact([playerStore], ([playerState]) => {
							playerState.currentView = 'super-evolution';
						});
					}}
					disabled={gold < 200}
					className="rounded-lg bg-purple-600 px-8 py-4 text-xl font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
				>
					{config.superEvolutionButton}
				</button>
			)}

			<button
				onClick={handleBack}
				className="rounded-lg bg-gray-300 px-8 py-4 text-xl font-bold text-gray-700 hover:bg-gray-400"
			>
				{config.backButton}
			</button>
		</div>
	);
};
