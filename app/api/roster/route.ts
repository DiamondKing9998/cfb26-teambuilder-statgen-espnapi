// app/api/roster/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch'; // Required for Node.js versions without native fetch.
                               // Modern Next.js environments often have fetch built-in,
                               // so you might not explicitly need to import it.

// Define an interface for the player data
interface Player {
    id: number;
    first_name: string;
    last_name: string;
    team: string;
    position: string;
    jersey?: number;
    height?: number;
    weight?: number;
    home_city?: string;
    home_state?: string;
    home_country?: string;
    // Add other fields you expect from the API response
}

/**
 * Fetches the roster from CollegeFootballData.com.
 * This function now specifically handles the external API call.
 */
async function fetchRosterFromCFBD(teamName: string, year: number): Promise<Player[]> {
    // API key is accessed directly from environment variables in Next.js API routes
    const apiKey = process.env.CFBD_API_KEY; 

    if (!apiKey) {
        // In a production environment, you might log this error without exposing it to the client
        console.error('CFBD_API_KEY environment variable is not set.');
        throw new Error('Server configuration error: API key missing.');
    }

    const url = `https://api.collegefootballdata.com/roster?team=${encodeURIComponent(teamName)}&year=${year}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`CFBD API error! Status: ${response.status} - ${response.statusText}. Details: ${errorText}`);
        throw new Error(`Failed to fetch from external API: ${response.status} ${response.statusText}`);
    }

    const data: Player[] = await response.json();
    return data;
}

// Next.js API Route handler for GET requests
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const teamName = searchParams.get('team');
    const yearString = searchParams.get('year');

    if (!teamName || !yearString) {
        return NextResponse.json(
            { error: 'Missing required query parameters: team and year.' },
            { status: 400 }
        );
    }

    const year = parseInt(yearString);
    if (isNaN(year)) {
        return NextResponse.json(
            { error: 'Year must be a valid number.' },
            { status: 400 }
        );
    }

    try {
        const roster = await fetchRosterFromCFBD(teamName, year);
        return NextResponse.json(roster); // Return the roster data
    } catch (error: any) {
        console.error(`Error in /api/roster: ${error.message}`);
        // Do not expose sensitive error details in production
        return NextResponse.json(
            { error: 'Failed to retrieve roster data', details: error.message },
            { status: 500 }
        );
    }
}