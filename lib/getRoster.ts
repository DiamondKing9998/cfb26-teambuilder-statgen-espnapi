// lib/getRoster.ts

// Define your CollegeFootballData.com API key
const CFBD_API_KEY = process.env.CFBD_API_KEY; // It should be set in .env.local

// Interfaces (copy these from your route.ts or define them globally if shared more widely)
interface CfbdPlayerRaw {
    id: number;
    first_name: string;
    last_name: string;
    team: string;
    weight: number | null;
    height: number | null; // Note: CFBD often returns height in inches
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

    let cfbdPlayersUrl = `https://api.collegefootballdata.com/roster?year=${year}`; // Corrected endpoint
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
        console.log(`[DEBUG getRoster] Raw players received from CFBD (first 10):`, rawPlayers.slice(0, 10)); // Log first 10 for inspection

        let formattedPlayers: CfbdPlayer[] = rawPlayers.map(player => ({
            id: player.id.toString(),
            firstName: player.first_name || '',
            lastName: player.last_name || '',
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
            teamColor: null, // Not directly available from roster endpoint
            teamColorSecondary: null, // Not directly available from roster endpoint
        }));

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