// src/app/api/espn-cfb-proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

// ESPN's base URLs for college football. These are from community findings.
// site.api.espn.com is generally for top-level lists (teams, leagues)
// sports.core.api.espn.com is for more detailed sports-specific data (rosters, events)
const ESPN_SITE_BASE_URL = 'https://site.api.espn.com';
const ESPN_CORE_BASE_URL = 'https://sports.core.api.espn.com';

export async function GET(request: NextRequest) {
    console.log("[ESPN CFB Proxy] Route hit.");

    // No API key is typically required for these unofficial ESPN endpoints.
    // If ESPN changes this or introduces rate limiting, further strategies might be needed.

    const { searchParams } = new URL(request.url);
    const targetEndpoint = searchParams.get('target'); // e.g., 'players' or 'teams'
    const year = searchParams.get('year');
    const teamName = searchParams.get('team'); // Full team name, e.g., "Michigan"
    const playerNameSearchTerm = searchParams.get('search'); // Used for client-side filtering
    const position = searchParams.get('position'); // Used for client-side filtering

    let espnApiUrl = '';
    let responseData: any = []; // Initialize as an empty array for consistent return type

    try {
        if (targetEndpoint === 'teams') {
            // ESPN endpoint to list college football teams
            espnApiUrl = `${ESPN_SITE_BASE_URL}/apis/site/v2/sports/football/leagues/college-football/teams`;
            console.log(`[ESPN CFB Proxy] Fetching teams from: ${espnApiUrl}`);

            const teamsResponse = await fetch(espnApiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'CFB26Teambuilder/1.0 (ESPN CFB Teams Proxy)'
                },
            });

            if (!teamsResponse.ok) {
                const errorText = await teamsResponse.text();
                console.error(`[ESPN CFB Proxy] ESPN API (teams) returned ${teamsResponse.status}. Details:`, errorText);
                return NextResponse.json(
                    { error: `ESPN API error fetching teams: ${teamsResponse.statusText}`, details: errorText },
                    { status: teamsResponse.status }
                );
            }

            const teamsData = await teamsResponse.json();
            // ESPN's teams data structure often has teams under `sports[0].leagues[0].teams`
            // We need to extract just the relevant team information
            const extractedTeams = teamsData?.sports?.[0]?.leagues?.[0]?.teams?.map((teamWrapper: any) => {
                const team = teamWrapper.team;
                return {
                    id: team.id,
                    school: team.displayName, // Use displayName as 'school' for consistency with frontend
                    mascot: team.nickname,
                    abbreviation: team.abbreviation,
                    conference: team.conference?.name || null,
                    division: team.division?.name || null, // Check if division exists
                    classification: team.type, // ESPN often uses 'type' for classification like 'FBS'
                    color: team.color ? `#${team.color}` : null, // Add '#' prefix
                    alt_color: team.alternateColor ? `#${team.alternateColor}` : null, // Add '#' prefix
                    logos: team.logos?.map((logo: any) => logo.href) || null,
                    twitter: team.twitter || null,
                    location: {
                        name: team.venue?.fullName || null,
                        city: team.venue?.address?.city || null,
                        state: team.venue?.address?.state || null,
                        capacity: team.venue?.capacity || null,
                    },
                    // Add other fields from CfbdTeam if available in ESPN data
                };
            }).filter((team: any) => team.classification === 'FBS' || team.classification === 'FCS') || []; // Filter for FBS/FCS

            responseData = extractedTeams;

        } else if (targetEndpoint === 'players') {
            if (!teamName) {
                return NextResponse.json(
                    { error: "For player searches via ESPN API, a 'team' parameter (college name) is required." },
                    { status: 400 }
                );
            }
            if (!year) {
                // Default to current year if no year is provided for players
                const currentYear = new Date().getFullYear().toString();
                console.warn(`[ESPN CFB Proxy] No year provided for player search, defaulting to ${currentYear}.`);
                searchParams.set('year', currentYear);
            }

            // Step 1: Get team ID from team name
            const teamsLookupUrl = `${ESPN_SITE_BASE_URL}/apis/site/v2/sports/football/leagues/college-football/teams`;
            const teamsLookupResponse = await fetch(teamsLookupUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'CFB26Teambuilder/1.0 (ESPN CFB Teams Lookup)'
                },
            });

            if (!teamsLookupResponse.ok) {
                const errorText = await teamsLookupResponse.text();
                console.error(`[ESPN CFB Proxy] Failed to lookup team ID for '${teamName}'. ESPN API (teams lookup) returned ${teamsLookupResponse.status}. Details:`, errorText);
                return NextResponse.json(
                    { error: `ESPN API error: Could not find team ID for '${teamName}'.`, details: errorText },
                    { status: teamsLookupResponse.status }
                );
            }
            const teamsLookupData = await teamsLookupResponse.json();
            const foundTeam = teamsLookupData?.sports?.[0]?.leagues?.[0]?.teams?.find((t: any) => t.team.displayName === teamName || t.team.shortDisplayName === teamName);

            if (!foundTeam) {
                console.warn(`[ESPN CFB Proxy] Team '${teamName}' not found in ESPN team list.`);
                return NextResponse.json(
                    { error: `Team '${teamName}' not found for player search. Please check the college name.`, players: [] },
                    { status: 404 }
                );
            }
            const teamId = foundTeam.team.id;

            // Step 2: Fetch team roster using the team ID and year
            espnApiUrl = `${ESPN_CORE_BASE_URL}/v2/sports/football/leagues/college-football/seasons/${year}/teams/${teamId}/roster`;
            console.log(`[ESPN CFB Proxy] Fetching players from: ${espnApiUrl}`);

            const playersResponse = await fetch(espnApiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'CFB26Teambuilder/1.0 (ESPN CFB Players Proxy)'
                },
            });

            if (!playersResponse.ok) {
                const errorText = await playersResponse.text();
                console.error(`[ESPN CFB Proxy] ESPN API (players) returned ${playersResponse.status}. Details:`, errorText);
                return NextResponse.json(
                    { error: `ESPN API error fetching players for ${teamName}: ${playersResponse.statusText}`, details: errorText },
                    { status: playersResponse.status }
                );
            }

            const playerData = await playersResponse.json();
            // ESPN's roster structure is typically under `athletes`
            const rawPlayers = playerData?.athletes || [];

            // Map ESPN player data to your CfbdPlayer interface structure (approximate)
            const mappedPlayers = rawPlayers.map((player: any) => ({
                id: player.id,
                team: foundTeam.team.displayName, // Assign the team name
                name: player.fullName,
                firstName: player.firstName,
                lastName: player.lastName,
                weight: player.weight ? parseInt(player.weight) : null,
                height: player.height ? parseInt(player.height) : null, // Height typically in inches in ESPN data
                jersey: player.jersey ? parseInt(player.jersey) : null,
                position: player.position?.abbreviation || player.position?.displayName || null,
                hometown: player.hometown?.city && player.hometown?.state ? `${player.hometown.city}, ${player.hometown.state}` : player.hometown?.description || null,
                teamColor: foundTeam.team.color ? `#${foundTeam.team.color}` : null,
                teamColorSecondary: foundTeam.team.alternateColor ? `#${foundTeam.team.alternateColor}` : null,
                // You might need to add logic here to infer redshirted status, class, highSchoolRating, etc.
                // based on other player properties if they exist in the ESPN data.
            }));

            // Client-side filtering for playerName and position
            let filteredPlayers = mappedPlayers;
            if (playerNameSearchTerm) {
                const searchLower = playerNameSearchTerm.toLowerCase();
                filteredPlayers = filteredPlayers.filter((player: any) =>
                    (player.name && player.name.toLowerCase().includes(searchLower)) ||
                    (player.firstName && player.firstName.toLowerCase().includes(searchLower)) ||
                    (player.lastName && player.lastName.toLowerCase().includes(searchLower))
                );
            }
            if (position) {
                const positionUpper = position.toUpperCase();
                filteredPlayers = filteredPlayers.filter((player: any) =>
                    player.position && player.position.toUpperCase() === positionUpper
                );
            }

            responseData = filteredPlayers;

        } else {
            // If no valid target is specified
            return NextResponse.json(
                { error: "Invalid API target specified. Use 'players' or 'teams'." },
                { status: 400 }
            );
        }

        console.log(`[ESPN CFB Proxy] Successfully retrieved data for target '${targetEndpoint}'.`);
        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error(`[ESPN CFB Proxy] Error during API call for target '${targetEndpoint}':`, error);
        return NextResponse.json(
            {
                error: `Failed to fetch from ESPN CFB API via proxy for target '${targetEndpoint}'.`,
                details: error.message,
                espnApiUrl: espnApiUrl // Provide the URL that caused the error
            },
            { status: 500 }
        );
    }
}