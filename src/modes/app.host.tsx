import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { DebugView } from '@/views/debug-view';
import { KmQrCode } from '@kokimoki/shared';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	useGlobalController();
	const { title } = config;
	useDocumentTitle(title);

	const { started, phase, players, scores } = useSnapshot(globalStore.proxy);

	if (kmClient.clientContext.mode !== 'host') {
		throw new Error('App host rendered in non-host mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	const presenterLink = generateLink(kmClient.clientContext.presenterCode, {
		mode: 'presenter',
		playerCode: kmClient.clientContext.playerCode
	});

	const getPhaseLabel = () => {
		if (phase === 'intro-preparation') return config.introPreparationPhase;
		if (phase === 'preparation') return config.preparationPhase;
		if (phase === 'battle') return config.battlePhase;
		return phase;
	};

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header>
				<div className="text-sm opacity-70">{config.hostLabel}</div>
			</HostPresenterLayout.Header>

			<HostPresenterLayout.Main>
				<div className="rounded-lg border border-gray-200 bg-white shadow-md">
					<div className="flex flex-col gap-2 p-6">
						<h2 className="text-xl font-bold">{config.gameLinksTitle}</h2>
						<KmQrCode data={playerLink} size={200} interactive={false} />
						<div className="flex gap-2">
							<a
								href={playerLink}
								target="_blank"
								rel="noreferrer"
								className="break-all text-blue-600 underline hover:text-blue-700"
							>
								{config.playerLinkLabel}
							</a>
							|
							<a
								href={presenterLink}
								target="_blank"
								rel="noreferrer"
								className="break-all text-blue-600 underline hover:text-blue-700"
							>
								{config.presenterLinkLabel}
							</a>
						</div>
					</div>
				</div>

				{!started ? (
					<>
						<button
							onClick={() => {
								globalActions.startGame().catch((err) => {
									console.error('Failed to start game:', err);
									alert('Failed to start game: ' + err.message);
								});
							}}
							className="rounded-lg bg-green-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-green-700"
						>
							{config.startGameButton}
						</button>
						<button
							onClick={globalActions.resetPlayers}
							className="rounded-lg bg-purple-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-purple-700"
						>
							Reset Players
						</button>
					</>
				) : (
					<>
						{/* Phase Control */}
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<h2 className="mb-4 text-xl font-bold">{config.currentPhase}</h2>
							<div className="mb-4 text-2xl font-bold">{getPhaseLabel()}</div>

							{phase !== 'battle' && (
								<button
									onClick={globalActions.endPreparationPhase}
									className="w-full rounded-lg bg-orange-600 px-6 py-3 font-bold text-white transition hover:bg-orange-700"
								>
									{config.endPreparationButton}
								</button>
							)}

							{phase === 'battle' && (
								<button
									onClick={globalActions.finishBattlePhase}
									className="w-full rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
								>
									{config.finishBattleButton}
								</button>
							)}
						</div>

						{/* Scores */}
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<h2 className="mb-4 text-xl font-bold">{config.score}</h2>
							<div className="flex justify-around text-2xl font-bold">
								<div className="text-red-600">
									{config.redTeam}: {scores.red}
								</div>
								<div className="text-blue-600">
									{config.blueTeam}: {scores.blue}
								</div>
							</div>
						</div>

						{/* Players Overview */}
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<h2 className="mb-4 text-xl font-bold">{config.playersOverview}</h2>
							<div className="space-y-2">
								{Object.entries(players).map(([id, player]) => (
									<div
										key={id}
										className="flex items-center justify-between rounded border p-3"
									>
										<div>
											<span className="font-bold">{player.name}</span>
											{player.team && (
												<span
													className={`ml-2 rounded px-2 py-1 text-sm font-bold ${
														player.team === 'red'
															? 'bg-red-100 text-red-700'
															: 'bg-blue-100 text-blue-700'
													}`}
												>
													{player.team === 'red'
														? config.redTeam
														: config.blueTeam}
												</span>
											)}
										</div>
										{player.ready && (
											<span className="text-green-600">✓ Ready</span>
										)}
									</div>
								))}
							</div>
						</div>

						<DebugView />

						<button
							onClick={globalActions.stopGame}
							className="rounded-lg bg-red-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-red-700"
						>
							Stop Game
						</button>
					</>
				)}
			</HostPresenterLayout.Main>
		</HostPresenterLayout.Root>
	);
};

export default App;
