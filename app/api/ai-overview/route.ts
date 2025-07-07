import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
    try {
        const { player, year } = await request.json();

        if (!player || !player.name || !player.team || !year) {
            return NextResponse.json({ error: 'Player data (name, team) and year are required.' }, { status: 400 });
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
                const targetPlayerNameLower = playerName.toLowerCase();

                const playerSpecificStatsEntries = allTeamSeasonStats.filter((statEntry: any) => {
                    const entryPlayerNameLower = (statEntry.player || '').toLowerCase().trim();
                    const entryPlayerId = statEntry.playerId;

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

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            console.error("OPENAI_API_KEY environment variable is not set.");
            return NextResponse.json({ error: "Server configuration error: OpenAI API key missing." }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: OPENAI_API_KEY,
        });

        // --- UPDATED PROMPT WITH DELIMITERS ---
        const prompt = `Generate a concise college football player overview for ${playerName} from ${teamName} for the ${year} season. Follow the exact structure below, using the specified delimiters.

        ## OVERVIEW ##
        [Generate 2-3 paragraphs for the player overview here. If detailed statistics were not provided (indicated by 'N/A' or general phrasing), mention that and provide a general overview based on common knowledge about college football player roles and potential. Focus on their general profile if specific stats are absent. Keep it professional and informative.]

        ## RATINGS ##
        [Based on the player's real-world stats, position, and general college football knowledge, generate a list of hypothetical in-game ratings for them for a game like EA Sports College Football 26. For each rating, provide a numerical value between 50 and 100. Focus on categories relevant to their position. Use the exact format below, one rating per line.]

        EA CFB 26 Hypothetical Ratings:
        - Speed (SPD): [Rating]
        - Strength (STR): [Rating]
        - Agility (AGI): [Rating]
        - Awareness (AWR): [Rating]
        - Play Recognition (PRC): [Rating]
        - Tackle (TKL): [Rating]
        - Block Shedding (BKS): [Rating]
        - Pass Rush (PRS): [Rating]
        - Man Coverage (MCV): [Rating]
        - Zone Coverage (ZCV): [Rating]
        - Catching (CTH): [Rating]
        - Route Running (RTE): [Rating]
        - Carrying (CAR): [Rating]
        - Break Tackle (BTK): [Rating]
        - Pass Accuracy (PAC): [Rating]
        - Throw Power (THP): [Rating]
        - Elusiveness (ELU): [Rating]
        - Kick Power (KPW): [Rating]
        - Kick Accuracy (KAC): [Rating]
        - Punt Power (PPW): [Rating]
        - Punt Accuracy (PAC): [Rating]
        - Stamina (STA): [Rating]
        - Durability (DUR): [Rating]
        - Special Teams (ST): [Rating]
        - Overall (OVR): [Rating]

        Available information for AI:
        ${cfbdStatsSummary}
        `;

        console.log("Sending prompt to OpenAI API...");

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a concise college football expert. Generate player overviews and hypothetical in-game ratings. Always follow the specified output format with ## OVERVIEW ## and ## RATINGS ## delimiters. If data is limited, provide a general profile and infer ratings based on role." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 700, // Increased max_tokens again for safety with detailed ratings and delimiters
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