import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
    try {
        const { player, year } = await request.json();

        if (!player || !player.name || !player.team || !year) {
            return NextResponse.json({ error: 'Player data (name, team) and year are required.' }, { status: 400 });
        }

        const playerName = player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim();
        const teamName = player.team;
        const playerPosition = player.position ? player.position.toUpperCase() : 'N/A';
        const playerJersey = player.jersey ? `#${player.jersey}` : 'N/A';
        const playerHeight = player.height ? `${Math.floor(player.height / 12)}'${player.height % 12}"` : 'N/A';
        const playerWeight = player.weight ? `${player.weight} lbs` : 'N/A';
        const playerHometown = player.hometown || 'N/A';

        // --- CollegeFootballData.com API Call ---
        const CFBD_API_KEY = process.env.CFBD_API_KEY;

        if (!CFBD_API_KEY) {
            console.error("CFBD_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: College Football Data API key missing." }, { status: 500 });
        }

        let cfbdStatsSummary = `Basic player info: Name: ${playerName}, Team: ${teamName}, Position: ${playerPosition}, Jersey: ${playerJersey}, Height: ${playerHeight}, Weight: ${playerWeight}, Hometown: ${playerHometown}.`;
        
        try {
            // --- UPDATED CFBD API URL to /stats/player/season ---
            const cfbdStatsUrl = `https://api.collegefootballdata.com/stats/player/season?year=${year}&team=${encodeURIComponent(teamName)}`;
            
            console.log(`Attempting to fetch ALL season stats for ${teamName} in ${year} from CFBD: ${cfbdStatsUrl}`);
            const cfbdStatsResponse = await fetch(cfbdStatsUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (cfbdStatsResponse.ok) {
                const allSeasonStats = await cfbdStatsResponse.json();
                console.log("Raw ALL season stats data from CFBD:", allSeasonStats);

                // --- Find the specific player's stats from the returned list ---
                const targetPlayerStatsEntry = allSeasonStats.find((entry: any) => {
                    const entryPlayerName = (entry.player?.name || '').toLowerCase();
                    const targetPlayerNameLower = playerName.toLowerCase();

                    // Prefer matching by player ID if available, otherwise by name.
                    return (player.id && entry.player?.id === player.id) || 
                           (entryPlayerName === targetPlayerNameLower);
                });

                // --- NEW CONSOLE.LOG FOR DEBUGGING ---
                console.log("Target player stats entry found:", targetPlayerStatsEntry);

                let statsData: any[] = [];
                if (targetPlayerStatsEntry && targetPlayerStatsEntry.stats) {
                    statsData = targetPlayerStatsEntry.stats; 
                    // --- EXISTING CONSOLE.LOG ---
                    console.log(`Found stats for ${playerName}:`, statsData); 

                    // --- NEW CONSOLE.LOG FOR DEBUGGING ---
                    console.log("Extracted statsData for player:", statsData);

                } else {
                    console.log(`No specific season stats entry found for ${playerName} in the team data.`);
                }

                // --- Proceed with stat extraction using the found statsData ---
                if (statsData.length > 0) {
                    let specificStats: string[] = [];
                    const statsMap = new Map<string, any>(); 

                    statsData.forEach((s: any) => {
                        statsMap.set(`${s.category}_${s.statName}`, s.statValue);
                    });

                    // Define which stats to look for based on position (existing logic)
                    if (playerPosition.includes('QB')) {
                        specificStats.push(`Passing Yards: ${statsMap.get('passing_yards') || 'N/A'}`);
                        specificStats.push(`Passing TDs: ${statsMap.get('passing_tds') || 'N/A'}`);
                        specificStats.push(`Completions: ${statsMap.get('passing_completions') || 'N/A'}`);
                        specificStats.push(`Attempts: ${statsMap.get('passing_attempts') || 'N/A'}`);
                        const completionPct = statsMap.has('passing_completions') && statsMap.has('passing_attempts') && statsMap.get('passing_attempts') > 0
                            ? ((statsMap.get('passing_completions') / statsMap.get('passing_attempts')) * 100).toFixed(1) + '%'
                            : 'N/A';
                        specificStats.push(`Completion %: ${completionPct}`);
                        specificStats.push(`Interceptions: ${statsMap.get('passing_interceptions') || 'N/A'}`);
                        specificStats.push(`Rushing Yards (QB): ${statsMap.get('rushing_yards') || 'N/A'}`);
                        specificStats.push(`Rushing TDs (QB): ${statsMap.get('rushing_tds') || 'N/A'}`);
                    } else if (playerPosition.includes('RB') || playerPosition.includes('FB')) {
                        specificStats.push(`Rushing Yards: ${statsMap.get('rushing_yards') || 'N/A'}`);
                        specificStats.push(`Rushing TDs: ${statsMap.get('rushing_tds') || 'N/A'}`);
                        specificStats.push(`Carries: ${statsMap.get('rushing_attempts') || 'N/A'}`);
                        specificStats.push(`Receptions: ${statsMap.get('receiving_receptions') || 'N/A'}`);
                        specificStats.push(`Receiving Yards: ${statsMap.get('receiving_yards') || 'N/A'}`);
                        specificStats.push(`Receiving TDs: ${statsMap.get('receiving_tds') || 'N/A'}`);
                    } else if (playerPosition.includes('WR') || playerPosition.includes('TE')) {
                        specificStats.push(`Receptions: ${statsMap.get('receiving_receptions') || 'N/A'}`);
                        specificStats.push(`Receiving Yards: ${statsMap.get('receiving_yards') || 'N/A'}`);
                        specificStats.push(`Receiving TDs: ${statsMap.get('receiving_tds') || 'N/A'}`);
                        specificStats.push(`Targets: ${statsMap.get('receiving_targets') || 'N/A'}`);
                    } else if (playerPosition.includes('LB') || playerPosition.includes('DB') || playerPosition.includes('S') || playerPosition.includes('CB')) {
                        specificStats.push(`Total Tackles: ${statsMap.get('defense_totalTackles') || 'N/A'}`);
                        specificStats.push(`Sacks: ${statsMap.get('defense_sacks') || 'N/A'}`);
                        specificStats.push(`Tackles for Loss: ${statsMap.get('defense_tacklesForLoss') || 'N/A'}`);
                        specificStats.push(`Interceptions: ${statsMap.get('defense_interceptions') || 'N/A'}`);
                        specificStats.push(`Pass Breakups: ${statsMap.get('defense_passBreakups') || 'N/A'}`);
                        specificStats.push(`Forced Fumbles: ${statsMap.get('defense_forcedFumbles') || 'N/A'}`);
                    } else if (playerPosition.includes('DL') || playerPosition.includes('DT') || playerPosition.includes('DE')) {
                        specificStats.push(`Total Tackles: ${statsMap.get('defense_totalTackles') || 'N/A'}`);
                        specificStats.push(`Sacks: ${statsMap.get('defense_sacks') || 'N/A'}`);
                        specificStats.push(`Tackles for Loss: ${statsMap.get('defense_tacklesForLoss') || 'N/A'}`);
                        specificStats.push(`QB Hurries: ${statsMap.get('defense_quarterbackHurries') || 'N/A'}`);
                    } else if (playerPosition.includes('K') || playerPosition.includes('P')) { // Kicker/Punter
                        specificStats.push(`Field Goals Made: ${statsMap.get('kicking_fgm') || 'N/A'}`);
                        specificStats.push(`Field Goals Att: ${statsMap.get('kicking_fga') || 'N/A'}`);
                        specificStats.push(`Extra Points Made: ${statsMap.get('kicking_pat') || 'N/A'}`);
                        specificStats.push(`Punt Yards: ${statsMap.get('punting_yards') || 'N/A'}`);
                        specificStats.push(`Punts: ${statsMap.get('punting_punts') || 'N/A'}`);
                    } else {
                        const availableStatNames = statsData.map((s: any) => `${s.statName}: ${s.statValue}`).join(', ');
                        if (availableStatNames) {
                            specificStats.push(`All available stats: ${availableStatNames}`);
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

        // --- OpenAI API Call ---
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            console.error("OPENAI_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: OpenAI API key missing." }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: OPENAI_API_KEY,
        });

        const prompt = `Generate a concise, 2-3 paragraph college football player overview for ${playerName} from ${teamName} for the ${year} season. 
        
        Here's the available information:
        ${cfbdStatsSummary}
        
        If detailed statistics were not provided (indicated by 'N/A' or general phrasing), mention that and provide a general overview based on common knowledge about college football player roles and potential. Focus on their general profile if specific stats are absent. Keep it professional and informative.`;

        console.log("Sending prompt to OpenAI API...");

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a concise college football expert. Provide player overviews based on provided data. If data is limited, provide a general profile." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 300,
                temperature: 0.7,
            });

            const aiOverviewText = completion.choices[0].message.content;

            if (!aiOverviewText) {
                console.error("OpenAI did not generate any content or unexpected response format:", completion);
                return NextResponse.json({ error: "AI (OpenAI) did not generate an overview. Try again." }, { status: 500 });
            }

            console.log("AI Overview generated successfully by OpenAI.");
            return NextResponse.json({ overview: aiOverviewText });

        } catch (openaiError: any) {
            console.error(`Error calling OpenAI API:`, openaiError);
            const errorMessage = openaiError.message || "An unknown error occurred with the OpenAI API.";
            const errorDetails = openaiError.response?.data || openaiError; 

            return NextResponse.json({ 
                error: `Failed to get overview from OpenAI API.`,
                details: errorMessage,
                rawError: errorDetails
            }, { status: openaiError.status || 500 });
        }

    } catch (outerError: any) {
        console.error("OUTER CATCH: Generic error in AI overview generation route:", outerError);
        return NextResponse.json(
            { error: "Failed to generate AI overview due to a server error.", details: outerError.message },
            { status: 500 }
        );
    }
}