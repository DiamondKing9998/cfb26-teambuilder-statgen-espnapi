'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
    teamColor: string; // This would typically be from the /teams endpoint. We'll use a placeholder if not available.
    teamLogo: string; // This would typically be from the /teams endpoint.
    teamAlternateColor: string; // Also from /teams.
    teamDarkLogo: string; // Also from /teams.
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
        overview = overviewSection.replace(/\[Generate 2-3 paragraphs for the player overview here\. If detailed statistics were not provided.*?\]/s, '').trim();
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
            } else if (inRatingsList && !line.trim().startsWith('-')) {
                break;
            }
        }
    }

    return { overview, ratings };
};


export default function PlayerDetailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

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

    // Function to fetch team colors and logos
    const fetchTeamDetails = async (teamName: string) => {
        try {
            const teamsProxyUrl = `/api/cfbd-proxy?target=teams&year=2024`; // Using current year for teams
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
        return { // Default colors if fetch fails or team not found
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
                setPlayerDetails(prev => ({ ...prev, error: 'Player data or year missing.', loading: false }));
                return;
            }

            try {
                const playerFromUrl: CfbdPlayer = JSON.parse(decodeURIComponent(playerString));
                
                // Fetch team details (colors/logos)
                const teamInfo = await fetchTeamDetails(playerFromUrl.team);

                // Merge team info into player data
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
                        setPlayerDetails(prev => ({ ...prev, aiOverview: 'AI Overview not generated.', aiRatings: [], loading: false }));
                    }
                } else {
                    const errorData = await response.json();
                    setPlayerDetails(prev => ({ ...prev, error: `Failed to fetch AI overview: ${errorData.details || response.statusText}`, loading: false }));
                }
            } catch (err: any) {
                console.error("Error fetching player AI overview:", err);
                setPlayerDetails(prev => ({ ...prev, error: `Error processing player data: ${err.message}`, loading: false }));
            }
        };

        fetchAllDetails();
    }, [searchParams]);

    const { player, aiOverview, aiRatings, loading, error } = playerDetails;

    if (loading) {
        return <div className="p-8 text-center text-xl text-white">Loading player AI overview...</div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                <p>Error: {error}</p>
                {/* Changed Link href to just '/' */}
                <Link href="/" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
                    Go Back to Search
                </Link>
            </div>
        );
    }

    const primaryColor = player.teamColor || '#000000';
    const alternateColor = player.teamAlternateColor || '#FFFFFF';

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="relative p-6" style={{ background: `linear-gradient(to right, ${primaryColor}, ${alternateColor})` }}>
                    {/* Changed Link href to just '/' */}
                    <Link href="/" className="absolute top-4 left-4 text-white hover:underline flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to Player Search
                    </Link>
                    <div className="text-center mt-8">
                        {player.teamLogo && (
                            <Image
                                src={player.teamLogo}
                                alt={`${player.team} logo`}
                                width={100}
                                height={100}
                                className="mx-auto mb-4 bg-white p-2 rounded-full" // Added bg for better logo visibility
                            />
                        )}
                        <h1 className="text-4xl font-bold mb-2">{player.name.toUpperCase()}</h1>
                        <p className="text-xl">{player.team} | {player.position} | {searchParams.get('year')}</p>
                    </div>
                </div>

                <div className="p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-blue-400">Player Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-lg"> {/* Increased text size */}
                        <p><strong>Position:</strong> {player.position || 'N/A'}</p>
                        <p><strong>Jersey:</strong> {player.jersey || 'N/A'}</p>
                        <p><strong>Height:</strong> {player.height ? `${Math.floor(player.height / 12)}'${player.height % 12}"` : 'N/A'}</p>
                        <p><strong>Weight:</strong> {player.weight ? `${player.weight} lbs` : 'N/A'}</p>
                        <p><strong>Hometown:</strong> {player.hometown || 'N/A'}</p>
                        <p><strong>Team:</strong> {player.team || 'N/A'}</p>
                    </div>

                    <h2 className="text-2xl font-semibold mt-8 mb-4 text-blue-400">AI Overview</h2>
                    <div className="prose prose-invert max-w-none text-lg"> {/* Increased text size */}
                        {aiOverview.split('\n').map((paragraph, index) => (
                            <p key={index} className="mb-2">{paragraph}</p>
                        ))}
                    </div>

                    {aiRatings.length > 0 && (
                        <>
                            <h2 className="text-2xl font-semibold mt-8 mb-4 text-blue-400">EA CFB 26 Hypothetical Ratings</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-lg"> {/* Increased text size */}
                                {aiRatings.map((rating, index) => (
                                    <p key={index} className="text-gray-300">{rating}</p>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="mt-8 text-center">
                        {/* Changed Link href to just '/' */}
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