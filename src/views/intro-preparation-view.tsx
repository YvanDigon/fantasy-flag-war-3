import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { playerStore } from '@/state/stores/player-store';
import type { SoldierType } from '@/types';
import * as React from 'react';

const SOLDIER_IMAGES: Record<SoldierType, string> = {
	melee:
		'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153228778.png',
	mage: 'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153223922.png',
	ranged:
		'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153218722.png'
};

export const IntroPreparationView: React.FC = () => {
	const [selectedType, setSelectedType] = React.useState<SoldierType | null>(
		null
	);

	const handleConfirm = async () => {
		if (!selectedType) return;

		const defaultNames: Record<SoldierType, string> = {
			melee: 'Warrior',
			mage: 'Sorcerer',
			ranged: 'Archer'
		};

		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.soldierStats.type = selectedType;
			playerState.soldierStats.name = defaultNames[selectedType];
			playerState.soldierStats.sprite = SOLDIER_IMAGES[selectedType];
			playerState.soldierStats.visualEffect = 'effect-default';
			playerState.hasSelectedStartingSoldier = true;
			playerState.currentView = 'commander';
		});
	};

	const soldierTypes: Array<{ type: SoldierType; label: string }> = [
		{ type: 'melee', label: config.meleeType },
		{ type: 'mage', label: config.mageType },
		{ type: 'ranged', label: config.rangedType }
	];

	return (
		<div className="flex w-full max-w-2xl flex-col gap-6">
			<h1 className="text-center text-3xl font-bold">
				{config.introPreparationTitle}
			</h1>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{soldierTypes.map(({ type, label }) => (
					<button
						key={type}
						onClick={() => setSelectedType(type)}
						className={`flex flex-col items-center gap-3 rounded-lg border-4 p-4 transition ${
							selectedType === type
								? 'border-blue-600 bg-blue-50'
								: 'border-gray-300 bg-white hover:border-gray-400'
						}`}
					>
						<img
							src={SOLDIER_IMAGES[type]}
							alt={label}
							className="h-32 w-32 object-contain"
						/>
						<span className="text-xl font-bold">{label}</span>
					</button>
				))}
			</div>

			<button
				onClick={handleConfirm}
				disabled={!selectedType}
				className="rounded-lg bg-green-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
			>
				{config.confirmChoice}
			</button>
		</div>
	);
};
