// src/app/api/cfbd-proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

// It's highly recommended to use environment variables for sensitive keys
// Create a .env.local file in your project root with:
// CFBD_API_KEY=YOUR_ACTUAL_COLLEGE_FOOTBALL_DATA_API_KEY
const CFBD_API_KEY = process.env.CFBD_API_KEY;

// Alternatively, for immediate testing (NOT recommended for production):
// const CFBD_API_KEY = 'YOUR_CFBD_API_KEY_HERE'; // <-- REPLACE THIS WITH YOUR ACTUAL API KEY

const CFBD_BASE_URL = 'https://api.collegefootballdata.com';

export async function GET(req: NextRequest) {
    if (!CFBD_API_KEY) {
        console.error('CFBD_API_KEY is not set in environment variables.');
        return NextResponse.json({ error: 'Server configuration error: API key missing.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);

    // Get the 'target' parameter, which indicates which CFBD endpoint to hit
    const target = searchParams.get('target');

    if (!target) {
        return NextResponse.json({ error: 'Missing "target" parameter (e.g., target=teams or target=players).' }, { status: 400 });
    }

    // Build the upstream CFBD API URL
    let cfbdEndpoint = '';
    const query = new URLSearchParams();

    // Pass all query parameters from the client request to the CFBD API,
    // except for our internal 'target' parameter.
    searchParams.forEach((value, key) => {
        if (key !== 'target') {
            query.append(key, value);
        }
    });

    switch (target) {
        case 'teams':
            cfbdEndpoint = `${CFBD_BASE_URL}/teams?${query.toString()}`;
            break;
        case 'players':
            cfbdEndpoint = `${CFBD_BASE_URL}/players?${query.toString()}`;
            break;
        // Add more cases here if page.tsx starts requesting other targets
        // For example, if you later add routes for game data or stats:
        // case 'games':
        //     cfbdEndpoint = `${CFBD_BASE_URL}/games?${query.toString()}`;
        //     break;
        default:
            return NextResponse.json({ error: `Invalid target: ${target}` }, { status: 400 });
    }

    console.log(`Proxying request to CFBD: ${cfbdEndpoint}`);

    try {
        const response = await fetch(cfbdEndpoint, {
            headers: {
                'Authorization': `Bearer ${CFBD_API_KEY}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`CFBD API error (${response.status}): ${errorText}`);
            return NextResponse.json(
                { error: `Failed to fetch from CFBD API: ${response.status} ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Network or parsing error fetching from CFBD API:', error);
        return NextResponse.json({ error: 'Internal server error while proxying request.', details: error.message }, { status: 500 });
    }
}

// You might also want to define other HTTP methods if your frontend needs them (e.g., POST, PUT, DELETE)
// For this application, GET is sufficient.