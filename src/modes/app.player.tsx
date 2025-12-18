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
	const { phase, players, combatEvents, battleUnits, goldPickups } = useSnapshot(globalStore.proxy);
	const processedCombatEvents = React.useRef<Set<string>>(new Set());
	const claimedGoldIds = React.useRef<Set<string>>(new Set());

	useGlobalController();
	useDocumentTitle(title);

	// Track gold pickups
	React.useEffect(() => {
		if (phase !== 'battle') {
			claimedGoldIds.current.clear();
			return;
		}

		// Check for gold claimed by this player's units
		for (const [goldId, gold] of Object.entries(goldPickups)) {
			if (!gold.claimed || !gold.claimedBy) continue;
			if (claimedGoldIds.current.has(goldId)) continue;

			// Check if this gold was claimed by this player's unit
			const claimingUnit = battleUnits[gold.claimedBy];
			if (claimingUnit && claimingUnit.playerId === kmClient.id) {
				claimedGoldIds.current.add(goldId);

				// Award gold to player and track pickup
				kmClient.transact([playerStore], ([playerState]) => {
					playerState.gold += config.goldPickupAmount;
					playerState.goldPickups.push({
						amount: config.goldPickupAmount,
						timestamp: kmClient.serverTimestamp()
					});
				});
			}
		}
	}, [phase, goldPickups, battleUnits]);

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
				playerState.evolutionLevel = 0;
				playerState.currentEvolutionOptions = null;
				playerState.currentSuperSkillOptions = null;
				playerState.superEvolutionTitle = null;
				playerState.superSkill = null;
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
				playerState.evolutionLevel = 0;
				playerState.currentEvolutionOptions = null;
				playerState.currentSuperSkillOptions = null;
				playerState.superEvolutionTitle = null;
				playerState.superSkill = null;
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

					// Calculate spawn position
					let startPosition: number;
					const randomOffset = (Math.random() * 4) - 2; // ±2 random offset
					
					// Teleport skill: Spawn 10-50% forward
					if (playerState.superSkill === 'teleport' && !deployedUnit.isDefender) {
						const advanceMin = config.teleportMinAdvance;
						const advanceMax = config.teleportMaxAdvance;
						const advancePercent = advanceMin + Math.random() * (advanceMax - advanceMin);
						
						if (playerState.team === 'red') {
							startPosition = Math.min(50, advancePercent + randomOffset);
						} else {
							startPosition = Math.max(50, 100 - advancePercent + randomOffset);
						}
					} else {
						// Normal spawn at castle
						const basePosition = playerState.team === 'red' ? 0 : 100;
						startPosition = playerState.team === 'red' 
							? Math.max(0, basePosition + randomOffset)
							: Math.min(100, basePosition + randomOffset);
					}

					// Create stats with ready bonus and War Economy penalty if applicable
					const unitStats = { ...playerState.soldierStats };
					
					if (playerState.readyBonus) {
						unitStats.attack += 1;
						unitStats.defense += 1;
						unitStats.speed += 1;
						unitStats.criticalHitRate += 1;
					}
					
					// War Economy: Apply 10% stat penalty
					if (playerState.superSkill === 'war-economy') {
						const penalty = config.warEconomyStatPenalty / 100;
						unitStats.attack = Math.max(1, Math.round(unitStats.attack * (1 - penalty)));
						unitStats.defense = Math.max(1, Math.round(unitStats.defense * (1 - penalty)));
						unitStats.speed = Math.max(1, Math.round(unitStats.speed * (1 - penalty)));
						unitStats.criticalHitRate = Math.max(1, Math.round(unitStats.criticalHitRate * (1 - penalty)));
						unitStats.goldGeneration = Math.max(1, Math.round(unitStats.goldGeneration * (1 - penalty)));
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
						isDefender: deployedUnit.isDefender,
						superSkill: playerState.superSkill || undefined
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
				
				// Update Gold Magnet count if this player has the skill
			if (playerState.superSkill === 'gold-magnet' && playerState.team) {
				if (playerState.team === 'red') {
					globalState.goldMagnetCount.red += 1;
				} else {
					globalState.goldMagnetCount.blue += 1;
				}
				
				// Adjust gold positions based on new count
				const goldMagnetShift = config.goldMagnetShift;
				const goldMagnetMinPosition = config.goldMagnetMinPosition;
				
				Object.values(globalState.goldPickups).forEach((gold) => {
					if (gold.claimed) return; // Don't move already claimed gold
					
					// Determine which team's castle to move toward
					let targetPosition = 50; // Default middle
					if (playerState.team === 'red') {
						// Move toward red castle (position 0)
						const shiftAmount = goldMagnetShift * globalState.goldMagnetCount.red;
						targetPosition = Math.max(goldMagnetMinPosition, 50 - shiftAmount);
					} else {
						// Move toward blue castle (position 100)
						const shiftAmount = goldMagnetShift * globalState.goldMagnetCount.blue;
						targetPosition = Math.min(100 - goldMagnetMinPosition, 50 + shiftAmount);
					}
					
					gold.position = targetPosition;
				});
			}
			
			// Clear deployed units after spawning
				playerState.deployedUnits = {};
			});
		} else if (phase === 'preparation' && currentView === 'battle-wait') {
			playerStore.proxy.currentView = 'commander';
			
			// Grant gold when transitioning from battle to preparation and regenerate evolution options
			kmClient.transact([globalStore, playerStore], ([globalState, playerState]) => {
				// Grant gold to all players (base + bonus from gold generation stat)
				const baseGold = 200;
				const bonusGold = playerState.soldierStats.goldGeneration * config.goldGenMultiplier;
				playerState.gold += baseGold + bonusGold;
				
				// Reset participation flag for next battle
				participatedInBattle.current = false;
				
				// Regenerate evolution options for the new preparation phase
				playerState.currentEvolutionOptions = null;
			playerState.currentSuperSkillOptions = null;
				playerState.readyBonus = false;
			playerState.hasDeployedDefender = false; // Reset defender for new turn
				playerState.goldPickups = [];
				playerState.kills = []; // Reset kills from previous battle
				playerState.deaths = []; // Reset deaths from previous battle
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

		</PlayerLayout.Root>
	);
};

export default App;
