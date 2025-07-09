// src/app/api/ai-overview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Define interfaces for type safety
interface CfbdPlayer {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    position: string;
    height: number | null;
    weight: number | null;
    jersey: number | null;
    hometown: string | null;
    team: string;
    // Added redshirted status
    redshirted?: boolean | null; // Assuming this might come from the initial player data
}

// New interface for CFBD Team data
interface CfbdTeam {
    id: number;
    name: string;
    conference: string;
    division: string;
    classification: 'FBS' | 'FCS'; // Added classification
    color?: string;
    alt_color?: string;
    logos?: string[]; // Assuming logos might be present
}


interface AssignedAbility {
    name: string;
    tier: string;
    description: string;
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
    { name: "Field", positions: ["CB"], description: "Excels at playing the field side of the defense." },
    { name: "Robber", positions: ["S", "CB"], description: "Reads the QB and jumps routes for interceptions in the middle." },
    { name: "Zone", positions: ["CB", "S"], description: "Excels in zone coverage, breaking on passes." },

    // Safeties
    { name: "Box Specialist", positions: ["S"], description: "Dominant run defender near the line of scrimmage." },
    { name: "Coverage Specialist", positions: ["S"], description: "Elite skills in pass coverage." },
    { name: "Hybrid", positions: ["S"], description: "Excels at both run support and pass coverage." },

    // Kickers & Punters
    { name: "Accurate", positions: ["K", "P"], description: "Consistent accuracy on kicks/punts." },
    { name: "Chip Shot", positions: ["K"], description: "Highly reliable on short-range field goals." },
    { name: "Deep Range", positions: ["K", "P"], description: "Can kick/punt from long distances." },
    { name: "Mega Leg", positions: ["K", "P"], description: "Possesses exceptional leg strength." },
    { name: "Coffin Corner", positions: ["P"], description: "Excels at pinning opponents deep with precision punts." },

    // Mental Abilities (can apply to multiple positions, listed as "Any" for broader assignment)
    { name: "Best Friend", positions: ["Any"], description: "Boosts teammates' morale and performance." },
    { name: "Clear Headed", positions: ["Any"], description: "Maintains composure and makes smart decisions under pressure." },
    { name: "Clutch Kicker", positions: ["K", "P", "Any"], description: "Performs best in high-pressure kicking situations." },
    { name: "Defensive Rally", positions: ["DL", "LB", "CB", "S"], description: "Inspires defensive teammates to play harder." },
    { name: "Fan Favorite", positions: ["Any"], description: "A fan favorite, providing a boost to team energy." },
    { name: "Field General", positions: ["QB"], description: "Commands the offense and makes smart decisions pre-snap." },
    { name: "Hot Head", positions: ["DL", "LB"], description: "Can get overly aggressive, sometimes leading to penalties." },
    { name: "Headstrong", positions: ["DL", "LB"], description: "Resists being fooled by fakes and misdirection." },
    { name: "Legion", positions: ["DL", "LB", "CB", "S"], description: "A leader on defense, boosting morale and effectiveness." },
    { name: "Offensive Rally", positions: ["QB", "RB", "WR", "TE", "OL", "FB"], description: "Inspires offensive teammates to play harder." },
    { name: "Road Dog", positions: ["Any"], description: "Excels in hostile away game environments." },
    { name: "Team Player", positions: ["Any"], description: "Puts team success above individual stats." },
    { name: "The Natural", positions: ["Any"], description: "Possesses innate talent and instincts for the game." },
    { name: "Winning Time", positions: ["Any"], description: "Performs exceptionally well in critical late-game situations." }
];

const tiers = ["Bronze", "Silver", "Gold", "Platinum", "X-Factor"];

// GET handler for fetching teams or other data
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target');

    const CFBD_API_KEY = process.env.CFBD_API_KEY;

    if (!CFBD_API_KEY) {
        console.error("CFBD_API_KEY environment variable is not set.");
        return NextResponse.json({ error: "Server configuration error: College Football Data API key missing." }, { status: 500 });
    }

    if (target === 'teams') {
        try {
            console.log("[AI Overview API] Fetching teams from CFBD API...");
            const cfbdTeamsUrl = 'https://api.collegefootballdata.com/teams';
            const cfbdTeamsResponse = await fetch(cfbdTeamsUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (!cfbdTeamsResponse.ok) {
                const errorText = await cfbdTeamsResponse.text();
                console.error(`[AI Overview API] CFBD Teams API Error: ${cfbdTeamsResponse.status} - ${errorText}`);
                return NextResponse.json(
                    { error: 'Failed to fetch teams from College Football Data API', details: errorText },
                    { status: cfbdTeamsResponse.status }
                );
            }

            const teams: CfbdTeam[] = await cfbdTeamsResponse.json();
            console.log(`[AI Overview API] Fetched ${teams.length} teams from CFBD.`);

            // Return all teams from CFBD API
            return NextResponse.json(teams);

        } catch (error: any) {
            console.error('[AI Overview API] Error fetching teams:', error);
            return NextResponse.json({ error: 'Internal Server Error fetching teams', details: error.message || 'Unknown error' }, { status: 500 });
        }
    }

    // If no target or an unhandled target, return a bad request
    return NextResponse.json({ error: 'Invalid or missing target parameter.' }, { status: 400 });
}


export async function POST(req: NextRequest) {
    try {
        const { player, year } = await req.json();

        // --- Logging Input ---
        console.log(`[AI Overview API] Received request for player: ${player.name}, team: ${player.team}, year: ${year}`);
        console.log(`[AI Overview API] Player Data:`, player);

        if (!player || !player.id || !player.name || !player.team || !year) {
            return NextResponse.json({ error: 'Missing player data or year in request.' }, { status: 400 });
        }

        const playerName = (player.name || `${player.firstName || ''} ${player.lastName || ''}`).trim();
        const teamName = player.team;
        const playerPosition = player.position ? player.position.toUpperCase() : 'N/A';
        const playerJersey = player.jersey ? `#${player.jersey}` : 'N/A';
        const playerHeight = player.height ? `${Math.floor(player.height / 12)}'${player.height % 12}"` : 'N/A';
        const playerWeight = player.weight ? `${player.weight} lbs` : 'N/A';
        const playerHometown = player.hometown || 'N/A';
        // Handle redshirted status from player data, defaulting to 'Uncertain' if not provided
        const redshirtedStatus = player.redshirted === true ? 'Yes' : (player.redshirted === false ? 'No' : 'Uncertain');


        const CFBD_API_KEY = process.env.CFBD_API_KEY;

        if (!CFBD_API_KEY) {
            console.error("CFBD_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: College Football Data API key missing." }, { status: 500 });
        }

        let cfbdStatsSummary = `Basic player info: Name: ${playerName}, Team: ${teamName}, Position: ${playerPosition}, Jersey: ${playerJersey}, Height: ${playerHeight}, Weight: ${playerWeight}, Hometown: ${playerHometown}, Redshirted: ${redshirtedStatus}.`;

        try {
            const cfbdStatsUrl = `https://api.collegefootballdata.com/stats/player/season?year=${year}&team=${encodeURIComponent(teamName)}`;

            console.log(`Attempting to fetch ALL season stats for ${teamName} in ${year} from CFBD: ${cfbdStatsUrl}`);
            const cfbdStatsResponse = await fetch(cfbdStatsUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (cfbdStatsResponse.ok) {
                const allTeamSeasonStats = await cfbdStatsResponse.json();
                console.log("Raw ALL season stats data from CFBD:", allTeamSeasonStats);

                const targetPlayerId = player.id;
                const targetPlayerNameLower = playerName.toLowerCase().trim(); // Ensure trimming for comparison

                const playerSpecificStatsEntries = allTeamSeasonStats.filter((statEntry: any) => {
                    const entryPlayerNameLower = (statEntry.player || '').toLowerCase().trim();
                    const entryPlayerId = statEntry.id; // Corrected: Use statEntry.id as per CFBD schema for player ID

                    // Match by ID if available, otherwise by name (player.id is the ID from your initial player search)
                    return (targetPlayerId && entryPlayerId === targetPlayerId) ||
                           (entryPlayerNameLower === targetPlayerNameLower);
                });

                console.log("Player-specific filtered stat entries:", playerSpecificStatsEntries);

                if (playerSpecificStatsEntries.length > 0) {
                    let specificStats: string[] = [];
                    const statsMap = new Map<string, any>();

                    playerSpecificStatsEntries.forEach((s: any) => {
                        statsMap.set(`${s.category}_${s.statType}`, s.stat);
                    });

                    // Add more detailed stats based on position if available
                    if (playerPosition.includes('QB')) {
                        specificStats.push(`Passing Yards: ${statsMap.get('passing_YDS') || 'N/A'}`);
                        specificStats.push(`Passing TDs: ${statsMap.get('passing_TD') || 'N/A'}`);
                        specificStats.push(`Completions: ${statsMap.get('passing_COMP') || 'N/A'}`);
                        specificStats.push(`Attempts: ${statsMap.get('passing_ATT') || 'N/A'}`);
                        const completionPct = statsMap.has('passing_COMP') && statsMap.has('passing_ATT') && parseFloat(statsMap.get('passing_ATT')) > 0
                            ? ((parseFloat(statsMap.get('passing_COMP')) / parseFloat(statsMap.get('passing_ATT'))) * 100).toFixed(1) + '%'
                            : 'N/A';
                        specificStats.push(`Completion %: ${completionPct}`);
                        specificStats.push(`Interceptions: ${statsMap.get('passing_INT') || 'N/A'}`);
                        specificStats.push(`Rushing Yards (QB): ${statsMap.get('rushing_YDS') || 'N/A'}`);
                        specificStats.push(`Rushing TDs (QB): ${statsMap.get('rushing_TD') || 'N/A'}`);
                    } else if (playerPosition.includes('RB') || playerPosition.includes('FB')) {
                        specificStats.push(`Rushing Yards: ${statsMap.get('rushing_YDS') || 'N/A'}`);
                        specificStats.push(`Rushing TDs: ${statsMap.get('rushing_TD') || 'N/A'}`);
                        specificStats.push(`Carries: ${statsMap.get('rushing_CAR') || 'N/A'}`);
                        specificStats.push(`Receptions: ${statsMap.get('receiving_REC') || 'N/A'}`);
                        specificStats.push(`Receiving Yards: ${statsMap.get('receiving_YDS') || 'N/A'}`);
                        specificStats.push(`Receiving TDs: ${statsMap.get('receiving_TD') || 'N/A'}`);
                    } else if (playerPosition.includes('WR') || playerPosition.includes('TE')) {
                        specificStats.push(`Receptions: ${statsMap.get('receiving_REC') || 'N/A'}`);
                        specificStats.push(`Receiving Yards: ${statsMap.get('receiving_YDS') || 'N/A'}`);
                        specificStats.push(`Receiving TDs: ${statsMap.get('receiving_TD') || 'N/A'}`);
                        specificStats.push(`Targets: ${statsMap.get('receiving_TAR') || 'N/A'}`);
                    } else if (playerPosition.includes('LB') || playerPosition.includes('DB') || playerPosition.includes('S') || playerPosition.includes('CB')) {
                        specificStats.push(`Total Tackles: ${statsMap.get('defensive_TOT') || 'N/A'}`);
                        specificStats.push(`Solo Tackles: ${statsMap.get('defensive_SOLO') || 'N/A'}`);
                        specificStats.push(`Sacks: ${statsMap.get('defensive_SACK') || 'N/A'}`);
                        specificStats.push(`Tackles for Loss: ${statsMap.get('defensive_TFL') || 'N/A'}`);
                        specificStats.push(`Interceptions: ${statsMap.get('defensive_INT') || 'N/A'}`);
                        specificStats.push(`Pass Breakups: ${statsMap.get('defensive_PD') || 'N/A'}`);
                        specificStats.push(`Forced Fumbles: ${statsMap.get('defensive_FF') || 'N/A'}`);
                    } else if (playerPosition.includes('DL') || playerPosition.includes('DT') || playerPosition.includes('DE')) {
                        specificStats.push(`Total Tackles: ${statsMap.get('defensive_TOT') || 'N/A'}`);
                        specificStats.push(`Solo Tackles: ${statsMap.get('defensive_SOLO') || 'N/A'}`);
                        specificStats.push(`Sacks: ${statsMap.get('defensive_SACK') || 'N/A'}`);
                        specificStats.push(`Tackles for Loss: ${statsMap.get('defensive_TFL') || 'N/A'}`);
                        specificStats.push(`QB Hurries: ${statsMap.get('defensive_QB HUR') || 'N/A'}`);
                    } else if (playerPosition.includes('K') || playerPosition.includes('P')) {
                        specificStats.push(`Field Goals Made: ${statsMap.get('kicking_FGM') || 'N/A'}`);
                        specificStats.push(`Field Goals Att: ${statsMap.get('kicking_FGA') || 'N/A'}`);
                        specificStats.push(`Extra Points Made: ${statsMap.get('kicking_PAT') || 'N/A'}`);
                        specificStats.push(`Punt Yards: ${statsMap.get('punting_YDS') || 'N/A'}`);
                        specificStats.push(`Punts: ${statsMap.get('punting_PUNTS') || 'N/A'}`);
                        specificStats.push(`Average Punt: ${statsMap.get('punting_AVG') || 'N/A'}`);
                    } else {
                        // For other positions (OL, etc.) or if no specific stats found, provide a general message
                        specificStats.push("No detailed CFBD stats available for this player's position or for the selected year.");
                    }
                    cfbdStatsSummary = specificStats.join('\n');
                } else {
                    cfbdStatsSummary = `No detailed CFBD stats found for ${playerName} in ${year} for team ${teamName}.`;
                }
            } else {
                cfbdStatsSummary = `Could not retrieve CFBD stats for ${playerName} in ${year}. Status: ${cfbdStatsResponse.status}.`;
                console.error(`Failed to fetch CFBD stats for ${playerName}: ${cfbdStatsResponse.statusText}`);
            }
        } catch (cfbdError: any) {
            console.error('[AI Overview API] CFBD Player Stats Fetch Error:', cfbdError);
            cfbdStatsSummary = `Error fetching CFBD stats: ${cfbdError.message || 'Unknown error'}.`;
        }

        // Fetch high school recruit rating (if available)
        let highSchoolRating: string = 'N/A';
        try {
            // Check if player.recruitId exists, which is typically used for recruiting data
            if (player.recruitId) {
                const recruitingUrl = `https://api.collegefootballdata.com/recruiting/players?recruitIds=${player.recruitId}`;
                console.log(`[AI Overview API] Fetching recruiting data from CFBD: ${recruitingUrl}`);

                const recruitingResponse = await fetch(recruitingUrl, {
                    headers: {
                        'Authorization': `Bearer ${CFBD_API_KEY}`,
                        'Accept': 'application/json'
                    }
                });

                if (recruitingResponse.ok) {
                    const recruitingData = await recruitingResponse.json();
                    if (recruitingData && recruitingData.length > 0) {
                        const recruit = recruitingData[0];
                        highSchoolRating = recruit.rating ? `${recruit.rating} (${recruit.stars}-star)` : 'N/A';
                        console.log(`[AI Overview API] High School Rating for ${playerName}: ${highSchoolRating}`);
                    } else {
                        console.log(`[AI Overview API] No recruiting data found for recruitId: ${player.recruitId}`);
                    }
                } else {
                    const errorText = await recruitingResponse.text();
                    console.warn(`[AI Overview API] Failed to fetch recruiting data: ${recruitingResponse.status} - ${errorText}`);
                }
            } else {
                console.log(`[AI Overview API] No recruitId available for ${playerName}, skipping recruiting data fetch.`);
            }
        } catch (recruitingError: any) {
            console.error('[AI Overview API] Error fetching recruiting data:', recruitingError);
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        if (!process.env.OPENAI_API_KEY) {
            console.error("OPENAI_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: OpenAI API key missing." }, { status: 500 });
        }


        // Combine all relevant information for the AI model
        const playerInfoForAI = `
            Player Name: ${playerName}
            Team: ${teamName}
            Position: ${playerPosition}
            Height: ${playerHeight}
            Weight: ${playerWeight}
            Jersey: ${playerJersey}
            Hometown: ${playerHometown}
            Redshirted: ${redshirtedStatus}
            High School Rating: ${highSchoolRating}
            College Football Data Stats Summary for ${year} Season:\n${cfbdStatsSummary}
        `;

        console.log(`[AI Overview API] Sending to OpenAI:\n${playerInfoForAI}`);

        const systemPrompt = `You are an AI assistant specialized in college football analysis. Your task is to provide an overview, assign a player quality score (0-100), assign specific numerical ratings (0-99) across various categories, determine player class (e.g., Freshman, Sophomore, Junior, Senior), determine if the player is redshirted ('Yes', 'No', 'Uncertain'), determine their archetype, and identify any potential dealbreaker.

        Based on the provided player information and College Football Data API stats, generate the following:

        1.  **AI Overview**: A concise, engaging, and professional summary (2-4 paragraphs) of the player's key attributes, play style, strengths, and areas for improvement. Integrate provided stats naturally.
        2.  **Player Quality Score**: A single numerical score from 0-100 representing the player's overall quality and potential.
        3.  **Player Class**: Determine the player's current class (e.g., 'Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad'). If not explicitly stated and impossible to infer, state 'Uncertain'.
        4.  **Redshirted Status**: State 'Yes', 'No', or 'Uncertain' based on the provided information.
        5.  **High School Rating**: Reiterate the high school rating provided, or 'N/A' if not available.
        6.  **Archetype**: Assign a fitting archetype from the following list (choose only one):
            * **QB**: Pocket Passer, Dual Threat, Scrambler, Field General
            * **HB**: Power Back, Elusive Back, Receiving Back, All-Purpose Back
            * **FB**: Blocker, Utility, Goal-line Back
            * **WR**: Possession Receiver, Deep Threat, Slot Receiver, Red Zone Threat, Route Technician
            * **TE**: Blocking TE, Receiving TE, All-Purpose TE, Red Zone Threat
            * **OL**: Pass Blocker, Run Blocker, Agile Blocker (Zone Scheme), Power Blocker (Power Scheme)
            * **DL**: Pass Rusher (Edge), Run Stopper (Interior), Hybrid (Edge/Interior), Disruptor
            * **LB**: Inside Linebacker (Run Stopper), Outside Linebacker (Pass Rusher), Coverage Linebacker, Hybrid
            * **CB**: Man Coverage, Zone Coverage, Press Corner, Ballhawk
            * **S**: Strong Safety (Box), Free Safety (Coverage), Hybrid Safety
            * **K/P**: Kicker, Punter, Kickoff Specialist
            * **Overall**: Athlete (if highly versatile and excels in multiple positions/phases of game, often used for recruits without a fixed position yet)
            If no specific archetype fits well, state 'General'.
        7.  **Dealbreaker**: Identify one potential significant weakness or area of concern that could hinder the player's future development or impact (e.g., "lacks top-end speed," "prone to penalties," "struggles against press coverage," "injury history"). If none are apparent or if the information is insufficient to determine one, state 'None apparent'.
        8.  **AI Ratings**: Provide specific numerical ratings (0-99) for a range of relevant attributes. Organize these by category (e.g., General, Quarterback, Rushing, Receiving, Blocking, Defense, Coverage, Kicking, Punting). Only include categories and stats relevant to the player's primary position and available information. Do NOT include ratings for irrelevant positions. For example, a QB should not have "Tackling" or "Pass Block" ratings. If a specific stat isn't applicable or inferable, omit it or mark as 'N/A'.
            * **General**: Speed, Acceleration, Agility, Strength, Stamina, Injury Resistance, Awareness, Consistency, Leadership, Poise, Durability, Potential
            * **Quarterback**: Throw Power, Throw Accuracy (Short), Throw Accuracy (Medium), Throw Accuracy (Deep), Play Action, Throw on Run, Under Pressure, Break Sack, Deep Ball, Pre-snap Read
            * **Rushing**: Break Tackle, Trucking, Elusiveness, Spin Move, Juke Move, Stiff Arm, Ball Carrier Vision, Carrying, Short Yardage, Goal Line
            * **Receiving**: Catching, Spectacular Catch, Catch in Traffic, Short Route Run, Medium Route Run, Deep Route Run, Release, Route Running, YAC (Yards After Catch)
            * **Blocking**: Run Block, Pass Block, Impact Blocking, Lead Block, Pass Block Power, Pass Block Finesse, Run Block Power, Run Block Finesse
            * **Defense**: Play Recognition, Tackle, Hit Power, Power Moves, Finesse Moves, Block Shedding, Pursuit, Shed Block, Pass Rush, Discipline
            * **Coverage**: Man Coverage, Zone Coverage, Press, Hands (for interceptions/PBUs)
            * **Kicking**: Kick Power, Kick Accuracy, Kick Return
            * **Punting**: Punt Power, Punt Accuracy, Punt Return

        Ensure your response is structured clearly with distinct sections for each point (AI Overview, Player Quality Score, Player Class, Redshirted Status, High School Rating, Archetype, Dealbreaker, AI Ratings). For AI Ratings, use a JSON-like structure within the text for easy parsing, like:
        Category: [
          { name: "StatName", value: Rating },
          { name: "AnotherStat", value: Rating }
        ]
        Example:
        General: [
          { name: "Speed", value: 88 },
          { name: "Strength", value: 75 }
        ]

        Do NOT include any additional conversational text or preambles outside of the requested structured output.
        `;

        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4o", // You can use "gpt-4o" or "gpt-3.5-turbo"
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: playerInfoForAI,
                },
            ],
            temperature: 0.7,
            max_tokens: 1500,
        });

        const aiResponseContent = chatCompletion.choices[0].message.content;
        console.log(`[AI Overview API] Raw AI Response:\n${aiResponseContent}`);


        // --- Parse AI Response ---
        let aiOverview = '';
        let aiRatings: { category: string; stats: { name: string; value: any }[] }[] = [];
        let playerQualityScore = 'N/A';
        let playerClass = 'Uncertain';
        let redshirted = 'Uncertain'; // Default value
        let archetype = 'General';
        let dealbreaker = 'None apparent';
        let parsedHighSchoolRating = 'N/A'; // For the AI's parsed understanding of high school rating


        // Regular expressions to extract information
        const overviewRegex = /AI Overview:\s*([\s\S]*?)(?=(?:Player Quality Score:|Player Class:|Redshirted Status:|High School Rating:|Archetype:|Dealbreaker:|AI Ratings:|$))/;
        const qualityScoreRegex = /Player Quality Score:\s*(\d+)/;
        const playerClassRegex = /Player Class:\s*([a-zA-Z]+)/;
        const redshirtedRegex = /Redshirted Status:\s*(Yes|No|Uncertain)/;
        const highSchoolRatingRegex = /High School Rating:\s*(.*)/;
        const archetypeRegex = /Archetype:\s*([a-zA-Z\s,()-]+)/;
        const dealbreakerRegex = /Dealbreaker:\s*([\s\S]*?)(?=(?:AI Ratings:|$))/;
        const ratingsRegex = /(\w+):\s*\[\s*(\{[\s\S]*?\})\s*\]/g; // Regex for categories and their arrays of stats

        // Extract AI Overview
        const overviewMatch = aiResponseContent?.match(overviewRegex);
        if (overviewMatch && overviewMatch[1]) {
            aiOverview = overviewMatch[1].trim();
        }

        // Extract Player Quality Score
        const qualityScoreMatch = aiResponseContent?.match(qualityScoreRegex);
        if (qualityScoreMatch && qualityScoreMatch[1]) {
            playerQualityScore = qualityScoreMatch[1];
        }

        // Extract Player Class
        const playerClassMatch = aiResponseContent?.match(playerClassRegex);
        if (playerClassMatch && playerClassMatch[1]) {
            playerClass = playerClassMatch[1].trim();
        }

        // Extract Redshirted Status
        const redshirtedMatch = aiResponseContent?.match(redshirtedRegex);
        if (redshirtedMatch && redshirtedMatch[1]) {
            redshirted = redshirtedMatch[1].trim();
        }

        // Extract High School Rating
        const parsedHighSchoolRatingMatch = aiResponseContent?.match(highSchoolRatingRegex);
        if (parsedHighSchoolRatingMatch && parsedHighSchoolRatingMatch[1]) {
            parsedHighSchoolRating = parsedHighSchoolRatingMatch[1].trim();
        }

        // Extract Archetype
        const archetypeMatch = aiResponseContent?.match(archetypeRegex);
        if (archetypeMatch && archetypeMatch[1]) {
            archetype = archetypeMatch[1].trim();
        }

        // Extract Dealbreaker
        const dealbreakerMatch = aiResponseContent?.match(dealbreakerRegex);
        if (dealbreakerMatch && dealbreakerMatch[1]) {
            dealbreaker = dealbreakerMatch[1].trim();
        }


        // Extract AI Ratings
        let match;
        while ((match = ratingsRegex.exec(aiResponseContent || '')) !== null) {
            try {
                const category = match[1].trim();
                // Replace single quotes with double quotes for valid JSON parsing
                const statsString = match[2].replace(/'/g, '"');
                const stats = JSON.parse(`[${statsString}]`); // Parse as an array of objects
                aiRatings.push({ category, stats });
            } catch (jsonError) {
                console.error("Error parsing AI Ratings JSON:", jsonError);
                console.error("Problematic string:", match[2]);
            }
        }

        // --- Ability Assignment ---
        const playerSpecificAbilities = allAbilities.filter(ability =>
            ability.positions.includes(playerPosition) || ability.positions.includes("Any")
        );

        const assignedAbilities: AssignedAbility[] = [];
        const numAbilitiesToAssign = Math.min(playerSpecificAbilities.length, 3); // Assign up to 3 abilities

        // Simple random assignment for demonstration
        const shuffledAbilities = playerSpecificAbilities.sort(() => 0.5 - Math.random());
        for (let i = 0; i < numAbilitiesToAssign; i++) {
            const ability = shuffledAbilities[i];
            if (ability) {
                // Assign a random tier
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
            aiRatings, // Now an array of objects with category and stats
            assignedAbilities,
            playerQualityScore, // Include quality score in response if frontend needs it
            // NEW FIELDS IN RESPONSE
            playerClass,
            redshirted: redshirtedStatus, // Return the string for clarity
            highSchoolRating, // Use the highSchoolRating derived from CFBD
            archetype,
            dealbreaker,
        });

    } catch (error: any) {
        console.error('[AI Overview API] Error:', error);
        // More specific error messages for known issues
        if (error instanceof OpenAI.APIError) {
            console.error(error.status); // e.g. 401
            console.error(error.message); // e.g. The authentication token you passed was invalid...
            console.error(error.code); // e.g. 'invalid_api_key'
            console.error(error.type); // e.g. 'authentication_error'
            return NextResponse.json(
                { error: 'OpenAI API Error', details: error.message, code: error.code, type: error.type },
                { status: error.status || 500 }
            );
        } else {
            return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
        }
    }
}