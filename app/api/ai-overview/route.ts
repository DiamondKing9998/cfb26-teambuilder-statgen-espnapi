// src/app/api/ai-overview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load API keys from environment variables
const CFBD_API_KEY = process.env.CFBD_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    console.log("AI Overview proxy route hit.");

    if (!CFBD_API_KEY) {
        console.error("CRITICAL ERROR: CFBD_API_KEY is not defined in the environment.");
        return NextResponse.json({ error: "Server configuration error: CFBD API key missing." }, { status: 500 });
    }
    if (!GEMINI_API_KEY) {
        console.error("CRITICAL ERROR: GEMINI_API_KEY is not defined in the environment.");
        return NextResponse.json({ error: "Server configuration error: Gemini API key missing." }, { status: 500 });
    }

    try {
        const { player, year } = await request.json();

        if (!player || !year || !player.id || !player.name || !player.team) {
            return NextResponse.json({ error: "Missing required player data (id, name, team) or year in request body." }, { status: 400 });
        }

        // --- Step 1: Fetch year-specific stats from CollegeFootballData.com API ---
        const cfbdStatsUrl = `https://api.collegefootballdata.com/player/seasonstats?year=${year}&playerId=${player.id}`;
        console.log(`Attempting to fetch player season stats from CFBD: ${cfbdStatsUrl}`);

        let playerStats: any[] = [];
        let cfbdRawResponseText: string | null = null;

        try {
            const cfbdResponse = await fetch(cfbdStatsUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`,
                    'Accept': 'application/json',
                    'User-Agent': `YourAppName/1.0 (CFBD AI Stats Fetch)`
                },
            });

            cfbdRawResponseText = await cfbdResponse.text();
            console.log(`DEBUG: CFBD Response Status: ${cfbdResponse.status}, OK: ${cfbdResponse.ok}`);
            console.log(`DEBUG: CFBD Raw Response Text (first 500 chars): ${cfbdRawResponseText.substring(0, 500)}`);

            if (cfbdResponse.ok) {
                try {
                    playerStats = JSON.parse(cfbdRawResponseText);
                    console.log("Player stats fetched and parsed successfully.");
                } catch (jsonParseError: any) {
                    console.error(`ERROR: CFBD response was OK (${cfbdResponse.status}), but failed to parse JSON. JSON parse error:`, jsonParseError);
                    console.error(`Raw CFBD Response that failed JSON parsing:`, cfbdRawResponseText);
                    playerStats = [];
                }
            } else {
                console.error(`ERROR: CFBD API returned non-OK status ${cfbdResponse.status} (${cfbdResponse.statusText}).`);
                console.error(`Raw CFBD Response that caused non-OK status:`, cfbdRawResponseText);
                playerStats = [];
            }
        } catch (fetchOrOtherError: any) {
            console.error(`CRITICAL FETCH ERROR: Failed to make a request to CFBD API. Details:`, fetchOrOtherError);
            console.error(`CFBD URL attempted: ${cfbdStatsUrl}`);
            playerStats = [];
        }

        // --- Step 2: Construct AI Prompt ---
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
                const stats = Object.keys(statEntry)
                    .filter(key => 
                        key !== 'category' && 
                        key !== 'playerId' && 
                        key !== 'team' && 
                        key !== 'year' && 
                        statEntry[key] !== null
                    ) 
                    .map(key => `${key}: ${statEntry[key]}`);
                prompt += stats.join(', ');
            });
        } else {
            prompt += `\n\nNo detailed statistics found for the ${year} season. Please provide a general overview based on player details, position, and potential impact.`;
        }
        
        prompt += `\n\nEnsure the language is dynamic and highlights the player's impact and potential in a video game context. Keep the overview concise, around 100-150 words.`;


        // --- Step 3: Call Google Gemini API ---
        console.log("Sending prompt to Google Gemini API...");
        // Use gemini-1.0-pro for text-only generation
        const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro'}); // <-- IMPORTANT CHANGE HERE!

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiOverviewText = response.text();

        if (!aiOverviewText) {
            console.error("Gemini did not generate any content.");
            return NextResponse.json({ error: "AI (Gemini) did not generate an overview. Try again." }, { status: 500 });
        }

        console.log("AI Overview generated successfully by Gemini.");
        return NextResponse.json({ overview: aiOverviewText });

    } catch (outerError: any) {
        console.error("OUTER CATCH: Generic error in AI overview generation route:", outerError);
        return NextResponse.json(
            { error: "Failed to generate AI overview due to a server error.", details: outerError.message },
            { status: 500 }
        );
    }
}