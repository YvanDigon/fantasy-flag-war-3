import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { playerStore } from '@/state/stores/player-store';
import type { SoldierType, SuperEvolutionOption, UnitStats } from '@/types';
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

function generateSuperEvolutionOptions(): SuperEvolutionOption[] {
	const statOptions: Array<keyof Omit<UnitStats, 'hp' | 'type' | 'name'>> = [
		'attack',
		'defense',
		'speed',
		'criticalHitRate',
		'goldGeneration'
	];

	// Generate 3 options with different stat combinations
	const options: SuperEvolutionOption[] = [];
	const usedCombos = new Set<string>();

	while (options.length < 3) {
		const shuffled = [...statOptions].sort(() => Math.random() - 0.5);
		const boostStat = shuffled[0];
		const decreaseStat = shuffled[1];
		const combo = `${boostStat}-${decreaseStat}`;

		if (!usedCombos.has(combo)) {
			usedCombos.add(combo);
			options.push({
				boostStat,
				boostAmount: 15,
				decreaseStat,
				decreaseAmount: 3
			});
		}
	}

	return options;
}

export const SuperEvolutionView: React.FC = () => {
	const { gold, soldierStats } = useSnapshot(playerStore.proxy);
	const [options] = React.useState<SuperEvolutionOption[]>(() =>
		generateSuperEvolutionOptions()
	);
	const [selectedOption, setSelectedOption] = React.useState<
		SuperEvolutionOption | null
	>(null);
	const [customName, setCustomName] = React.useState('');
	const [isGenerating, setIsGenerating] = React.useState(false);
	const [generatedSprites, setGeneratedSprites] = React.useState<{
		melee: string;
		mage: string;
		ranged: string;
	} | null>(null);

	const handleBack = async () => {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = 'evolution';
		});
	};

	const handleConfirm = async () => {
		if (gold < 200 || !selectedOption || !customName.trim()) return;

		console.log('🎨 Starting super evolution generation...');
		setIsGenerating(true);

		try {
			console.log('🎨 Starting super evolution with title:', customName);

			// Generate modified sprites for all 3 classes
			const types: SoldierType[] = ['melee', 'mage', 'ranged'];
			const spriteUrls: { melee: string; mage: string; ranged: string } = {
				melee: '',
				mage: '',
				ranged: ''
			};

			console.log('🎨 Starting sprite generation loop for all 3 classes...');
			for (const type of types) {
				try {
					const baseSprite = SOLDIER_IMAGES[type];
					console.log(`🎨 Generating ${type} sprite from:`, baseSprite);
					const prompt = `Modify this ${type} soldier sprite to represent "${customName}". Keep the base pose and structure. Add visual enhancements like different armor details, color accents, glowing effects, or weapon modifications that match the name "${customName}".`;

					console.log(`🎨 Calling AI modifyImage for ${type}...`);
					const upload = await kmClient.ai.modifyImage(
						baseSprite,
						prompt,
						['soldier', 'super-evolution', type, customName]
					);
					
					spriteUrls[type] = upload.url;
					console.log(`✅ Generated ${type} sprite:`, upload.url);
				} catch (typeError) {
					console.error(`❌ Failed to generate ${type} sprite:`, typeError);
					throw typeError; // Re-throw to trigger outer catch
				}
			}
			console.log('✅ All sprites generated successfully!');

			// Apply super evolution
			await kmClient.transact([playerStore], ([playerState]) => {
				playerState.gold -= 200;
				playerState.superEvolutionTitle = customName;
				playerState.soldierStats.name = `${customName} ${playerState.soldierStats.name}`;
				playerState.soldierStats.visualEffect = getVisualEffectForName(customName);
				playerState.soldierStats[selectedOption.boostStat] +=
					selectedOption.boostAmount;
				playerState.soldierStats[selectedOption.decreaseStat] -=
					selectedOption.decreaseAmount;
				playerState.soldierStats.sprite = spriteUrls[soldierStats.type];
				playerState.soldierStats.superSprites = spriteUrls;
				playerState.hasSuperEvolved = true;
				
				// Regenerate evolution options for next time
				// (Generate new random evolution options after super evolution)
				const FANTASY_NAMES: Record<SoldierType, string[]> = {
					melee: ['Swiss Pikeman', '2-Handed Super Swordsman', 'Berserker Knight', 'Iron Vanguard', 'Crimson Crusader', 'Dreadnought Warrior'],
					mage: ['Daughters of Gandalf', 'Arcane Invoker', 'Crystal Sorceress', 'Storm Caller', 'Void Mage', 'Mystic Enchanter'],
					ranged: ['Hell Crossbowman', 'Shadow Archer', 'Eagle-Eye Marksman', 'Poison Dart Master', 'Longbow Champion', 'Frost Ranger']
				};
				const types: SoldierType[] = ['melee', 'mage', 'ranged'];
				const statOptions: Array<keyof Omit<UnitStats, 'hp' | 'type'>> = ['attack', 'defense', 'speed', 'criticalHitRate', 'goldGeneration'];
				playerState.currentEvolutionOptions = types.map((type) => {
					const names = FANTASY_NAMES[type];
					const name = names[Math.floor(Math.random() * names.length)];
					const shuffled = [...statOptions].sort(() => Math.random() - 0.5);
					return { name, type, statBoosts: { stat1: shuffled[0], stat2: shuffled[1] } };
				});
			});

			console.log('🎨 Setting generated sprites state...');
			// Show the generated sprites
			setGeneratedSprites(spriteUrls);
			setIsGenerating(false);
			console.log('🎨 Super evolution complete!');
		} catch (error) {
			console.error('❌ Failed to generate sprites - FULL ERROR:', error);
			console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
			console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
			setIsGenerating(false);
			// Show error message and don't charge the player
			alert(`Failed to generate custom sprites: ${error instanceof Error ? error.message : String(error)}. Please try again.`);
		}
	};

	const handleOk = async () => {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = 'commander';
		});
	};

	const getStatLabel = (
		stat: keyof Omit<UnitStats, 'hp' | 'type' | 'name'>
	): string => {
		const labels: Record<string, string> = {
			attack: config.attack,
			defense: config.defense,
			speed: config.speed,
			criticalHitRate: config.criticalHitRate,
			goldGeneration: config.goldGeneration
		};
		return labels[stat] || stat;
	};

	if (isGenerating) {
		return (
			<div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
				<h1 className="text-3xl font-bold">{config.generatingSprite}</h1>
				<div className="h-32 w-32 animate-spin rounded-full border-b-2 border-purple-600"></div>
			</div>
		);
	}

	if (generatedSprites) {
		const currentType = soldierStats.type;
		const otherTypes = (['melee', 'mage', 'ranged'] as SoldierType[]).filter(t => t !== currentType);
		
		return (
			<div className="flex w-full max-w-4xl flex-col items-center gap-6">
				<h1 className="text-3xl font-bold">{config.superEvolutionTitle}</h1>
				
				<div className="rounded-lg border-4 border-purple-600 bg-white p-8 shadow-lg">
					<h2 className="mb-6 text-center text-3xl font-bold text-purple-600">{customName}</h2>
					
					{/* Sprites Display */}
					<div className="flex items-center justify-center gap-8">
						{/* Left - Other class 1 */}
						<div className="flex flex-col items-center opacity-60">
							<img
								src={generatedSprites[otherTypes[0]]}
								alt={otherTypes[0]}
								className={`h-32 w-32 object-contain ${soldierStats.visualEffect || 'effect-default'}`}
							/>
							<p className="mt-2 text-sm font-semibold capitalize text-gray-600">
								{otherTypes[0]}
							</p>
						</div>
						
						{/* Center - Current class (larger) */}
						<div className="flex flex-col items-center">
							<img
								src={generatedSprites[currentType]}
								alt={currentType}
								className={`h-64 w-64 object-contain ${soldierStats.visualEffect || 'effect-default'}`}
							/>
							<p className="mt-2 text-xl font-bold capitalize text-purple-600">
								{currentType}
							</p>
						</div>
						
						{/* Right - Other class 2 */}
						<div className="flex flex-col items-center opacity-60">
							<img
								src={generatedSprites[otherTypes[1]]}
								alt={otherTypes[1]}
								className={`h-32 w-32 object-contain ${soldierStats.visualEffect || 'effect-default'}`}
							/>
							<p className="mt-2 text-sm font-semibold capitalize text-gray-600">
								{otherTypes[1]}
							</p>
						</div>
					</div>
					
					<p className="mt-6 text-center text-sm italic text-gray-600">
						Your soldier has been transformed! If you evolve to a different class, the corresponding appearance will be used.
					</p>
				</div>

				<button
					onClick={handleOk}
					className="rounded-lg bg-green-600 px-12 py-4 text-xl font-bold text-white hover:bg-green-700"
				>
					OK
				</button>
			</div>
		);
	}

	return (
		<div className="flex w-full max-w-4xl flex-col gap-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">{config.superEvolutionTitle}</h1>
				<div className="text-2xl font-bold text-yellow-600">
					{config.gold}: {gold}
				</div>
			</div>

			{/* Current Soldier Display */}
			<div className="rounded-lg border-2 border-gray-300 bg-white p-4">
				<div className="flex items-center gap-4">
					<img
						src={SOLDIER_IMAGES[soldierStats.type]}
						alt={soldierStats.type}
						className="h-24 w-24 object-contain"
					/>
					<div className="flex-1">
						<h2 className="text-xl font-bold">{soldierStats.name}</h2>
						<p className="text-sm text-gray-600">
							{config.type}: {soldierStats.type}
						</p>
					</div>
				</div>
			</div>

			{/* Stat Options */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{options.map((option, idx) => (
					<button
						key={idx}
						onClick={() => setSelectedOption(option)}
						className={`flex flex-col gap-3 rounded-lg border-4 p-4 transition ${
							selectedOption === option
								? 'border-purple-600 bg-purple-50'
								: 'border-gray-300 bg-white hover:border-gray-400'
						}`}
					>
						<div className="text-center">
							<div className="mb-2 text-lg font-bold">Option {idx + 1}</div>
							<div className="text-green-600">
								<strong>+{option.boostAmount}</strong>{' '}
								{getStatLabel(option.boostStat)}
							</div>
							<div className="text-red-600">
								<strong>-{option.decreaseAmount}</strong>{' '}
								{getStatLabel(option.decreaseStat)}
							</div>
						</div>
					</button>
				))}
			</div>

			{/* Custom Name Input */}
			{selectedOption && (
				<div className="rounded-lg border-2 border-purple-600 bg-purple-50 p-6">
					<label className="mb-2 block text-lg font-bold">
						Give a title to your super evolved soldier (e.g. Imperial, Royal, Draconic, etc)
					</label>
					<p className="mb-1 text-sm text-gray-700">
						This legendary transformation can only be performed once per battle. (12 characters max)
					</p>
					<p className="mb-3 text-sm text-purple-700 italic">
						Your soldier's appearance will be reshaped by ancient magic to embody its new title.
					</p>
					<input
						type="text"
						value={customName}
						onChange={(e) => setCustomName(e.target.value)}
						placeholder="12 character max"
						maxLength={12}
						className="w-full rounded border-2 border-gray-300 px-4 py-3 text-lg focus:border-purple-600 focus:outline-none"
					/>
				</div>
			)}

			{/* Confirm Button */}
			{selectedOption && customName.trim() && (
				<button
					onClick={handleConfirm}
					disabled={gold < 200}
					className="rounded-lg bg-purple-600 px-8 py-4 text-xl font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
				>
					{config.confirmSuperEvolution}
				</button>
			)}

			{/* Cost Warning */}
			{gold < 200 && (
				<div className="rounded-lg bg-red-100 p-4 text-center text-red-700">
					{config.notEnoughGold}
				</div>
			)}

			{/* Back Button */}
			<button
				onClick={handleBack}
				className="rounded-lg bg-gray-300 px-8 py-4 text-xl font-bold text-gray-700 hover:bg-gray-400"
			>
				{config.backButton}
			</button>
		</div>
	);
};
