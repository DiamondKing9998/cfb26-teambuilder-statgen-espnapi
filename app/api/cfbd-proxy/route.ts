// src/app/api/cfbd-proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

const CFBD_API_KEY = process.env.CFBD_API_KEY;
const CFBD_BASE_URL = 'https://api.collegefootballdata.com';

export async function GET(request: NextRequest) {
    console.log("Proxy route hit.");
    console.log("Attempting to access CFBD_API_KEY. Status:", CFBD_API_KEY ? "Loaded" : "Undefined/Missing");

    if (!CFBD_API_KEY) {
        console.error("CRITICAL: CFBD_API_KEY is not defined in the Vercel environment!");
        return NextResponse.json({ error: "Server configuration error: API key missing." }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const targetEndpoint = searchParams.get('target'); // e.g., 'players' or 'teams'

    let cfbdApiUrl = '';
    const cfbdQueryParams = new URLSearchParams();

    // Determine which CFBD API endpoint to call based on the 'target' parameter
    if (targetEndpoint === 'players') {
        // Logic for fetching players
        const year = searchParams.get('year');
        const team = searchParams.get('team');
        const playerName = searchParams.get('search'); // 'search' from client maps to 'searchTerm' for CFBD
        const position = searchParams.get('position'); // <--- ADD THIS LINE to extract position

        if (playerName) {
            cfbdQueryParams.append('searchTerm', playerName);
        } else {
            cfbdQueryParams.append('searchTerm', ' '); // Default to space for broad search
        }
        if (year) cfbdQueryParams.append('year', year);
        if (team) cfbdQueryParams.append('team', team);
        if (position) cfbdQueryParams.append('position', position); // <--- ADD THIS LINE to append position
        if (!year) cfbdQueryParams.append('year', '2024'); // Default year for players

        cfbdApiUrl = `${CFBD_BASE_URL}/player/search?${cfbdQueryParams.toString()}`;

    } else if (targetEndpoint === 'teams') {
        // Logic for fetching teams for the filter sidebar
        const year = searchParams.get('year');

        if (year) {
            cfbdQueryParams.append('year', year);
        } else {
            cfbdQueryParams.append('year', '2024'); // Default year for teams if not provided
        }

        cfbdApiUrl = `${CFBD_BASE_URL}/teams?${cfbdQueryParams.toString()}`;

    } else {
        // If no valid target is specified
        return NextResponse.json({ error: "Invalid API target specified. Use 'players' or 'teams'." }, { status: 400 });
    }

    try {
        console.log(`Proxying request for target '${targetEndpoint}' to CFBD URL:`, cfbdApiUrl);
        const cfbdResponse = await fetch(cfbdApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CFBD_API_KEY}`,
                'Accept': 'application/json',
                'User-Agent': `YourAppName/1.0 (CFBD API Proxy - Target: ${targetEndpoint})`
            },
        });

        if (!cfbdResponse.ok) {
            const errorText = await cfbdResponse.text();
            console.error(`CFBD API returned ${cfbdResponse.status} from proxy for target '${targetEndpoint}'. Raw response:`, errorText);
            return NextResponse.json(
                { error: `CFBD API error for '${targetEndpoint}': ${cfbdResponse.statusText}`, details: errorText },
                { status: cfbdResponse.status }
            );
        }

        const data = await cfbdResponse.json();
        console.log(`Data received from CFBD API for target '${targetEndpoint}':`, JSON.stringify(data, null, 2));
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Proxy fetch error during CFBD call:", error);
        return NextResponse.json(
            {
                error: `Failed to fetch from CFBD API via proxy for target '${targetEndpoint}'.`,
                details: error.message,
                cfbdApiUrl: cfbdApiUrl
            },
            { status: 500 }
        );
    }
}