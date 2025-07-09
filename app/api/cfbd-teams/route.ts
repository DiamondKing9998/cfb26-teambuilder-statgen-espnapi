// src/app/api/cfbd-teams/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const CFBD_API_KEY = process.env.CFBD_API_KEY; // Ensure your API key is securely stored

        if (!CFBD_API_KEY) {
            return NextResponse.json({ error: 'CFBD API Key is not configured.' }, { status: 500 });
        }

        const headers = { 'Authorization': `Bearer ${CFBD_API_KEY}` };

        // 1. Fetch FBS teams using the dedicated endpoint
        const fbsResponse = await fetch('https://api.collegefootballdata.com/teams/fbs', { headers });
        if (!fbsResponse.ok) {
            console.error(`CFBD FBS Teams API Error: ${fbsResponse.status} ${fbsResponse.statusText}`);
            return NextResponse.json(
                { error: 'Failed to fetch FBS teams from CFBD API', details: `Status: ${fbsResponse.status}` },
                { status: fbsResponse.status }
            );
        }
        const fbsTeams = await fbsResponse.json();

        // 2. Fetch ALL teams to filter for FCS
        const allTeamsResponse = await fetch('https://api.collegefootballdata.com/teams', { headers });
        if (!allTeamsResponse.ok) {
            console.error(`CFBD All Teams API Error: ${allTeamsResponse.status} ${allTeamsResponse.statusText}`);
            return NextResponse.json(
                { error: 'Failed to fetch all teams from CFBD API', details: `Status: ${allTeamsResponse.status}` },
                { status: allTeamsResponse.status }
            );
        }
        const allTeams = await allTeamsResponse.json();

        // 3. Filter for FCS teams based on the 'classification' field
        // This is updated as per your clarification.
        // The 'classification' field typically contains 'fbs', 'fcs', 'naia', etc.
        // We'll filter explicitly for 'fcs' (case-insensitive for robustness)
        // and ensure the field exists to avoid issues with 'N/A' or missing classifications.
        const fcsTeams = allTeams.filter((team: any) =>
            team.classification && team.classification.toLowerCase() === 'fcs'
        );

        return NextResponse.json({
            fbsTeams,
            fcsTeams,
        });

    } catch (error: any) {
        console.error('[CFBD Teams API] Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message || 'Unknown error' },
            { status: 500 }
        );
    }
}