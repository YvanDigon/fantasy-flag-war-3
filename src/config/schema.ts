import { z } from 'zod/v4';

export const schema = z.object({
	// General
	title: z.string().default('Fantasy Flag War'),
	hostLabel: z.string().default('Host'),
	presenterLabel: z.string().default('Presenter'),
	loading: z.string().default('Loading...'),

	// Player name
	playerNameTitle: z.string().default('Enter Your Name'),
	playerNamePlaceholder: z.string().default('Your name...'),
	playerNameButton: z.string().default('Continue'),

	// Team selection
	teamSelectionTitle: z.string().default('Choose Your Team'),
	redTeam: z.string().default('Red Team'),
	blueTeam: z.string().default('Blue Team'),
	randomTeam: z.string().default('Random Team'),

	// Intro preparation
	introPreparationTitle: z.string().default('Choose Your Starting Soldier'),
	meleeType: z.string().default('Melee'),
	mageType: z.string().default('Mage'),
	rangedType: z.string().default('Ranged'),
	confirmChoice: z.string().default('Confirm'),

	// Commander screen
	commanderTitle: z.string().default('Commander'),
	gold: z.string().default('Gold'),
	deployButton: z.string().default('Deploy Soldier'),
	evolveButton: z.string().default('Evolve Soldier'),
	readyButton: z.string().default('Ready'),
	defendCastleButton: z.string().default('Defend Castle'),
	notEnoughGold: z.string().default('Not enough gold'),
	selectLane: z.string().default('Select Lane'),
	topLane: z.string().default('Top Lane'),
	midLane: z.string().default('Mid Lane'),
	botLane: z.string().default('Bot Lane'),
	deployedUnits: z.string().default('Deployed Units'),
	
	// Soldier stats
	hp: z.string().default('HP'),
	attack: z.string().default('Attack'),
	defense: z.string().default('Defense'),
	speed: z.string().default('Speed'),
	criticalHitRate: z.string().default('Critical Hit'),
	goldGeneration: z.string().default('Gold Gen'),
	type: z.string().default('Type'),

	// Stat info descriptions
	typeInfo: z.string().default('Your {type} soldier is strong against {strongAgainst} and weak against {weakAgainst}.'),
	attackInfo: z.string().default('Determines how much damage your soldier deals. Base damage = Attack * {attackMultiplier}, modified by type advantage.'),
	defenseInfo: z.string().default('Reduces incoming damage by subtracting Defense / {defenseDivisor} from enemy attacks.'),
	speedInfo: z.string().default('Determines how fast your soldier moves across the battlefield and the chance to dodge attacks from slower enemies (Speed * {dodgeMultiplier}% dodge chance).'),
	criticalHitInfo: z.string().default('Each point gives a chance to deal a devastating blow. Critical hits multiply damage by {criticalHitMultiplier}x.'),
	goldGenerationInfo: z.string().default('Generates additional gold at the end of each battle phase. Earns {goldGenMultiplier} gold per point.'),

	// Evolution screen
	evolutionTitle: z.string().default('Choose Evolution'),
	evolutionCost: z.string().default('Cost: 100 Gold'),
	superEvolutionButton: z.string().default('Super Evolution'),
	backButton: z.string().default('Back'),
	
	// Super evolution screen
	superEvolutionTitle: z.string().default('Super Evolution'),
	superEvolutionCost: z.string().default('Cost: 200 Gold'),
	nameYourSuperEvolution: z.string().default('Name Your Super Evolution'),
	superEvolutionPlaceholder: z.string().default('Enter custom name...'),
	confirmSuperEvolution: z.string().default('Confirm - 200 Gold'),
	generatingSprite: z.string().default('Generating custom sprite...'),

	// Battle wait
	battleWaitTitle: z.string().default('Battle in Progress'),
	battleWaitMd: z
		.string()
		.default('Your soldiers are fighting! Watch the battle on the presenter screen.'),

	// Host view
	gameLinksTitle: z.string().default('Game Links'),
	playerLinkLabel: z.string().default('Player Link'),
	presenterLinkLabel: z.string().default('Presenter Link'),
	startGameButton: z.string().default('Start Game'),
	endPreparationButton: z.string().default('End Preparation Phase'),
	finishBattleButton: z.string().default('Finish Battle Phase'),
	playersOverview: z.string().default('Players Overview'),
	currentPhase: z.string().default('Current Phase'),
	preparationPhase: z.string().default('Preparation Phase'),
	battlePhase: z.string().default('Battle Phase'),
	introPreparationPhase: z.string().default('Intro Preparation'),

	// Presenter view
	redCastle: z.string().default('Red Castle'),
	blueCastle: z.string().default('Blue Castle'),
	score: z.string().default('Score'),
	flags: z.string().default('Flags'),
	
	// Connections view
	connectionsMd: z.string().default('Waiting for warriors to join the battle...'),
	players: z.string().default('Warriors'),
	noPlayersYet: z.string().default('No warriors have joined the battle yet. Share the link to recruit your army!'),

	// Battle damage formula
	attackMultiplier: z.number().default(4),
	defenseDivisor: z.number().default(2),
	typeAdvantageMultiplier: z.number().default(3),
	criticalHitMultiplier: z.number().default(3),
	dodgeMultiplier: z.number().default(1),
	// Gold pickup mechanic
	goldPickupAmount: z.number().default(100),
	// Economy settings
	deploySoldierPrice: z.number().default(100),
	evolveSoldierPrice: z.number().default(100),
	evolveStatIncrease: z.number().default(3),
	superEvolveSoldierPrice: z.number().default(200),
	superEvolveStatIncrease: z.number().default(15),
	superEvolveStatDecrease: z.number().default(3),
	goldGenMultiplier: z.number().default(10),
	// Super skill parameters
	teleportMinAdvance: z.number().default(10), // Minimum % forward spawn
	teleportMaxAdvance: z.number().default(50), // Maximum % forward spawn
	goldMagnetShift: z.number().default(25), // % closer to castle per player
	goldMagnetMinPosition: z.number().default(25), // Minimum % position for gold
	warEconomyCostReduction: z.number().default(20), // % cost reduction
	warEconomyStatPenalty: z.number().default(10), // % stat penalty
	fortressAttackBonus: z.number().default(25), // % attack bonus for defenders
	warmasterBonusIncrease: z.number().default(33), // % increase to type advantage damage
	solidStoneDamageReduction: z.number().default(50), // % damage reduction from type disadvantage
	// Combat system explanation
	combatSystemExplanation: z.string().default('Melee beats Ranged, Ranged beats Mage, Mage beats Melee — just like rock-paper-scissors!'),
	evolutionNotice: z.string().default('You can evolve your soldier between battle rounds.')
});

export type Config = z.infer<typeof schema>;
