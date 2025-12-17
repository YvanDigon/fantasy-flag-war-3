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

	// Evolution screen
	evolutionTitle: z.string().default('Choose Evolution'),
	evolutionCost: z.string().default('Cost: 100 Gold'),
	superEvolutionButton: z.string().default('Super Evolution - 200 Gold'),
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
	// Combat system explanation
	combatSystemExplanation: z.string().default('Melee beats Ranged, Ranged beats Mage, Mage beats Melee — just like rock-paper-scissors!'),
	evolutionNotice: z.string().default('You can evolve your soldier between battle rounds.')
});

export type Config = z.infer<typeof schema>;
