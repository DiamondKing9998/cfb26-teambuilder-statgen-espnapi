// src/app/api/main-api/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Interface for what CFBD's /teams endpoint returns (simplified for relevant fields)
interface CfbdTeamRaw {
    id: number;
    school: string;
    mascot: string | null;
    conference: string | null;
    classification: string | null;
    color: string | null;
    alt_color: string | null;
    logos: { href: string }[] | null;
}

// The interface for what your frontend expects for teams
interface FormattedTeamForFrontend {
    id: string; // CFBD's ID is number, your proxy converts to string
    collegeDisplayName: string;
    mascot: string;
    conference: string;
    classification: string;
    color: string;
    alternateColor: string;
    logo: string;
    darkLogo: string;
}

// Interface for CFBD's /roster endpoint.
// It returns player data, which is what your CfbdPlayerRaw likely was meant for.
interface CfbdPlayerRaw {
    athlete_id: number;
    first_name: string;
    last_name: string;
    team: string; // CFBD gives team name (e.g., "Florida State")
    weight: number | null;
    height: number | null;
    jersey: number | null; // CFBD jersey is number
    year: number | null;
    position: string;
    home_town: string | null; // Added based on typical /roster fields
    eligibility: string | null; // Added based on typical /roster fields
}


export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');
    const year = searchParams.get('year');
    const teamName = searchParams.get('team');
    // Note: The 'search' parameter (for player name) will now be handled on the proxy side
    // because /roster endpoint does not have a 'search' query param.
    const playerNameSearch = searchParams.get('search'); // Get the search term for filtering
    const limit = searchParams.get('limit');

    console.log(`[DEBUG route.ts] Received target: ${target}, year: ${year}, teamName: ${teamName}, playerNameSearch: ${playerNameSearch}, limit: ${limit}`);

    const CFBD_API_KEY = process.env.CFBD_API_KEY;

    if (!CFBD_API_KEY) {
        console.error('[Proxy] CFBD_API_KEY is not set!');
        return new NextResponse(JSON.stringify({ error: 'CFBD_API_KEY is not set in environment variables.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        let data: any;

        // --- CHANGE target from 'players' to 'roster' ---
        if (target === 'roster') { // CHANGE THIS LINE
            // --- CFBD Roster API Call ---
            let cfbdRosterUrl = `https://api.collegefootballdata.com/roster`; // CHANGE THIS ENDPOINT
            
            const queryParts = [];
            if (year) {
                queryParts.push(`year=${year}`);
            }
            if (teamName) {
                queryParts.push(`team=${encodeURIComponent(teamName)}`);
            }
            // Removed 'search' from queryParts as /roster doesn't have it directly

            if (queryParts.length > 0) {
                cfbdRosterUrl += `?${queryParts.join('&')}`;
            }

            console.log(`[Proxy] Fetching roster from CFBD: ${cfbdRosterUrl}`);

            const cfbdResponse = await fetch(cfbdRosterUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`
                }
            });

            console.log(`[Proxy] CFBD Roster API Response Status: ${cfbdResponse.status}`);
            const responseBody = await cfbdResponse.text();
            console.log(`[Proxy] CFBD Roster API Raw Response Body (first 500 chars):`, responseBody.substring(0, 500));

            if (!cfbdResponse.ok) {
                console.error(`Error from CFBD Roster API: ${cfbdResponse.status} ${cfbdResponse.statusText}. Details:`, responseBody);
                throw new Error(`Failed to fetch CFBD roster: ${cfbdResponse.statusText}. Details: ${responseBody}`);
            }

            let rawPlayers: CfbdPlayerRaw[];
            try {
                rawPlayers = JSON.parse(responseBody);
            } catch (jsonError) {
                console.error("[Proxy] Failed to parse CFBD Roster API response as JSON:", jsonError);
                throw new Error(`Invalid JSON response from CFBD Roster API. Raw body starts with: ${responseBody.substring(0, 500)}...`);
            }
            
            console.log("[Proxy] Raw CFBD roster fetched:", rawPlayers.length);

            // --- Apply playerNameSearch filter on the proxy side ---
            let playersToReturn = rawPlayers;
            if (playerNameSearch) {
                const searchLower = playerNameSearch.toLowerCase();
                playersToReturn = playersToReturn.filter(player =>
                    (player.first_name && player.first_name.toLowerCase().includes(searchLower)) ||
                    (player.last_name && player.last_name.toLowerCase().includes(searchLower))
                );
                console.log(`[Proxy] Filtered by player name "${playerNameSearch}". Found ${playersToReturn.length} matches.`);
            }

            // Apply limit after fetching from CFBD and applying player name filter
            if (limit) {
                const parsedLimit = parseInt(limit, 10);
                if (!isNaN(parsedLimit) && parsedLimit > 0) {
                    playersToReturn = playersToReturn.slice(0, parsedLimit);
                }
            }

            // Transform CFBD player data to the CfbdPlayer interface expected by frontend
            data = playersToReturn.map(player => ({
                id: player.athlete_id.toString(),
                firstName: player.first_name || 'N/A',
                lastName: player.last_name || 'N/A',
                fullName: `${player.first_name || ''} ${player.last_name || ''}`.trim(),
                position: { displayName: player.position || 'N/A' },
                jersey: player.jersey ? player.jersey.toString() : 'N/A',
                team: {
                    displayName: player.team || 'N/A',
                    slug: player.team ? player.team.toLowerCase().replace(/\s/g, '-') : 'N/A'
                },
                weight: player.weight,
                height: player.height,
                hometown: player.home_town || null, // Now available from /roster
                teamColor: null, // Still not directly from /roster
                teamColorSecondary: null, // Still not directly from /roster
            }));

        } else if (target === 'teams') {
            // ... (your existing teams fetching logic - remains unchanged)
            const cfbdTeamsUrl = `https://api.collegefootballdata.com/teams?year=${year}`;
            
            console.log(`[Proxy] Fetching teams from CFBD: ${cfbdTeamsUrl}`);

            const cfbdResponse = await fetch(cfbdTeamsUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`
                }
            });

            console.log(`[Proxy] CFBD Teams API Response Status: ${cfbdResponse.status}`);
            const responseBody = await cfbdResponse.text();
            console.log(`[Proxy] CFBD Teams API Raw Response Body (first 500 chars):`, responseBody.substring(0, 500));

            if (!cfbdResponse.ok) {
                console.error(`Error from CFBD Teams API: ${cfbdResponse.status} ${cfbdResponse.statusText}. Details:`, responseBody);
                throw new Error(`Failed to fetch CFBD teams: ${cfbdResponse.statusText}. Details: ${responseBody}`);
            }
            
            let cfbdTeams: CfbdTeamRaw[];
            try {
                cfbdTeams = JSON.parse(responseBody);
            } catch (jsonError) {
                console.error("[Proxy] Failed to parse CFBD Teams API response as JSON:", jsonError);
                throw new Error(`Invalid JSON response from CFBD Teams API. Raw body starts with: ${responseBody.substring(0, 500)}...`);
            }

            console.log("[Proxy] Raw CFBD teams fetched:", cfbdTeams.length);

            const formattedTeams: FormattedTeamForFrontend[] = cfbdTeams
                .filter(team =>
                    team.classification?.toUpperCase() === 'FBS' ||
                    team.classification?.toUpperCase() === 'FCS'
                )
                .map(team => ({
                    id: team.id.toString(),
                    collegeDisplayName: team.school,
                    mascot: team.mascot || '',
                    conference: team.conference || 'N/A',
                    classification: team.classification || 'N/A',
                    color: team.color || '#cccccc',
                    alternateColor: team.alt_color || '#eeeeee',
                    logo: team.logos && team.logos.length > 0 ? team.logos[0].href : '',
                    darkLogo: team.logos && team.logos.length > 1 ? team.logos[1].href : '',
                }));
            
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