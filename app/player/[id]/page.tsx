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

// Interface for a nested rating stat (e.g., Speed: 85)
interface NestedRatingStat {
    name: string;
    value: any; // Can be number or string
}

// Interface for the overall player details state
interface PlayerDetailsState {
    player: CfbdPlayer | null; // Player can be null initially or if not found
    aiOverview: string;
    // Updated to explicitly handle the nested array of objects for ratings
    aiRatings: string[] | { category: string; stats: NestedRatingStat[] }[] | { name: string; value: NestedRatingStat[] }[];
    assignedAbilities: AssignedAbility[];
    loading: boolean;
    error: string | null;
    // New fields from AI overview
    playerClass: string;
    redshirted: string;
    highSchoolRating: string;
    archetype: string;
    dealbreaker: string;
}

export default function PlayerDetailPage() {
    const searchParams = useSearchParams();

    const [playerDetails, setPlayerDetails] = useState<PlayerDetailsState>({
        player: null,
        aiOverview: 'Generating AI Overview...',
        aiRatings: [],
        assignedAbilities: [],
        loading: true,
        error: null,
        // Initialize new fields
        playerClass: 'N/A',
        redshirted: 'N/A',
        highSchoolRating: 'N/A',
        archetype: 'N/A',
        dealbreaker: 'N/A',
    });

    const fetchTeamDetails = useCallback(async (teamName: string) => {
        try {
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
        }
        return {
            teamColor: '#4A5568',
            teamAlternateColor: '#A0AEC0',
            teamLogo: '',
            teamDarkLogo: '',
        };
    }, []);

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
                const playerFromUrl: CfbdPlayer = JSON.parse(decodeURIComponent(playerString));
                const teamInfo = await fetchTeamDetails(playerFromUrl.team);

                const playerWithTeamDetails: CfbdPlayer = {
                    ...playerFromUrl,
                    teamColor: teamInfo.teamColor,
                    teamAlternateColor: teamInfo.teamAlternateColor,
                    teamLogo: teamInfo.teamLogo,
                    teamDarkLogo: teamInfo.teamDarkLogo,
                };

                setPlayerDetails(prev => ({
                    ...prev,
                    player: playerWithTeamDetails,
                    loading: true,
                    error: null,
                    aiOverview: 'Generating AI Overview...',
                    aiRatings: [],
                    assignedAbilities: [],
                    // Reset new fields
                    playerClass: 'N/A',
                    redshirted: 'N/A',
                    highSchoolRating: 'N/A',
                    archetype: 'N/A',
                    dealbreaker: 'N/A',
                }));

                const response = await fetch('/api/ai-overview', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ player: playerWithTeamDetails, year: parseInt(year) }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setPlayerDetails(prev => ({
                        ...prev,
                        aiOverview: data.aiOverview || 'No AI overview available.',
                        aiRatings: data.aiRatings || [],
                        assignedAbilities: data.assignedAbilities || [],
                        // Set new fields from API response
                        playerClass: data.playerClass || 'N/A',
                        redshirted: data.redshirted || 'N/A',
                        highSchoolRating: data.highSchoolRating || 'N/A',
                        archetype: data.archetype || 'N/A',
                        dealbreaker: data.dealbreaker || 'N/A',
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
    }, [searchParams, fetchTeamDetails]);

    const { player, aiOverview, aiRatings, assignedAbilities, loading, error, playerClass, redshirted, highSchoolRating, archetype, dealbreaker } = playerDetails;

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'Bronze': return 'text-amber-500';
            case 'Silver': return 'text-gray-400';
            case 'Gold': return 'text-yellow-500';
            case 'Platinum': return 'text-blue-400';
            case 'X-Factor': return 'text-red-500';
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

    const playerHeightFeet = player.height ? Math.floor(player.height / 12) : null;
    const playerHeightInches = player.height ? player.height % 12 : null;
    const formattedHeight = playerHeightFeet !== null && playerHeightInches !== null
        ? `${playerHeightFeet}'${playerHeightInches}"`
        : 'N/A';

    const displayYear = searchParams.get('year') || new Date().getFullYear().toString();

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {/* Player Header Section */}
                <div
                    className="relative p-6 sm:p-8 text-center"
                    style={{ backgroundColor: player.teamColor || '#000000' }}
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
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = player.teamDarkLogo || '/images/default-team-logo.png';
                                }}
                            />
                        )}
                        <h1
                            className="text-3xl sm:text-4xl font-bold mb-2"
                            style={{ color: player.teamAlternateColor || '#FFFFFF' }}
                        >
                            {player.name.toUpperCase()}
                        </h1>
                        <p
                            className="text-lg sm:text-xl"
                            style={{ color: player.teamAlternateColor || '#FFFFFF' }}
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
                            {/* New Player Details */}
                            <p><strong>Class:</strong> {playerClass}</p>
                            <p><strong>Redshirted:</strong> {redshirted}</p>
                            <p><strong>High School Rating:</strong> {highSchoolRating}</p>
                            <p><strong>Archetype:</strong> {archetype}</p>
                            <p><strong>Dealbreaker:</strong> {dealbreaker}</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="p-6 sm:p-8">
                    {/* AI Overview Section */}
                    <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-blue-400">AI Overview for {player.name}</h2>
                    <div className="prose prose-invert max-w-none text-base sm:text-lg leading-relaxed mb-8">
                        {aiOverview.split('\n').map((paragraph, index) => (
                            paragraph.trim() !== '' && <p key={index} className="mb-3">{paragraph.trim()}</p>
                        ))}
                        {aiOverview.trim() === '' && <p className="text-gray-400 italic">No detailed AI overview available for this player.</p>}
                    </div>

                    {/* AI Ratings Section - Updated for nested objects */}
                    {aiRatings.length > 0 ? (
                        <>
                            <h2 className="text-xl sm:text-2xl font-semibold mt-6 mb-4 text-blue-400">EA CFB 26 Hypothetical Ratings</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-base sm:text-lg mb-8">
                                {aiRatings.map((rating: any, index) => {
                                    let categoryTitle = '';
                                    let statsToDisplay: NestedRatingStat[] = [];

                                    // Determine the category title and extract the stats array
                                    if (typeof rating === 'object' && rating !== null) {
                                        if ('category' in rating && Array.isArray(rating.stats)) {
                                            categoryTitle = String(rating.category || 'N/A');
                                            statsToDisplay = rating.stats;
                                        } else if ('name' in rating && Array.isArray(rating.value)) {
                                            categoryTitle = String(rating.name || 'N/A');
                                            statsToDisplay = rating.value;
                                        } else {
                                            console.warn('Unexpected top-level object structure in aiRatings, skipping:', rating);
                                            return null; // Skip malformed top-level objects
                                        }
                                    } else if (typeof rating === 'string') {
                                        // Handle plain string ratings if they still exist, though unlikely with current data
                                        return (
                                            <p key={index} className="text-gray-300">{rating}</p>
                                        );
                                    } else {
                                        console.warn('Unexpected data type in aiRatings, skipping:', rating);
                                        return null; // Skip other unexpected types
                                    }

                                    // Render the category title and then the nested stats
                                    return (
                                        <div key={index} className="mb-4">
                                            <p className="text-gray-300">
                                                <strong>{categoryTitle}:</strong>
                                            </p>
                                            <ul className="list-disc list-inside ml-4 text-gray-400 text-sm">
                                                {statsToDisplay.length > 0 ? (
                                                    statsToDisplay.map((stat, statIndex) => (
                                                        <li key={statIndex}>
                                                            {String(stat.name || 'N/A')}: {String(stat.value || 'N/A')}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li>No detailed stats available.</li>
                                                )}
                                            </ul>
                                        </div>
                                    );
                                })}
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