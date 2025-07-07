'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image'; // Assuming you use next/image for player photos
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
    aiRatings: string[]; // To store individual rating lines
    loading: boolean;
    error: string | null;
}

// Helper function to parse the AI response
const parseAiResponse = (fullText: string) => {
    const overviewSection = fullText.split('## OVERVIEW ##')[1]?.split('## RATINGS ##')[0]?.trim();
    const ratingsSection = fullText.split('## RATINGS ##')[1]?.trim();

    let overview = "Overview not available.";
    const ratings: string[] = [];

    if (overviewSection) {
        // Remove the prompt instructions if AI includes them
        overview = overviewSection.replace(/\[Generate 2-3 paragraphs for the player overview here\. If detailed statistics were not provided.*?\]/s, '').trim();
    }

    if (ratingsSection) {
        // Extract ratings lines, skipping the "EA CFB 26 Hypothetical Ratings:" header
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
                // Allow for empty lines within the list
                continue;
            } else if (inRatingsList && !line.trim().startsWith('-')) {
                // If we were in the list but current line doesn't start with '-', it's likely end of list
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

    useEffect(() => {
        const fetchPlayerDetails = async () => {
            const playerString = searchParams.get('player');
            const year = searchParams.get('year');

            if (!playerString || !year) {
                setPlayerDetails(prev => ({ ...prev, error: 'Player data or year missing.', loading: false }));
                return;
            }

            try {
                const player: CfbdPlayer = JSON.parse(decodeURIComponent(playerString));
                setPlayerDetails(prev => ({ ...prev, player: player, loading: true, error: null }));

                const response = await fetch('/api/ai-overview', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ player, year: parseInt(year) }),
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

        fetchPlayerDetails();
    }, [searchParams]);

    const { player, aiOverview, aiRatings, loading, error } = playerDetails;

    if (loading) {
        return <div className="p-8 text-center text-xl text-white">Loading player AI overview...</div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                <p>Error: {error}</p>
                <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
                    Go Back
                </button>
            </div>
        );
    }

    const primaryColor = player.teamColor || '#000000';
    const alternateColor = player.teamAlternateColor || '#FFFFFF';

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="relative p-6" style={{ background: `linear-gradient(to right, ${primaryColor}, ${alternateColor})` }}>
                    <Link href="/player-search" className="absolute top-4 left-4 text-white hover:underline flex items-center">
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
                                className="mx-auto mb-4"
                            />
                        )}
                        <h1 className="text-4xl font-bold mb-2">{player.name.toUpperCase()}</h1>
                        <p className="text-xl">{player.team} | {player.position} | {searchParams.get('year')}</p>
                    </div>
                </div>

                <div className="p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-blue-400">Player Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <p><strong>Position:</strong> {player.position}</p>
                        <p><strong>Jersey:</strong> {player.jersey}</p>
                        <p><strong>Height:</strong> {Math.floor(player.height / 12)}'{player.height % 12}"</p>
                        <p><strong>Weight:</strong> {player.weight} lbs</p>
                        <p><strong>Hometown:</strong> {player.hometown}</p>
                        <p><strong>Team:</strong> {player.team}</p>
                    </div>

                    <h2 className="text-2xl font-semibold mb-4 text-blue-400">AI Overview</h2>
                    <div className="prose prose-invert max-w-none">
                        {aiOverview.split('\n').map((paragraph, index) => (
                            <p key={index} className="mb-2">{paragraph}</p>
                        ))}
                    </div>

                    {aiRatings.length > 0 && (
                        <>
                            <h2 className="text-2xl font-semibold mt-8 mb-4 text-blue-400">EA CFB 26 Hypothetical Ratings</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                                {aiRatings.map((rating, index) => (
                                    <p key={index} className="text-gray-300">{rating}</p>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300"
                        >
                            Back to Player Search
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}