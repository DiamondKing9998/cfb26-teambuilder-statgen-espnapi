import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // --- Receive player data and year from frontend PlayerCard ---
        const { player, year } = await request.json();

        if (!player || !player.name || !player.team || !year) {
            return NextResponse.json({ error: 'Player data (name, team) and year are required.' }, { status: 400 });
        }

        const playerName = player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim();
        const teamName = player.team;
        const playerPosition = player.position || 'N/A';
        const playerJersey = player.jersey ? `#${player.jersey}` : 'N/A';
        const playerHeight = player.height ? `${Math.floor(player.height / 12)}'${player.height % 12}"` : 'N/A';
        const playerWeight = player.weight ? `${player.weight} lbs` : 'N/A';
        const playerHometown = player.hometown || 'N/A';

        // --- CollegeFootballData.com API Call ---
        // This part is modified to retrieve player stats for the specific year,
        // which can then be fed to the AI.
        const CFBD_API_KEY = process.env.CFBD_API_KEY; // Ensure this is set in Vercel

        if (!CFBD_API_KEY) {
            console.error("CFBD_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: College Football Data API key missing." }, { status: 500 });
        }

        let cfbdStatsSummary = `Basic player info: Name: ${playerName}, Team: ${teamName}, Position: ${playerPosition}, Jersey: ${playerJersey}, Height: ${playerHeight}, Weight: ${playerWeight}, Hometown: ${playerHometown}.`;
        
        try {
            // Attempt to get detailed player stats for the specified year.
            // This endpoint might need adjustment based on CFBD's actual stats API.
            // A common one is /player/season/stats or /player/season/usage
            const cfbdStatsUrl = `https://api.collegefootballdata.com/player/stats?year=${year}&team=${encodeURIComponent(teamName)}&player=${encodeURIComponent(playerName)}`;
            
            console.log(`Attempting to fetch detailed stats from CFBD: ${cfbdStatsUrl}`);
            const cfbdStatsResponse = await fetch(cfbdStatsUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (cfbdStatsResponse.ok) {
                const statsData = await cfbdStatsResponse.json();
                console.log("Raw CFBD stats data:", statsData);

                if (statsData && statsData.length > 0) {
                    // This is a basic way to summarize stats. You might want to refine this
                    // to pick specific, relevant statistics.
                    const relevantStats = statsData.map((s: any) => `${s.statName}: ${s.statValue}`).join(', ');
                    cfbdStatsSummary += `\nDetailed stats for ${year} season: ${relevantStats}.`;
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

        // --- DeepSeek API Call ---
        const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; // Ensure this is set in Vercel!

        if (!DEEPSEEK_API_KEY) {
            console.error("DEEPSEEK_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: DeepSeek API key missing." }, { status: 500 });
        }

        // --- THESE ARE PLACEHOLDERS ---
        // You MUST find the exact API URL and model name from DeepSeek's official documentation.
        const DEEPSEEK_MODEL = "deepseek-chat"; // Example: deepseek-chat, deepseek-coder
        const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"; // Example: https://api.deepseek.com/chat/completions

        const prompt = `Generate a concise, 2-3 paragraph college football player overview for ${playerName} from ${teamName} for the ${year} season. 
        
        Here's the available information:
        ${cfbdStatsSummary}
        
        If detailed statistics were not provided, mention that and provide a general overview based on common knowledge about college football player roles and potential. Focus on their general profile if specific stats are absent. Keep it professional and informative.`;

        console.log("Sending prompt to DeepSeek API...");

        const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                messages: [
                    { role: "system", content: "You are a concise college football expert. Provide player overviews based on provided data. If data is limited, provide a general profile." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 300, // Adjust as needed to control response length
                temperature: 0.7, // Adjust creativity (0.0-1.0)
            }),
        });

        if (!deepseekResponse.ok) {
            const errorBody = await deepseekResponse.text(); // Get raw error response for debugging
            console.error(`DeepSeek API returned non-OK status ${deepseekResponse.status}: ${errorBody}`);
            return NextResponse.json({ 
                error: `Failed to get overview from DeepSeek API (Status: ${deepseekResponse.status}).`,
                details: errorBody // Include raw error for debugging
            }, { status: deepseekResponse.status });
        }

        const deepseekData = await deepseekResponse.json();
        const aiOverviewText = deepseekData.choices?.[0]?.message?.content;

        if (!aiOverviewText) {
            console.error("DeepSeek did not generate any content or unexpected response format:", deepseekData);
            return NextResponse.json({ error: "AI (DeepSeek) did not generate an overview. Try again." }, { status: 500 });
        }

        console.log("AI Overview generated successfully by DeepSeek.");
        return NextResponse.json({ overview: aiOverviewText });

    } catch (outerError: any) {
        console.error("OUTER CATCH: Generic error in AI overview generation route:", outerError);
        return NextResponse.json(
            { error: "Failed to generate AI overview due to a server error.", details: outerError.message },
            { status: 500 }
        );
    }
}

//this should work now hopefully