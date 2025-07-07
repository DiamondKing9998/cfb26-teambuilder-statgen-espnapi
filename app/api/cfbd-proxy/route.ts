// src/app/api/cfbd-proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

// IMPORTANT: Never hardcode your API key directly in client-side code for production.
// For server-side API routes, it's safe to use process.env
const CFBD_API_KEY = process.env.CFBD_API_KEY;

const CFBD_BASE_URL = 'https://api.collegefootballdata.com';

export async function GET(request: NextRequest) {
    // This console.log will appear in your terminal where you run 'npm run dev'
    // It's crucial for debugging if the environment variable is being loaded correctly.
    console.log("CFBD_API_KEY from environment:", CFBD_API_KEY ? "Loaded" : "Undefined/Missing");

    // Parse query parameters from the client-side request to your proxy
    const { searchParams } = new URL(request.url);

    // Extract relevant parameters for the CFBD API
    const year = searchParams.get('year');
    const team = searchParams.get('team');
    const position = searchParams.get('position');
    const search = searchParams.get('search'); // for player name

    // Construct the query string for the CFBD API
    const cfbdQueryParams = new URLSearchParams();
    if (year) cfbdQueryParams.append('year', year);
    if (team) cfbdQueryParams.append('team', team);
    if (position) cfbdQueryParams.append('position', position);
    if (search) cfbdQueryParams.append('search', search);

    // Ensure year is always present (CFBD API requires it for /players)
    if (!year) {
        // You might want a better default or error handling here
        cfbdQueryParams.append('year', '2024'); // Default year if not provided by client
    }

    const cfbdApiUrl = `${CFBD_BASE_URL}/players?${cfbdQueryParams.toString()}`;

    // IMPORTANT: Check if API key is configured
    if (!CFBD_API_KEY) {
        console.error("CFBD_API_KEY is not configured in environment variables!");
        return NextResponse.json({ error: "Server configuration error: API key missing." }, { status: 500 });
    }

    try {
        console.log("Proxying request to CFBD:", cfbdApiUrl);
        const cfbdResponse = await fetch(cfbdApiUrl, {
            method: 'GET',
            headers: {
                // Attach the Authorization header directly from the server
                'Authorization': `Bearer ${CFBD_API_KEY}`,
                // No need for Cache-Control here, as the server handles the request
            },
        });

        // If CFBD API returns an error, propagate it back to the client
        if (!cfbdResponse.ok) {
            const errorText = await cfbdResponse.text();
            console.error(`CFBD API error (from proxy): ${cfbdResponse.status} ${cfbdResponse.statusText} - ${errorText}`);
            return NextResponse.json(
                { error: `CFBD API error: ${cfbdResponse.statusText}`, details: errorText },
                { status: cfbdResponse.status }
            );
        }

        const data = await cfbdResponse.json();
        return NextResponse.json(data); // Send JSON data back to client
    } catch (error: any) {
        console.error("Proxy fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch from CFBD API via proxy.", details: error.message }, { status: 500 });
    }
}