// src/app/api/main-api/route.ts

import { NextRequest, NextResponse } from 'next/server'; // Import NextRequest and NextResponse

// Interface for what CFBD's /teams endpoint returns (simplified for relevant fields)
interface CfbdTeamRaw {
    id: number;
    school: string;
    mascot: string | null;
    conference: string | null;
    classification: string | null;
    color: string | null;
    alt_color: string | null;
    logos: { href: string }[] | null; // CFBD has an array of objects for logos
}

// The interface for what your frontend expects for teams
interface FormattedTeamForFrontend {
    id: string; // Crucial: CFBD's ID is number, your proxy converts to string
    collegeDisplayName: string;
    mascot: string;
    conference: string;
    classification: string;
    color: string;
    alternateColor: string;
    logo: string; // Primary logo URL
    darkLogo: string; // Dark mode logo URL
}

// Interface for what ESPN's roster API returns (simplified for relevant fields)
interface EspnRosterPlayerRaw {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string; // ESPN often uses displayName
    position: { displayName: string };
    jersey: string; // ESPN jersey is string
    team: { displayName: string; slug: string }; // Team info for the player
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');
    const year = searchParams.get('year');
    // Renamed 'team' to 'teamParam' to clarify it's the parameter from the URL,
    // which for players should now be the team ID/slug.
    const teamParam = searchParams.get('team');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    const CFBD_API_KEY = process.env.CFBD_API_KEY; // Ensure you have this in .env.local

    if (!CFBD_API_KEY) {
        return new NextResponse(JSON.stringify({ error: 'CFBD_API_KEY is not set in environment variables.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        let data: any;

        if (target === 'players') {
            let espnApiUrl = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/roster`; // Base roster endpoint

            if (teamParam) {
                // If a team ID/slug is provided, build the specific team roster URL
                espnApiUrl = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${teamParam}/roster`;
                console.log(`[Proxy] Fetching specific team roster for slug/ID: ${teamParam}`);
            } else {
                // If no team is specified for players, fetching a general roster across all teams
                // is complex and inefficient with ESPN's API. For this POC, if no team is selected,
                // we will not attempt to fetch a generic roster. The frontend should handle this
                // by either requiring a team or having a default 'no search performed' state.
                console.warn("[Proxy] Player search initiated without a specific team. This API route is not configured to fetch a general roster across all teams. Returning empty array.");
                return new NextResponse(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (year) {
                espnApiUrl += `?season=${year}`; // Add season parameter
            }
            
            // For ESPN API, we typically don't have a direct 'limit' in the URL for rosters.
            // We fetch and then slice the results.
            const espnResponse = await fetch(espnApiUrl);

            if (!espnResponse.ok) {
                const errorBody = await espnResponse.text();
                console.error(`Error from ESPN API: ${espnResponse.status} ${espnResponse.statusText}. Details:`, errorBody);
                // If the error is 404 (e.g., team not found for year), return an empty array gracefully
                if (espnResponse.status === 404) {
                     data = []; // No players found for this team/year combination
                } else {
                    throw new Error(`Failed to fetch ESPN roster: ${espnResponse.statusText}. Details: ${errorBody}`);
                }
            } else {
                const espnData = await espnResponse.json();
                let players: EspnRosterPlayerRaw[] = [];

                // Navigate ESPN's potentially nested JSON structure to find athletes
                if (espnData && espnData.athletes) {
                    players = espnData.athletes;
                } else if (espnData && espnData.sport && espnData.sport.leagues && espnData.sport.leagues[0] && espnData.sport.leagues[0].teams && espnData.sport.leagues[0].teams[0] && espnData.sport.leagues[0].teams[0].athletes) {
                    // This path might be for broader team endpoints if the structure is like:
                    // sport -> leagues -> [0] -> teams -> [0] -> athletes
                    players = espnData.sport.leagues[0].teams[0].athletes;
                } else if (espnData && espnData.teams && espnData.teams[0] && espnData.teams[0].athletes) {
                    // Another possible structure for an endpoint returning multiple teams
                    players = espnData.teams[0].athletes;
                }
                
                // Filter by search name (if present)
                if (search) {
                    const searchLower = search.toLowerCase();
                    players = players.filter((player: EspnRosterPlayerRaw) =>
                        player.displayName?.toLowerCase().includes(searchLower) ||
                        player.firstName?.toLowerCase().includes(searchLower) ||
                        player.lastName?.toLowerCase().includes(searchLower)
                    );
                }

                // Apply the limit (slice the array)
                if (limit) {
                    const parsedLimit = parseInt(limit, 10);
                    if (!isNaN(parsedLimit) && parsedLimit > 0) {
                        players = players.slice(0, parsedLimit);
                    }
                }

                // Transform ESPN player data to CfbdPlayer interface (used by frontend)
                data = players.map((player: EspnRosterPlayerRaw) => ({
                    id: player.id,
                    firstName: player.firstName,
                    lastName: player.lastName,
                    fullName: player.displayName,
                    position: { displayName: player.position?.displayName || 'N/A' },
                    jersey: player.jersey || 'N/A',
                    team: {
                        displayName: player.team?.displayName || 'N/A',
                        slug: player.team?.slug || 'N/A'
                    },
                    weight: null,
                    height: null,
                    hometown: null,
                    teamColor: null,
                    teamColorSecondary: null,
                }));
            }

        } else if (target === 'teams') {
            // --- CFBD Teams API Call ---
            // The `year` parameter for CFBD's /teams endpoint is crucial.
            // Ensure you're requesting data for a year that has teams.
            const cfbdTeamsUrl = `https://api.collegefootballdata.com/teams?year=${year}`;
            
            console.log(`[Proxy] Fetching teams from CFBD: ${cfbdTeamsUrl}`);

            const cfbdResponse = await fetch(cfbdTeamsUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`
                }
            });

            if (!cfbdResponse.ok) {
                const errorBody = await cfbdResponse.text();
                console.error(`Error from CFBD Teams API: ${cfbdResponse.status} ${cfbdResponse.statusText}. Details:`, errorBody);
                throw new Error(`Failed to fetch CFBD teams: ${cfbdResponse.statusText}. Details: ${errorBody}`);
            }

            const cfbdTeams: CfbdTeamRaw[] = await cfbdResponse.json();
            console.log("[Proxy] Raw CFBD teams fetched:", cfbdTeams.length);

            // Filter for FBS and FCS, then map to FormattedTeamForFrontend
            const formattedTeams: FormattedTeamForFrontend[] = cfbdTeams
                .filter(team =>
                    team.classification?.toUpperCase() === 'FBS' ||
                    team.classification?.toUpperCase() === 'FCS'
                )
                .map(team => ({
                    id: team.id.toString(), // Convert number ID to string for consistency
                    collegeDisplayName: team.school,
                    mascot: team.mascot || '',
                    conference: team.conference || 'N/A',
                    classification: team.classification || 'N/A',
                    color: team.color || '#cccccc', // Default color if null
                    alternateColor: team.alt_color || '#eeeeee', // Default alt color if null
                    logo: team.logos && team.logos.length > 0 ? team.logos[0].href : '', // Take first logo
                    darkLogo: team.logos && team.logos.length > 1 ? team.logos[1].href : '', // Take second logo if available
                }));
            
            // Sort teams alphabetically by display name before sending
            formattedTeams.sort((a, b) => a.collegeDisplayName.localeCompare(b.collegeDisplayName));

            data = formattedTeams;

        } else {
            return new NextResponse(JSON.stringify({ error: 'Invalid target specified.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new NextResponse(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('API proxy error:', error);
        return new NextResponse(JSON.stringify({ error: (error as Error).message || 'An unknown error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}