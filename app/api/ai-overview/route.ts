import { NextResponse } from 'next/server';
import OpenAI from 'openai'; // Import the OpenAI library

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
        const CFBD_API_KEY = process.env.CFBD_API_KEY; // Ensure this is set in Vercel

        if (!CFBD_API_KEY) {
            console.error("CFBD_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: College Football Data API key missing." }, { status: 500 });
        }

        let cfbdStatsSummary = `Basic player info: Name: ${playerName}, Team: ${teamName}, Position: ${playerPosition}, Jersey: ${playerJersey}, Height: ${playerHeight}, Weight: ${playerWeight}, Hometown: ${playerHometown}.`;
        
        try {
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

        // --- OpenAI API Call ---
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // This should be set in Vercel

        if (!OPENAI_API_KEY) {
            console.error("OPENAI_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: OpenAI API key missing." }, { status: 500 });
        }

        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: OPENAI_API_KEY,
        });

        const prompt = `Generate a concise, 2-3 paragraph college football player overview for ${playerName} from ${teamName} for the ${year} season. 
        
        Here's the available information:
        ${cfbdStatsSummary}
        
        If detailed statistics were not provided, mention that and provide a general overview based on common knowledge about college football player roles and potential. Focus on their general profile if specific stats are absent. Keep it professional and informative.`;

        console.log("Sending prompt to OpenAI API...");

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini", // Explicitly using the gpt-4o-mini model
                messages: [
                    { role: "system", content: "You are a concise college football expert. Provide player overviews based on provided data. If data is limited, provide a general profile." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 300, // Adjust as needed to control response length
                temperature: 0.7, // Adjust creativity (0.0-1.0)
            });

            const aiOverviewText = completion.choices[0].message.content;

            if (!aiOverviewText) {
                console.error("OpenAI did not generate any content or unexpected response format:", completion);
                return NextResponse.json({ error: "AI (OpenAI) did not generate an overview. Try again." }, { status: 500 });
            }

            console.log("AI Overview generated successfully by OpenAI.");
            return NextResponse.json({ overview: aiOverviewText });

        } catch (openaiError: any) {
            // OpenAI SDK throws errors for non-2xx responses or network issues
            console.error(`Error calling OpenAI API:`, openaiError);
            // Check if it's an OpenAI APIError for specific details
            const errorMessage = openaiError.message || "An unknown error occurred with the OpenAI API.";
            const errorDetails = openaiError.response?.data || openaiError; // Get more details if available

            return NextResponse.json({ 
                error: `Failed to get overview from OpenAI API.`,
                details: errorMessage,
                rawError: errorDetails
            }, { status: openaiError.status || 500 }); // Use OpenAI's status code if available
        }

    } catch (outerError: any) {
        console.error("OUTER CATCH: Generic error in AI overview generation route:", outerError);
        return NextResponse.json(
            { error: "Failed to generate AI overview due to a server error.", details: outerError.message },
            { status: 500 }
        );
    }
}