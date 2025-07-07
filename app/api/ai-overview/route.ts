// src/app/api/ai-overview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Load API keys from environment variables
// IMPORTANT: These MUST be set in your Vercel project environment variables
// and in your local .env.local file for local development.
const CFBD_API_KEY = process.env.CFBD_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    console.log("AI Overview proxy route hit.");

    // Basic checks for API keys
    if (!CFBD_API_KEY) {
        console.error("CRITICAL ERROR: CFBD_API_KEY is not defined in the environment.");
        return NextResponse.json({ error: "Server configuration error: CFBD API key missing." }, { status: 500 });
    }
    if (!OPENAI_API_KEY) {
        console.error("CRITICAL ERROR: OPENAI_API_KEY is not defined in the environment.");
        return NextResponse.json({ error: "Server configuration error: OpenAI API key missing." }, { status: 500 });
    }

    try {
        const { player, year } = await request.json();

        // Validate incoming data
        if (!player || !year || !player.id || !player.name || !player.team) {
            return NextResponse.json({ error: "Missing required player data (id, name, team) or year in request body." }, { status: 400 });
        }

        // --- Step 1: Fetch year-specific stats from CollegeFootballData.com API ---
        // Using /player/seasonstats which provides aggregated stats per category for a season
        const cfbdStatsUrl = `https://api.collegefootballdata.com/player/seasonstats?year=${year}&playerId=${player.id}`;
        console.log(`Attempting to fetch player season stats from CFBD: ${cfbdStatsUrl}`);

        let playerStats: any[] = [];
        let cfbdRawResponseText: string | null = null; // Variable to store the raw response content

        try {
            const cfbdResponse = await fetch(cfbdStatsUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`,
                    'Accept': 'application/json',
                    'User-Agent': `YourAppName/1.0 (CFBD AI Stats Fetch)` // Identify your app
                },
            });

            // *ALWAYS* read the response as text first, regardless of status.
            // This is critical for debugging HTML responses.
            cfbdRawResponseText = await cfbdResponse.text();
            console.log(`DEBUG: CFBD Response Status: ${cfbdResponse.status}, OK: ${cfbdResponse.ok}`);
            console.log(`DEBUG: CFBD Raw Response Text (first 500 chars): ${cfbdRawResponseText.substring(0, 500)}`); // Log first part of response


            if (cfbdResponse.ok) {
                // If the response status is OK (e.g., 200), attempt to parse it as JSON
                try {
                    playerStats = JSON.parse(cfbdRawResponseText);
                    console.log("Player stats fetched and parsed successfully.");
                } catch (jsonParseError: any) {
                    console.error(`ERROR: CFBD response was OK (${cfbdResponse.status}), but failed to parse JSON. JSON parse error:`, jsonParseError);
                    console.error(`Raw CFBD Response that failed JSON parsing:`, cfbdRawResponseText);
                    // We will proceed without stats, but this is an unexpected scenario for a 200 OK.
                    playerStats = [];
                }
            } else {
                // If the response status is NOT OK (e.g., 401, 404, 429)
                console.error(`ERROR: CFBD API returned non-OK status ${cfbdResponse.status} (${cfbdResponse.statusText}).`);
                console.error(`Raw CFBD Response that caused non-OK status:`, cfbdRawResponseText);
                // In this case, playerStats will remain an empty array. The AI will generate a generic overview.
                // OPTIONAL: If you prefer to return this error directly to the client and stop:
                // return NextResponse.json(
                //     { error: `Failed to fetch player stats from CFBD: ${cfbdResponse.statusText}`, details: cfbdRawResponseText },
                //     { status: cfbdResponse.status }
                // );
            }
        } catch (fetchOrOtherError: any) {
            // This catches network errors, DNS errors, etc. before a response is even received.
            console.error(`CRITICAL FETCH ERROR: Failed to make a request to CFBD API. Details:`, fetchOrOtherError);
            console.error(`CFBD URL attempted: ${cfbdStatsUrl}`);
            // In this case, playerStats will remain an empty array.
            // OPTIONAL: If you prefer to return this error directly to the client and stop:
            // return NextResponse.json(
            //     { error: `Network/Fetch error for CFBD API: ${fetchOrOtherError.message}`, details: cfbdStatsUrl },
            //     { status: 500 }
            // );
        }

        // --- Step 2: Construct AI Prompt ---
        // Provide both player details and the fetched stats for context
        let prompt = `Generate a concise, engaging overview for a college football player based on the provided details and their performance for the specific ${year} season. This overview should be suitable for a video game roster editor like EA Sports College Football 26 Teambuilder, focusing on key accomplishments and relevant statistics from the ${year} season only. Do not include career totals unless explicitly stated for that year.
        
        Player Details:
        Name: ${player.name}
        Team: ${player.team}
        Position: ${player.position || 'N/A'}
        Weight: ${player.weight ? player.weight + ' lbs' : 'N/A'}
        Height: ${player.height ? Math.floor(player.height / 12) + "'" + (player.height % 12) + '"' : 'N/A'}
        Jersey: #${player.jersey || 'N/A'}
        Hometown: ${player.hometown || 'N/A'}
        `;

        if (playerStats && playerStats.length > 0) {
            prompt += `\n\n${year} Season Statistics (Categorized):\n`;
            playerStats.forEach((statEntry: any) => {
                prompt += `\n- ${statEntry.category}: `;
                // Extract only actual stat properties, excluding metadata
                const stats = Object.keys(statEntry)
                    .filter(key => 
                        key !== 'category' && 
                        key !== 'playerId' && 
                        key !== 'team' && 
                        key !== 'year' && 
                        statEntry[key] !== null // Filter out null values
                    ) 
                    .map(key => `${key}: ${statEntry[key]}`);
                prompt += stats.join(', ');
            });
        } else {
            prompt += `\n\nNo detailed statistics found for the ${year} season. Please provide a general overview based on player details, position, and potential impact.`;
        }
        
        prompt += `\n\nEnsure the language is dynamic and highlights the player's impact and potential in a video game context. Keep the overview concise, around 100-150 words.`;

        // --- Step 3: Call OpenAI API ---
        console.log("Sending prompt to OpenAI API...");
        const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // You can try 'gpt-4o' for higher quality, but it's more expensive
            messages: [
                { role: 'system', content: 'You are an expert college football scout and video game roster editor. You generate player overviews based on given data, focusing strictly on the provided year and relevant stats.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7, // Adjust for creativity (higher) vs. factualness (lower)
            max_tokens: 300,  // Limit response length to prevent excessive cost/long text
        });

        const aiOverviewText = chatCompletion.choices[0].message.content;

        if (!aiOverviewText) {
            console.error("AI did not generate any content.");
            return NextResponse.json({ error: "AI did not generate an overview. Try again." }, { status: 500 });
        }

        console.log("AI Overview generated successfully.");
        return NextResponse.json({ overview: aiOverviewText });

    } catch (outerError: any) {
        // This outer catch now primarily catches errors from request.json()
        // or unexpected errors from the OpenAI API call, or re-thrown errors from the CFBD block if enabled.
        console.error("OUTER CATCH: Generic error in AI overview generation route:", outerError);
        return NextResponse.json(
            { error: "Failed to generate AI overview due to a server error.", details: outerError.message },
            { status: 500 }
        );
    }
}