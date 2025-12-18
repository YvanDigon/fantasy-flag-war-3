import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import type { Team } from '@/types';
import * as React from 'react';

export const TeamSelectionView: React.FC = () => {
	const handleTeamSelect = async (team: Team | 'random') => {
		let selectedTeam: Team;

		if (team === 'random') {
			// Count players on each team (excluding the current player)
			const players = globalStore.proxy.players;
			let redCount = 0;
			let blueCount = 0;

			Object.entries(players).forEach(([playerId, player]) => {
				if (playerId !== kmClient.id && player.team === 'red') {
					redCount++;
				} else if (playerId !== kmClient.id && player.team === 'blue') {
					blueCount++;
				}
			});

			// Assign to team with fewer players, or randomly if equal
			if (redCount < blueCount) {
				selectedTeam = 'red';
			} else if (blueCount < redCount) {
				selectedTeam = 'blue';
			} else {
				selectedTeam = Math.random() < 0.5 ? 'red' : 'blue';
			}
		} else {
			selectedTeam = team;
		}

		await kmClient.transact(
			[playerStore, globalStore],
			([playerState, globalState]) => {
				playerState.team = selectedTeam;
				playerState.currentView = 'intro-preparation';

				if (!globalState.players[kmClient.id]) {
					globalState.players[kmClient.id] = {
						name: playerState.name,
						team: selectedTeam,
						ready: false,
						isGeneratingSprite: false
					};
				} else {
					globalState.players[kmClient.id].team = selectedTeam;
				}
			}
		);
	};

	return (
		<div className="flex w-full max-w-md flex-col gap-6">
			<h1 className="text-center text-3xl font-bold">
				{config.teamSelectionTitle}
			</h1>

			<div className="flex flex-col gap-4">
				<button
					onClick={() => handleTeamSelect('red')}
					className="rounded-lg bg-red-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-red-700"
				>
					{config.redTeam}
				</button>

				<button
					onClick={() => handleTeamSelect('blue')}
					className="rounded-lg bg-blue-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-blue-700"
				>
					{config.blueTeam}
				</button>

				<button
					onClick={() => handleTeamSelect('random')}
					className="rounded-lg border-2 border-gray-300 bg-white px-8 py-4 text-xl font-bold text-gray-700 transition hover:bg-gray-100"
				>
					{config.randomTeam}
				</button>
			</div>
		</div>
	);
};
