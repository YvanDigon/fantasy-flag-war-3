import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { ConnectionsView } from '@/views/connections-view';
import { PresenterView } from '@/views/presenter-view';
import { KmQrCode } from '@kokimoki/shared';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	const { title } = config;
	const { started } = useSnapshot(globalStore.proxy);

	useGlobalController();
	useDocumentTitle(title);

	if (kmClient.clientContext.mode !== 'presenter') {
		throw new Error('App presenter rendered in non-presenter mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	if (!started) {
		return (
			<HostPresenterLayout.Root>
				<HostPresenterLayout.Header>
					<div className="text-sm opacity-70">{config.presenterLabel}</div>
				</HostPresenterLayout.Header>

				<HostPresenterLayout.Main>
					<div className="rounded-lg border border-gray-200 bg-white shadow-md">
					<div className="flex flex-col gap-6 p-8 md:flex-row md:items-center">
						<div className="flex-1 text-center md:text-left">
							<h1 className="mb-3 text-5xl font-bold text-bark-800">
								Fantasy Flag War
							</h1>
							<p className="text-xl text-bark-600">
								Prepare your army, attack your opponent's castle, bring back their flags!
							</p>
						</div>
						<div className="flex flex-col items-center gap-3">
							<KmQrCode data={playerLink} size={200} interactive={false} />
							<div className="text-center">
								<div className="text-sm font-semibold text-bark-700">
									Scan to Join
								</div>
								<div className="mt-2 flex gap-3">
									<img
										src="https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153228778.png"
										alt="Warrior"
										className="h-12 w-12 object-contain"
									/>
									<img
										src="https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153223922.png"
										alt="Sorcerer"
										className="h-12 w-12 object-contain"
									/>
									<img
										src="https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153218722.png"
										alt="Archer"
										className="h-12 w-12 object-contain"
									/>
								</div>
							</div>
						</div>
						</div>
					</div>

					<ConnectionsView />
				</HostPresenterLayout.Main>
			</HostPresenterLayout.Root>
		);
	}

	return <PresenterView />;
};

export default App;
