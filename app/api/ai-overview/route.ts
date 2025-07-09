// src/app/api/ai-overview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { headers } from 'next/headers'; // Import headers for API key access

// Define interfaces for type safety
// Interface for the detailed player data from ESPN (used for AI overview)
interface ESPNPlayer {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    position: { displayName: string };
    displayHeight: string;
    displayWeight: string;
    jersey: string;
    hometown: { city: string; state: string };
    team: { displayName: string; logos: { href: string }[]; color: string; alternateColor: string };
    college: { year: string; redshirted: boolean };
    recruit: { rating: string | null; positionRank: string | null };
}

// Interface for Assigned Abilities
interface AssignedAbility {
    name: string;
    tier: string;
    description: string;
}

// Interfaces for College Football Data API (for players)
interface CfbdPlayerBasic {
    id: number;
    first_name: string;
    last_name: string;
    team: string;
    position: string;
    // Add other fields as needed from CFBD API for basic player list
}

// Interface for ESPN Teams API
interface ESPNTeam {
    id: string;
    displayName: string;
    shortDisplayName: string;
    abbreviation: string;
    isActive: boolean;
    logos: { href: string }[];
    color: string;
    alternateColor: string;
    groups: {
        id: string;
        name: string;
        isConference: boolean;
        isFootballBowlSubdivision: boolean; // This will indicate FBS
        parentGroupId?: string;
        // Add other group properties if needed
    };
}


const allAbilities = [
    // Quarterbacks
    { name: "Backfield Creator", positions: ["QB"], description: "Exceptional at creating plays from the backfield." },
    { name: "Off Platform", positions: ["QB"], description: "Throws accurately while throwing off-platform." },
    { name: "Pull Down", positions: ["QB"], description: "Can quickly pull the ball down and run." },
    { name: "On Time", positions: ["QB"], "description": "Delivers accurate passes with perfect timing." },
    { name: "Sleight Of Hand", positions: ["QB"], description: "Excels at faking handoffs and play-action." },
    { name: "Mobile Deadeye", positions: ["QB"], description: "Maintains accuracy while throwing on the run." },
    { name: "Dual Threat", positions: ["QB"], description: "Effective passer and runner." },
    { name: "Downhill", positions: ["QB"], description: "Picks up extra yards falling forward when scrambling." },
    { name: "Extender", positions: ["QB"], description: "Extends plays outside the pocket effectively." },
    { name: "Option King", positions: ["QB"], description: "Master of option reads and execution." },
    { name: "Dot Dot!", positions: ["QB"], description: "High accuracy on deep throws." },
    { name: "Mobile Resistance", positions: ["QB"], description: "Resists pressure while scrambling." },
    { name: "Pocket Passer", positions: ["QB"], description: "Elite accuracy and decision-making from the pocket." },
    { name: "Resistance", positions: ["QB"], description: "Resists pressure while in the pocket." },
    { name: "Step Up", positions: ["QB"], description: "Steps up in the pocket to avoid edge rushers." },
    { name: "Pure Runner", positions: ["QB"], description: "Elite rushing ability for a QB." },
    { name: "Magician", positions: ["QB"], description: "Creates something out of nothing with incredible plays." },
    { name: "Shifty", positions: ["QB"], description: "Elusive with quick jukes and cuts as a runner." },
    { name: "Side Step", positions: ["QB"], description: "Avoids defenders with quick side steps." },
    { name: "Workhorse", positions: ["QB"], description: "Durable and reliable, can handle heavy workload." },

    // Halfbacks
    { name: "Backfield Threat", positions: ["HB"], description: "Dangerous receiving threat out of the backfield." },
    { name: "360", positions: ["HB"], description: "Can spin out of tackles effectively." },
    { name: "Safety Valve", positions: ["HB", "TE"], description: "Reliable target on short passes when primary reads are covered." },
    { name: "Takeoff", positions: ["HB", "WR", "TE"], description: "Quick acceleration and burst." },
    { name: "Recoup", positions: ["HB", "WR", "TE"], description: "Recovers quickly after taking a hit or making a cut." },
    { name: "Contact Seeker", positions: ["HB"], description: "Actively seeks contact to fall forward for extra yards." },
    { name: "Battering Ram", positions: ["HB"], description: "Breaks tackles with sheer power." },
    { name: "Ball Security", positions: ["HB", "FB"], description: "Protects the ball well to avoid fumbles." },
    { name: "Balanced", positions: ["HB", "WR", "TE", "FB", "OL", "S"], description: "Well-rounded skills in multiple areas." },
    { name: "East/West Playmaker", positions: ["HB"], description: "Excels at making defenders miss with lateral movement." },
    { name: "Arm Bar", positions: ["HB", "WR"], description: "Fights for extra yards by stiff-arming defenders." },
    { name: "Elusive Bruiser", positions: ["HB"], description: "Combines elusiveness with breaking tackles." },
    { name: "Headfirst", positions: ["HB", "WR"], description: "Dives forward to gain extra yards." },
    { name: "North/South", positions: ["HB"], description: "Runs directly upfield, rarely losing yards." },

    // Fullbacks
    { name: "Blocking Strong Grip", positions: ["FB"], description: "Maintains strong blocks against defenders." },
    { name: "Second Level", positions: ["FB", "OL", "TE"], description: "Engages and sustains blocks on second level defenders (LBs, Safeties)." },
    { name: "Pocket Shield", positions: ["FB", "OL"], description: "Provides elite pass protection for the quarterback." },
    { name: "Sidekick", positions: ["FB"], description: "An effective and reliable blocking companion." },
    { name: "Screen Enforcer", positions: ["FB", "OL"], description: "Dominates blocks on screen plays." },
    { name: "Utility", positions: ["FB"], description: "Versatile, can block, run, or catch effectively." },

    // Wide Receivers
    { name: "Contested Specialist", positions: ["WR"], description: "Dominant in contested catch situations." },
    { name: "50/50", positions: ["WR", "TE"], description: "Wins jump balls and contested catches frequently." },
    { name: "Cutter", positions: ["WR", "TE"], description: "Executes sharp, precise cuts on routes." },
    { name: "Double Dip", positions: ["WR", "TE"], description: "Excels at double moves to create separation." },
    { name: "Gadget", positions: ["WR"], description: "Versatile in various offensive packages, including runs." },
    { name: "Sure Hands", positions: ["WR", "TE"], description: "Rarely drops catchable passes." },
    { name: "Physical Route Runner", positions: ["WR", "TE"], description: "Uses physicality to gain separation on routes." },
    { name: "Route Artist", positions: ["WR"], description: "Master of route running, creates consistent separation." },
    { name: "Speedster", positions: ["WR"], description: "Possesses elite straight-line speed." },

    // Tight Ends
    { name: "Wear Down", positions: ["TE", "OL", "DL"], description: "Gradually wears down defenders with sustained effort." },
    { name: "Pure Blocker", positions: ["TE"], description: "An elite run-blocking tight end." },
    { name: "Quick Drop", positions: ["TE", "OL"], description: "Quickly gets into blocking position off the snap." },
    { name: "Vertical Threat", positions: ["TE"], description: "A dangerous deep threat from the tight end position." },

    // Offensive Line
    { name: "Agile", positions: ["OL"], description: "Quick and nimble, excels in pulling or zone schemes." },
    { name: "Option Shield", positions: ["OL"], description: "Maintains blocks effectively on option plays." },
    { name: "Raw Strength", positions: ["OL"], description: "Dominates defenders with sheer power." },
    { name: "Ground N Pound", positions: ["OL"], description: "Excels at opening running lanes in power schemes." },
    { name: "Well Rounded", positions: ["OL"], description: "Strong in both run blocking and pass protection." },

    // Defensive Line
    { name: "Edge Setter", positions: ["DL"], description: "Consistently sets a strong edge against outside runs." },
    { name: "Gap Specialist", positions: ["DL"], description: "Excels at filling and defending specific gaps." },
    { name: "Grip Breaker", positions: ["DL", "LB"], description: "Sheds blockers quickly to get to the ball carrier/QB." },
    { name: "Inside Disruptor", positions: ["DL", "LB"], description: "Penetrates interior offensive line for disruption." },
    { name: "Outside Disruptor", positions: ["DL", "LB"], description: "Excels at pressuring from the edge." },
    { name: "Pocket Disruptor", positions: ["DL"], description: "Consistently collapses the pocket around the QB." },
    { name: "Quick Jump", positions: ["DL", "CB"], description: "Gets an explosive jump off the line of scrimmage." },
    { name: "Power Rusher", positions: ["DL"], description: "Uses strength to bull rush and overwhelm blockers." },
    { name: "Duress", positions: ["DL", "LB"], description: "Applies significant pressure on the quarterback, forcing errant throws." },
    { name: "Take Down", positions: ["DL"], description: "Consistently brings down ball carriers for minimal gain." },
    { name: "Speed Rusher", positions: ["DL"], description: "Uses speed and agility to get around blockers." },

    // Linebackers
    { name: "Lurker", positions: ["LB"], description: "Excellent at intercepting passes from the middle." },
    { name: "House Call", positions: ["LB", "CB", "S"], description: "Capable of returning turnovers for touchdowns." },
    { name: "Knockout", positions: ["LB", "CB", "S"], description: "Delivers powerful hits to dislodge the ball." },
    { name: "Bouncer", positions: ["LB", "S"], description: "Bounces off blocks and continues pursuit." },
    { name: "Hammer", positions: ["LB", "S"], description: "Delivers forceful, tackle-breaking hits." },
    { name: "Signal Caller", positions: ["LB"], description: "Commands the defense and makes pre-snap adjustments." },
    { name: "Thumper", positions: ["LB"], description: "A hard-hitting run stopper." },
    { name: "Aftershock", positions: ["LB", "S"], description: "Delivers secondary hits to disrupt plays even after the initial tackle." },

    // Cornerbacks
    { name: "Boundary Jammer", positions: ["CB"], description: "Excels at pressing receivers on the sideline." },
    { name: "Blanket Coverage", positions: ["CB", "S"], description: "Sticks tightly to receivers in man coverage." },
    { name: "Bump and Run", positions: ["CB"], description: "Effective at disrupting routes with physical press coverage." },
    { name: "Ballhawk", positions: ["CB", "S"], description: "Instinctive playmaker for interceptions." },
    { name: "Shutdown", positions: ["CB"], description: "Consistently neutralizes the opposing team's top receiver." },
    { name: "Pick Artist", positions: ["CB", "S"], description: "Exceptional at reading QBs and intercepting passes." },

    // Safeties
    { name: "Box Safety", positions: ["S"], description: "Strong run defender who plays effectively near the line of scrimmage." },
    { name: "Free Safety", positions: ["S"], description: "Covers a deep portion of the field and makes plays on the ball." },
    { name: "Versatile Safety", positions: ["S"], description: "Can play effectively in both run support and pass coverage." },
    { name: "Field General", positions: ["S"], description: "Directs defensive backs and communicates effectively." },
    { name: "Tackling Machine", positions: ["S"], description: "A reliable open-field tackler." },
    { name: "Enforcer", positions: ["S"], description: "Delivers punishing hits to intimidate opponents." },

    // Kickers/Punters
    { name: "Accurate Kicker", positions: ["K"], description: "Consistently makes field goals and extra points." },
    { name: "Long-Range Kicker", positions: ["K"], description: "Capable of making field goals from long distances." },
    { name: "Punt Master", positions: ["P"], description: "Delivers accurate and long punts." },
    { name: "Coffin Corner", positions: ["P"], description: "Consistently pins opponents deep inside their own territory." },
    { name: "Hang Time", positions: ["P"], description: "Generates exceptional hang time on punts, limiting returns." },

    // Returners
    { name: "Kick Returner", positions: ["RB", "WR", "CB", "S"], description: "Excels at returning kicks for significant yardage." },
    { name: "Punt Returner", positions: ["RB", "WR", "CB", "S"], description: "Dangerous punt returner who can break tackles and find open space." },
    { name: "Dynamic Returner", positions: ["RB", "WR", "CB", "S"], description: "Consistently creates big plays on special teams returns." },
];

const tiers = ["Gold", "Silver", "Bronze"];

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const target = searchParams.get('target');
    const playerId = searchParams.get('playerId');
    const year = searchParams.get('year');
    const team = searchParams.get('team');
    const search = searchParams.get('search');

    // Retrieve API keys from environment variables
    const CFBD_API_KEY = process.env.CFBD_API_KEY; // Still needed for players endpoint
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // Check for necessary API keys based on potential usage
    if (!OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OPENAI_API_KEY is not set in environment variables.' }, { status: 500 });
    }
    // CFBD_API_KEY is only needed for 'players' target, so we check it conditionally below

    // --- Handle different API targets ---

    // 1. Fetch Teams from ESPN API
    if (target === 'teams') {
        try {
            console.log('[API Route] Fetching teams from ESPN API...');
            // ESPN Teams API does not require an API key
            const teamsResponse = await fetch(`http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams`);

            if (!teamsResponse.ok) {
                console.error(`Error fetching teams from ESPN: ${teamsResponse.status} ${teamsResponse.statusText}`);
                return NextResponse.json({ error: `Failed to fetch teams: ${teamsResponse.statusText}` }, { status: teamsResponse.status });
            }

            const teamsJson = await teamsResponse.json();
            // ESPN API structure has sports -> 0 -> leagues -> 0 -> teams
            const espnTeams: ESPNTeam[] = teamsJson.sports?.[0]?.leagues?.[0]?.teams || [];

            // Map ESPN team data to a more simplified structure, including classification
            const formattedTeams = espnTeams.map(team => ({
                id: team.id,
                name: team.displayName,
                mascot: team.shortDisplayName, // Using shortDisplayName as mascot, adjust if a proper mascot field is found
                conference: team.groups?.name || 'N/A', // Use conference name from groups if available
                classification: team.groups?.isFootballBowlSubdivision ? 'FBS' : 'FCS', // Determine FBS/FCS
                // You might add more fields from ESPNTeam if needed in the frontend
            }));

            return NextResponse.json(formattedTeams);

        } catch (error: any) {
            console.error('[API Route] Error fetching teams:', error);
            return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
        }
    }

    // 2. Fetch Players from College Football Data API
    if (target === 'players') {
        if (!CFBD_API_KEY) {
            return NextResponse.json({ error: 'CFBD_API_KEY is not set in environment variables for player fetching.' }, { status: 500 });
        }
        if (!year) {
            return NextResponse.json({ error: 'Year is required for fetching players' }, { status: 400 });
        }

        try {
            console.log(`[API Route] Fetching players from College Football Data API for year ${year}, team ${team || 'all'}, search "${search || 'none'}"`);
            let playersUrl = `https://api.collegefootballdata.com/players?year=${year}`;
            if (team) {
                playersUrl += `&team=${encodeURIComponent(team)}`;
            }
            if (search) {
                playersUrl += `&search=${encodeURIComponent(search)}`;
            }

            const playersResponse = await fetch(playersUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`,
                    'Accept': 'application/json',
                },
            });

            if (!playersResponse.ok) {
                console.error(`Error fetching players from CFBD: ${playersResponse.status} ${playersResponse.statusText}`);
                return NextResponse.json({ error: `Failed to fetch players: ${playersResponse.statusText}` }, { status: playersResponse.status });
            }

            const players: CfbdPlayerBasic[] = await playersResponse.json();
            return NextResponse.json(players);

        } catch (error: any) {
            console.error('[API Route] Error fetching players:', error);
            return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
        }
    }

    // 3. Generate AI Overview (default if no specific target or target is 'ai-overview')
    if (target === 'ai-overview' || (!target && playerId)) { // playerId check for backward compatibility
        if (!playerId) {
            return NextResponse.json({ error: 'Player ID is required for AI overview' }, { status: 400 });
        }

        try {
            console.log(`[AI Overview API] Fetching player data from ESPN for Player ID: ${playerId}`);
            // Fetch player data from ESPN (using the community-discovered endpoint structure)
            const playerResponse = await fetch(`http://site.api.espn.com/apis/site/v2/sports/football/college-football/athletes/${playerId}`);

            if (!playerResponse.ok) {
                console.error(`Error fetching player data from ESPN: ${playerResponse.status} ${playerResponse.statusText}`);
                return NextResponse.json({ error: `Failed to fetch player data: ${playerResponse.statusText}` }, { status: playerResponse.status });
            }

            const playerJson = await playerResponse.json();
            const player: ESPNPlayer | undefined = playerJson.athletes?.[0]; // Assuming the structure has an 'athletes' array

            if (!player) {
                return NextResponse.json({ error: 'Player not found on ESPN' }, { status: 404 });
            }

            // Extract relevant player details for AI prompt
            const {
                id,
                firstName,
                lastName,
                fullName: name,
                position: { displayName: position },
                displayHeight: height,
                displayWeight: weight,
                jersey,
                hometown: { city: hometownCity, state: hometownState },
                team: { displayName: teamName, logos, color, alternateColor },
                college: {
                    year: collegeYear,
                    redshirted: isRedshirted,
                },
                recruit: {
                    rating: highSchoolRating,
                    positionRank: archetype,
                }
            } = player;

            const redshirtedStatus = isRedshirted ? 'Yes' : 'No';
            const dealbreaker = null; // No direct mapping from ESPN API for this.

            const teamLogo = logos?.[0]?.href || '';
            const teamDarkLogo = logos?.[1]?.href || logos?.[0]?.href || '';

            let playerClass = collegeYear || 'N/A';

            // Generate AI Overview and Ratings
            const openai = new OpenAI({
                apiKey: OPENAI_API_KEY,
            });

            const prompt = `Generate a concise AI overview, detailed AI ratings (speed, strength, agility, awareness, etc., categorized by offense, defense, and athletic with numerical values 1-99), and a single quality score (1-99) for a college football player based on the following attributes:
            Player Name: ${name}
            Position: ${position}
            Height: ${height}
            Weight: ${weight}
            Jersey: ${jersey}
            Hometown: ${hometownCity}, ${hometownState}
            Team: ${teamName}
            Player ID: ${id}
            Player Class: ${playerClass}
            Redshirted: ${redshirtedStatus}
            High School Rating: ${highSchoolRating ? highSchoolRating : 'N/A'}
            Archetype: ${archetype ? archetype : 'N/A'}

            The AI overview should be a 3-4 sentence paragraph describing the player's overall style, strengths, and potential.
            The AI ratings should be an array of objects, each with a 'category' (e.g., "Offense", "Defense", "Athletic") and a 'stats' array. Each stat should have a 'name' and a 'value' (1-99). The ratings should be comprehensive for their position, and if a stat is not applicable or cannot be inferred, assign a reasonable default (e.g., 50) but prioritize specific, strong ratings where appropriate.
            The player quality score should be a single numerical value between 1 and 99, representing their overall quality.

            Example AI Ratings structure:
            [
                {
                    "category": "Offense",
                    "stats": [
                        {"name": "Throw Power", "value": 85},
                        {"name": "Accuracy", "value": 88}
                    ]
                },
                {
                    "category": "Athletic",
                    "stats": [
                        {"name": "Speed", "value": 90},
                        {"name": "Agility", "value": 85}
                    ]
                }
            ]
            `;

            console.log("[AI Overview API] Sending prompt to OpenAI.");

            const aiResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 700,
                response_format: { type: "json_object" },
            });

            console.log("[AI Overview API] Received response from OpenAI.");

            const parsedResponse = JSON.parse(aiResponse.choices[0].message?.content || '{}');
            const { aiOverview, aiRatings, playerQualityScore } = parsedResponse;

            // Assign abilities based on position and ratings
            const assignedAbilities: AssignedAbility[] = [];
            const playerPosition = position.split(' ')[0]; // Take the first word of the position

            for (const ability of allAbilities) {
                if (ability.positions.includes(playerPosition)) {
                    const randomTierIndex = Math.floor(Math.random() * tiers.length);
                    const assignedTier = tiers[randomTierIndex];

                    assignedAbilities.push({
                        name: ability.name,
                        tier: assignedTier,
                        description: ability.description,
                    });
                }
            }
            console.log(`[AI Overview API] Assigned Abilities:`, assignedAbilities);

            return NextResponse.json({
                aiOverview,
                aiRatings,
                assignedAbilities,
                playerQualityScore,
                playerClass,
                redshirted: redshirtedStatus,
                highSchoolRating,
                archetype,
                dealbreaker,
            });

        } catch (error: any) {
            console.error('[AI Overview API] Error:', error);
            if (error instanceof OpenAI.APIError) {
                console.error(error.status);
                console.error(error.message);
                console.error(error.code);
                console.error(error.type);
                return NextResponse.json(
                    { error: 'OpenAI API Error', details: error.message, code: error.code, type: error.type },
                    { status: error.status || 500 }
                );
            } else {
                return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
            }
        }
    }

    // Fallback for invalid or missing target
    return NextResponse.json({ error: 'Invalid or missing target parameter. Must be "teams", "players", or "ai-overview" with playerId.' }, { status: 400 });
}