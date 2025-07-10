import { NextRequest, NextResponse } from 'next/server';

// Define your CollegeFootballData.com API key
// *** IMPORTANT: Replace 'YOUR_CFBD_API_KEY_HERE' with your actual API key,
// or better yet, set it as an environment variable (e.g., in .env.local)
// and remove the || 'YOUR_CFBD_API_KEY_HERE' part for production. ***
const CFBD_API_KEY = process.env.CFBD_API_KEY || 'YOUR_CFBD_API_KEY_HERE';

// Interfaces to match the frontend expectations
interface FormattedTeamForFrontend {
    id: string;
    collegeDisplayName: string;
    mascot: string;
    conference: string;
    classification: string;
    color: string;
    alternateColor: string;
    logo: string;
    darkLogo: string;
}

interface CfbdPlayer {
    id: string; // Assuming CFBD player ID can be a string, or convert number to string
    firstName: string;
    lastName: string;
    fullName: string; // Combined name
    position: { displayName: string }; // CFBD has 'position', map it to 'displayName'
    jersey: string; // CFBD has 'jersey', ensure it's a string
    team: { displayName: string; slug: string }; // From CFBD team data
    weight: number | null;
    height: number | null;
    hometown: string | null;
    // Add other fields you might use from CFBD player roster if needed
    teamColor: string | null; // Added to match frontend interface, likely null from player roster API
    teamColorSecondary: string | null; // Added to match frontend interface, likely null from player roster API
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');
    const year = searchParams.get('year') || new Date().getFullYear().toString(); // Default to current year
    const teamName = searchParams.get('team'); // For player search
    const playerNameSearch = searchParams.get('search'); // For player search

    // --- DEBUG: Log API Key Status ---
    console.log(`[DEBUG main-api] CFBD_API_KEY status: ${CFBD_API_KEY && CFBD_API_KEY !== 'YOUR_CFBD_API_KEY_HERE' ? 'Set' : 'NOT SET or Default Placeholder'}`);

    if (!CFBD_API_KEY || CFBD_API_KEY === 'YOUR_CFBD_API_KEY_HERE') {
        console.error('[ERROR main-api] CollegeFootballData.com API key is not configured or is using the default placeholder.');
        return NextResponse.json({ error: 'CollegeFootballData.com API key not configured.' }, { status: 500 });
    }

    try {
        if (target === 'teams') {
            const cfbdTeamsUrl = `https://api.collegefootballdata.com/teams?year=${year}`;
            console.log(`[DEBUG main-api] Fetching teams from CFBD: ${cfbdTeamsUrl}`);

            const cfbdResponse = await fetch(cfbdTeamsUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`
                },
            });

            if (!cfbdResponse.ok) {
                const errorText = await cfbdResponse.text();
                console.error(`[ERROR main-api] CFBD Teams API returned ${cfbdResponse.status} ${cfbdResponse.statusText}. Response body:`, errorText);
                return NextResponse.json({ error: `Failed to fetch teams from CFBD: ${cfbdResponse.statusText}. Details: ${errorText}` }, { status: cfbdResponse.status });
            }

            const teams: any[] = await cfbdResponse.json();

            // Format teams to match FormattedTeamForFrontend interface
            const formattedTeams: FormattedTeamForFrontend[] = teams.map(team => ({
                id: team.id.toString(), // Ensure ID is string
                collegeDisplayName: team.school,
                mascot: team.mascot || 'N/A',
                conference: team.conference || 'Independent',
                classification: team.classification || 'N/A',
                color: team.color || '#000000',
                alternateColor: team.alt_color || '#FFFFFF',
                logo: team.logos?.[0] || '', // Use first logo if available
                darkLogo: team.logos?.[1] || team.logos?.[0] || '', // Use second logo for dark, fallback to first
            }));

            // Frontend specifically requested only FBS and FCS for the filter dropdown
            const fbsTeams = formattedTeams.filter(team => team.classification?.toUpperCase() === 'FBS');
            const fcsTeams = formattedTeams.filter(team => team.classification?.toUpperCase() === 'FCS');

            const filteredAndSortedTeams = [...fbsTeams, ...fcsTeams].sort((a, b) =>
                a.collegeDisplayName.localeCompare(b.collegeDisplayName)
            );

            console.log(`[DEBUG main-api] Returning ${filteredAndSortedTeams.length} FBS/FCS teams for year ${year}.`);
            return NextResponse.json(filteredAndSortedTeams);

        } else if (target === 'players') {
            if (!teamName && !playerNameSearch) {
                console.warn('[WARN main-api] Missing team or search parameter for players target, returning 400.');
                return NextResponse.json({ error: 'Missing team or search parameter for players target.' }, { status: 400 });
            }

            // CFBD player roster endpoint. Note: CFBD's /roster/players does not support name search directly.
            // It filters by year and team.
            let cfbdPlayersUrl = `https://api.collegefootballdata.com/roster/players?year=${year}`;
            if (teamName) {
                cfbdPlayersUrl += `&team=${encodeURIComponent(teamName)}`;
            }

            // --- DEBUG: Log Player Fetch Details ---
            console.log(`[DEBUG main-api] Attempting to fetch players for year: ${year}, team: "${teamName || 'All Teams'}"`);
            console.log(`[DEBUG main-api] Full CFBD Players API URL being called: ${cfbdPlayersUrl}`);
            // --- END DEBUG LOGS ---

            const cfbdResponse = await fetch(cfbdPlayersUrl, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`
                },
            });

            if (!cfbdResponse.ok) {
                const errorText = await cfbdResponse.text(); // Read the full response body for debugging
                console.error(`[ERROR main-api] CFBD Players API returned ${cfbdResponse.status} ${cfbdResponse.statusText}. Response body:`, errorText);
                return NextResponse.json({ error: `Failed to fetch players from CFBD: ${cfbdResponse.statusText}. Details: ${errorText}` }, { status: cfbdResponse.status });
            }

            const rawPlayers: any[] = await cfbdResponse.json();
            console.log(`[DEBUG main-api] Raw players received from CFBD (first 5):`, rawPlayers.slice(0, 5));


            // Map CFBD player data to match the CfbdPlayer interface expected by the frontend
            let formattedPlayers: CfbdPlayer[] = rawPlayers.map(player => ({
                id: player.id.toString(),
                firstName: player.first_name || '',
                lastName: player.last_name || '',
                fullName: `${player.first_name || ''} ${player.last_name || ''}`.trim(),
                position: { displayName: player.position || 'N/A' }, // CFBD uses 'position' directly
                jersey: player.jersey ? player.jersey.toString() : 'N/A', // Ensure jersey is string
                team: {
                    displayName: player.team || 'N/A', // CFBD provides 'team' name
                    slug: player.team ? player.team.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'n-a' // Simple slugify for consistency
                },
                weight: player.weight || null,
                height: player.height || null,
                hometown: player.home_city && player.home_state ? `${player.home_city}, ${player.home_state}` : player.home_city || player.home_state || null,
                teamColor: null, // Not directly available on player roster via this endpoint
                teamColorSecondary: null, // Not directly available on player roster via this endpoint
            }));

            // Implement client-side filtering for player name if provided
            if (playerNameSearch) {
                const searchLower = playerNameSearch.toLowerCase();
                formattedPlayers = formattedPlayers.filter(player =>
                    player.fullName.toLowerCase().includes(searchLower) ||
                    player.firstName.toLowerCase().includes(searchLower) ||
                    player.lastName.toLowerCase().includes(searchLower)
                );
            }

            console.log(`[DEBUG main-api] Returning ${formattedPlayers.length} players for year ${year} and team ${teamName || 'all'} (after search filter).`);
            return NextResponse.json(formattedPlayers);

        } else {
            console.warn(`[WARN main-api] Invalid target parameter received: ${target}, returning 400.`);
            return NextResponse.json({ error: 'Invalid target parameter.' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('[FATAL ERROR main-api] Proxy caught an unhandled error:', error);
        return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
    }
}