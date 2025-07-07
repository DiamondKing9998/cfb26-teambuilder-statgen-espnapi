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
    height: number;
    weight: number;
    jersey: number;
    hometown: string;
    team: string;
    teamColor: string;
    teamLogo: string;
    teamAlternateColor: string;
    teamDarkLogo: string;
}

// NEW: Interface for an assigned ability
interface AssignedAbility {
    name: string;
    tier: string;
    description: string;
}

interface PlayerDetails {
    player: CfbdPlayer;
    aiOverview: string;
    aiRatings: string[];
    // NEW: Add assignedAbilities to PlayerDetails interface
    assignedAbilities: AssignedAbility[];
    loading: boolean;
    error: string | null;
}

// The parseAiResponse on the client side is mostly for fallback or if we want to re-parse.
// In this setup, the server-side API already parses and sends structured data.
// So, this client-side parser can be simplified or even removed if you trust the API's structure.
// However, keeping it for robustness is fine, it just won't be used for `assignedAbilities` directly.
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

    return { overview, ratings };
};


export default function PlayerDetailPage() {
    const searchParams = useSearchParams();

    const [playerDetails, setPlayerDetails] = useState<PlayerDetails>({
        player: {
            id: '', firstName: '', lastName: '', name: '', position: '',
            height: 0, weight: 0, jersey: 0, hometown: '', team: '',
            teamColor: '', teamLogo: '', teamAlternateColor: '', teamDarkLogo: ''
        },
        aiOverview: 'Loading AI Overview...',
        aiRatings: [],
        // NEW: Initialize assignedAbilities
        assignedAbilities: [],
        loading: true,
        error: null,
    });

    const fetchTeamDetails = async (teamName: string) => {
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
                setPlayerDetails(prev => ({ ...prev, error: 'Player data or year missing. Please go back and select a player from the search results.', loading: false }));
                return;
            }

            try {
                const playerFromUrl: CfbdPlayer = JSON.parse(decodeURIComponent(playerString));
                const teamInfo = await fetchTeamDetails(playerFromUrl.team);

                const playerWithTeamDetails = {
                    ...playerFromUrl,
                    teamColor: teamInfo.teamColor,
                    teamAlternateColor: teamInfo.teamAlternateColor,
                    teamLogo: teamInfo.teamLogo,
                    teamDarkLogo: teamInfo.teamDarkLogo,
                };

                setPlayerDetails(prev => ({ ...prev, player: playerWithTeamDetails, loading: true, error: null }));

                // Pointing to the new App Router API route
                const response = await fetch('/api/ai-overview', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ player: playerWithTeamDetails, year: parseInt(year) }),
                });

                if (response.ok) {
                    const data = await response.json();
                    // NEW: Destructure assignedAbilities from the response data
                    const { overview, ratings, assignedAbilities } = data;
                    setPlayerDetails(prev => ({ ...prev, aiOverview: overview, aiRatings: ratings, assignedAbilities: assignedAbilities || [], loading: false }));
                } else {
                    const errorData = await response.json();
                    setPlayerDetails(prev => ({ ...prev, error: `Failed to fetch AI overview: ${errorData.details || response.statusText}`, loading: false }));
                }
            } catch (err: any) {
                console.error("Error fetching player AI overview:", err);
                setPlayerDetails(prev => ({ ...prev, error: `Error processing player data: ${err.message}. Please try again.`, loading: false }));
            }
        };

        fetchAllDetails();
    }, [searchParams]);

    // NEW: Destructure assignedAbilities from playerDetails
    const { player, aiOverview, aiRatings, assignedAbilities, loading, error } = playerDetails;

    // Helper function to get tier specific styling
    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'Bronze': return 'text-amber-500'; // Or a custom bronze color
            case 'Silver': return 'text-gray-400';
            case 'Gold': return 'text-yellow-500';
            case 'Platinum': return 'text-blue-400';
            case 'X-Factor': return 'text-red-500'; // Or a vibrant unique color
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

    // These colors are used for the banner background as per your preference
    const primaryColor = player.teamColor || '#00274c';
    const alternateColor = player.teamAlternateColor || '#ffcb05';

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="relative p-6 sm:p-8" style={{ background: `radial-gradient(circle at center, #E5E7EB, #111827)` }}>
                    <div className="text-center pt-10 sm:pt-12 pb-4">
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
                        <p className="text-lg sm:text-xl">{player.team} | {player.position} | {searchParams.get('year')}</p>
                    </div>
                </div>

                <div className="p-6 sm:p-8">
                    <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-blue-400">Player Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-8 text-base sm:text-lg">
                        <p><strong>Position:</strong> {player.position || 'N/A'}</p>
                        <p><strong>Jersey:</strong> {player.jersey ? `#${player.jersey}` : 'N/A'}</p>
                        <p><strong>Height:</strong> {player.height ? `${Math.floor(player.height / 12)}'${player.height % 12}"` : 'N/A'}</p>
                        <p><strong>Weight:</strong> {player.weight ? `${player.weight} lbs` : 'N/A'}</p>
                        <p><strong>Hometown:</strong> {player.hometown || 'N/A'}</p>
                        <p><strong>Team:</strong> {player.team || 'N/A'}</p>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-semibold mt-6 mb-4 text-blue-400">AI Overview</h2>
                    <div className="prose prose-invert max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
                        {aiOverview.split('\n').map((paragraph, index) => (
                            paragraph.trim() !== '' && <p key={index} className="mb-3">{paragraph.trim()}</p>
                        ))}
                        {aiOverview.trim() === '' && <p className="text-gray-400 italic">No detailed AI overview available for this player.</p>}
                    </div>

                    {aiRatings.length > 0 && (
                        <>
                            <h2 className="text-xl sm:text-2xl font-semibold mt-8 mb-4 text-blue-400">EA CFB 26 Hypothetical Ratings</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-base sm:text-lg">
                                {aiRatings.map((rating, index) => (
                                    <p key={index} className="text-gray-300">{rating}</p>
                                ))}
                            </div>
                        </>
                    )}
                    {aiRatings.length === 0 && !loading && (
                        <p className="mt-8 text-gray-400 italic">No hypothetical ratings available for this player.</p>
                    )}

                    {/* NEW SECTION: Player Abilities */}
                    {assignedAbilities.length > 0 && (
                        <>
                            <h2 className="text-xl sm:text-2xl font-semibold mt-8 mb-4 text-blue-400">Player Abilities</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {assignedAbilities.map((ability, index) => (
                                    <div key={index} className="bg-gray-700 p-4 rounded-lg shadow-md">
                                        <h3 className={`text-lg font-bold mb-1 ${getTierColor(ability.tier)}`}>
                                            {ability.name} <span className="text-sm font-normal">({ability.tier})</span>
                                        </h3>
                                        <p className="text-gray-300 text-sm">{ability.description}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {assignedAbilities.length === 0 && !loading && (
                        <p className="mt-8 text-gray-400 italic">No special abilities assigned to this player.</p>
                    )}

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