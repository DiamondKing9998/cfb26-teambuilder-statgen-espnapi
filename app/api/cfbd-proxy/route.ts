// src/app/api/cfbd-proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

const CFBD_API_KEY = process.env.CFBD_API_KEY;
const CFBD_BASE_URL = 'https://api.collegefootballdata.com';

export async function GET(request: NextRequest) {
    console.log("Proxy route hit.");
    console.log("Attempting to access CFBD_API_KEY. Length:", CFBD_API_KEY?.length || "undefined");
    console.log("First 5 chars of API_KEY:", CFBD_API_KEY ? CFBD_API_KEY.substring(0, 5) + "..." : "N/A");

    if (!CFBD_API_KEY) {
        console.error("CRITICAL: CFBD_API_KEY is not defined in the Vercel environment!");
        return NextResponse.json({ error: "Server configuration error: API key missing." }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const team = searchParams.get('team');
    const position = searchParams.get('position');
    const search = searchParams.get('search');

    const cfbdQueryParams = new URLSearchParams();
    if (year) cfbdQueryParams.append('year', year);
    if (team) cfbdQueryParams.append('team', team);
    if (position) cfbdQueryParams.append('position', position);
    if (search) cfbdQueryParams.append('search', search);

    if (!year) cfbdQueryParams.append('year', '2024');

    const cfbdApiUrl = `${CFBD_BASE_URL}/players?${cfbdQueryParams.toString()}`;

    try {
        console.log("Proxying request to CFBD URL:", cfbdApiUrl);
        const cfbdResponse = await fetch(cfbdApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CFBD_API_KEY}`,
                'Accept': 'application/json', // Explicitly request JSON
                // --- ADDED: Explicit User-Agent header ---
                'User-Agent': 'YourAppName/1.0 (CFBD API Proxy)' // Or a common browser UA like 'Mozilla/5.0...'
                // You could also try 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                // or just remove it if you want the default Node.js fetch UA.
                // For now, let's try a descriptive one.
                // --- END ADDED ---
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