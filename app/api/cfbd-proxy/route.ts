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

    // Extract parameters from client-side request
    const year = searchParams.get('year');
    const team = searchParams.get('team');
    const position = searchParams.get('position'); // Note: /player/search might not support position directly
    const playerName = searchParams.get('search'); // This was 'search' from page.tsx

    // Construct query parameters for the CFBD API
    const cfbdQueryParams = new URLSearchParams();

    // Use the correct parameter name for player search: 'searchTerm'
    if (playerName) {
        cfbdQueryParams.append('searchTerm', playerName);
    } else {
        // If no player name, provide a default empty search term or handle as per API's requirement
        // The Swagger UI example had '%20' for empty search, which is just a space
        cfbdQueryParams.append('searchTerm', ' ');
    }

    if (year) cfbdQueryParams.append('year', year);
    if (team) cfbdQueryParams.append('team', team);

    // Note: The /player/search endpoint might not directly filter by 'position'.
    // If you need position filtering, you might have to fetch all players for the team/year
    // and then filter by position on your server-side after getting the results.
    // For now, we'll omit sending 'position' to this specific endpoint.
    // If it *does* support it, you can add: if (position) cfbdQueryParams.append('position', position);

    // Ensure year is always present (CFBD API requires it for this endpoint too)
    if (!year) {
        cfbdQueryParams.append('year', '2024'); // Default year if not provided by client
    }

    // --- IMPORTANT CHANGE: Use the /player/search endpoint ---
    const cfbdApiUrl = `${CFBD_BASE_URL}/player/search?${cfbdQueryParams.toString()}`;

    try {
        console.log("Proxying request to CFBD URL:", cfbdApiUrl);
        const cfbdResponse = await fetch(cfbdApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CFBD_API_KEY}`,
                'Accept': 'application/json',
                'User-Agent': 'YourAppName/1.0 (CFBD API Proxy)'
            },
        });

        if (!cfbdResponse.ok) {
            const errorText = await cfbdResponse.text();
            console.error(`CFBD API returned ${cfbdResponse.status} from proxy. Raw response:`, errorText);
            return NextResponse.json(
                { error: `CFBD API error: ${cfbdResponse.statusText}`, details: errorText },
                { status: cfbdResponse.status }
            );
        }

        const data = await cfbdResponse.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Proxy fetch error during CFBD call:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch from CFBD API via proxy.",
                details: error.message,
                cfbdApiUrl: cfbdApiUrl
            },
            { status: 500 }
        );
    }
}