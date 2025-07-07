// src/app/player-overview/[playerId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // For Next.js 13+ App Router
import Link from 'next/link'; // For the "Back" button

export default function PlayerOverviewPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Extracting parameters from the URL's query string
    const playerId = searchParams.get('playerId'); // From [playerId] in path, or can just use ID in query
    const playerName = searchParams.get('playerName');
    const teamName = searchParams.get('teamName');
    const position = searchParams.get('position');
    const jersey = searchParams.get('jersey');
    const height = searchParams.get('height');
    const weight = searchParams.get('weight');
    const hometown = searchParams.get('hometown');
    const year = searchParams.get('year');

    const [aiOverview, setAiOverview] = useState<string | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState<boolean>(true); // Start as true since we'll fetch on load
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        // Only fetch if we have enough data and haven't fetched yet
        if (playerName && teamName && year && !aiOverview && !aiError) {
            const generateOverview = async () => {
                setIsLoadingAI(true);
                setAiError(null);
                setAiOverview(null);

                try {
                    // Reconstruct a 'player' object to send to the backend API,
                    // similar to what the original PlayerCard would have sent.
                    const playerForBackend = {
                        id: playerId || 'N/A', // Use playerId from path if available, or just a placeholder
                        name: playerName,
                        team: teamName,
                        position: position,
                        jersey: jersey ? parseInt(jersey) : null,
                        height: height ? parseInt(height) : null,
                        weight: weight ? parseInt(weight) : null,
                        hometown: hometown,
                        // Add any other fields your backend expects from the 'player' object
                    };

                    const response = await fetch('/api/ai-overview', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            player: playerForBackend,
                            year: year,
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.details || errorData.error || 'Failed to generate AI overview');
                    }

                    const data = await response.json();
                    setAiOverview(data.overview);

                } catch (error: any) {
                    console.error("Error generating AI overview on dynamic page:", error);
                    setAiError(error.message || "Could not generate AI overview.");
                } finally {
                    setIsLoadingAI(false);
                }
            };
            generateOverview();
        } else if (!playerName || !teamName || !year) {
            // Handle cases where essential data is missing from URL
            setIsLoadingAI(false);
            setAiError("Missing player data in URL to generate AI overview.");
        }
    }, [playerId, playerName, teamName, year, position, jersey, height, weight, hometown]); // Dependencies for useEffect

    return (
        <div className="player-overview-page-container">
            <header className="player-overview-header">
                <Link href="/" className="back-button">← Back to Player Search</Link>
                <h1>AI Overview for {playerName}</h1>
                <p>{teamName} | {position} | {year}</p>
            </header>

            <main className="overview-content">
                {isLoadingAI && (
                    <div className="loading-ai-overview">Generating AI overview...</div>
                )}

                {aiError && (
                    <div className="ai-error-message">
                        Error: {aiError}
                        <p>Please go back and try again.</p>
                    </div>
                )}

                {aiOverview && (
                    <div className="ai-overview-box">
                        <p>{aiOverview}</p>
                    </div>
                )}
            </main>

            {/* Optional: Add basic styling */}
            <style jsx>{`
                .player-overview-page-container {
                    font-family: Arial, sans-serif;
                    max-width: 900px;
                    margin: 40px auto;
                    padding: 25px;
                    border: 1px solid #e0e0e0;
                    border-radius: 10px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                    background-color: #ffffff;
                }
                .player-overview-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 20px;
                }
                .player-overview-header h1 {
                    color: #333;
                    font-size: 2em;
                    margin-bottom: 10px;
                }
                .player-overview-header p {
                    color: #666;
                    font-size: 1.1em;
                }
                .back-button {
                    display: inline-block;
                    margin-bottom: 20px;
                    color: #007bff;
                    text-decoration: none;
                    font-weight: bold;
                    transition: color 0.2s ease;
                }
                .back-button:hover {
                    color: #0056b3;
                }
                .overview-content {
                    min-height: 200px; /* Ensure space for content */
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                }
                .loading-ai-overview {
                    font-size: 1.2em;
                    color: #007bff;
                    margin-top: 20px;
                }
                .ai-error-message {
                    color: #d9534f;
                    background-color: #f2dede;
                    border: 1px solid #ebccd1;
                    padding: 15px;
                    border-radius: 5px;
                    text-align: center;
                    margin-top: 20px;
                    width: 100%;
                }
                .ai-overview-box {
                    background-color: #f9f9f9;
                    border: 1px solid #e9e9e9;
                    padding: 20px;
                    border-radius: 8px;
                    line-height: 1.7;
                    color: #333;
                    white-space: pre-wrap; /* Preserves formatting from AI */
                    width: 100%;
                    text-align: left;
                    margin-top: 20px;
                }
            `}</style>
        </div>
    );
}