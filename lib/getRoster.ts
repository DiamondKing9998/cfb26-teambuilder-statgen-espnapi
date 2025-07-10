// lib/getRoster.ts

// Define your CollegeFootballData.com API key
const CFBD_API_KEY = process.env.CFBD_API_KEY;

// Interfaces (UPDATED: CfbdPlayerRaw uses firstName and lastName directly)
interface CfbdPlayerRaw {
    id: number | string;
    firstName: string; // <--- CHANGED: Use firstName
    lastName: string;  // <--- CHANGED: Use lastName
    team: string;
    weight: number | null;
    height: number | null;
    jersey: number | null;
    year: number;
    position: string;
    homeCity: string | null; // Also noticed homeCity/State in logs, not home_city/state
    homeState: string | null;
    homeCountry: string | null;
    homeLatitude: number | null;
    homeLongitude: number | null;
    homeCountyFIPS: string | null;
    recruitIds: string[]; // Added this based on your debug log
    // Add any other fields you expect from the CFBD roster API
}

interface CfbdPlayer {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    position: { displayName: string };
    jersey: string;
    team: { displayName: string; slug: string };
    weight: number | null;
    height: number | null;
    hometown: string | null;
    teamColor: string | null;
    teamColorSecondary: string | null;
}

export async function getRoster(year: string, teamName?: string, playerNameSearch?: string): Promise<CfbdPlayer[]> {
    if (!CFBD_API_KEY) {
        console.error('[ERROR getRoster] CFBD_API_KEY is not set.');
        throw new Error('CollegeFootballData.com API key not configured.');
    }

    let cfbdPlayersUrl = `https://api.collegefootballdata.com/roster?year=${year}`;
    if (teamName) {
        cfbdPlayersUrl += `&team=${encodeURIComponent(teamName)}`;
    }

    console.log(`[DEBUG getRoster] Fetching players from CFBD: ${cfbdPlayersUrl}`);

    try {
        const cfbdResponse = await fetch(cfbdPlayersUrl, {
            headers: {
                'Authorization': `Bearer ${CFBD_API_KEY}`
            },
        });

        if (!cfbdResponse.ok) {
            const errorText = await cfbdResponse.text();
            console.error(`[ERROR getRoster] CFBD Players API returned ${cfbdResponse.status} - ${cfbdResponse.statusText}. Response body:`, errorText);
            throw new Error(`Failed to fetch players from CFBD: ${cfbdResponse.statusText}. Details: ${errorText}`);
        }

        const rawPlayers: CfbdPlayerRaw[] = await cfbdResponse.json();
        console.log(`[DEBUG getRoster] Raw players received from CFBD (first 5, BEFORE filter):`, rawPlayers.slice(0, 5));

        // Filter out players with negative IDs and where firstName/lastName are explicitly empty strings
        const filteredRawPlayers = rawPlayers.filter(player => {
            const playerIdAsNumber = Number(player.id);
            // NOW using player.firstName and player.lastName from the raw object
            return playerIdAsNumber >= 0 && (player.firstName !== '' && player.lastName !== '');
        });

        // Log filtered raw players to inspect their firstName and lastName values
        console.log(`[DEBUG getRoster] Filtered raw players (first 5, AFTER ID & name filter, checking raw names):`,
            filteredRawPlayers.slice(0, 5).map(p => ({
                id: p.id,
                firstName: p.firstName, // Now correctly logging firstName
                lastName: p.lastName,   // Now correctly logging lastName
                team: p.team,
                position: p.position,
                jersey: p.jersey
            }))
        );

        // Map filtered raw players to the CfbdPlayer interface (which already uses camelCase)
        let formattedPlayers: CfbdPlayer[] = filteredRawPlayers.map(player => ({
            id: player.id.toString(),
            firstName: player.firstName || '', // Direct mapping
            lastName: player.lastName || '',   // Direct mapping
            fullName: `${player.firstName || ''} ${player.lastName || ''}`.trim(),
            position: { displayName: player.position || 'N/A' },
            jersey: player.jersey ? player.jersey.toString() : 'N/A',
            team: {
                displayName: player.team || 'N/A',
                slug: player.team ? player.team.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'n-a'
            },
            weight: player.weight || null,
            height: player.height || null,
            // Also updated these based on your log: homeCity, homeState (camelCase)
            hometown: player.homeCity && player.homeState ? `${player.homeCity}, ${player.homeState}` : player.homeCity || player.homeState || null,
            teamColor: null,
            teamColorSecondary: null,
        }));

        // Log the final formatted players to ensure names are present after mapping
        console.log(`[DEBUG getRoster] Formatted players (first 5, AFTER mapping, checking firstName/lastName):`,
            formattedPlayers.slice(0, 5).map(p => ({
                id: p.id,
                firstName: p.firstName,
                lastName: p.lastName,
                fullName: p.fullName,
                team: p.team
            }))
        );

        // Client-side filtering for player name if provided
        if (playerNameSearch) {
            const searchLower = playerNameSearch.toLowerCase();
            formattedPlayers = formattedPlayers.filter(player =>
                player.fullName.toLowerCase().includes(searchLower) ||
                player.firstName.toLowerCase().includes(searchLower) ||
                player.lastName.toLowerCase().includes(searchLower)
            );
        }

        return formattedPlayers;

    } catch (error: any) {
        console.error('[FATAL ERROR getRoster] Error fetching roster:', error);
        throw error; // Re-throw the error for main-api/route.ts to catch
    }
}