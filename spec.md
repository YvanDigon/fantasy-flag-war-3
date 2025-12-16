# Fantasy Flag War - Game Specification

## Overview

A turn-based strategy game where two teams (Red and Blue) compete to steal flags from opposing castles across three lanes. Teams deploy soldiers during preparation phases, then watch them battle autonomously in battle phases.

## Core Concepts

### Teams
- **Red Team** vs **Blue Team**
- Each team has a castle with 3 flags
- Players join one of the two teams (can select or random assignment)

### Map Layout
- Similar to League of Legends map structure
- 3 lanes connecting the two castles:
  - **Top Lane**: Longest distance
  - **Mid Lane**: Shortest distance  
  - **Bot Lane**: Longest distance
- Distance affects movement time

### Soldier Types
Three types with rock-paper-scissors advantage system:
- **Mage** > Melee (3x damage multiplier)
- **Melee** > Ranged (3x damage multiplier)
- **Ranged** > Mage (3x damage multiplier)

#### Soldier Sprites
- Melee: https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153228778.png
- Mage: https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153223922.png
- Ranged: https://loquiz.com/wpmainpage/wp-content/uploads/2025/12/image_2025-12-13_153218722.png

### Soldier Stats
All soldiers have 7 stats:
- **HP**: Always 100 (never changes)
- **Type**: Mage, Melee, or Ranged
- **Attack**: Damage dealt
- **Defense**: Damage reduction
- **Speed**: Movement and dodge chance
- **Critical Hit Rate**: 3x damage chance
- **Gold Generation**: Bonus gold per preparation phase

#### Base Stats (Starting Soldier)
- HP: 100
- Attack: 5
- Defense: 5
- Speed: 5
- Critical Hit Rate: 5%
- Gold Generation: 5

## Game Flow

### 1. Player Setup
1. Enter name
2. Select team (Red/Blue) or choose random
3. **Intro Preparation Phase**: Choose starting soldier type (Melee/Mage/Ranged)
4. Enter Commander Screen

### 2. Game Phases (Loop)

#### Preparation Phase
Players manage their army on Commander Screen:
- **Deploy Soldiers**: Spend 100 gold to deploy on chosen lane (Top/Mid/Bot)
- **Evolve Soldier**: Spend 100 gold to upgrade base soldier stats
- **Ready Up**: Signal readiness for battle
- Cannot spend below 0 gold
- Deployed soldiers show on player screen (not presenter until battle)
- Phase ends when host clicks "End Preparation Phase"

##### Gold System
- Starting gold: 200
- Each preparation phase: +200 base + (10 × Gold Generation stat)
- Example: If Gold Generation = 5, player receives 200 + 50 = 250 gold

#### Evolution System
When player chooses to evolve:
- Shows 3 random evolution options
- Each option displays:
  - AI-generated fantasy name (e.g., "Hell Crossbowman", "Swiss Pikeman", "Daughters of Gandalf")
  - Type: Mage, Melee, or Ranged
  - Stat boosts: +3 to 2 different random stats (excluding HP)
  - Cost: 100 gold
- Evolution is permanent and applies to the base soldier template
- All future deployments use the evolved stats

#### Battle Phase
Autonomous combat simulation:
- All deployed soldiers appear on presenter screen
- Soldiers move toward enemy castle on assigned lane
- Combat triggers when opposing soldiers meet
- Phase ends when:
  - Host clicks "Finish Battle Phase" (removes all soldiers/flags from lanes)
  - No moving soldiers remain (all dead or returned to castle)

## Combat Mechanics

### Movement
- Soldiers move every 0.5 seconds
- Distance covered based on Speed stat
- **Formula**: Time to cross = 20 seconds / (Speed / 5) for Top/Bot lanes
- **Mid lane**: 15 seconds / (Speed / 5)
- Example: Speed 5 = 20 seconds (Top/Bot), 15 seconds (Mid)
- Soldiers carrying flags move at 50% speed

### Combat
When opposing soldiers meet:
- Both attack simultaneously every 0.5 seconds
- **Damage calculation**: 
  - Base damage = Attacker's Attack - Defender's Defense
  - Apply type advantage multiplier (×3 if strong against type)
  - Apply critical hit multiplier (×3 if critical succeeds)
  - Critical chance = Critical Hit Rate stat as percentage

#### Dodge Mechanic
- If sum of (Attack + Defense + Critical Hit Rate) < opponent's sum:
  - Dodge chance = Speed stat as percentage
  - On successful dodge: soldier bypasses opponent, both continue walking
  - Check occurs with each hit (every 0.5 seconds)

#### Combat Feedback (Presenter)
- Show health bars above each soldier (green/red horizontal bars)
- Visual feedback when soldiers fight
- Highlight critical hits
- Show dodge events
- Show death animations

## Flag Mechanics

### Capturing Flags
- Each castle has 3 flags (one per lane conceptually)
- When soldier reaches enemy castle: automatically grabs available flag
- Soldier automatically walks back to own castle when carrying flag
- Movement speed reduced to 50% while carrying flag

### Flag States
- **Unclaimed**: At original castle position
- **Claimed**: Being carried by a soldier
- **Dropped**: Soldier died while carrying (flag stays at death location)

### Flag Interactions
- Soldiers can only interact with enemy flags (not their own team's flags)
- If enemy castle has no flags available:
  - Soldier moves to lane with closest unclaimed enemy flag
  - If equidistant, chooses randomly
  - If all flags claimed or at own castle: picks random lane and returns home

### Dropped Flags
- When flag carrier dies, flag drops at that position
- Can be picked up by any soldier of the opposing team (not the flag's team)
- Pickup is automatic when soldier reaches flag position

### Scoring
- Team earns 1 point when soldier successfully delivers enemy flag to their castle
- Soldier disappears after delivering flag

## Host View

### Controls
- "End Preparation Phase" button (visible during preparation)
- "Finish Battle Phase" button (visible during battle)

### Player Overview
- List all players with:
  - Player name
  - Team
  - Current gold
  - Soldier type and stats (clickable)
  - Flags captured count

### Unit Inspection
- Click on player to view:
  - Soldier sprite
  - All 7 stats
  - Evolution history

## Presenter View

### Visual Elements
- Two castles (Red and Blue) at opposite ends
- 3 lanes visually connecting them (Top/Mid/Bot layout like LoL)
- Team scores (flags captured)
- Current phase indicator (Preparation/Battle)

### Battle Phase Display
- Soldiers represented by emojis:
  - ⚔️ Melee
  - 🔮 Mage
  - 🏹 Ranged
- Color-coded by team (red/blue tint or background)
- Health bars above each soldier
- Combat feedback animations
- Flag indicators on carriers
- Death animations

### Phase Display
- Clear indicator showing current phase
- Preparation Phase: Show waiting state
- Battle Phase: Show active combat

## Player View States

### Navigation Flow
1. **Name Entry** → Create Profile View
2. **Team Selection** → Team Selection View
3. **Intro Preparation** → Starting Soldier Choice View (one-time)
4. **Commander Screen** → Deploy/Evolve/Ready interface
5. **Battle Phase** → Waiting/spectating screen
6. Loop back to Commander Screen for next preparation phase

### Commander Screen
Shows:
- Soldier sprite (current evolution)
- All 7 stats
- Current gold amount
- "Deploy Soldier" button with lane selection (Top/Mid/Bot) - Cost: 100 gold
- "Evolve Soldier" button - Cost: 100 gold
- "Ready" button
- Deployed units list (visible on player screen only)

### Evolution Screen
Shows 3 options:
- Evolution name (AI-generated fantasy name)
- Soldier type (Mage/Melee/Ranged)
- Stat changes: "+3 Attack, +3 Speed" (2 random stats)
- Confirm button (100 gold)
- Back button

## Technical Requirements

### State Management
- **Global Store**: Phase, teams, soldiers in battle, flags, scores, positions
- **Player Store**: Team, gold, soldier stats, deployed units, ready status, current view
- Use `useDynamicStore` if needed for team-specific state

### Battle Simulation
- Runs in global controller (single source of truth)
- Updates every 0.5 seconds during battle phase
- Tracks positions, HP, combat states, flag states
- Deterministic based on stats and RNG seed

### Synchronization
- All clients see same battle simulation
- Use server timestamps for battle timing
- Position updates broadcast via global store

## Balance Considerations

### Starting Soldier Choice
- All three types have identical base stats
- Only difference is type advantage in combat
- Choice is strategic based on expected enemy composition

### Evolution Strategy
- Random stat boosts encourage diverse strategies
- Type can change during evolution (adds unpredictability)
- Gold management: deploy more units vs. evolve for stronger units

### Lane Strategy
- Mid lane fastest but most contested
- Top/Bot lanes slower but may be less crowded
- Flag distribution across lanes creates tactical decisions
