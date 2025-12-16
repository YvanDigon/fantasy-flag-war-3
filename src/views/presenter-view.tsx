import { config } from '@/config';
import { globalStore } from '@/state/stores/global-store';
import type { Lane } from '@/types';
import * as React from 'react';
import { useSnapshot } from 'valtio';

function getEffectClass(name: string): string {
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

interface CombatFeedback {
	id: string;
	type: 'hit' | 'death' | 'dodge' | 'score';
	x: string;
	y: string;
	timestamp: number;
}

export const PresenterView: React.FC = () => {
	const { battleUnits, flags, combatEvents, scores, lastScoreEvent } = useSnapshot(globalStore.proxy);
	const [showScoreOverlay, setShowScoreOverlay] = React.useState(false);
	const [currentScoreEvent, setCurrentScoreEvent] = React.useState<typeof lastScoreEvent>(null);
	const [feedbacks, setFeedbacks] = React.useState<CombatFeedback[]>([]);
	const processedEvents = React.useRef<Set<string>>(new Set());

	// Process combat events for visual feedback
	React.useEffect(() => {
		// Only process NEW combat events
		for (const [eventId, event] of Object.entries(combatEvents)) {
			if (processedEvents.current.has(eventId)) continue;
			
			processedEvents.current.add(eventId);

			const unit = battleUnits[event.attackerId];
			if (!unit || unit.isDead) continue;

			// Calculate position based on unit lane and position
			let x: string, y: string;
			const progress = unit.position / 100;
			
			if (unit.lane === 'top') {
				if (progress <= 0.5) {
					x = '9%';
					y = `${95 - (progress * 2 * 90)}%`;
				} else {
					x = `${9 + ((progress - 0.5) * 2 * 86)}%`;
					y = '9%';
				}
			} else if (unit.lane === 'mid') {
				x = `${5 + (progress * 90)}%`;
				y = `${95 - (progress * 90)}%`;
			} else {
				if (progress <= 0.5) {
					x = `${9 + (progress * 2 * 86)}%`;
					y = '91%';
				} else {
					x = '91%';
					y = `${91 - ((progress - 0.5) * 2 * 86)}%`;
				}
			}

			const feedback: CombatFeedback = {
				id: eventId,
				type: event.type === 'death' ? 'death' : event.type === 'dodge' ? 'dodge' : 'hit',
				x,
				y,
				timestamp: event.timestamp
			};

			setFeedbacks(prev => [...prev, feedback]);
			
			setTimeout(() => {
				setFeedbacks(prev => prev.filter(f => f.id !== eventId));
			}, 800);
		}
		
		// Clean up processed events that are no longer in combatEvents
		const currentEventIds = new Set(Object.keys(combatEvents));
		for (const eventId of processedEvents.current) {
			if (!currentEventIds.has(eventId)) {
				processedEvents.current.delete(eventId);
			}
		}
	}, [combatEvents, battleUnits]);

	// Show score overlay when new score event occurs
	React.useEffect(() => {
		if (lastScoreEvent && (!currentScoreEvent || lastScoreEvent.timestamp !== currentScoreEvent.timestamp)) {
			setCurrentScoreEvent(lastScoreEvent);
			setShowScoreOverlay(true);
			
			const timer = setTimeout(() => {
				setShowScoreOverlay(false);
			}, 1000);
			
			return () => clearTimeout(timer);
		}
	}, [lastScoreEvent]);

	const getLaneUnits = (lane: Lane) =>
		Object.values(battleUnits).filter((u) => u.lane === lane && !u.isDead && !u.isDefender);

	const topUnits = getLaneUnits('top');
	const midUnits = getLaneUnits('mid');
	const botUnits = getLaneUnits('bot');
	
	const redDefenders = Object.values(battleUnits).filter((u) => u.isDefender && u.team === 'red' && !u.isDead);
	const blueDefenders = Object.values(battleUnits).filter((u) => u.isDefender && u.team === 'blue' && !u.isDead);

	const sortedCombatEvents = Object.entries(combatEvents)
		.sort(([a], [b]) => Number(b) - Number(a))
		.slice(0, 50)
		.map(([, event]) => event);

	return (
		<div className="flex h-screen flex-col bg-forest-950">
			{/* Header */}
			<div className="flex items-center justify-between border-b-4 border-bark-700 bg-bark-800 p-4 shadow-lg">
				<div className="text-2xl font-bold text-red-400">
					{config.redTeam}: {scores.red}
				</div>
				<div className="text-xl font-bold text-parchment">{config.score}</div>
				<div className="text-2xl font-bold text-blue-400">
					{config.blueTeam}: {scores.blue}
				</div>
			</div>

			{/* Main Content - Battle Map + Combat Log */}
			<div className="flex flex-1 overflow-hidden">
				{/* Main Battle Map */}
				<div className="relative flex-1">
					{/* BRIGHT VISIBLE LANES - Connecting castles properly */}
					<div className="absolute inset-0 pointer-events-none">
						{/* TOP LANE - Pink/Magenta L-shape (bottom-left → up left side → right along top → top-right) */}
						{/* Vertical section: up the left side */}
						<div 
							className="absolute bg-pink-500 opacity-50"
							style={{
								left: '5%',
								bottom: '5%',
								width: '8%',
								height: '85%'
							}}
						/>
						{/* Horizontal section: along the top */}
						<div 
							className="absolute bg-pink-500 opacity-50"
							style={{
								left: '5%',
								top: '5%',
								width: '90%',
								height: '8%'
							}}
						/>

						{/* MID LANE - Yellow diagonal (bottom-left → top-right) */}
						<svg 
							className="absolute inset-0 pointer-events-none"
							style={{ width: '100%', height: '100%' }}
						>
							<line
								x1="5%"
								y1="95%"
								x2="95%"
								y2="5%"
								stroke="#facc15"
								strokeWidth="60"
								opacity="0.5"
								strokeLinecap="round"
							/>
						</svg>

						{/* BOT LANE - Cyan L-shape (bottom-left → right along bottom → up right side → top-right) */}
						{/* Horizontal section: along the bottom */}
						<div 
							className="absolute bg-cyan-400 opacity-50"
							style={{
								left: '5%',
								bottom: '5%',
								width: '90%',
								height: '8%'
							}}
						/>
						{/* Vertical section: up the right side */}
						<div 
							className="absolute bg-cyan-400 opacity-50"
							style={{
								right: '5%',
								bottom: '5%',
								width: '8%',
								height: '85%'
							}}
						/>
					</div>

					{/* TOP LANE Units - L-shaped path */}
					{topUnits.map((unit) => {
						// 0-50: up left side, 50-100: right along top
						const progress = unit.position;
						let left: string, top: string;
						
						if (progress <= 50) {
							// Moving up the left side
							left = '9%';
							top = `${95 - (progress * 1.8)}%`;
						} else {
							// Moving right along the top
							const horizontalProgress = (progress - 50) * 2;
							left = `${9 + (horizontalProgress * 0.86)}%`;
							top = '9%';
						}
						
						const healthPercent = (unit.currentHp / unit.stats.hp) * 100;
						
						return (
							<div
								key={unit.id}
								className="absolute flex flex-col items-center"
								style={{ left, top, transform: 'translate(-50%, -50%)', zIndex: 10, transition: 'left 0.5s linear, top 0.5s linear' }}
							>
								{/* Health bar */}
								<div className="mb-1 h-1.5 w-12 rounded-full bg-gray-700">
									<div
										className="h-full rounded-full bg-green-500"
										style={{ width: `${healthPercent}%` }}
									/>
								</div>
								
								{/* Soldier emoji */}
								<div className="text-3xl">
									{unit.stats.type === 'melee' ? '⚔️' : unit.stats.type === 'mage' ? '🧙' : '🏹'}
									{unit.carryingFlag && <span className="absolute -top-2 text-2xl">🚩</span>}
								</div>
								
								{/* Unit name */}
								<div className={`text-xs font-bold mt-0.5 ${unit.team === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
									{unit.stats.name || unit.stats.type}
								</div>
							</div>
						);
					})}

					{/* MID LANE Units - Diagonal path */}
					{midUnits.map((unit) => {
						// Move diagonally from bottom-left to top-right
						const progress = unit.position / 100;
						const left = `${5 + (progress * 90)}%`;
						const top = `${95 - (progress * 90)}%`;
						const healthPercent = (unit.currentHp / unit.stats.hp) * 100;
						
						return (
							<div
								key={unit.id}
								className="absolute flex flex-col items-center"
								style={{ left, top, transform: 'translate(-50%, -50%)', zIndex: 10, transition: 'left 0.5s linear, top 0.5s linear' }}
							>
								{/* Health bar */}
								<div className="mb-1 h-1.5 w-12 rounded-full bg-gray-700">
									<div
										className="h-full rounded-full bg-green-500"
										style={{ width: `${healthPercent}%` }}
									/>
								</div>
								
								{/* Soldier emoji */}
								<div className="text-3xl">
									{unit.stats.type === 'melee' ? '⚔️' : unit.stats.type === 'mage' ? '🧙' : '🏹'}
									{unit.carryingFlag && <span className="absolute -top-2 text-2xl">🚩</span>}
								</div>
								
								{/* Unit name */}
								<div className={`text-xs font-bold mt-0.5 ${unit.team === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
									{unit.stats.name || unit.stats.type}
								</div>
							</div>
						);
					})}

					{/* BOT LANE Units - L-shaped path */}
					{botUnits.map((unit) => {
						// 0-50: right along bottom, 50-100: up right side
						const progress = unit.position;
						let left: string, top: string;
						
						if (progress <= 50) {
							// Moving right along the bottom
							const horizontalProgress = progress * 2;
							left = `${9 + (horizontalProgress * 0.86)}%`;
							top = '91%';
						} else {
							// Moving up the right side
							const verticalProgress = (progress - 50) * 2;
							left = '91%';
							top = `${91 - (verticalProgress * 0.86)}%`;
						}
						
						const healthPercent = (unit.currentHp / unit.stats.hp) * 100;
						
						return (
							<div
								key={unit.id}
								className="absolute flex flex-col items-center"
								style={{ left, top, transform: 'translate(-50%, -50%)', zIndex: 10, transition: 'left 0.5s linear, top 0.5s linear' }}
							>
								{/* Health bar */}
								<div className="mb-1 h-1.5 w-12 rounded-full bg-gray-700">
									<div
										className="h-full rounded-full bg-green-500"
										style={{ width: `${healthPercent}%` }}
									/>
								</div>
								
								{/* Soldier emoji */}
								<div className="text-3xl">
									{unit.stats.type === 'melee' ? '⚔️' : unit.stats.type === 'mage' ? '🧙' : '🏹'}
									{unit.carryingFlag && <span className="absolute -top-2 text-2xl">🚩</span>}
								</div>
								
								{/* Unit name */}
								<div className={`text-xs font-bold mt-0.5 ${unit.team === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
									{unit.stats.name || unit.stats.type}
								</div>
							</div>
						);
					})}

					{/* Red Castle (Bottom Left) with flags */}
					<div className="absolute bottom-4 left-4 flex flex-col items-center">
						<div className="text-6xl">🏰</div>
						<div className="font-bold text-red-500">{config.redCastle}</div>
						<div className="mt-2 flex gap-1">
							{Object.values(flags)
								.filter((f) => f.team === 'red' && f.status === 'at-castle')
								.map((flag) => (
									<span key={flag.id} className="text-2xl">🚩</span>
								))}
						</div>
						{/* Defenders */}
						{redDefenders.length > 0 && (
							<div className="mt-2 flex flex-col gap-1">
								{redDefenders.map((defender) => {
									const healthPercent = (defender.currentHp / defender.stats.hp) * 100;
									return (
										<div key={defender.id} className="flex flex-col items-center">
											{/* Health bar */}
											<div className="mb-1 h-1.5 w-12 rounded-full bg-gray-700">
												<div
													className="h-full rounded-full bg-green-500"
													style={{ width: `${healthPercent}%` }}
												/>
											</div>
										{/* Defender emoji */}
										<div className="text-3xl">
											{defender.stats.type === 'melee' ? '⚔️' : defender.stats.type === 'mage' ? '🧙' : '🏹'}
										</div>
											{/* Defender name */}
											<div className="text-xs font-bold text-red-400">
												🛡️ {defender.stats.name || defender.stats.type}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Blue Castle (Top Right) with flags */}
					<div className="absolute right-4 top-4 flex flex-col items-center">
						<div className="text-6xl">🏰</div>
						<div className="font-bold text-blue-500">{config.blueCastle}</div>
						<div className="mt-2 flex gap-1">
							{Object.values(flags)
								.filter((f) => f.team === 'blue' && f.status === 'at-castle')
								.map((flag) => (
									<span key={flag.id} className="text-2xl">🚩</span>
								))}
						</div>
						{/* Defenders */}
						{blueDefenders.length > 0 && (
							<div className="mt-2 flex flex-col gap-1">
								{blueDefenders.map((defender) => {
									const healthPercent = (defender.currentHp / defender.stats.hp) * 100;
									return (
										<div key={defender.id} className="flex flex-col items-center">
											{/* Health bar */}
											<div className="mb-1 h-1.5 w-12 rounded-full bg-gray-700">
												<div
													className="h-full rounded-full bg-green-500"
													style={{ width: `${healthPercent}%` }}
												/>
											</div>
										{/* Defender emoji */}
										<div className="text-3xl">
											{defender.stats.type === 'melee' ? '⚔️' : defender.stats.type === 'mage' ? '🧙' : '🏹'}
										</div>
											{/* Defender name */}
											<div className="text-xs font-bold text-blue-400">
												🛡️ {defender.stats.name || defender.stats.type}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Combat Visual Feedback */}
					{feedbacks.map((feedback) => (
						<div
							key={feedback.id}
							className="absolute pointer-events-none"
							style={{
								left: feedback.x,
								top: feedback.y,
								transform: 'translate(-50%, -50%)',
								animation: 'floatUp 0.8s ease-out forwards',
								zIndex: 20
							}}
						>
							<div className="text-2xl">
								{feedback.type === 'hit' && '✨'}
								{feedback.type === 'death' && '💀'}
								{feedback.type === 'dodge' && '⚡'}
							</div>
						</div>
					))}
				</div>

				{/* Combat Log (Right Side) */}
				<div className="relative w-80 border-l-4 border-bark-700 bg-bark-800 p-4 shadow-lg flex flex-col">
					<div className="text-lg font-bold text-parchment mb-2">Combat Log</div>
					<div className="flex-1 overflow-y-auto space-y-1 text-sm text-forest-200">
						{sortedCombatEvents.length === 0 && (
							<div className="italic opacity-50 text-parchment">No combat events yet...</div>
						)}
						{sortedCombatEvents.map((event, idx) => {
							const attacker = battleUnits[event.attackerId];
							const defender = event.defenderId ? battleUnits[event.defenderId] : null;
							
							if (!attacker) return null;
							
							return (
								<div key={idx} className="font-mono text-xs">
									{event.type === 'hit' && defender && (
										<>
											<span className={attacker.team === 'red' ? 'text-red-400' : 'text-blue-400'}>
												{attacker.stats.name || attacker.stats.type}
											</span>
											{' '}dealt{' '}
											<span className="font-bold text-yellow-400">{event.damage}</span>
											{' '}damage to{' '}
											<span className={defender.team === 'red' ? 'text-red-400' : 'text-blue-400'}>
												{defender.stats.name || defender.stats.type}
											</span>
										</>
									)}
									{event.type === 'critical' && defender && (
										<>
											<span className={attacker.team === 'red' ? 'text-red-400' : 'text-blue-400'}>
												{attacker.stats.name || attacker.stats.type}
											</span>
											{' '}💥 CRITICAL for{' '}
											<span className="font-bold text-orange-400">{event.damage}</span>
											{' '}to{' '}
											<span className={defender.team === 'red' ? 'text-red-400' : 'text-blue-400'}>
												{defender.stats.name || defender.stats.type}
											</span>
										</>
									)}
									{event.type === 'death' && defender && (
										<>
											<span className={attacker.team === 'red' ? 'text-red-400' : 'text-blue-400'}>
												{attacker.stats.name || attacker.stats.type}
											</span>
											{' '}💀 killed{' '}
											<span className={defender.team === 'red' ? 'text-red-400' : 'text-blue-400'}>
												{defender.stats.name || defender.stats.type}
											</span>
										</>
									)}
									{event.type === 'dodge' && (
										<>
											<span className={attacker.team === 'red' ? 'text-red-400' : 'text-blue-400'}>
												{attacker.stats.name || attacker.stats.type}
											</span>
											{' '}⚡ dodged away
										</>
									)}
								</div>
							);
						})}
					</div>
					
					{/* Score Overlay - Only covers combat log */}
					{showScoreOverlay && currentScoreEvent && (
						<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
							<div className={`flex flex-col items-center gap-2 rounded-lg p-4 shadow-2xl ${
								currentScoreEvent.team === 'red' ? 'bg-red-600' : 'bg-blue-600'
							}`}>
								<img
									src={currentScoreEvent.sprite}
									alt={currentScoreEvent.soldierName}
									className="h-24 w-24 object-contain drop-shadow-2xl"
								/>
								<div className="text-center text-sm font-bold text-white drop-shadow-lg">
									{currentScoreEvent.playerName.toUpperCase()}'S
									<br />
									{currentScoreEvent.soldierName.toUpperCase()}
									<br />
									BROUGHT THE FLAG HOME!
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
