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
        console.error("CRITICAL: CFBD_API_KEY is not defined in the environment.");
        return NextResponse.json({ error: "Server configuration error: CFBD API key missing." }, { status: 500 });
    }
    if (!OPENAI_API_KEY) {
        console.error("CRITICAL: OPENAI_API_KEY is not defined in the environment.");
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

        const cfbdResponse = await fetch(cfbdStatsUrl, {
            headers: {
                'Authorization': `Bearer ${CFBD_API_KEY}`,
                'Accept': 'application/json',
                'User-Agent': `YourAppName/1.0 (CFBD AI Stats Fetch)` // Identify your app
            },
        });

        let playerStats: any[] = [];
        if (cfbdResponse.ok) {
            playerStats = await cfbdResponse.json();
            console.log("Player stats fetched successfully:", playerStats);
        } else {
            const errorText = await cfbdResponse.text();
            console.warn(`CFBD API returned ${cfbdResponse.status} for player season stats. AI will proceed without detailed stats. Raw response:`, errorText);
            // We'll allow the AI to still attempt an overview even if stats fetching fails,
            // but the overview will be less detailed.
            playerStats = []; // Ensure it's an empty array if fetch failed
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

    } catch (error: any) {
        console.error("Error in AI overview generation route:", error);
        return NextResponse.json(
            { error: "Failed to generate AI overview due to a server error.", details: error.message },
            { status: 500 }
        );
    }
}