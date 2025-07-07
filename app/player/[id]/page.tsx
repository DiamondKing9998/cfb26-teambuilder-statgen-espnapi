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

interface PlayerDetails {
    player: CfbdPlayer;
    aiOverview: string;
    aiRatings: string[];
    loading: boolean;
    error: string | null;
}

const parseAiResponse = (fullText: string) => {
    const overviewSection = fullText.split('## OVERVIEW ##')[1]?.split('## RATINGS ##')[0]?.trim();
    const ratingsSection = fullText.split('## RATINGS ##')[1]?.trim();

    let overview = "Overview not available.";
    const ratings: string[] = [];

    if (overviewSection) {
        overview = overviewSection.replace(/\[Generate 2-3 paragraphs for the player overview here\. If detailed statistics were not provided\s*.*?\]/s, '').trim();
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

                const response = await fetch('/api/ai-overview', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ player: playerWithTeamDetails, year: parseInt(year) }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.overview) {
                        const { overview, ratings } = parseAiResponse(data.overview);
                        setPlayerDetails(prev => ({ ...prev, aiOverview: overview, aiRatings: ratings, loading: false }));
                    } else {
                        setPlayerDetails(prev => ({ ...prev, aiOverview: 'AI Overview not generated for this player.', aiRatings: [], loading: false }));
                    }
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

    const { player, aiOverview, aiRatings, loading, error } = playerDetails;

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

    const primaryColor = player.teamColor || '#00274c';
    const alternateColor = player.teamAlternateColor || '#ffcb05';

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="relative p-6 sm:p-8" style={{ background: `linear-gradient(to right, ${primaryColor}, ${alternateColor})` }}>
                    <Link href="/" className="absolute top-4 left-4 text-white hover:underline flex items-center text-sm sm:text-base">
                        <svg className="w-4 h-4 mr-1 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to Player Search
                    </Link>
                    <div className="text-center pt-10 sm:pt-12 pb-4">
                        {/* console.log removed, but you can add it back for debugging logo URL if needed */}
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
                    {/* UPDATED: Removed max-w-none, added max-w-2xl and mx-auto */}
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