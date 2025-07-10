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

// NEW/REVISED: Interface for CFBD's /players endpoint (which seems to be what you had before for players)
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
}


export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');
    const year = searchParams.get('year');
    const teamName = searchParams.get('team'); // This will be the collegeDisplayName from frontend (e.g., "Auburn")
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    // --- ADD THIS LOG ---
    console.log(`[DEBUG route.ts] Received target: ${target}, year: ${year}, teamName: ${teamName}, search: ${search}, limit: ${limit}`);
    // --------------------

    const CFBD_API_KEY = process.env.CFBD_API_KEY;

    if (!CFBD_API_KEY) {
        // --- ADD THIS LOG FOR API KEY CHECK ---
        console.error('[Proxy] CFBD_API_KEY is not set!');
        // --------------------------------------
        return new NextResponse(JSON.stringify({ error: 'CFBD_API_KEY is not set in environment variables.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        let data: any;

        if (target === 'players') {
            // --- CFBD Players API Call ---
            let cfbdPlayersUrl = `https://api.collegefootballdata.com/players`;
            
            const queryParts = [];
            if (year) {
                queryParts.push(`year=${year}`);
            }
            if (teamName) {
                // CFBD's /players endpoint expects 'team' as the full team name (e.g., "Auburn")
                // Make sure teamName here is indeed the actual name and not an ID.
                queryParts.push(`team=${encodeURIComponent(teamName)}`);
            }
            if (search) {
                queryParts.push(`search=${encodeURIComponent(search)}`);
            }

            if (queryParts.length > 0) {
                cfbdPlayersUrl += `?${queryParts.join('&')}`;
            }

            console.log(`[Proxy] Fetching players from CFBD: ${cfbdPlayersUrl}`);

            const cfbdResponse = await fetch(cfbdPlayersUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`
                }
            });

            // --- ADD THESE LOGS FOR RESPONSE STATUS AND BODY ---
            console.log(`[Proxy] CFBD Players API Response Status: ${cfbdResponse.status}`);
            const responseBody = await cfbdResponse.text(); // Read the body once
            console.log(`[Proxy] CFBD Players API Raw Response Body (first 500 chars):`, responseBody.substring(0, 500));
            // --------------------------------------------------

            if (!cfbdResponse.ok) {
                // Use the already-read responseBody for error reporting
                console.error(`Error from CFBD Players API: ${cfbdResponse.status} ${cfbdResponse.statusText}. Details:`, responseBody);
                throw new Error(`Failed to fetch CFBD players: ${cfbdResponse.statusText}. Details: ${responseBody}`);
            }

            let rawPlayers: CfbdPlayerRaw[];
            try {
                rawPlayers = JSON.parse(responseBody); // Try parsing the logged body
            } catch (jsonError) {
                console.error("[Proxy] Failed to parse CFBD Players API response as JSON:", jsonError);
                throw new Error(`Invalid JSON response from CFBD Players API. Raw body starts with: ${responseBody.substring(0, 500)}...`); // Show part of the invalid JSON
            }
            
            console.log("[Proxy] Raw CFBD players fetched:", rawPlayers.length);

            // Apply limit after fetching from CFBD
            let playersToReturn = rawPlayers;
            if (limit) {
                const parsedLimit = parseInt(limit, 10);
                if (!isNaN(parsedLimit) && parsedLimit > 0) {
                    playersToReturn = rawPlayers.slice(0, parsedLimit);
                }
            }

            // Transform CFBD player data to the CfbdPlayer interface expected by frontend
            data = playersToReturn.map(player => ({
                id: player.athlete_id.toString(), // Convert number ID to string
                firstName: player.first_name || 'N/A',
                lastName: player.last_name || 'N/A',
                fullName: `${player.first_name || ''} ${player.last_name || ''}`.trim(), // Combine for fullName
                position: { displayName: player.position || 'N/A' },
                jersey: player.jersey ? player.jersey.toString() : 'N/A', // Convert jersey to string
                team: {
                    displayName: player.team || 'N/A',
                    slug: player.team ? player.team.toLowerCase().replace(/\s/g, '-') : 'N/A' // Simple slug for team name
                },
                weight: player.weight,
                height: player.height,
                hometown: null, // CFBD players endpoint has city/state, but not single 'hometown' field
                teamColor: null, // Not directly from CFBD /players endpoint
                teamColorSecondary: null, // Not directly from CFBD /players endpoint
            }));

        } else if (target === 'teams') {
            // --- CFBD Teams API Call (Remains the same as before) ---
            const cfbdTeamsUrl = `https://api.collegefootballdata.com/teams?year=${year}`;
            
            console.log(`[Proxy] Fetching teams from CFBD: ${cfbdTeamsUrl}`);

            const cfbdResponse = await fetch(cfbdTeamsUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`
                }
            });

            // --- ADD THESE LOGS FOR TEAMS RESPONSE STATUS AND BODY TOO ---
            console.log(`[Proxy] CFBD Teams API Response Status: ${cfbdResponse.status}`);
            const responseBody = await cfbdResponse.text();
            console.log(`[Proxy] CFBD Teams API Raw Response Body (first 500 chars):`, responseBody.substring(0, 500));
            // -------------------------------------------------------------

            if (!cfbdResponse.ok) {
                const errorBody = await cfbdResponse.text(); // This line might error if body was already read once above, hence read it once.
                console.error(`Error from CFBD Teams API: ${cfbdResponse.status} ${cfbdResponse.statusText}. Details:`, errorBody);
                throw new Error(`Failed to fetch CFBD teams: ${cfbdResponse.statusText}. Details: ${errorBody}`);
            }
            
            let cfbdTeams: CfbdTeamRaw[];
            try {
                cfbdTeams = JSON.parse(responseBody); // Use the already-read body
            } catch (jsonError) {
                console.error("[Proxy] Failed to parse CFBD Teams API response as JSON:", jsonError);
                throw new Error(`Invalid JSON response from CFBD Teams API. Raw body starts with: ${responseBody.substring(0, 500)}...`);
            }

            console.log("[Proxy] Raw CFBD teams fetched:", cfbdTeams.length);

            // Filter for FBS and FCS, then map to FormattedTeamForFrontend
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