// src/app/player/[id]/page.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// Interface for a player from CFBD API (and enriched with team colors/logos)
interface CfbdPlayer {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    position: string;
    height: number | null; // Allow null as per CFBD API data
    weight: number | null; // Allow null as per CFBD API data
    jersey: number | null; // Allow null as per CFBD API data
    hometown: string | null; // Allow null as per CFBD API data
    team: string;
    teamColor: string; // Primary team color (e.g., Michigan Blue)
    teamLogo: string;
    teamAlternateColor: string; // Secondary team color (e.g., Michigan Maize)
    teamDarkLogo: string; // A darker logo variation if available
}

// Interface for an assigned ability
interface AssignedAbility {
    name: string;
    tier: string;
    description: string;
}

// Interface for the overall player details state
interface PlayerDetailsState {
    player: CfbdPlayer | null; // Player can be null initially or if not found
    aiOverview: string;
    aiRatings: string[];
    assignedAbilities: AssignedAbility[];
    loading: boolean;
    error: string | null;
}

// *** IMPORTANT: The parseAiResponse function has been REMOVED. ***
// Your /api/ai-overview endpoint is now expected to return structured JSON
// with 'aiOverview', 'aiRatings', and 'assignedAbilities' properties already parsed.
// Attempting to use a client-side parser on the already-parsed AI overview string
// (as was the case with `data.aiOverview` in the previous code) would cause the 'split' error.

export default function PlayerDetailPage() {
    const searchParams = useSearchParams(); // Correctly uses searchParams for query parameters

    const [playerDetails, setPlayerDetails] = useState<PlayerDetailsState>({
        player: null, // Initialize player as null
        aiOverview: 'Generating AI Overview...', // Initial message while AI data loads
        aiRatings: [],
        assignedAbilities: [],
        loading: true,
        error: null,
    });

    // Memoize fetchTeamDetails to prevent unnecessary re-creations and re-fetches
    const fetchTeamDetails = useCallback(async (teamName: string) => {
        try {
            // Using a fixed year for team details for consistent logo/colors
            const teamsProxyUrl = `/api/cfbd-proxy?target=teams&year=2024`;
            const teamsResponse = await fetch(teamsProxyUrl);

            if (teamsResponse.ok) {
                const allTeams = await teamsResponse.json();
                const foundTeam = allTeams.find((team: any) => team.school === teamName);

                if (foundTeam) {
                    return {
                        teamColor: foundTeam.color || '#000000',
                        teamAlternateColor: foundTeam.alt_color || '#FFFFFF',
                        teamLogo: foundTeam.logos && foundTeam.logos.length > 0 ? foundTeam.logos[0] : '',
                        teamDarkLogo: foundTeam.logos && foundTeam.logos.length > 1 ? foundTeam.logos[1] : foundTeam.logos?.[0] || '',
                    };
                }
            }
        } catch (error) {
            console.error("Error fetching team details:", error);
            // Don't rethrow; return fallback colors/logos if fetch fails
        }
        // Fallback colors if team details can't be fetched or team not found
        return {
            teamColor: '#4A5568', // bg-gray-700 fallback
            teamAlternateColor: '#A0AEC0', // bg-gray-400 fallback
            teamLogo: '',
            teamDarkLogo: '',
        };
    }, []); // No dependencies for useCallback as the URL for teamsProxyUrl is static

    useEffect(() => {
        const fetchAllDetails = async () => {
            const playerString = searchParams.get('player');
            const year = searchParams.get('year');

            if (!playerString || !year) {
                setPlayerDetails(prev => ({
                    ...prev,
                    error: 'Player data or year missing from URL. Please go back and select a player from the search results.',
                    loading: false
                }));
                return;
            }

            try {
                // Parse player data from URL query string
                const playerFromUrl: CfbdPlayer = JSON.parse(decodeURIComponent(playerString));

                // Fetch team specific details (colors, logos)
                const teamInfo = await fetchTeamDetails(playerFromUrl.team);

                // Combine player data with fetched team details
                const playerWithTeamDetails: CfbdPlayer = {
                    ...playerFromUrl,
                    teamColor: teamInfo.teamColor,
                    teamAlternateColor: teamInfo.teamAlternateColor,
                    teamLogo: teamInfo.teamLogo,
                    teamDarkLogo: teamInfo.teamDarkLogo,
                };

                // Update state to show loading for AI data specifically
                setPlayerDetails(prev => ({
                    ...prev,
                    player: playerWithTeamDetails,
                    loading: true, // Still loading for AI data
                    error: null,
                    aiOverview: 'Generating AI Overview...', // Show a generating message
                    aiRatings: [],
                    assignedAbilities: []
                }));

                // Fetch AI overview, ratings, and abilities from your backend API
                const response = await fetch('/api/ai-overview', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ player: playerWithTeamDetails, year: parseInt(year) }),
                });

                if (response.ok) {
                    const data = await response.json(); // Data is ALREADY structured JSON

                    // CRITICAL FIX: Directly use properties from the JSON response
                    setPlayerDetails(prev => ({
                        ...prev,
                        aiOverview: data.aiOverview || 'No AI overview available.',
                        aiRatings: data.aiRatings || [],
                        assignedAbilities: data.assignedAbilities || [],
                        loading: false
                    }));
                } else {
                    const errorData = await response.json();
                    setPlayerDetails(prev => ({
                        ...prev,
                        error: `Failed to fetch AI overview: ${errorData.details || errorData.error || response.statusText}`,
                        loading: false
                    }));
                }
            } catch (err: any) {
                console.error("Error fetching player AI overview or details:", err);
                setPlayerDetails(prev => ({
                    ...prev,
                    error: `Error processing player data: ${err.message}. Please try again.`,
                    loading: false
                }));
            }
        };

        fetchAllDetails();
    }, [searchParams, fetchTeamDetails]); // Add fetchTeamDetails to dependencies

    // Destructure for easier access
    const { player, aiOverview, aiRatings, assignedAbilities, loading, error } = playerDetails;

    // Helper function to get tier specific styling (using Tailwind CSS classes)
    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'Bronze': return 'text-amber-500';
            case 'Silver': return 'text-gray-400';
            case 'Gold': return 'text-yellow-500';
            case 'Platinum': return 'text-blue-400';
            case 'X-Factor': return 'text-red-500'; // Commonly used for X-Factor
            default: return 'text-white';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <p className="text-xl">Loading player details and generating AI overview...</p>
                    <div className="mt-4 animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-red-400 p-8">
                <p className="text-xl mb-4 text-center">Error: {error}</p>
                <Link href="/" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300">
                    Go Back to Search
                </Link>
            </div>
        );
    }

    // This case should ideally be caught by `if (error)` if player data is truly missing from URL.
    // However, if player data from URL is invalid/incomplete, it could still be null after parsing.
    if (!player) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-8">
                <p className="text-xl mb-4">No player data available. Please select a player from the search page.</p>
                <Link href="/" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300">
                    Go Back to Search
                </Link>
            </div>
        );
    }

    // Format player height from inches to feet and inches
    const playerHeightFeet = player.height ? Math.floor(player.height / 12) : null;
    const playerHeightInches = player.height ? player.height % 12 : null;
    const formattedHeight = playerHeightFeet !== null && playerHeightInches !== null
        ? `${playerHeightFeet}'${playerHeightInches}"`
        : 'N/A';

    // Get the year from search params for display
    const displayYear = searchParams.get('year') || new Date().getFullYear().toString();

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {/* Player Header Section - Dynamic background and text colors */}
                <div
                    className="relative p-6 sm:p-8 text-center"
                    style={{ backgroundColor: player.teamColor || '#000000' }} // Set background to primary team color
                >
                    <Link href="/" className="absolute top-4 left-4 text-white hover:text-gray-200 transition duration-300 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Player Search
                    </Link>

                    <div className="pt-10 sm:pt-12 pb-4">
                        {player.teamLogo && (
                            <Image
                                src={player.teamLogo}
                                alt={`${player.team} logo`}
                                width={120}
                                height={120}
                                className="mx-auto mb-4 bg-white p-2 rounded-full shadow-md"
                                onError={(e) => {
                                    // Fallback to teamDarkLogo or a generic default if primary logo fails
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null; // Prevents infinite loop if fallback also fails
                                    target.src = player.teamDarkLogo || '/images/default-team-logo.png'; // Path to a default logo if you have one
                                }}
                            />
                        )}
                        <h1
                            className="text-3xl sm:text-4xl font-bold mb-2"
                            style={{ color: player.teamAlternateColor || '#FFFFFF' }} // Set player name to secondary team color
                        >
                            {player.name.toUpperCase()}
                        </h1>
                        <p
                            className="text-lg sm:text-xl"
                            style={{ color: player.teamAlternateColor || '#FFFFFF' }} // Set subtitle to secondary team color
                        >
                            {player.team || 'N/A Team'} | {player.position || 'N/A Pos'} | {displayYear} Season
                        </p>

                        {/* Player Core Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-x-6 gap-y-2 mt-6 text-base sm:text-lg justify-items-center text-white">
                            <p><strong>Jersey:</strong> {player.jersey ? `#${player.jersey}` : 'N/A'}</p>
                            <p><strong>Height:</strong> {formattedHeight}</p>
                            <p><strong>Weight:</strong> {player.weight ? `${player.weight} lbs` : 'N/A'}</p>
                            <p><strong>Hometown:</strong> {player.hometown || 'N/A'}</p>
                            <p><strong>Team:</strong> {player.team || 'N/A'}</p>
                            {/* If you plan to add Grade Level, ensure your data source provides it */}
                            {/* <p><strong>Grade:</strong> [N/A]</p> */}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="p-6 sm:p-8">
                    {/* AI Overview Section */}
                    <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-blue-400">AI Overview for {player.name}</h2>
                    <div className="prose prose-invert max-w-none text-base sm:text-lg leading-relaxed mb-8">
                        {/* Render overview, splitting by newlines for paragraph separation */}
                        {aiOverview.split('\n').map((paragraph, index) => (
                            paragraph.trim() !== '' && <p key={index} className="mb-3">{paragraph.trim()}</p>
                        ))}
                        {aiOverview.trim() === '' && <p className="text-gray-400 italic">No detailed AI overview available for this player.</p>}
                    </div>

                    {/* AI Ratings Section */}
                    {aiRatings.length > 0 ? (
                        <>
                            <h2 className="text-xl sm:text-2xl font-semibold mt-6 mb-4 text-blue-400">EA CFB 26 Hypothetical Ratings</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-base sm:text-lg mb-8">
                                {aiRatings.map((rating, index) => (
                                    // Assuming ratings are already formatted like "Stat: Value"
                                    <p key={index} className="text-gray-300">{rating}</p>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="mt-8 text-gray-400 italic mb-8">No hypothetical ratings available for this player.</p>
                    )}

                    {/* Player Abilities Section */}
                    {assignedAbilities.length > 0 ? (
                        <>
                            <h2 className="text-xl sm:text-2xl font-semibold mt-6 mb-4 text-blue-400">Player Abilities</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {assignedAbilities.map((ability, index) => (
                                    <div key={index} className="bg-gray-700 p-4 rounded-lg shadow-md">
                                        <h3 className={`text-lg font-bold mb-1 ${getTierColor(ability.tier)}`}>
                                            {ability.name} <span className="text-sm font-normal text-gray-300">({ability.tier})</span>
                                        </h3>
                                        <p className="text-gray-300 text-sm">{ability.description}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="mt-8 text-gray-400 italic mb-8">No special abilities assigned to this player.</p>
                    )}

                    {/* Back to Search Button at the bottom */}
                    <div className="mt-8 text-center">
                        <Link
                            href="/"
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300"
                        >
                            Back to Player Search
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}