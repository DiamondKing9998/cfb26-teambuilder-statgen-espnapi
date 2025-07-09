// src/app/api/ai-overview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { headers } from 'next/headers'; // Import headers for API key access

// Define interfaces for type safety

// Interface for the detailed player data from ESPN (used for AI overview)
interface ESPNPlayerDetail { // Renamed for clarity vs. roster player
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    position: { displayName: string };
    displayHeight: string;
    displayWeight: string;
    jersey: string;
    hometown: { city: string; state: string };
    team: { displayName: string; logos: { href: string }[]; color: string; alternateColor: string; slug: string }; // Added slug for lookup
    college: { year: string; redshirted: boolean };
    recruit: { rating: string | null; positionRank: string | null };
}

// Interface for Players from ESPN Roster (list of players)
interface ESPNRosterPlayer {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    position: { displayName: string };
    jersey: string;
    // Add other relevant fields for the roster list view
    team: { displayName: string; slug: string }; // Basic team info
}

// Interface for Assigned Abilities
interface AssignedAbility {
    name: string;
    tier: string;
    description: string;
}

// Interfaces for College Football Data API (for teams)
interface CFBDTeam {
    id: number;
    school: string; // Team name
    mascot: string;
    abbreviation: string;
    conference: string;
    classification: string; // 'fbs' or 'fcs'
    color: string;
    alt_color: string;
    logos: string[]; // URLs for logos
    // Add other fields as needed from CFBD API for basic team list
}

// Interface for ESPN Teams API (needed internally for player lookup)
interface ESPNTeamLookupData {
    id: string;
    uid: string;
    slug: string;
    abbreviation: string;
    displayName: string;
    shortDisplayName: string;
    name: string;
    nickname: string;
    location: string;
    color: string;
    alternateColor: string;
    isActive: boolean;
    isAllStar: boolean;
    logos: { href: string; alt: string; rel: string[]; width: number; height: number }[];
    groups?: {
        id: string;
        name: string;
        isConference: boolean;
        isFootballBowlSubdivision: boolean;
        parentGroupId?: string;
    };
}

// Interface for the item wrapper in ESPN team list response
interface ESPNTeamArrayItem {
    team: ESPNTeamLookupData;
}


const allAbilities = [
    // Quarterbacks
    { name: "Backfield Creator", positions: ["QB"], description: "Exceptional at creating plays from the backfield." },
    { name: "Off Platform", positions: ["QB"], description: "Throws accurately while throwing off-platform." },
    { name: "Pull Down", positions: ["QB"], description: "Can quickly pull the ball down and run." },
    { name: "On Time", positions: ["QB"], description: "Delivers accurate passes with perfect timing." },
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
    { name: "Lurker", positions: ["LB"], description: "Disguises coverage and surprises quarterbacks." },
    { name: "Tackling Machine", positions: ["LB", "DB"], description: "Consistently makes tackles, rarely missing." },
    { name: "Coverage Specialist", positions: ["LB", "DB"], description: "Excels in pass coverage against receivers and tight ends." },
    { name: "Run Stopper", positions: ["LB", "DL"], description: "Dominant against the run, clogs lanes." },
    { name: "Pass Rush Specialist", positions: ["LB", "DL"], description: "An elite pass rusher from the linebacker position." },

    // Defensive Backs (Cornerbacks & Safeties)
    { name: "Ball Hawk", positions: ["CB", "S"], description: "Instinctively finds and attacks the ball in the air." },
    { name: "Man Coverage", positions: ["CB"], description: "Locks down receivers in man-to-man coverage." },
    { name: "Zone Hawk", positions: ["CB", "S"], description: "Reads and reacts effectively to plays in zone coverage." },
    { name: "Big Hitter", positions: ["S", "LB"], description: "Delivers impactful hits, often forcing fumbles or incompletions." },
    { name: "Return Specialist", positions: ["CB", "S", "WR", "HB"], description: "Elite kick and/or punt returner." },
    { name: "Closer", positions: ["CB", "S"], description: "Finishes plays strong, making critical tackles or deflections." },
    { name: "Decoy", positions: ["CB", "S", "WR"], description: "Draws attention away from other players effectively." },
    { name: "Enforcer", positions: ["S"], description: "Imposes physical will on opposing players." },
    { name: "Versatile", positions: ["CB", "S", "LB"], description: "Can play multiple roles in the secondary or defense." },
    { name: "Pinch", positions: ["CB", "S"], description: "Quickly diagnoses and breaks on short passes." },

    // Kickers & Punters
    { name: "Accurate Kicker", positions: ["K"], description: "High accuracy on field goals and extra points." },
    { name: "Long Range Kicker", positions: ["K"], description: "Can consistently make kicks from long distances." },
    { name: "Hangtime Punter", positions: ["P"], description: "Punts with exceptional hangtime, limiting returns." },
    { name: "Accurate Punter", positions: ["P"], description: "Consistently places punts precisely." },
    { name: "Touchback Specialist", positions: ["K"], description: "Consistently kicks touchbacks on kickoffs." },
];

const tiers = ["Gold", "Silver", "Bronze"];

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const target = searchParams.get('target');
    const playerId = searchParams.get('playerId');
    const year = searchParams.get('year');
    const team = searchParams.get('team'); // This will now be CFBD team name for players target
    const search = searchParams.get('search');

    // Retrieve API keys from environment variables
    const CFBD_API_KEY = process.env.CFBD_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // Check for necessary API keys based on potential usage
    if (!OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OPENAI_API_KEY is not set in environment variables.' }, { status: 500 });
    }
    // CFBD_API_KEY is only needed for 'players' and 'teams' target, so we check it conditionally below

    // --- Handle different API targets ---

    // 1. Fetch Teams from CFBD API (FBS/FCS Team List Filter data)
    if (target === 'teams') {
        if (!CFBD_API_KEY) {
            return NextResponse.json({ error: 'CFBD_API_KEY is not set for fetching teams.' }, { status: 500 });
        }
        try {
            console.log('[API Route] Fetching teams from College Football Data API...');
            const teamsResponse = await fetch(`https://api.collegefootballdata.com/teams`, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`,
                    'Accept': 'application/json',
                },
            });

            if (!teamsResponse.ok) {
                console.error(`Error fetching teams from CFBD: ${teamsResponse.status} ${teamsResponse.statusText}`);
                return NextResponse.json({ error: `Failed to fetch teams: ${teamsResponse.statusText}` }, { status: teamsResponse.status });
            }

            const teamsJson: CFBDTeam[] = await teamsResponse.json();
            console.log('[API Route] Raw CFBD Teams Data:', JSON.stringify(teamsJson, null, 2));

            // Map CFBD team data to a simplified structure
            const formattedTeams = teamsJson.map(team => ({
                id: team.id.toString(), // Convert number ID to string
                name: team.school,
                mascot: team.mascot,
                conference: team.conference || 'N/A',
                classification: team.classification.toUpperCase(), // 'fbs' -> 'FBS'
                color: team.color || '#000000',
                alternateColor: team.alt_color || '#FFFFFF',
                logo: team.logos?.[0] || '', // Primary logo
                darkLogo: team.logos?.[1] || team.logos?.[0] || '', // Alternative/dark logo
            }));

            return NextResponse.json(formattedTeams);

        } catch (error: any) {
            console.error('[API Route] Error fetching teams:', error);
            return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
        }
    }

    // 2. Fetch Players (Roster data) from ESPN API
    if (target === 'players') {
        if (!year) {
            return NextResponse.json({ error: 'Year is required for fetching players' }, { status: 400 });
        }
        if (!team) {
             return NextResponse.json({ error: 'Team name is required for fetching ESPN roster data' }, { status: 400 });
        }

        try {
            console.log(`[API Route] Fetching ESPN team details to find ESPN ID for team: ${team}`);
            // First, fetch all ESPN teams to find the corresponding ESPN team ID/slug for the given CFBD team name
            const espnTeamsResponse = await fetch(`http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams`);
            if (!espnTeamsResponse.ok) {
                console.error(`Error fetching ESPN teams for lookup: ${espnTeamsResponse.status} ${espnTeamsResponse.statusText}`);
                return NextResponse.json({ error: `Failed to lookup ESPN team: ${espnTeamsResponse.statusText}` }, { status: espnTeamsResponse.status });
            }
            const espnTeamsJson = await espnTeamsResponse.json();
            const allEspnTeams: ESPNTeamArrayItem[] = espnTeamsJson.sports?.[0]?.leagues?.[0]?.teams || [];

            // Find the ESPN team that matches the CFBD team name (case-insensitive and flexible matching)
            const matchedEspnTeam = allEspnTeams.find(item =>
                item.team.displayName.toLowerCase() === team.toLowerCase() ||
                item.team.shortDisplayName.toLowerCase() === team.toLowerCase() ||
                item.team.slug.toLowerCase() === team.toLowerCase()
            );

            if (!matchedEspnTeam) {
                return NextResponse.json({ error: `Could not find ESPN team ID for CFBD team: ${team}` }, { status: 404 });
            }

            const espnTeamSlug = matchedEspnTeam.team.slug;
            console.log(`[API Route] Found ESPN team slug: ${espnTeamSlug} for CFBD team: ${team}`);

            console.log(`[API Route] Fetching roster from ESPN API for team: ${espnTeamSlug}, year ${year}`);
            // ESPN roster endpoint (example structure, might need adjustment based on exact ESPN API response)
            // Note: ESPN roster endpoints often don't take a 'year' parameter directly in this path for college football.
            // They usually represent the current/latest roster. If historical rosters are needed, it's more complex.
            const playersResponse = await fetch(`http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${espnTeamSlug}/roster`);

            if (!playersResponse.ok) {
                console.error(`Error fetching players from ESPN: ${playersResponse.status} ${playersResponse.statusText}`);
                return NextResponse.json({ error: `Failed to fetch players: ${playersResponse.statusText}` }, { status: playersResponse.status });
            }

            const playersJson = await playersResponse.json();
            console.log('[API Route] Raw ESPN Roster Data:', JSON.stringify(playersJson, null, 2));

            // Extract players from ESPN roster data
            // This path might need adjustment based on the exact ESPN roster JSON structure
            // Common paths: playersJson.sports[0].leagues[0].teams[0].athletes OR playersJson.athletes.items[0].athletes
            let espnPlayers: any[] = [];
            if (playersJson.sports?.[0]?.leagues?.[0]?.teams?.[0]?.athletes) {
                espnPlayers = playersJson.sports[0].leagues[0].teams[0].athletes;
            } else if (playersJson.athletes?.items?.[0]?.athletes) {
                // Sometimes the structure is simpler like this
                espnPlayers = playersJson.athletes.items.flatMap((item: any) => item.athletes);
            } else if (Array.isArray(playersJson.athletes)) { // Direct athletes array
                 espnPlayers = playersJson.athletes;
            } else {
                console.warn('[API Route] Unexpected ESPN roster data structure. Could not find athletes.');
            }


            const formattedPlayers: ESPNRosterPlayer[] = espnPlayers.map((player: any) => ({
                id: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
                fullName: player.fullName,
                position: { displayName: player.position?.displayName || 'N/A' },
                jersey: player.jersey || 'N/A',
                team: {
                    displayName: matchedEspnTeam.team.displayName,
                    slug: matchedEspnTeam.team.slug
                }
            }));

            // Filter by search query if present
            const filteredPlayers = search
                ? formattedPlayers.filter(player =>
                    player.fullName.toLowerCase().includes(search.toLowerCase())
                )
                : formattedPlayers;


            return NextResponse.json(filteredPlayers);

        } catch (error: any) {
            console.error('[API Route] Error fetching players:', error);
            return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
        }
    }

    // 3. Generate AI Overview (detailed player data from ESPN)
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
            const player: ESPNPlayerDetail | undefined = playerJson.athletes?.[0]; // Assuming the structure has an 'athletes' array

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