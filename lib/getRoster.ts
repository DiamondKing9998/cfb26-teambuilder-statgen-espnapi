// lib/getRoster.ts

// Define your CollegeFootballData.com API key
const CFBD_API_KEY = process.env.CFBD_API_KEY;

// Interfaces (updated id type for CfbdPlayerRaw to correctly handle string IDs like '-5405')
interface CfbdPlayerRaw {
    id: number | string; // Correctly handles IDs that might come as numbers or strings
    first_name: string;
    last_name: string;
    team: string;
    weight: number | null;
    height: number | null;
    jersey: number | null;
    year: number;
    position: string;
    home_city: string | null;
    home_state: string | null;
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
        // Log raw players before any filtering to see initial state
        console.log(`[DEBUG getRoster] Raw players received from CFBD (first 5, BEFORE filter):`, rawPlayers.slice(0, 5));

        // Filter out players with negative IDs and where first/last name are explicitly empty strings
        const filteredRawPlayers = rawPlayers.filter(player => {
            const playerIdAsNumber = Number(player.id); // Convert to number for robust comparison
            return playerIdAsNumber >= 0 && (player.first_name !== '' && player.last_name !== '');
        });

        // Log filtered raw players to inspect their first_name and last_name values
        console.log(`[DEBUG getRoster] Filtered raw players (first 5, AFTER ID & name filter, checking raw names):`,
            filteredRawPlayers.slice(0, 5).map(p => ({
                id: p.id,
                first_name: p.first_name, // Log these as they are received from the raw API
                last_name: p.last_name,   // Log these as they are received from the raw API
                team: p.team,
                position: p.position,
                jersey: p.jersey
            }))
        );

        // Map filtered raw players to the CfbdPlayer interface (camelCase names)
        let formattedPlayers: CfbdPlayer[] = filteredRawPlayers.map(player => ({
            id: player.id.toString(),
            firstName: player.first_name || '', // This mapping is correct
            lastName: player.last_name || '',   // This mapping is correct
            fullName: `${player.first_name || ''} ${player.last_name || ''}`.trim(),
            position: { displayName: player.position || 'N/A' },
            jersey: player.jersey ? player.jersey.toString() : 'N/A',
            team: {
                displayName: player.team || 'N/A',
                slug: player.team ? player.team.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'n-a'
            },
            weight: player.weight || null,
            height: player.height || null,
            hometown: player.home_city && player.home_state ? `${player.home_city}, ${player.home_state}` : player.home_city || player.home_state || null,
            teamColor: null,
            teamColorSecondary: null,
        }));

        // Log the final formatted players to ensure names are present after mapping
        console.log(`[DEBUG getRoster] Formatted players (first 5, AFTER mapping, checking firstName/lastName):`,
            formattedPlayers.slice(0, 5).map(p => ({
                id: p.id,
                firstName: p.firstName, // Log these in camelCase
                lastName: p.lastName,   // Log these in camelCase
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