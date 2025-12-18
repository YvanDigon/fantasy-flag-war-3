import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import type { SoldierType, SuperSkillOption, UnitStats } from '@/types';
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

function getStatLabel(stat: keyof Omit<UnitStats, 'hp' | 'type'>): string {
	const labels: Record<string, string> = {
		attack: config.attack,
		defense: config.defense,
		speed: config.speed,
		criticalHitRate: config.criticalHitRate,
		goldGeneration: config.goldGeneration,
		name: 'Name',
		sprite: 'Sprite',
		visualEffect: 'Effect',
		superSprites: 'Sprites'
	};
	return labels[stat as string] || String(stat);
}

export const SuperEvolutionView: React.FC = () => {
	const { gold, soldierStats } = useSnapshot(playerStore.proxy);
	
	// All 9 skill options (statBoosts will be generated randomly)
	const allSkills: Omit<SuperSkillOption, 'statBoosts'>[] = [
		{
			skill: 'teleport',
			emoji: '🚀',
			name: 'Teleport',
			description: 'Your unit spawns 10-50% forward along their lane (head start advantage)'
		},
		{
			skill: 'gold-magnet',
			emoji: '🧲',
			name: 'Gold Magnet',
			description: 'Gold bags spawn 25% closer to your team\'s castle (stacks with teammates using same skill)'
		},
		{
			skill: 'war-economy',
			emoji: '💰',
			name: 'War Economy',
			description: 'Deployment and evolution costs reduced by 20%, but your units have 10% lower stats'
		},
		{
			skill: 'fortress',
			emoji: '🏰',
			name: 'Fortress',
			description: 'Your defending unit (castle defender) gains +25% attack bonus'
		},
		{
			skill: 'acrobat',
			emoji: '🤸',
			name: 'Acrobat',
			description: 'Your unit can dodge attacks even when facing weaker opponents'
		},
		{
			skill: 'infiltrator',
			emoji: '🥷',
			name: 'Infiltrator',
			description: 'Your unit can dodge attacks from enemy defenders'
		},
		{
			skill: 'big-net',
			emoji: '🕸️',
			name: 'Big Net',
			description: 'Enemy units cannot dodge your attacks (counters Acrobats & Infiltrators)'
		},
		{
			skill: 'warmaster',
			emoji: '⚔️',
			name: 'Warmaster',
			description: 'When your unit has type advantage, the bonus damage is increased by 33%'
		},
		{
			skill: 'solid-stone',
			emoji: '🛡️',
			name: 'Solid Stone',
			description: 'When enemy has type advantage against you, you take 50% less damage'
		}
	];
	
	// Generate options if they don't exist yet
	React.useEffect(() => {
		if (!playerStore.proxy.currentSuperSkillOptions) {
			kmClient.transact([playerStore], ([playerState]) => {
				const shuffled = [...allSkills].sort(() => Math.random() - 0.5);
				const selected = shuffled.slice(0, 3);
				
				// Generate random stat boosts for each option
				type StatKey = 'attack' | 'defense' | 'speed' | 'criticalHitRate' | 'goldGeneration';
				const statOptions: StatKey[] = [
					'attack',
					'defense',
					'speed',
					'criticalHitRate',
					'goldGeneration'
				];
				
				const optionsWithBoosts: SuperSkillOption[] = selected.map(skill => {
					const shuffledStats = [...statOptions].sort(() => Math.random() - 0.5);
					return {
						...skill,
						statBoosts: {
							increases: shuffledStats.slice(0, 1) as StatKey[], // +10 to 1 random stat
							decreases: shuffledStats.slice(1, 2) as StatKey[]  // -3 to 1 random stat
						}
					};
				});
				
				playerState.currentSuperSkillOptions = optionsWithBoosts;
			});
		}
	}, []);
	
	const options = playerStore.proxy.currentSuperSkillOptions || [];
	
	const [selectedOption, setSelectedOption] = React.useState<
		SuperSkillOption | null
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
		if (gold < config.superEvolveSoldierPrice || !selectedOption || !customName.trim()) return;

		console.log('🎨 Starting super evolution generation...');
		setIsGenerating(true);
		
		// Set global state to show generating status in host view
		await kmClient.transact([playerStore, globalStore], ([playerState, globalState]) => {
			playerState.isGeneratingSprite = true;
			if (globalState.players[kmClient.id]) {
				globalState.players[kmClient.id].isGeneratingSprite = true;
			}
		});

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

// Apply super evolution with skill and stat boosts
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.gold -= config.superEvolveSoldierPrice;
			playerState.superEvolutionTitle = customName;
			playerState.soldierStats.name = `${customName} ${playerState.soldierStats.name}`;
			playerState.soldierStats.visualEffect = getVisualEffectForName(customName);
			playerState.soldierStats.sprite = spriteUrls[soldierStats.type];
			playerState.soldierStats.superSprites = spriteUrls;
			playerState.superSkill = selectedOption.skill; // Store selected skill
			playerState.hasSuperEvolved = true;
			
			// Apply stat boosts
			selectedOption.statBoosts.increases.forEach(stat => {
				(playerState.soldierStats as unknown as Record<string, number>)[stat] = 
					(playerState.soldierStats[stat] as number) + config.superEvolveStatIncrease;
			});
			selectedOption.statBoosts.decreases.forEach(stat => {
				(playerState.soldierStats as unknown as Record<string, number>)[stat] = 
					Math.max(1, (playerState.soldierStats[stat] as number) - config.superEvolveStatDecrease);
			});
			
			// Regenerate evolution options for next evolution
			playerState.currentEvolutionOptions = null;
		});

		console.log('🎨 Setting generated sprites state...');
		// Show the generated sprites
		setGeneratedSprites(spriteUrls);
		setIsGenerating(false);
		
		// Clear generating status
		await kmClient.transact([playerStore, globalStore], ([playerState, globalState]) => {
			playerState.isGeneratingSprite = false;
			if (globalState.players[kmClient.id]) {
				globalState.players[kmClient.id].isGeneratingSprite = false;
			}
		});
		
		console.log('🎨 Super evolution complete!');
	} catch (error) {
			console.error('❌ Failed to generate sprites - FULL ERROR:', error);
			console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
			console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
			setIsGenerating(false);
			
			// Clear generating status
			await kmClient.transact([playerStore, globalStore], ([playerState, globalState]) => {
				playerState.isGeneratingSprite = false;
				if (globalState.players[kmClient.id]) {
					globalState.players[kmClient.id].isGeneratingSprite = false;
				}
			});
			
			// Show error message and don't charge the player
			alert(`Failed to generate custom sprites: ${error instanceof Error ? error.message : String(error)}. Please try again.`);
		}
	};

	const handleOk = async () => {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = 'commander';
		});
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

			{/* Instruction Text */}
			<div className="text-center">
				<p className="text-xl font-bold text-purple-700">
					✨ Choose a legendary power to super-evolve your soldier ✨
				</p>
				<p className="mt-1 text-sm text-gray-600">
					Each power grants unique abilities and stat modifications
				</p>
			</div>

			{/* Skill Options */}
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
						<div className="flex flex-col items-center gap-2 text-center">
							<div className="text-5xl">{option.emoji}</div>
							<div className="text-xl font-bold text-purple-700">
								{option.name}
							</div>
							<div className="text-sm text-gray-700">
								{option.description}
							</div>						<div className="mt-2 border-t border-gray-300 pt-2 text-xs">
							<div className="text-green-600 font-semibold">
								{option.statBoosts.increases.map(stat => (
									<div key={stat}>+{config.superEvolveStatIncrease} {getStatLabel(stat)}</div>
								))}
							</div>
							<div className="text-red-600 font-semibold">
								{option.statBoosts.decreases.map(stat => (
									<div key={stat}>-{config.superEvolveStatDecrease} {getStatLabel(stat)}</div>
								))}
							</div>
						</div>						</div>
					</button>
				))}
			</div>

			{/* Custom Name Input */}
			<div className={`rounded-lg border-2 p-6 transition ${
				selectedOption 
					? 'border-purple-600 bg-purple-50' 
					: 'border-gray-300 bg-gray-100 opacity-60'
			}`}>
				<label className={`mb-2 block text-lg font-bold ${!selectedOption && 'text-gray-500'}`}>
					Give a title to your super evolved soldier (e.g. Imperial, Royal, Draconic, etc)
				</label>
				<p className={`mb-1 text-sm ${selectedOption ? 'text-gray-700' : 'text-gray-500'}`}>
					This legendary transformation can only be performed once per battle. (12 characters max)
				</p>
				<p className={`mb-3 text-sm italic ${selectedOption ? 'text-purple-700' : 'text-gray-500'}`}>
					Your soldier's appearance will be reshaped by ancient magic to embody its new title.
				</p>
				<input
					type="text"
					value={customName}
					onChange={(e) => setCustomName(e.target.value)}
					placeholder="12 character max"
					maxLength={12}
					disabled={!selectedOption}
					className={`w-full rounded border-2 px-4 py-3 text-lg focus:outline-none ${
						selectedOption 
							? 'border-gray-300 focus:border-purple-600 bg-white' 
							: 'border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed'
					}`}
				/>
			</div>

			{/* Confirm Button */}
			<button
				onClick={handleConfirm}
				disabled={gold < config.superEvolveSoldierPrice || !selectedOption || !customName.trim()}
				className="rounded-lg bg-purple-600 px-8 py-4 text-xl font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-60"
			>
				{config.confirmSuperEvolution}
			</button>

			{/* Cost Warning */}
			{gold < config.superEvolveSoldierPrice && (
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
