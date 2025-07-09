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
    redshirted?: boolean | null; // Assuming this might come from the initial player data
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
    { name: "On Time", positions: ["QB"], "description": "Delivers accurate passes with perfect timing." },
    { name: "Sleight Of Hand", positions: ["QB"], description: "Excels at faking handoffs and play-action." },
    { name: "Mobile Deadeye", positions: ["QB"], description: "Maintains accuracy while throwing on the run." },
    { name: "Dual Threat", positions: ["QB"], description: "Effective passer and runner, making him a versatile offensive weapon." },
    { name: "Strong Arm", positions: ["QB"], description: "Possesses exceptional arm strength to make deep throws." },
    // Running Backs
    { name: "Elusive", positions: ["RB"], description: "Difficult for defenders to tackle in the open field." },
    { name: "Power Back", positions: ["RB"], description: "Breaks tackles and gains tough yardage." },
    { name: "Receiving Back", positions: ["RB"], description: "Adept at catching passes out of the backfield." },
    { name: "Home Run Hitter", positions: ["RB"], description: "Capable of breaking long runs for touchdowns." },
    { name: "Workhorse", positions: ["RB"], description: "Can handle a heavy workload and consistently produce." },
    { name: "One Cut", positions: ["RB"], description: "Quickly identifies running lanes and makes decisive cuts." },
    // Wide Receivers
    { name: "Route Technician", positions: ["WR"], description: "Runs precise routes to create separation from defenders." },
    { name: "Deep Threat", positions: ["WR"], description: "Excels at catching long passes and stretching the field." },
    { name: "Possession Receiver", positions: ["WR"], description: "Reliable hands, consistently catches passes in traffic." },
    { name: "YAC Monster", positions: ["WR"], description: "Gains significant yardage after the catch." },
    { name: "Red Zone Threat", positions: ["WR"], description: "Dominant in the red zone, frequently scores touchdowns." },
    // Offensive Linemen
    { name: "Pass Protector", positions: ["OG", "OT", "C"], description: "Excellent at protecting the quarterback from sacks." },
    { name: "Run Blocker", positions: ["OG", "OT", "C"], description: "Dominant in opening running lanes for ball carriers." },
    { name: "Anchor", positions: ["OG", "OT", "C"], description: "Maintains a strong base against bull rushes." },
    // Defensive Linemen
    { name: "Pass Rusher", positions: ["DT", "DE"], description: "Consistently pressures the quarterback." },
    { name: "Run Stopper", positions: ["DT", "DE"], description: "Excels at defending against the run." },
    { name: "Double Team Bypass", positions: ["DT", "DE"], description: "Can split double teams." },
    { name: "Swim Move", positions: ["DT", "DE"], description: "Utilizes a swim move to beat blockers." },
    // Linebackers
    { name: "Tackling Machine", positions: ["LB"], description: "Consistently makes tackles all over the field." },
    { name: "Coverage Linebacker", positions: ["LB"], description: "Adept at covering tight ends and running backs." },
    { name: "Blitz Master", positions: ["LB"], description: "Effective at rushing the passer from the linebacker position." },
    { name: "Play Recognition", positions: ["LB"], description: "Quickly diagnoses plays and reacts accordingly." },
    // Cornerbacks
    { name: "Man Coverage", positions: ["CB"], description: "Excels at locking down receivers in man-to-man coverage." },
    { name: "Zone Coverage", positions: ["CB"], description: "Effective at defending passes in zone coverage." },
    { name: "Ball Hawk", positions: ["CB"], description: "Possesses excellent ball skills, frequently intercepts passes." },
    { name: "Press Coverage", positions: ["CB"], description: "Disrupts receivers at the line of scrimmage with physical press." },
    // Safeties
    { name: "Box Safety", positions: ["S"], description: "Strong run defender who plays effectively near the line of scrimmage." },
    { name: "Free Safety", positions: ["S"], description: "Covers a deep portion of the field and makes plays on the ball." },
    { name: "Versatile Safety", positions: ["S"], description: "Can play effectively in both run support and pass coverage." },
    // Kickers/Punterm
    { name: "Accurate Kicker", positions: ["K"], description: "Consistently makes field goals and extra points." },
    { name: "Long-Range Kicker", positions: ["K"], description: "Capable of making field goals from long distances." },
    { name: "Punt Master", positions: ["P"], description: "Delivers accurate and long punts." },
    // Returners
    { name: "Kick Returner", positions: ["RB", "WR", "CB", "S"], description: "Excels at returning kicks for significant yardage." },
    { name: "Punt Returner", positions: ["RB", "WR", "CB", "S"], description: "Dangerous punt returner who can break tackles and find open space." },
];

const tiers = ["Gold", "Silver", "Bronze"];

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const playerId = searchParams.get('playerId');

    if (!playerId) {
        return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    try {
        // Fetch player data from ESPN (using the community-discovered endpoint structure)
        const playerResponse = await fetch(`http://site.api.espn.com/apis/site/v2/sports/football/college-football/athletes/${playerId}`);

        if (!playerResponse.ok) {
            console.error(`Error fetching player data: ${playerResponse.status} ${playerResponse.statusText}`);
            return NextResponse.json({ error: `Failed to fetch player data: ${playerResponse.statusText}` }, { status: playerResponse.status });
        }

        const playerJson = await playerResponse.json();
        const player = playerJson.athletes?.[0]; // Assuming the structure has an 'athletes' array

        if (!player) {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        // Extract relevant player details
        const {
            id,
            firstName,
            lastName,
            fullName: name, // Use fullName as 'name'
            position: { displayName: position }, // Extract displayName as position
            displayHeight: height, // Use displayHeight for height
            displayWeight: weight, // Use displayWeight for weight
            jersey,
            hometown: { city: hometownCity, state: hometownState }, // Extract city and state
            team: { displayName: teamName, logos, color, alternateColor }, // Extract team details
            // NEW: Access college details for class and redshirted status
            college: {
                year: collegeYear, // e.g., 'Sophomore'
                redshirted: isRedshirted, // boolean
            },
            // NEW: Access recruit for high school rating, archetype, dealbreaker
            recruit: {
                rating: highSchoolRating, // e.g., '0.999', or could be null
                positionRank: archetype, // e.g., 'Pro-Style QB', or could be null
                // dealbreaker, // This field is not directly available in the recruit object in a consistent way for a direct mapping. Will need to infer or set to null.
            }
        } = player;

        // Simplify redshirted status to a readable string
        const redshirtedStatus = isRedshirted ? 'Yes' : 'No';

        // Placeholder for dealbreaker - needs to be determined based on game logic or set to null
        const dealbreaker = null; // No direct mapping from ESPN API for this.

        // Get team logo and colors
        const teamLogo = logos?.[0]?.href || '';
        const teamDarkLogo = logos?.[1]?.href || logos?.[0]?.href || ''; // Assuming the second logo might be darker, or fallback to first

        // Determine player class based on collegeYear
        let playerClass = collegeYear || 'N/A'; // Default to 'N/A' if not available

        // Fetch team data (for the initial filter options)
        // Corrected ESPN API endpoint for teams with limit parameter
        const teamsResponse = await fetch(`http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=1000`);

        if (!teamsResponse.ok) {
            console.error(`Error fetching teams data: ${teamsResponse.status} ${teamsResponse.statusText}`);
            return NextResponse.json({ error: `Failed to load initial filter options: Proxy error fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}` }, { status: teamsResponse.status });
        }

        const teamsJson = await teamsResponse.json();
        const teams = teamsJson.sports?.[0]?.leagues?.[0]?.teams || [];

        // Generate AI Overview and Ratings
        // (rest of your existing logic for OpenAI API call)
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
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

        console.log("[AI Overview API] Sending prompt to OpenAI:", prompt);

        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o", // You can use "gpt-4" or "gpt-3.5-turbo" as well
            messages: [{ role: "user", content: prompt }],
            max_tokens: 700,
            response_format: { type: "json_object" },
        });

        console.log("[AI Overview API] Received response from OpenAI:", aiResponse.choices[0].message?.content);

        const parsedResponse = JSON.parse(aiResponse.choices[0].message?.content || '{}');
        const { aiOverview, aiRatings, playerQualityScore } = parsedResponse;

        // Assign abilities based on position and ratings
        const assignedAbilities: AssignedAbility[] = [];
        const playerPosition = position.split(' ')[0]; // Take the first word of the position

        for (const ability of allAbilities) {
            if (ability.positions.includes(playerPosition)) {
                // For demonstration, let's randomly assign a tier
                // In a real scenario, you'd use AI ratings to determine tiers
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
            highSchoolRating,
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