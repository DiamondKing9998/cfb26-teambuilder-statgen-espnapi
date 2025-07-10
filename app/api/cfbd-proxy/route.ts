// src/app/api/cfbd-teams/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const CFBD_API_KEY = process.env.CFBD_API_KEY; // Ensure your API key is securely stored

        if (!CFBD_API_KEY) {
            return NextResponse.json({ error: 'CFBD API Key is not configured.' }, { status: 500 });
        }

        const headers = { 'Authorization': `Bearer ${CFBD_API_KEY}` };

        // Use only the /teams endpoint as per your instruction
        const allTeamsResponse = await fetch('https://api.collegefootballdata.com/teams', { headers });

        if (!allTeamsResponse.ok) {
            console.error(`CFBD All Teams API Error: ${allTeamsResponse.status} ${allTeamsResponse.statusText}`);
            return NextResponse.json(
                { error: 'Failed to fetch all teams from CFBD API', details: `Status: ${allTeamsResponse.status}` },
                { status: allTeamsResponse.status }
            );
        }

        const allTeams = await allTeamsResponse.json();
        console.log('[CFBD API] Raw All Teams Response (for FBS/FCS filtering):', allTeams); // For debugging

        const fbsTeams: any[] = [];
        const fcsTeams: any[] = [];

        // Filter based on the 'classification' tag
        allTeams.forEach((team: any) => {
            if (team.classification) {
                const lowerCaseClassification = team.classification.toLowerCase();
                if (lowerCaseClassification === 'fbs') {
                    fbsTeams.push(team);
                } else if (lowerCaseClassification === 'fcs') {
                    fcsTeams.push(team);
                }
            }
        });

        console.log('[CFBD API] Filtered FBS Teams:', fbsTeams); // For debugging
        console.log('[CFBD API] Filtered FCS Teams:', fcsTeams); // For debugging


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