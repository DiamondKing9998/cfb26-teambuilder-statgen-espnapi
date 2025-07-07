// src/app/api/ai-overview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
// Assuming these utilities are in the same directory or you have paths set up
// You will need to create these files if they don't exist, or integrate their logic directly.
// For this response, I'll provide placeholder comments for their content if they are critical.
// import { calculatePlayerQualityScore } from './_utils/qualityScoreCalculator';
// import { assignAbilities } from './_utils/abilityAssigner';

// Initialize OpenAI client with your API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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
                    const entryPlayerId = statEntry.playerId;

                    // Match by ID if available, otherwise by name
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
            Provide 8-10 key attribute ratings for EA Sports College Football 26.
            Each rating should be on a scale of 1-99 and formatted as a single bullet point: "- [Attribute Name]: [Rating]"
            Example:
            - Speed: 88
            - Strength: 75
            - Agility: 90
            - Throw Power: 92
            - Accuracy: 85
            - Awareness: 80
            - Tackle: 70
            - Break Tackle: 80
            - Catch: 78
            - Route Running: 85

            Select attributes relevant to the player's position. If specific stats are missing or player details are limited, make reasonable, informed estimations based on their general position role and college football knowledge. Ensure all ratings are numbers between 1 and 99.

            ## ASSESSMENT ##
            Provide a concise assessment of the player's overall quality as an EA Sports College Football 26 prospect. This assessment is for internal use for ability assignment, and should be a single number between 1 and 100, representing their overall quality score.
            Format: "Quality Score: [Number 1-100]"
            Example: Quality Score: 87
        `;

        // --- Logging Prompt ---
        console.log(`[AI Overview API] Prompt sent to OpenAI:\n${prompt}`);

        // Call OpenAI API
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            console.error("OPENAI_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: OpenAI API key missing." }, { status: 500 });
        }

        const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-4o', // Or 'gpt-3.5-turbo' if you prefer
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7, // Keep it somewhat creative but factual
            max_tokens: 1000,
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
        let aiRatings: string[] = [];
        let playerQualityScore: number | null = null;

        // Overview parsing
        const overviewMatch = aiResponseText.match(/## OVERVIEW ##\s*([\s\S]*?)(?=## RATINGS ##|$)/);
        if (overviewMatch && overviewMatch[1]) {
            aiOverview = overviewMatch[1].trim();
        }

        // Ratings parsing (more robust)
        const ratingsMatch = aiResponseText.match(/## RATINGS ##\s*([\s\S]*?)(?=## ASSESSMENT ##|$)/);
        if (ratingsMatch && ratingsMatch[1]) {
            const rawRatingLines = ratingsMatch[1].split('\n');
            aiRatings = rawRatingLines
                .map(line => {
                    const trimmedLine = line.trim();
                    // Strip leading bullet points/hyphens and then trim
                    if (trimmedLine.startsWith('- ')) {
                        return trimmedLine.substring(2).trim();
                    }
                    if (trimmedLine.startsWith('* ')) { // In case AI uses asterisks
                        return trimmedLine.substring(2).trim();
                    }
                    // If it's just "Attribute: Value" without a leading bullet
                    if (trimmedLine.includes(':') && trimmedLine.split(':')[1].trim().match(/^\d+$/)) {
                        return trimmedLine;
                    }
                    return ''; // Ignore lines that don't match expected format
                })
                .filter(line => line !== '' && line.includes(':') && line.split(':')[1].trim().match(/^\d+$/)); // Final filter for valid rating lines
        }

        // Quality Score parsing
        const assessmentMatch = aiResponseText.match(/## ASSESSMENT ##\s*Quality Score:\s*(\d+)/);
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
            const numAbilitiesToAssign = Math.floor(Math.random() * 3) + 3; // Assign 3 to 5 abilities

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


        return NextResponse.json({
            aiOverview,
            aiRatings,
            assignedAbilities,
            playerQualityScore, // Include quality score in response if frontend needs it
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