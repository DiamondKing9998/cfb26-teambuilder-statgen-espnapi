// src/app/player/[id]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

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
    teamColor: string;
    teamLogo: string;
    teamAlternateColor: string;
    teamDarkLogo: string;
}

// Interface for an assigned ability
interface AssignedAbility {
    name: string;
    tier: string;
    description: string;
}

interface PlayerDetails {
    player: CfbdPlayer;
    aiOverview: string;
    aiRatings: string[];
    assignedAbilities: AssignedAbility[];
    loading: boolean;
    error: string | null;
}

// The parseAiResponse on the client side is mostly for fallback or if we want to re-parse.
// In this setup, the server-side API already parses and sends structured data.
// This function might not be strictly necessary if your /api/ai-overview always returns structured JSON.
// Keeping it for robustness if there are cases where raw text might be received.
const parseAiResponse = (fullText: string) => {
    const overviewSection = fullText.split('## OVERVIEW ##')[1]?.split('## RATINGS ##')[0]?.trim();
    const ratingsSection = fullText.split('## RATINGS ##')[1]?.split('## ASSESSMENT ##')[0]?.trim();

    let overview = "Overview not available.";
    const ratings: string[] = [];

    if (overviewSection) {
        overview = overviewSection.replace(/\[Generate 2-3 paragraphs for the player overview here\.\s*.*?\]/s, '', ).trim();
    }

    if (ratingsSection) {
        const ratingLines = ratingsSection.split('\n');
        let inRatingsList = false;
        for (const line of ratingLines) {
            if (line.includes('EA CFB 26 Hypothetical Ratings:')) {
                inRatingsList = true;
                continue;
            }
            if (inRatingsList && line.trim().startsWith('-')) {
                ratings.push(line.trim());
            } else if (inRatingsList && line.trim() === '') {
                continue;
            } else if (inRatingsList && !line.trim().startsWith('-') && line.trim() !== '') {
                break;
            }
        }
    }

    // Note: assignedAbilities are expected to come directly as structured JSON from the API,
    // so this client-side parser doesn't handle them.
    return { overview, ratings };
};


export default function PlayerDetailPage() {
    const searchParams = useSearchParams();

    // Initialize with default values. Some player fields can be null from CFBD.
    const [playerDetails, setPlayerDetails] = useState<PlayerDetails>({
        player: {
            id: '', firstName: '', lastName: '', name: '', position: '',
            height: null, weight: null, jersey: null, hometown: null, team: '',
            teamColor: '', teamLogo: '', teamAlternateColor: '', teamDarkLogo: ''
        },
        aiOverview: 'Loading AI Overview...',
        aiRatings: [],
        assignedAbilities: [],
        loading: true,
        error: null,
    });

    const fetchTeamDetails = async (teamName: string) => {
        try {
            const teamsProxyUrl = `/api/cfbd-proxy?target=teams&year=2024`; // Assuming year 2024 for team data
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
            teamColor: '#4A5568', // bg-gray-700 fallback
            teamAlternateColor: '#A0AEC0', // bg-gray-400 fallback
            teamLogo: '',
            teamDarkLogo: '',
        };
    };

    useEffect(() => {
        const fetchAllDetails = async () => {
            const playerString = searchParams.get('player');
            const year = searchParams.get('year');

            if (!playerString || !year) {
                setPlayerDetails(prev => ({
                    ...prev,
                    error: 'Player data or year missing. Please go back and select a player from the search results.',
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

                // Set initial player data and indicate loading for AI content
                setPlayerDetails(prev => ({
                    ...prev,
                    player: playerWithTeamDetails,
                    loading: true,
                    error: null,
                    aiOverview: 'Loading AI Overview...', // Reset message
                    aiRatings: [], // Clear previous ratings
                    assignedAbilities: [] // Clear previous abilities
                }));

                // Fetch AI overview, ratings, and abilities from your new API route
                const response = await fetch('/api/ai-overview', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ player: playerWithTeamDetails, year: parseInt(year) }),
                });

                if (response.ok) {
                    const data = await response.json();
                    // Assuming the API now returns structured `overview`, `ratings`, and `assignedAbilities`
                    const { overview, ratings, assignedAbilities } = data;

                    setPlayerDetails(prev => ({
                        ...prev,
                        aiOverview: overview,
                        aiRatings: ratings,
                        assignedAbilities: assignedAbilities || [], // Ensure it's an array
                        loading: false
                    }));
                } else {
                    const errorData = await response.json();
                    setPlayerDetails(prev => ({
                        ...prev,
                        error: `Failed to fetch AI overview: ${errorData.details || response.statusText}`,
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
    }, [searchParams]);

    // Destructure for easier access
    const { player, aiOverview, aiRatings, assignedAbilities, loading, error } = playerDetails;

    // Helper function to get tier specific styling (using Tailwind CSS classes)
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
                    <p className="text-xl">Loading player AI overview...</p>
                    <div className="mt-4 animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-red-400 p-8">
                <p className="text-xl mb-4">Error: {error}</p>
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

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {/* Player Header Section - Updated to include core stats */}
                <div className="relative p-6 sm:p-8 text-center" style={{ background: `radial-gradient(circle at center, #E5E7EB, #111827)` }}>
                    <Link href="/" className="absolute top-4 left-4 text-blue-300 hover:text-blue-500 transition duration-300 flex items-center gap-2">
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
                            />
                        )}
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{player.name.toUpperCase()}</h1>
                        <p className="text-lg sm:text-xl text-gray-300">
                            {player.team || 'N/A Team'} | {player.position || 'N/A Pos'} | {searchParams.get('year') || 'N/A Season'}
                        </p>

                        {/* Player Core Stats - Now within the header */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-x-6 gap-y-2 mt-6 text-base sm:text-lg justify-items-center">
                            <p><strong>Jersey:</strong> {player.jersey ? `#${player.jersey}` : 'N/A'}</p>
                            <p><strong>Height:</strong> {formattedHeight}</p>
                            <p><strong>Weight:</strong> {player.weight ? `${player.weight} lbs` : 'N/A'}</p>
                            <p><strong>Hometown:</strong> {player.hometown || 'N/A'}</p>
                            <p><strong>Team:</strong> {player.team || 'N/A'}</p>
                            {/* Grade Level: Not directly available from current API data */}
                            {/* <p><strong>Grade:</strong> [N/A]</p> */}
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

                    {/* AI Ratings Section */}
                    {aiRatings.length > 0 && (
                        <>
                            <h2 className="text-xl sm:text-2xl font-semibold mt-6 mb-4 text-blue-400">EA CFB 26 Hypothetical Ratings</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-base sm:text-lg mb-8">
                                {aiRatings.map((rating, index) => (
                                    <p key={index} className="text-gray-300">{rating}</p>
                                ))}
                            </div>
                        </>
                    )}
                    {aiRatings.length === 0 && !loading && (
                        <p className="mt-8 text-gray-400 italic mb-8">No hypothetical ratings available for this player.</p>
                    )}

                    {/* Player Abilities Section */}
                    {assignedAbilities.length > 0 && (
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
                    )}
                    {assignedAbilities.length === 0 && !loading && (
                        <p className="mt-8 text-gray-400 italic mb-8">No special abilities assigned to this player.</p>
                    )}

                    {/* Back to Search Button at the bottom */}
                    <div className="mt-8 text-center">
                        <Link
                            href="/"
                            className="px-6 py-3 bg-blue-600 !text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300"
                        >
                            Back to Player Search
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}