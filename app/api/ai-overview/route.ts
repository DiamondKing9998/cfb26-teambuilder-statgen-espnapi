// src/app/api/ai-overview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai'; // Added this import

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
}

interface AssignedAbility {
    name: string;
    tier: string;
    description: string;
}

// Re-defining allAbilities and tiers as they were included in your provided original file
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


        const CFBD_API_KEY = process.env.CFBD_API_KEY;

        if (!CFBD_API_KEY) {
            console.error("CFBD_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: College Football Data API key missing." }, { status: 500 });
        }

        let cfbdStatsSummary = `Basic player info: Name: ${playerName}, Team: ${teamName}, Position: ${playerPosition}, Jersey: ${playerJersey}, Height: ${playerHeight}, Weight: ${playerWeight}, Hometown: ${playerHometown}.`;

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
                        const allPlayerStats = playerSpecificStatsEntries.map((s: any) => `${s.category} ${s.statType}: ${s.stat}`).join(', ');
                        if (allPlayerStats) {
                            specificStats.push(`All available stats: ${allPlayerStats}`);
                        }
                    }

                    if (specificStats.length > 0) {
                        cfbdStatsSummary += `\nKey stats for ${year} season: ${specificStats.filter(s => !s.includes('N/A')).join(', ')}.`;
                    } else {
                        cfbdStatsSummary += `\nNo specific statistical data found for ${playerName} in ${year} from CollegeFootballData.com using the new endpoint.`;
                    }
                } else {
                    cfbdStatsSummary += `\nNo specific statistical data found for ${playerName} in ${year} from CollegeFootballData.com.`;
                }
            } else {
                const errorText = await cfbdStatsResponse.text();
                console.warn(`CFBD stats API returned non-OK status ${cfbdStatsResponse.status}: ${errorText}`);
                cfbdStatsSummary += `\nCould not retrieve detailed stats from CollegeFootballData.com (Status: ${cfbdStatsResponse.status}).`;
            }
        } catch (cfbdError: any) {
            console.error("Error fetching detailed stats from CollegeFootballData.com:", cfbdError);
            cfbdStatsSummary += `\nError retrieving detailed stats from CollegeFootballData.com: ${cfbdError.message}.`;
        }


        // Construct the detailed prompt for OpenAI
        const prompt = `
            You are an expert college football analyst for the new EA Sports College Football 26 video game.
            Your task is to analyze a player's real-world performance for the ${year} season and provide a detailed scout report for the game.

            Player Details:
            Name: ${player.name}
            Position: ${player.position}
            Team: ${player.team}
            Height: ${player.height ? `${Math.floor(player.height / 12)}'${player.height % 12}"` : 'N/A'}
            Weight: ${player.weight ? `${player.weight} lbs` : 'N/A'}
            Jersey Number: ${player.jersey || 'N/A'}
            Hometown: ${player.hometown || 'N/A'}

            ${cfbdStatsSummary}

            Based on this information, generate the following sections in the exact format specified below.
            Each section must be clearly demarcated by its header.

            ## OVERVIEW ##
            Generate 2-3 detailed paragraphs summarizing the player's key attributes, play style, strengths, and weaknesses. Focus on how their real-world performance translates to in-game potential. Be descriptive and analytical.

            ## RATINGS ##
            Provide hypothetical in-game ratings for the player for EA Sports College Football 26.
            Each rating should be on a scale of 0-99.
            **Important rules for ratings:**
            1.  **Be Realistic:** Most players will have many average or low ratings, especially in areas not relevant to their position. For example, a defensive lineman will have very low Throw Power, and an offensive lineman will have very low Man Coverage. A player's rating in a given stat should be proportional to their real-world ability and relevance for their position.
            2.  **Missing Data:** If you cannot confidently determine a specific rating based on the provided real-world stats or general football knowledge for that player, assign a very low rating (e.g., between 0-30). Do not leave any stat unrated.
            3.  **No Overall Rating from this section:** Do NOT calculate or provide an "Overall" rating within this list. The overall assessment is in the next section.
            4.  **Format:** List each stat as a single bullet point: "- [Attribute Name]: [Rating]"
                Group the ratings under the following categories exactly as shown, with each category having its own header.

            ### General ###
            - Speed: [Value]
            - Strength: [Value]
            - Agility: [Value]
            - Acceleration: [Value]
            - Awareness: [Value]
            - Injury: [Value]
            - Toughness: [Value]
            - Stamina: [Value]

            ### Ball Carrier ###
            - Break Tackle: [Value]
            - Trucking: [Value]
            - Change of Direction: [Value]
            - Ball Carrier Vision: [Value]
            - Stiff Arm: [Value]
            - Spin Move: [Value]
            - Juke Move: [Value]
            - Carrying: [Value]
            - Jumping: [Value]

            ### Quarterback ###
            - Throw Power: [Value]
            - Short Throw Accuracy: [Value]
            - Medium Throw Accuracy: [Value]
            - Deep Throw Accuracy: [Value]
            - Throw on the Run: [Value]
            - Throw Under Pressure: [Value]
            - Break Sack: [Value]
            - Play Action: [Value]

            ### Receiver ###
            - Catching: [Value]
            - Short Route Run: [Value]
            - Medium Route Run: [Value]
            - Deep Route Run: [Value]
            - Catch in Traffic: [Value]
            - Spectacular Catch: [Value]
            - Release: [Value]

            ### Blocking ###
            - Pass Block: [Value]
            - Pass Block Power: [Value]
            - Pass Block Finesse: [Value]
            - Run Block: [Value]
            - Run Block Power: [Value]
            - Run Block Finesse: [Value]
            - Lead Block: [Value]
            - Impact Blocking: [Value]

            ### Defense ###
            - Play Recognition: [Value]
            - Tackle: [Value]
            - Hit Power: [Value]
            - Power Moves: [Value]
            - Finesse Moves: [Value]
            - Block Shedding: [Value]
            - Pursuit: [Value]

            ### Coverage ###
            - Man Coverage: [Value]
            - Zone Coverage: [Value]
            - Press: [Value]

            ### Kicking ###
            - Kick Power: [Value]
            - Kick Accuracy: [Value]
            - Return: [Value]
            - Long Snap: [Value]

            ## ASSESSMENT ##
            Overall Player Quality: [Generate a score out of 100 (e.g., 92/100) or a descriptive term (e.g., Elite, Great, Good, Average) indicating their overall talent/impact for a player at their position. Make this accurate for known players like Joe Burrow, giving him a high score. For less prominent players like Davis Warren, give a lower, more realistic score.]
        `;

        // --- Logging Prompt ---
        console.log(`[AI Overview API] Prompt sent to OpenAI:\n${prompt}`);

        // Call OpenAI API
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            console.error("OPENAI_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: OpenAI API key missing." }, { status: 500 });
        }

        // Initialize the OpenAI client
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY }); // Added this line

        const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-4o', // Or 'gpt-3.5-turbo' if you prefer
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7, // Keep it somewhat creative but factual
            max_tokens: 1500, // Increased max_tokens significantly to accommodate all 54 stats + categories
        });

        const aiResponseText = chatCompletion.choices[0].message.content;

        // --- Logging Raw AI Response ---
        console.log(`[AI Overview API] Raw AI Response:\n${aiResponseText}`);

        if (!aiResponseText) {
            console.error('[AI Overview API] OpenAI returned an empty response.');
            return NextResponse.json({ error: 'OpenAI did not return a valid response.' }, { status: 500 });
        }

        // --- Parsing AI Response ---
        let aiOverview = "No AI overview available.";
        let aiRatings: { category: string; stats: { name: string; value: number }[] }[] = [];
        let playerQualityScore: number | null = null;

        // Overview parsing
        const overviewMatch = aiResponseText.match(/## OVERVIEW ##\s*([\s\S]*?)(?=## RATINGS ##|$)/);
        if (overviewMatch && overviewMatch[1]) {
            aiOverview = overviewMatch[1].trim();
        }

        // Ratings parsing (more robust for categories and individual stats)
        const ratingsSectionMatch = aiResponseText.match(/## RATINGS ##\s*([\s\S]*?)(?=## ASSESSMENT ##|$)/);
        if (ratingsSectionMatch && ratingsSectionMatch[1]) {
            const rawRatingsContent = ratingsSectionMatch[1].trim();
            const categoryRegex = /###\s*(.*?)\s*###\s*\n([\s\S]*?)(?=(?:###|$))/g;
            let currentCategoryMatch;

            while ((currentCategoryMatch = categoryRegex.exec(rawRatingsContent)) !== null) {
                const categoryName = currentCategoryMatch[1].trim();
                const categoryStatsText = currentCategoryMatch[2].trim();

                const stats: { name: string; value: number }[] = [];
                const statLineRegex = /-\s*(.*?):\s*(\d+)/g; // Matches "- Stat Name: Value"
                let statMatch;

                while ((statMatch = statLineRegex.exec(categoryStatsText)) !== null) {
                    const statName = statMatch[1].trim();
                    const statValue = parseInt(statMatch[2], 10);
                    if (!isNaN(statValue)) {
                        stats.push({ name: statName, value: statValue });
                    }
                }
                aiRatings.push({ category: categoryName, stats: stats });
            }
        }


        // Quality Score parsing
        const assessmentMatch = aiResponseText.match(/## ASSESSMENT ##\s*Overall Player Quality:\s*(\d+)/);
        if (assessmentMatch && assessmentMatch[1]) {
            playerQualityScore = parseInt(assessmentMatch[1], 10);
        } else {
             // Fallback for descriptive assessments
            const descriptiveScoreMatch = aiResponseText.match(/## ASSESSMENT ##\s*Overall Player Quality:\s*(.*?)(?=\n|$)/i);
            if (descriptiveScoreMatch && descriptiveScoreMatch[1]) {
                const assessmentText = descriptiveScoreMatch[1].toLowerCase();
                if (assessmentText.includes("elite")) playerQualityScore = 95;
                else if (assessmentText.includes("great") || assessmentText.includes("top-tier")) playerQualityScore = 85;
                else if (assessmentText.includes("good") || assessmentText.includes("solid")) playerQualityScore = 75;
                else if (assessmentText.includes("average") || assessmentText.includes("decent")) playerQualityScore = 65;
                else if (assessmentText.includes("poor") || assessmentText.includes("low")) playerQualityScore = 40;
                else playerQualityScore = 50; // Default if no clear indicator
            }
        }


        // --- Logging Parsed Data ---
        console.log(`[AI Overview API] Parsed Overview:`, aiOverview);
        console.log(`[AI Overview API] Parsed Ratings:`, aiRatings);
        console.log(`[AI Overview API] Parsed Quality Score:`, playerQualityScore);

        // --- Ability Assignment Logic (Moved directly into route.ts) ---
        const assignedAbilities: AssignedAbility[] = [];
        const relevantAbilities = allAbilities.filter(
            ability => ability.positions.includes(playerPosition) || ability.positions.includes("Any")
        );

        if (playerQualityScore !== null) {
            // Changed to consistently assign 5 abilities for key players, aligning with reference
            const numAbilitiesToAssign = 5;

            let baseTierIndex = 0; // Default to Bronze
            if (playerQualityScore >= 90) baseTierIndex = 4; // X-Factor (index 4)
            else if (playerQualityScore >= 80) baseTierIndex = 3; // Platinum (index 3)
            else if (playerQualityScore >= 70) baseTierIndex = 2; // Gold (index 2)
            else if (playerQualityScore >= 60) baseTierIndex = 1; // Silver (index 1)

            // Randomly select abilities and assign a tier, biasing towards the base tier
            const shuffledAbilities = relevantAbilities.sort(() => 0.5 - Math.random());
            for (let i = 0; i < Math.min(numAbilitiesToAssign, shuffledAbilities.length); i++) {
                const ability = shuffledAbilities[i];
                // Randomly select a tier, with higher probability for the baseTierIndex or one below it
                let randomTierIndex = Math.floor(Math.random() * (baseTierIndex + 1));
                if (randomTierIndex > tiers.length - 1) { // Ensure it doesn't exceed array bounds
                    randomTierIndex = tiers.length - 1;
                }
                const assignedTier = tiers[randomTierIndex];

                assignedAbilities.push({
                    name: ability.name,
                    tier: assignedTier,
                    description: ability.description,
                });
            }
        }
        console.log(`[AI Overview API] Assigned Abilities:`, assignedAbilities);

        // --- New: Add redshirt, class, dealbreaker, archetype ---
        const playerRedshirtStatus = getRedshirtStatus(player);
        const playerClass = getPlayerClass(year);
        const playerDealbreaker = getDealbreaker();
        const playerArchetype = getArchetype(player, aiRatings);

        return NextResponse.json({
            aiOverview,
            aiRatings, // Now an array of objects with category and stats
            assignedAbilities,
            playerQualityScore, // Include quality score in response if frontend needs it
            playerRedshirtStatus,
            playerClass,
            playerDealbreaker,
            playerArchetype
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

// --- Dealbreakers and Archetypes ---
const dealbreakers = [
    "Injury Prone",
    "Low Work Ethic",
    "Disciplinary Issues",
    "Poor Academic Standing",
    "Off-Field Distractions",
    "Coachability Concerns",
    "Low Football IQ",
    "Poor Attitude",
    "Lack of Leadership",
    "Inconsistent Performer"
];

function getPlayerClass(year: number): string {
    // You can adjust this logic if you have more accurate data
    switch (year) {
        case 1: return "Freshman";
        case 2: return "Sophomore";
        case 3: return "Junior";
        case 4: return "Senior";
        default: return "Unknown";
    }
}

function getRedshirtStatus(player: any): string {
    // If you have a field for redshirt, use it. Otherwise, random for now.
    // Example: player.redshirt === true ? "Redshirted" : "Not Redshirted"
    if (player.redshirt !== undefined) {
        return player.redshirt ? "Redshirted" : "Not Redshirted";
    }
    // Random fallback
    return Math.random() < 0.2 ? "Redshirted" : "Not Redshirted";
}

function getDealbreaker(): string {
    // Randomly assign a dealbreaker
    return dealbreakers[Math.floor(Math.random() * dealbreakers.length)];
}

function getArchetype(player: any, aiRatings: any[]): string {
    // Example logic: Use position and a few key stats to determine archetype
    const pos = (player.position || '').toUpperCase();
    // Helper to get stat value
    function getStat(category: string, stat: string): number {
        const cat = aiRatings.find((c: any) => c.category === category);
        if (!cat) return 0;
        const s = cat.stats.find((s: any) => s.name === stat);
        return s ? s.value : 0;
    }
    if (pos === 'QB') {
        const spd = getStat('General', 'Speed');
        const thp = getStat('Quarterback', 'Throw Power');
        const run = getStat('Quarterback', 'Throw on the Run');
        if (spd > 80 && run > 75) return 'Dual Threat';
        if (thp > 85 && run < 70) return 'Pocket Passer';
        if (run > 85) return 'Improviser';
        return 'Game Manager';
    } else if (pos === 'RB' || pos === 'HB') {
        const spd = getStat('General', 'Speed');
        const btk = getStat('Ball Carrier', 'Break Tackle');
        if (spd > 85 && btk > 80) return 'Power Back';
        if (spd > 90) return 'Speed Back';
        return 'Balanced Back';
    } else if (pos === 'WR') {
        const spd = getStat('General', 'Speed');
        const cth = getStat('Receiver', 'Catching');
        if (spd > 90) return 'Deep Threat';
        if (cth > 85) return 'Possession Receiver';
        return 'Slot Receiver';
    } else if (pos === 'TE') {
        const blk = getStat('Blocking', 'Run Block');
        const cth = getStat('Receiver', 'Catching');
        if (blk > 80) return 'Blocking TE';
        if (cth > 80) return 'Receiving TE';
        return 'Balanced TE';
    } else if (pos === 'CB') {
        const mcv = getStat('Coverage', 'Man Coverage');
        const zcv = getStat('Coverage', 'Zone Coverage');
        if (mcv > 85) return 'Lockdown Corner';
        if (zcv > 85) return 'Zone Specialist';
        return 'Nickel Corner';
    } else if (pos === 'LB') {
        const tkl = getStat('Defense', 'Tackle');
        const pow = getStat('Defense', 'Hit Power');
        if (pow > 85) return 'Enforcer';
        if (tkl > 85) return 'Tackling LB';
        return 'Coverage LB';
    } else if (pos === 'S') {
        const zcv = getStat('Coverage', 'Zone Coverage');
        const mcv = getStat('Coverage', 'Man Coverage');
        if (zcv > 85) return 'Free Safety';
        if (mcv > 85) return 'Strong Safety';
        return 'Hybrid Safety';
    } else if (pos === 'OL') {
        const pbk = getStat('Blocking', 'Pass Block');
        const rbk = getStat('Blocking', 'Run Block');
        if (pbk > 85) return 'Pass Protector';
        if (rbk > 85) return 'Run Blocker';
        return 'Balanced Lineman';
    } else if (pos === 'DL') {
        const pmv = getStat('Defense', 'Power Moves');
        const fmv = getStat('Defense', 'Finesse Moves');
        if (pmv > 85) return 'Power Rusher';
        if (fmv > 85) return 'Speed Rusher';
        return 'Run Stopper';
    } else if (pos === 'K') {
        return 'Kicker';
    } else if (pos === 'P') {
        return 'Punter';
    }
    return 'Athlete';
}