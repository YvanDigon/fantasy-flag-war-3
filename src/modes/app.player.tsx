import { NameLabel } from '@/components/player/name-label';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { PlayerLayout } from '@/layouts/player';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { BattleWaitView } from '@/views/battle-wait-view';
import { CommanderView } from '@/views/commander-view';
import { CreateProfileView } from '@/views/create-profile-view';
import { EvolutionView } from '@/views/evolution-view';
import { IntroPreparationView } from '@/views/intro-preparation-view';
import { SuperEvolutionView } from '@/views/super-evolution-view';
import { TeamSelectionView } from '@/views/team-selection-view';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	const { title } = config;
	const { name, currentView, team } = useSnapshot(playerStore.proxy);
	const { phase, players, combatEvents, battleUnits } = useSnapshot(globalStore.proxy);
	const processedCombatEvents = React.useRef<Set<string>>(new Set());

	useGlobalController();
	useDocumentTitle(title);

	// Track combat results (kills and deaths)
	React.useEffect(() => {
		if (phase !== 'battle') return;

		// Process death events
		for (const [eventId, event] of Object.entries(combatEvents)) {
			if (event.type !== 'death') continue;
			if (processedCombatEvents.current.has(eventId)) continue;

			processedCombatEvents.current.add(eventId);

			const killerUnit = battleUnits[event.attackerId];
			const deadUnit = battleUnits[event.defenderId];

			if (!killerUnit || !deadUnit) continue;

			// Check if this player's soldier killed an enemy
			if (killerUnit.playerId === kmClient.id && deadUnit.playerId !== kmClient.id) {
				kmClient.transact([playerStore], ([playerState]) => {
					playerState.kills.push({
						opponentName: deadUnit.stats.name,
						opponentSprite: deadUnit.sprite,
						timestamp: event.timestamp
					});
				});
			}

			// Check if an enemy killed this player's soldier
			if (deadUnit.playerId === kmClient.id && killerUnit.playerId !== kmClient.id) {
				kmClient.transact([playerStore], ([playerState]) => {
					playerState.deaths.push({
						opponentName: killerUnit.stats.name,
						opponentSprite: killerUnit.sprite,
						timestamp: event.timestamp
					});
				});
			}
		}
	}, [combatEvents, battleUnits, phase]);

	// Reset player state if they were removed from global players list (host reset)
	React.useEffect(() => {
		if (name && !players[kmClient.id]) {
			// Player was reset by host, reset local state
			kmClient.transact([playerStore], ([playerState]) => {
				playerState.name = '';
				playerState.currentView = 'team-selection';
				playerState.team = null;
				playerState.gold = 200;
				playerState.soldierStats = {
					hp: 100,
					type: 'melee',
					name: 'Warrior',
					attack: 5,
					defense: 5,
					speed: 5,
					criticalHitRate: 5,
					goldGeneration: 5
				};
				playerState.deployedUnits = {};
				playerState.hasSelectedStartingSoldier = false;
				playerState.hasSuperEvolved = false;
				playerState.currentEvolutionOptions = null;
				playerState.superEvolutionTitle = null;
			});
		}
	}, [name, players]);

	// Reset gold when game starts fresh
	React.useEffect(() => {
		if (phase === 'intro-preparation' && name && team) {
			kmClient.transact([playerStore], ([playerState]) => {
				// Reset gold to default when a new game starts
				if (playerState.gold !== 200) {
					playerState.gold = 200;
					playerState.deployedUnits = {};
					playerState.hasDeployedDefender = false;
					playerState.hasSelectedStartingSoldier = false;
					playerState.hasSuperEvolved = false;
					playerState.currentEvolutionOptions = null;
					playerState.superEvolutionTitle = null;
				}
			});
		}
	}, [phase, name, team]);

	// Track if player participated in the current battle
	const participatedInBattle = React.useRef(false);

	// Sync player view with game phase and spawn units
	React.useEffect(() => {
		if (phase === 'battle' && currentView !== 'battle-wait') {
			playerStore.proxy.currentView = 'battle-wait';
			
			// Spawn this player's deployed units into battle
			const playerId = kmClient.id;
			
			kmClient.transact([globalStore, playerStore], ([globalState, playerState]) => {
				// Check if this player already has units spawned (prevent duplicate spawning)
				const playerHasUnits = Object.keys(globalState.battleUnits).some(
					unitId => unitId.startsWith(`${playerId}-`)
				);
				
				if (playerHasUnits) {
					return; // Units already spawned, skip
				}
				
				// Check if player has deployed units to spawn
				if (!playerState.team || Object.keys(playerState.deployedUnits).length === 0) {
					participatedInBattle.current = false; // Mark as not participated
					return; // Nothing to spawn
				}
				
				// Mark that this player participated in the battle
				participatedInBattle.current = true;
				
				// Store player's units for bot copying
				const playerUnits: BattleUnit[] = [];
				
				// Spawn each deployed unit
				Object.values(playerState.deployedUnits).forEach((deployedUnit) => {
					const unitId = `${playerId}-${deployedUnit.timestamp}`;
					
					// Get soldier sprite - use custom sprite if available, otherwise default by type
					const spriteUrl = playerState.soldierStats.sprite ||
						(playerState.soldierStats.type === 'melee'
							? 'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153228778.png'
							: playerState.soldierStats.type === 'mage'
								? 'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153223922.png'
								: 'https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153218722.png');

					// Add small random offset to prevent perfect overlap (±2 position units)
					const randomOffset = (Math.random() * 4) - 2;
					const basePosition = playerState.team === 'red' ? 0 : 100;
					const startPosition = playerState.team === 'red' 
						? Math.max(0, basePosition + randomOffset)
						: Math.min(100, basePosition + randomOffset);

					// Create stats with ready bonus if applicable
					const unitStats = { ...playerState.soldierStats };
					if (playerState.readyBonus) {
						unitStats.attack += 1;
						unitStats.defense += 1;
						unitStats.speed += 1;
						unitStats.criticalHitRate += 1;
					}
					
					// Apply 2x defense for defenders
					if (deployedUnit.isDefender) {
						unitStats.defense *= 2;
					}

					const battleUnit: BattleUnit = {
						id: unitId,
						playerId,
						team: playerState.team,
						lane: deployedUnit.lane || 'mid', // Defenders use mid lane for positioning
						stats: unitStats,
						currentHp: unitStats.hp,
						position: startPosition,
						movingTowardEnemy: !deployedUnit.isDefender, // Defenders don't move
						carryingFlag: false,
						isDead: false,
						sprite: spriteUrl,
						inCombatWith: undefined,
						isDefender: deployedUnit.isDefender
					};
					
					globalState.battleUnits[unitId] = battleUnit;
					playerUnits.push(battleUnit);
				});
				
				// Store deployment for bot copying
				if (playerUnits.length > 0) {
					globalState.playerDeployments[playerId] = {
						team: playerState.team,
						units: playerUnits
					};
				}
				
				// Clear deployed units after spawning
				playerState.deployedUnits = {};
			});
		} else if (phase === 'preparation' && currentView === 'battle-wait') {
			playerStore.proxy.currentView = 'commander';
			
			// Grant gold when transitioning from battle to preparation and regenerate evolution options
			kmClient.transact([globalStore, playerStore], ([globalState, playerState]) => {
				// Only grant gold if player actually participated in the battle
				if (participatedInBattle.current) {
					const baseGold = 200;
					const bonusGold = playerState.soldierStats.goldGeneration * 10;
					playerState.gold += baseGold + bonusGold;
				}
				
				// Reset participation flag for next battle
				participatedInBattle.current = false;
				
				// Regenerate evolution options for the new preparation phase
				playerState.currentEvolutionOptions = null;
				
				// Reset defender flag for new preparation phase
				playerState.hasDeployedDefender = false;
				
				// Clear ready bonus (temporary 1 round bonus)
				playerState.readyBonus = false;
				
				// Clear combat results from previous battle
				playerState.kills = [];
				playerState.deaths = [];
				
				// Clear processed events
				processedCombatEvents.current.clear();
				
				// Ensure player's ready state is reset
				if (globalState.players[kmClient.id]) {
					globalState.players[kmClient.id].ready = false;
				}
			});
		}
	}, [phase, currentView]);

	if (!name) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<CreateProfileView />
				</PlayerLayout.Main>
			</PlayerLayout.Root>
		);
	}

	if (!team) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<TeamSelectionView />
				</PlayerLayout.Main>
				<PlayerLayout.Footer>
					<NameLabel name={name} />
				</PlayerLayout.Footer>
			</PlayerLayout.Root>
		);
	}

	return (
		<PlayerLayout.Root>
			<PlayerLayout.Header>
				<div
					className={`rounded px-3 py-1 font-bold ${
						team === 'red'
							? 'bg-crimson-600 text-parchment'
							: 'bg-sapphire-600 text-parchment'
					}`}
				>
					{team === 'red' ? config.redTeam : config.blueTeam}
				</div>
			</PlayerLayout.Header>

			<PlayerLayout.Main>
				{currentView === 'intro-preparation' && <IntroPreparationView />}
				{currentView === 'commander' && <CommanderView />}
				{currentView === 'evolution' && <EvolutionView />}
				{currentView === 'super-evolution' && <SuperEvolutionView />}
				{currentView === 'battle-wait' && <BattleWaitView />}
			</PlayerLayout.Main>

			<PlayerLayout.Footer>
				<NameLabel name={name} />
			</PlayerLayout.Footer>
		</PlayerLayout.Root>
	);
};

export default App;
