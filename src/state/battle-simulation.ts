import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import type {
	BattleUnit,
	CombatEvent,
	Flag,
	Lane,
	SoldierType,
	Team,
	UnitStats
} from '@/types';
import type { GlobalState } from './stores/global-store';

const TICK_INTERVAL = 500; // 0.5 seconds in ms
const LANE_DISTANCES: Record<Lane, number> = {
	top: 100,
	mid: 75,
	bot: 100
};

export class BattleSimulation {
	/**
	 * Calculate damage dealt by attacker to defender
	 */
	static calculateDamage(
		attackerStats: UnitStats,
		defenderStats: UnitStats
	): { damage: number; isCritical: boolean } {
		// Formula: (Attack * multiplier - Defense / divisor) * type advantage * critical hit
		let baseDamage = Math.max(
			0,
			attackerStats.attack * config.attackMultiplier - defenderStats.defense / config.defenseDivisor
		);

		// Type advantage (rock-paper-scissors)
		const multiplier = this.getTypeAdvantage(
			attackerStats.type,
			defenderStats.type
		);
		baseDamage *= multiplier;

		// Critical hit check
		const isCritical = Math.random() * 100 < attackerStats.criticalHitRate;
		if (isCritical) {
			baseDamage *= config.criticalHitMultiplier;
		}

		return { damage: Math.ceil(baseDamage), isCritical };
	}

	/**
	 * Get type advantage multiplier
	 */
	static getTypeAdvantage(
		attackerType: SoldierType,
		defenderType: SoldierType
	): number {
		if (attackerType === 'mage' && defenderType === 'melee') return config.typeAdvantageMultiplier;
		if (attackerType === 'melee' && defenderType === 'ranged') return config.typeAdvantageMultiplier;
		if (attackerType === 'ranged' && defenderType === 'mage') return config.typeAdvantageMultiplier;
		return 1;
	}

	/**
	 * Check if defender can dodge the attack
	 */
	static canDodge(
		attackerStats: UnitStats,
		defenderStats: UnitStats,
		defenderIsDefender: boolean = false
	): boolean {
		// Castle defenders can't dodge
		if (defenderIsDefender) {
			return false;
		}

		const attackerPower =
			attackerStats.attack +
			attackerStats.defense +
			attackerStats.criticalHitRate;
		const defenderPower =
			defenderStats.attack +
			defenderStats.defense +
			defenderStats.criticalHitRate;

		if (defenderPower >= attackerPower) {
			return false;
		}

		// Dodge based on speed difference - must be faster to dodge
		const speedDifference = defenderStats.speed - attackerStats.speed;
		if (speedDifference <= 0) {
			return false; // Cannot dodge if slower or equal speed
		}

		const dodgeChance = speedDifference * config.dodgeMultiplier;
		return Math.random() * 100 < dodgeChance;
	}

	/**
	 * Calculate movement distance per tick
	 * Uses logarithmic scaling to make high speed stats less impactful
	 */
	static calculateMovementPerTick(speed: number, lane: Lane): number {
		const laneDistance = LANE_DISTANCES[lane];
		// Logarithmic speed scaling: log2(speed + 1) ensures it's always inferior to linear
		// At speed=5: log2(6)≈2.58 vs linear 5
		// At speed=10: log2(11)≈3.46 vs linear 10
		// At speed=20: log2(21)≈4.39 vs linear 20
		const effectiveSpeed = Math.log2(speed + 1);
		const totalTicks = (lane === 'mid' ? 15 : 20) / (effectiveSpeed / 5);
		return laneDistance / totalTicks;
	}

	/**
	 * Get the closest flag for a unit to retrieve
	 */
	static getClosestFlag(
		unit: BattleUnit,
		flags: Record<string, Flag>,
		lane: Lane
	): Flag | null {
		const enemyFlags = Object.values(flags).filter(
			(flag) =>
				flag.team !== unit.team &&
				flag.status !== 'carried' &&
				flag.lane === lane
		);

		if (enemyFlags.length === 0) {
			// Check other lanes
			const allEnemyFlags = Object.values(flags).filter(
				(flag) => flag.team !== unit.team && flag.status !== 'carried'
			);

			if (allEnemyFlags.length === 0) return null;

			// Return a random flag from another lane
			return allEnemyFlags[
				Math.floor(Math.random() * allEnemyFlags.length)
			];
		}

		return enemyFlags[0];
	}

	/**
	 * Process combat between two units
	 */
	static processCombat(
		attacker: BattleUnit,
		defender: BattleUnit,
		globalState: GlobalState,
		isNewCombat: boolean = true
	): void {
		// Start combat - lock both units
		attacker.inCombatWith = defender.id;
		defender.inCombatWith = attacker.id;

		// Check for dodge only on initial contact (not on continued combat)
		if (isNewCombat && this.canDodge(attacker.stats, defender.stats, defender.isDefender)) {
			// Dodge successful - both units escape and continue moving
			const dodgeEvent: CombatEvent = {
				id: `${kmClient.serverTimestamp()}-dodge`,
				timestamp: kmClient.serverTimestamp(),
				type: 'dodge',
				attackerId: defender.id
			};
			globalState.combatEvents[dodgeEvent.id] = dodgeEvent;

			// Release combat lock - both units continue moving
			attacker.inCombatWith = undefined;
			defender.inCombatWith = undefined;
			return;
		}

		// Both units attack each other simultaneously
		const attackerDamage = this.calculateDamage(attacker.stats, defender.stats);
		const defenderDamage = this.calculateDamage(defender.stats, attacker.stats);

		// Apply damage to defender
		defender.currentHp -= attackerDamage.damage;
		if (attackerDamage.isCritical) {
			const critEvent: CombatEvent = {
				id: `${kmClient.serverTimestamp()}-crit-${attacker.id}`,
				timestamp: kmClient.serverTimestamp(),
				type: 'critical',
				attackerId: attacker.id,
				defenderId: defender.id,
				damage: attackerDamage.damage
			};
			globalState.combatEvents[critEvent.id] = critEvent;
		} else {
			const hitEvent: CombatEvent = {
				id: `${kmClient.serverTimestamp()}-hit-${attacker.id}`,
				timestamp: kmClient.serverTimestamp(),
				type: 'hit',
				attackerId: attacker.id,
				defenderId: defender.id,
				damage: attackerDamage.damage
			};
			globalState.combatEvents[hitEvent.id] = hitEvent;
		}

		// Apply damage to attacker
		attacker.currentHp -= defenderDamage.damage;
		if (defenderDamage.isCritical) {
			const critEvent: CombatEvent = {
				id: `${kmClient.serverTimestamp()}-crit-${defender.id}`,
				timestamp: kmClient.serverTimestamp(),
				type: 'critical',
				attackerId: defender.id,
				defenderId: attacker.id,
				damage: defenderDamage.damage
			};
			globalState.combatEvents[critEvent.id] = critEvent;
		} else {
			const hitEvent: CombatEvent = {
				id: `${kmClient.serverTimestamp()}-hit-${defender.id}`,
				timestamp: kmClient.serverTimestamp(),
				type: 'hit',
				attackerId: defender.id,
				defenderId: attacker.id,
				damage: defenderDamage.damage
			};
			globalState.combatEvents[hitEvent.id] = hitEvent;
		}

		// Check for deaths and release combat lock only if someone died
		if (defender.currentHp <= 0) {
			defender.isDead = true;
			const deathEvent: CombatEvent = {
				id: `${kmClient.serverTimestamp()}-death-${defender.id}`,
				timestamp: kmClient.serverTimestamp(),
				type: 'death',
				attackerId: attacker.id,
				defenderId: defender.id
			};
			globalState.combatEvents[deathEvent.id] = deathEvent;

			// Drop flag if carrying
			if (defender.carryingFlag && defender.flagId) {
				const flag = globalState.flags[defender.flagId];
				if (flag) {
					flag.status = 'dropped';
					flag.position = defender.position;
					flag.carrierId = undefined;
				}
				defender.carryingFlag = false;
				defender.flagId = undefined;
			}

			// Release combat lock - defender died
			attacker.inCombatWith = undefined;
			defender.inCombatWith = undefined;
			return;
		}

		if (attacker.currentHp <= 0) {
			attacker.isDead = true;
			const deathEvent: CombatEvent = {
				id: `${kmClient.serverTimestamp()}-death-${attacker.id}`,
				timestamp: kmClient.serverTimestamp(),
				type: 'death',
				attackerId: defender.id,
				defenderId: attacker.id
			};
			globalState.combatEvents[deathEvent.id] = deathEvent;

			// Drop flag if carrying
			if (attacker.carryingFlag && attacker.flagId) {
				const flag = globalState.flags[attacker.flagId];
				if (flag) {
					flag.status = 'dropped';
					flag.position = attacker.position;
					flag.carrierId = undefined;
				}
				attacker.carryingFlag = false;
				attacker.flagId = undefined;
			}

			// Release combat lock - attacker died
			attacker.inCombatWith = undefined;
			defender.inCombatWith = undefined;
			return;
		}

		// Both units survived - they stay locked in combat
		// Combat will continue on next tick until one dies or dodges
	}

	/**
	 * Main battle tick - processes movement and combat
	 */
	static tick(globalState: GlobalState): void {
		// Collect flag/score updates to apply at end
		const scoreChanges = { red: 0, blue: 0 };
		const flagUpdates: Array<{ flagId: string; status: 'at-castle' | 'dropped' | 'carried', position: number, carrierId?: string }> = [];
		
		// Get all unit IDs at start
		const unitIds = Object.keys(globalState.battleUnits);
		console.log('🔄 Tick: Processing', unitIds.length, 'units');

		// Process movement for all alive units
		for (const unitId of unitIds) {
			const unit = globalState.battleUnits[unitId];
			if (!unit || unit.isDead) {
				console.log('⏭️ Skipping unit', unitId, '- dead or null');
				continue;
			}

			// Skip movement for defenders - they never move
			if (unit.isDefender) {
				console.log('🛡️ Skipping defender', unitId, '- defenders don\'t move');
				continue;
			}

			// Skip movement for units in combat - they're locked in battle
			if (unit.inCombatWith) {
				console.log('⚔️ Unit', unitId, 'in combat with', unit.inCombatWith);
				// Still update flag position if carrying
				if (unit.carryingFlag && unit.flagId) {
					const flag = globalState.flags[unit.flagId];
					if (flag) {
						flag.position = unit.position;
					}
				}
				continue;
			}

			// Calculate movement speed
			const baseMovement = this.calculateMovementPerTick(
				unit.stats.speed,
				unit.lane
			);
			const movement = unit.carryingFlag ? baseMovement * 0.5 : baseMovement;
			
			const oldPosition = unit.position;

			// Update position
			if (unit.movingTowardEnemy) {
				if (unit.team === 'red') {
					// Red moves right (toward blue at 100)
					unit.position += movement;
					unit.position = Math.min(unit.position, 100);
				} else {
					// Blue moves left (toward red at 0)
					unit.position -= movement;
					unit.position = Math.max(unit.position, 0);
				}
				console.log('➡️ Unit', unitId, unit.team, 'moved from', oldPosition.toFixed(2), 'to', unit.position.toFixed(2), 'movement:', movement.toFixed(2));
			} else {
				// Moving back to own castle
				if (unit.team === 'red') {
					// Red returns left (toward red castle at 0)
					unit.position -= movement;
					
					// Reached castle
					if (unit.position <= 0) {
						unit.position = 0;
						if (unit.carryingFlag && unit.flagId) {
							scoreChanges.red += 1;
							const flag = globalState.flags[unit.flagId];
							if (flag) {
								flagUpdates.push({
									flagId: unit.flagId,
									status: 'at-castle',
									position: flag.team === 'red' ? 0 : 100,
									carrierId: undefined
								});
							}
							
						// Log flag score event
						const flagScoreEvent: CombatEvent = {
							id: `${kmClient.serverTimestamp()}-flag-score-${unit.id}`,
							timestamp: kmClient.serverTimestamp(),
							type: 'flag-score',
							attackerId: unit.id,
							flagId: unit.flagId
						};
						globalState.combatEvents[flagScoreEvent.id] = flagScoreEvent;
						
						}
						unit.isDead = true;
						continue;
					}
					unit.position = Math.max(unit.position, 0);
				} else {
					// Blue returns right (toward blue castle at 100)
					unit.position += movement;
					
					// Reached castle
					if (unit.position >= 100) {
						unit.position = 100;
						if (unit.carryingFlag && unit.flagId) {
							scoreChanges.blue += 1;
							const flag = globalState.flags[unit.flagId];
							if (flag) {
								flagUpdates.push({
									flagId: unit.flagId,
									status: 'at-castle',
									position: flag.team === 'red' ? 0 : 100,
									carrierId: undefined
								});
							}
							
						// Log flag score event
						const flagScoreEvent: CombatEvent = {
							id: `${kmClient.serverTimestamp()}-flag-score-${unit.id}`,
							timestamp: kmClient.serverTimestamp(),
							type: 'flag-score',
							attackerId: unit.id,
							flagId: unit.flagId
						};
						globalState.combatEvents[flagScoreEvent.id] = flagScoreEvent;
						
						}
						unit.isDead = true;
						continue;
					}
					unit.position = Math.min(unit.position, 100);
				}
			}

			// Check for flag pickup at enemy castle
			if (unit.movingTowardEnemy && !unit.carryingFlag) {
				const targetPosition = unit.team === 'red' ? 100 : 0;
				const reachedCastle =
					Math.abs(unit.position - targetPosition) < baseMovement;

				if (reachedCastle) {
					// Check if enemy castle has any alive defenders
					const enemyTeam: Team = unit.team === 'red' ? 'blue' : 'red';
					const aliveDefenders = Object.values(globalState.battleUnits).filter(
						(u) => u.isDefender && u.team === enemyTeam && !u.isDead
					);
					
					// Can only grab flag if no defenders are alive
					if (aliveDefenders.length === 0) {
						// Try to grab flag from enemy castle
						const availableFlags = Object.values(globalState.flags).filter(
							(flag) =>
								flag.team === enemyTeam &&
								flag.status === 'at-castle' &&
								flag.lane === unit.lane
						);

						if (availableFlags.length > 0) {
							const flag = availableFlags[0];
							flag.status = 'carried';
							flag.carrierId = unit.id;
							unit.carryingFlag = true;
							unit.flagId = flag.id;
							unit.movingTowardEnemy = false; // Start returning						
						// Log flag grab event
						const flagGrabEvent: CombatEvent = {
							id: `${kmClient.serverTimestamp()}-flag-grab-${unit.id}`,
							timestamp: kmClient.serverTimestamp(),
							type: 'flag-grab',
							attackerId: unit.id,
							flagId: flag.id
						};
						globalState.combatEvents[flagGrabEvent.id] = flagGrabEvent;						} else {
							// No flags available, check for closest flag
							const closestFlag = this.getClosestFlag(
								unit,
								globalState.flags,
								unit.lane
							);
							if (closestFlag) {
								unit.lane = closestFlag.lane;
								// Continue moving toward that flag
							} else {
								// No flags at all, return home
								unit.movingTowardEnemy = false;
							}
						}
					} else {
						// Defenders are alive - unit waits at castle to fight them
						// Combat will be detected in the combat loop
						// If all flags are gone and defenders are alive, return home
						const anyEnemyFlags = Object.values(globalState.flags).some(
							(flag) => flag.team === enemyTeam && flag.status === 'at-castle'
						);
						if (!anyEnemyFlags) {
							// No point waiting, return home
							unit.movingTowardEnemy = false;
						}
					}
				}
			}

			// Check for dropped flag pickup
			if (!unit.carryingFlag) {
				const droppedFlags = Object.values(globalState.flags).filter(
					(flag) =>
						flag.team !== unit.team &&
						flag.status === 'dropped' &&
						flag.lane === unit.lane
				);

				droppedFlags.forEach((flag) => {
					if (Math.abs(unit.position - flag.position) < baseMovement) {
						flag.status = 'carried';
						flag.carrierId = unit.id;
						unit.carryingFlag = true;
						unit.flagId = flag.id;
						unit.movingTowardEnemy = false; // Start returning
						
						// Log flag grab event
						const flagGrabEvent: CombatEvent = {
							id: `${kmClient.serverTimestamp()}-flag-grab-${unit.id}`,
							timestamp: kmClient.serverTimestamp(),
							type: 'flag-grab',
							attackerId: unit.id,
							flagId: flag.id
						};
						globalState.combatEvents[flagGrabEvent.id] = flagGrabEvent;
					}
				});
			}

			// Check for gold pickup
			const unclaimedGold = Object.values(globalState.goldPickups).filter(
				(gold) => !gold.claimed && gold.lane === unit.lane
			);

			unclaimedGold.forEach((gold) => {
				if (Math.abs(unit.position - gold.position) < baseMovement) {
					// Claim the gold
					gold.claimed = true;
					gold.claimedBy = unit.id;
					
					// Log gold pickup event
					const goldPickupEvent: CombatEvent = {
						id: `${kmClient.serverTimestamp()}-gold-${unit.id}`,
						timestamp: kmClient.serverTimestamp(),
						type: 'gold-pickup',
						attackerId: unit.id,
						goldId: gold.id
					};
					globalState.combatEvents[goldPickupEvent.id] = goldPickupEvent;
					
					// Award gold to the player
					// Note: This will be picked up by the player client
				}
			});

			// Update flag position if carrying
			if (unit.carryingFlag && unit.flagId) {
				const flag = globalState.flags[unit.flagId];
				if (flag) {
					flag.position = unit.position;
				}
			}
		}

		// Apply all collected state changes at once
		// 1. Update scores
		globalState.scores.red += scoreChanges.red;
		globalState.scores.blue += scoreChanges.blue;

		// 2. Update flags
		for (const update of flagUpdates) {
			const flag = globalState.flags[update.flagId];
			if (flag) {
				flag.status = update.status;
				flag.position = update.position;
				flag.carrierId = update.carrierId;
			}
		}

		// Units are marked as dead (isDead = true) when they reach castle
		// The presenter view already filters out dead units

		// Process combat - check for collisions (get fresh list after removals)
		const remainingUnits = Object.values(globalState.battleUnits);
		const aliveUnits = remainingUnits.filter((u) => !u.isDead);
		for (let i = 0; i < aliveUnits.length; i++) {
			for (let j = i + 1; j < aliveUnits.length; j++) {
				const unit1 = aliveUnits[i];
				const unit2 = aliveUnits[j];

				// Check if already in combat with each other
				const alreadyInCombat = 
					(unit1.inCombatWith === unit2.id && unit2.inCombatWith === unit1.id);

				// If already fighting, continue combat without dodge check
				if (alreadyInCombat) {
					this.processCombat(unit1, unit2, globalState, false);
					continue;
				}

				// Skip if either unit is in combat with someone else
				if (unit1.inCombatWith || unit2.inCombatWith) {
					continue;
				}

				// Different teams only
				if (unit1.team === unit2.team) {
					continue;
				}

				// Check for defender at castle combat
				// Defenders fight anyone who reaches their castle, regardless of lane
				if (unit1.isDefender || unit2.isDefender) {
					const defender = unit1.isDefender ? unit1 : unit2;
					const attacker = unit1.isDefender ? unit2 : unit1;
					
					// Check if attacker reached castle (0 for red, 100 for blue)
					const castlePosition = defender.team === 'red' ? 0 : 100;
					const attackerDistance = Math.abs(attacker.position - castlePosition);
					
					if (attackerDistance < 5) {
						// Attacker reached castle, start new combat with defender
						this.processCombat(attacker, defender, globalState, true);
					}
					continue;
				}

				// For non-defenders, check if units are on same lane
				if (unit1.lane !== unit2.lane) {
					continue;
				}

				// Check if units are close enough to fight
				const distance = Math.abs(unit1.position - unit2.position);
				if (distance < 5) {
					// Within combat range - start new combat
					this.processCombat(unit1, unit2, globalState, true);
				}
			}
		}
	}
}
