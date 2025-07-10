// app/api/main-api/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getRoster } from '@/lib/getRoster'; // Import the new function

// Define your CollegeFootballData.com API key (still needed here for teams, and getRoster needs it)
const CFBD_API_KEY = process.env.CFBD_API_KEY || 'YOUR_CFBD_API_KEY_HERE';

// Interfaces (These should ideally be in a shared types file, but keeping them here for now)
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

// NOTE: CfbdPlayer interface is also defined in getRoster.ts.
// If these interfaces become more complex or used in more places, consider
// moving them to a dedicated `types.ts` file (e.g., `types/cfbd-types.ts`)
// and importing them in both `route.ts` and `getRoster.ts`.

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const teamName = searchParams.get('team');
    const playerNameSearch = searchParams.get('search');

    console.log(`[DEBUG main-api] CFBD_API_KEY status: ${CFBD_API_KEY && CFBD_API_KEY !== 'YOUR_CFBD_API_KEY_HERE' ? 'Set' : 'NOT SET or Default Placeholder'}`);

    // Ensure API key is present for the main handler, as teams endpoint uses it directly
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

            const formattedTeams: FormattedTeamForFrontend[] = teams.map(team => ({
                id: team.id.toString(),
                collegeDisplayName: team.school,
                mascot: team.mascot || 'N/A',
                conference: team.conference || 'Independent',
                classification: team.classification || 'N/A',
                color: team.color || '#000000',
                alternateColor: team.alt_color || '#FFFFFF',
                logo: team.logos?.[0] || '',
                darkLogo: team.logos?.[1] || team.logos?.[0] || '',
            }));

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

            try {
                // Call the new getRoster function
                const players = await getRoster(year, teamName || undefined, playerNameSearch || undefined); // Pass undefined if not present

                console.log(`[DEBUG main-api] Returning ${players.length} players from getRoster for year ${year} and team ${teamName || 'all'} (after search filter).`);
                return NextResponse.json(players);
            } catch (error: any) {
                console.error('[ERROR main-api] Error fetching players via getRoster:', error.message);
                return NextResponse.json({ error: `Failed to fetch players: ${error.message}` }, { status: 500 });
            }

        } else {
            console.warn(`[WARN main-api] Invalid target parameter received: ${target}, returning 400.`);
            return NextResponse.json({ error: 'Invalid target parameter.' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('[FATAL ERROR main-api] Proxy caught an unhandled error:', error);
        return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
    }
}