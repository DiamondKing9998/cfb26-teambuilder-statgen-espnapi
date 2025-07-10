// src/app/api/main-api/route.ts

import { NextRequest, NextResponse } from 'next/server'; // Add this line

// ... rest of your file
// ... (imports and existing code)

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');
    const year = searchParams.get('year');
    const team = searchParams.get('team');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit'); // <-- ADDED THIS LINE

    try {
        let data;
        if (target === 'players') {
            // Construct ESPN API URL
            let espnApiUrl = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/roster?group=50`; // Base URL with default group size
            
            if (year) {
                espnApiUrl += `&season=${year}`;
            }
            if (team) {
                // You'd need a way to map 'team' name back to ESPN team ID or slug
                // For simplicity, let's assume your existing team mapping handles this.
                // Or if 'team' is already the slug, append directly.
                // This is a placeholder, actual implementation depends on your ESPN team ID mapping.
                espnApiUrl += `&team=${team}`; // Assuming 'team' parameter is the slug/ID ESPN expects
            }
            if (search) {
                // ESPN's roster API doesn't have a direct 'search by player name'
                // You'd typically fetch the whole roster and filter client-side,
                // or fetch individual player details if you have player IDs.
                // For now, this proxy will fetch the roster and then filter *here*.
            }
            
            // Apply the limit here, either to the API call directly if supported,
            // or by slicing the results from ESPN.
            // ESPN roster API doesn't have a direct 'limit' or 'per_page' like CFBD.
            // You will need to fetch the full roster and then slice it here.

            const espnResponse = await fetch(espnApiUrl);
            if (!espnResponse.ok) {
                throw new Error(`Failed to fetch ESPN roster: ${espnResponse.statusText}`);
            }
            const espnData = await espnResponse.json();

            let players = espnData.athletes || []; // Assuming 'athletes' is the array of players

            // Filter by search name (if present)
            if (search) {
                const searchLower = search.toLowerCase();
                players = players.filter((player: any) => 
                    player.displayName?.toLowerCase().includes(searchLower) ||
                    player.firstName?.toLowerCase().includes(searchLower) ||
                    player.lastName?.toLowerCase().includes(searchLower)
                );
            }

            // Apply the limit
            if (limit) {
                const parsedLimit = parseInt(limit, 10);
                if (!isNaN(parsedLimit) && parsedLimit > 0) {
                    players = players.slice(0, parsedLimit); // <-- Slicing results here
                }
            }

            // Transform ESPN player data to CfbdPlayer interface
            data = players.map((player: any) => ({
                id: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
                fullName: player.displayName, // ESPN usually has a displayName
                position: { displayName: player.position?.displayName || 'N/A' },
                jersey: player.jersey || 'N/A',
                team: { 
                    displayName: player.team?.displayName || 'N/A', 
                    slug: player.team?.slug || 'N/A' 
                },
                weight: null, // ESPN roster doesn't usually have these directly
                height: null,
                hometown: null,
                teamColor: null,
                teamColorSecondary: null,
            }));

        } else if (target === 'teams') {
            // ... (existing teams fetch logic, no limit needed here)
        }
        // ... (other targets)

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('API proxy error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}