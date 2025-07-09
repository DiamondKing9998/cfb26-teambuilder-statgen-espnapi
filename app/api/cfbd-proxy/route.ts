// src/app/api/cfbd-teams/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // You'll need to obtain an API key from CollegeFootballData.com
        // and include it in your requests, e.g., in a header or query parameter.
        // For simplicity, API key handling is omitted here but is crucial.
        const CFBD_API_KEY = process.env.CFBD_API_KEY; // Store your API key securely

        // 1. Fetch Group IDs to identify FBS and FCS
        const groupResponse = await fetch('https://api.collegefootballdata.com/groupIds', {
            headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` }
        });
        const groupData = await groupResponse.json();
        const fbsGroupId = groupData.find((group: any) => group.name === 'FBS (I-A)')?.id;
        const fcsGroupId = groupData.find((group: any) => group.name === 'FCS (I-AA)')?.id;

        if (!fbsGroupId || !fcsGroupId) {
            return NextResponse.json({ error: 'Could not find FBS or FCS group IDs' }, { status: 500 });
        }

        // 2. Fetch all teams
        const teamsResponse = await fetch('https://api.collegefootballdata.com/team-ids', {
            headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` }
        });
        const allTeams = await teamsResponse.json();

        // 3. Filter for FBS and FCS teams (assuming team objects contain a groupId)
        // Note: The exact structure of the team object with groupId might vary,
        // you may need to adjust this filtering based on CFBD API documentation details.
        const fbsTeams = allTeams.filter((team: any) => team.groupId === fbsGroupId);
        const fcsTeams = allTeams.filter((team: any) => team.groupId === fcsGroupId);

        return NextResponse.json({
            fbsTeams,
            fcsTeams,
        });

    } catch (error: any) {
        console.error('[CFBD Teams API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch CFBD teams', details: error.message || 'Unknown error' },
            { status: 500 }
        );
    }
}