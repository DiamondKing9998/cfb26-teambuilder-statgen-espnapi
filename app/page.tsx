"use client"; // Essential for using useState and other client-side hooks

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Interfaces ---
interface Player {
    id: number;
    firstName: string;
    lastName: string;
    teamName: string; // Or college name if SportsDataIO provides it this way
    position: string;
    season: number; // API might return season as a number
    // Add other relevant stats/attributes from SportsDataIO player profiles
    // e.g., passingYards, rushingYards, tackles, interceptions etc.
    // For this POC, we'll just use basic info.
    jersey?: number;
    status?: string; // e.g., "Active"
}

// Interfaces for fetched filter options from SportsDataIO
interface ApiTeam {
    TeamID: number;
    School: string; // The college name
    Key: string; // Abbreviation, e.g., 'LSU'
    // ... other team properties
}

interface ApiPlayerDetails {
    PlayerID: number;
    FirstName: string;
    LastName: string;
    Position: string;
    College: string; // Assuming SportsDataIO provides this directly on player
    Season: number;
    // ... other player properties
}

interface FilterSidebarProps {
    onApplyFilters: (filters: { college: string; year: string; position: string; playerName: string }) => void;
    colleges: string[];
    years: string[];
    positions: string[];
    isLoadingFilters: boolean;
    onResetFilters: () => void;
}

interface PlayerCardProps {
    player: Player;
}

interface PlayerResultsProps {
    players: Player[];
    isLoadingPlayers: boolean;
    error: string | null;
}

// --- PlayerCard Component (now actively used) ---
const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
    return (
        <div className="player-card">
            <h4>{player.firstName} {player.lastName}</h4>
            <p>{player.college || player.teamName} | {player.position} | {player.season} Season</p>
            {player.jersey && <p>Jersey: #{player.jersey}</p>}
            {/* Add more player details here as needed */}
        </div>
    );
};

// --- PlayerResults Component (re-added to display search results) ---
const PlayerResults: React.FC<PlayerResultsProps> = ({ players, isLoadingPlayers, error }) => {
    if (isLoadingPlayers) {
        return (
            <main className="player-results">
                <div className="loading-message">Loading players...</div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="player-results">
                <div className="error-message">Error fetching players: {error}</div>
            </main>
        );
    }

    return (
        <main className="player-results">
            <h2>Player Profiles</h2>
            <div className="player-grid">
                {players.length > 0 ? (
                    players.map((player) => (
                        <PlayerCard key={player.id} player={player} />
                    ))
                ) : (
                    <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No players found matching your criteria. Try adjusting your filters.</p>
                )}
            </div>
        </main>
    );
};

// --- FilterSidebar Component (now has local state for input values and a submit button) ---
const FilterSidebar: React.FC<FilterSidebarProps> = ({
    onApplyFilters,
    colleges,
    years,
    positions,
    isLoadingFilters,
    onResetFilters,
}) => {
    // Local state for each filter input
    const [collegeValue, setCollegeValue] = useState<string>('');
    const [yearValue, setYearValue] = useState<string>('');
    const [positionValue, setPositionValue] = useState<string>('');
    const [playerNameValue, setPlayerNameValue] = useState<string>('');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault(); // Prevent page reload
        onApplyFilters({
            college: collegeValue,
            year: yearValue,
            position: positionValue,
            playerName: playerNameValue.trim(), // Trim whitespace
        });
    };

    const handleReset = () => {
        setCollegeValue('');
        setYearValue('');
        setPositionValue('');
        setPlayerNameValue('');
        onResetFilters(); // Also notify parent to reset its state
    };

    return (
        <aside className="filter-sidebar">
            <h2>Filter Players</h2>
            <form onSubmit={handleSubmit} className="filter-form">
                {isLoadingFilters ? (
                    <div className="loading-spinner">Loading filters...</div>
                ) : (
                    <>
                        <div className="filter-group">
                            <h3>College</h3>
                            <select value={collegeValue} onChange={(e) => setCollegeValue(e.target.value)}>
                                <option value="">All Colleges</option>
                                {colleges.map((college) => (
                                    <option key={college} value={college}>{college}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <h3>Year</h3>
                            <select value={yearValue} onChange={(e) => setYearValue(e.target.value)}>
                                <option value="">All Years</option>
                                {years.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <h3>Position</h3>
                            <select value={positionValue} onChange={(e) => setPositionValue(e.target.value)}>
                                <option value="">All Positions</option>
                                {positions.map((pos) => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <h3>Player Name</h3>
                            <input
                                type="text"
                                placeholder="First or Last Name"
                                value={playerNameValue}
                                onChange={(e) => setPlayerNameValue(e.target.value)}
                            />
                        </div>

                        <div className="button-group">
                            <button type="submit" className="submit-button">Search Players</button>
                            <button type="button" className="reset-button" onClick={handleReset}>Reset Filters</button>
                        </div>
                    </>
                )}
            </form>
        </aside>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
    // State for filter values that will be applied on submit
    const [appliedFilters, setAppliedFilters] = useState({
        college: '',
        year: '',
        position: '',
        playerName: '',
    });

    // State for the actual player results
    const [players, setPlayers] = useState<Player[]>([]);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
    const [playerError, setPlayerError] = useState<string | null>(null);

    // State for filter dropdown options
    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    const [apiColleges, setApiColleges] = useState<string[]>([]);
    const [apiYears, setApiYears] = useState<string[]>([]);
    const [apiPositions, setApiPositions] = useState<string[]>([]);

    // --- CONCEPTUAL API KEY & BASE URL ---
    // !!! IMPORTANT: Replace with your actual SportsDataIO API Key and Base URL !!!
    // Get your key from SportsDataIO dashboard. For Vercel deployment, use environment variables.
    const SPORTSDATAIO_API_KEY = process.env.NEXT_PUBLIC_SPORTSDATAIO_API_KEY || 'YOUR_SPORTSDATAIO_API_KEY';
    // Example College Football v3 Base URL (verify with SportsDataIO docs)
    const SPORTSDATAIO_BASE_URL = 'https://api.sportsdata.io/v3/cfb/scores/json'; // Adjust based on specific endpoint group

    // 1. Fetch data for filter dropdowns (runs once on mount)
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setIsLoadingFilters(true);
            try {
                // *** CONCEPTUAL SportsDataIO API Calls for filter options ***
                // You'll need to replace these with actual API calls from SportsDataIO docs
                // For 'Colleges' (Teams):
                // Look for an endpoint like /Teams or /Colleges
                // Example: /teams (might return a list of college teams with names)
                const collegesResponse = await fetch(`https://mockapi.test/cfb/teams.json`); // REPLACE THIS
                const collegesData: ApiTeam[] = await collegesResponse.json();
                const collegeNames = collegesData.map(team => team.School).sort();
                setApiColleges(collegeNames);

                // For 'Years' (Seasons):
                // Look for an endpoint like /Seasons or /Scores/CurrentSeason
                // Example: /CurrentSeason, then infer past seasons, or /Seasons for list
                const currentYear = new Date().getFullYear();
                const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString()).sort((a, b) => parseInt(b) - parseInt(a));
                setApiYears(years); // SportsDataIO might have a dedicated Seasons endpoint

                // For 'Positions':
                // Often, you might get a list of common positions, or derive from players.
                const dummyPositions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'ATH', 'K', 'P', 'LS', 'DL', 'DE', 'DT', 'ILB', 'OLB', 'CB', 'S', 'FS', 'SS'];
                setApiPositions(Array.from(new Set(dummyPositions)).sort()); // Remove duplicates and sort

            } catch (error) {
                console.error('Error fetching filter options:', error);
                // Handle error
            } finally {
                setIsLoadingFilters(false);
            }
        };

        fetchFilterOptions();
    }, []); // Runs once on component mount

    // 2. Fetch players based on applied filters (runs when appliedFilters state changes)
    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        setPlayerError(null);
        setPlayers([]); // Clear previous results

        // Only fetch if at least one filter is applied or player name is entered
        const isAnyFilterApplied = Object.values(appliedFilters).some(value => value !== '');

        if (!isAnyFilterApplied) {
            setIsLoadingPlayers(false);
            return; // Don't fetch if no filters are selected
        }

        try {
            // *** CONCEPTUAL SportsDataIO API Call for players ***
            // This is the most complex part and highly dependent on SportsDataIO's specific endpoints.
            // You'll likely need to use an endpoint like:
            // - /Players (to get a list of all players and then filter client-side if API doesn't support complex queries)
            // - /PlayersByTeam/{team} (if you filtered by college first)
            // - /PlayersBySeason/{season} (if you filtered by year first)
            // - A search endpoint if available.
            // SportsDataIO often has specific player endpoints for different sports/data levels.

            let url = `${SPORTSDATAIO_BASE_URL}/Players`; // Base endpoint (might need more specifics)
            const queryParams = [];

            if (appliedFilters.year) {
                // If the API supports filtering by season directly in the URL
                // e.g., /Players/Season/{season} or query parameter like ?season={season}
                url = `${SPORTSDATAIO_BASE_URL}/Players/${appliedFilters.year}`; // Example structure
            }
            if (appliedFilters.college) {
                // You'd need to convert college name to a TeamID or Key first if API needs it
                // e.g., filter through fetched teams to get the ID for "LSU"
                // For simplicity here, we'll assume a direct string filter is possible
                queryParams.push(`team=${appliedFilters.college}`); // Conceptual
            }
            if (appliedFilters.position) {
                queryParams.push(`position=${appliedFilters.position}`); // Conceptual
            }
            if (appliedFilters.playerName) {
                // Many APIs have a search endpoint or support a 'name' parameter
                // This is often tricky: some support partial match, others exact.
                queryParams.push(`name=${encodeURIComponent(appliedFilters.playerName)}`); // Conceptual
            }

            if (queryParams.length > 0) {
                url += `?${queryParams.join('&')}`;
            }

            // You'll need to add your API key to the headers for SportsDataIO
            const response = await fetch(url, {
                headers: {
                    'Ocp-Apim-Subscription-Key': SPORTSDATAIO_API_KEY, // Standard header for SportsDataIO
                },
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data: ApiPlayerDetails[] = await response.json();

            // Map API response to your Player interface
            const mappedPlayers: Player[] = data.map(p => ({
                id: p.PlayerID,
                firstName: p.FirstName,
                lastName: p.LastName,
                teamName: p.College || 'N/A', // Use College field if available
                college: p.College || 'N/A',
                position: p.Position,
                season: p.Season,
                // Map other fields as needed
            }));

            // Client-side filtering for player name if API doesn't fully support it
            // Or if you only fetched a broad list and need to refine.
            const finalPlayers = appliedFilters.playerName
                ? mappedPlayers.filter(p =>
                      p.firstName.toLowerCase().includes(appliedFilters.playerName.toLowerCase()) ||
                      p.lastName.toLowerCase().includes(appliedFilters.playerName.toLowerCase())
                  )
                : mappedPlayers;

            setPlayers(finalPlayers);

        } catch (error: any) {
            console.error('Error fetching players:', error);
            setPlayerError(error.message || 'Failed to fetch players.');
            setPlayers([]);
        } finally {
            setIsLoadingPlayers(false);
        }
    }, [appliedFilters, SPORTSDATAIO_API_KEY, SPORTSDATAIO_BASE_URL]); // Dependencies for useCallback

    // Trigger player fetch whenever appliedFilters change
    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    const handleApplyFilters = useCallback((filters: { college: string; year: string; position: string; playerName: string }) => {
        setAppliedFilters(filters);
    }, []);

    const handleResetAllFilters = useCallback(() => {
        setAppliedFilters({ college: '', year: '', position: '', playerName: '' });
        setPlayers([]); // Clear displayed players immediately on reset
        setPlayerError(null);
    }, []);

    return (
        <div className="App">
            <header>
                <h1>CFB Player Search</h1>
                <p>Find players by college, year, position, or name.</p>
            </header>

            <div className="main-container">
                <FilterSidebar
                    onApplyFilters={handleApplyFilters}
                    colleges={apiColleges}
                    years={apiYears}
                    positions={apiPositions}
                    isLoadingFilters={isLoadingFilters}
                    onResetFilters={handleResetAllFilters}
                    // Pass current applied filters back to sidebar to control dropdowns
                    currentCollege={appliedFilters.college}
                    currentYear={appliedFilters.year}
                    currentPosition={appliedFilters.position}
                />
                <PlayerResults
                    players={players}
                    isLoadingPlayers={isLoadingPlayers}
                    error={playerError}
                />
            </div>

            <footer>
                <p>&copy; 2025 CFB Player Database POC</p>
            </footer>
        </div>
    );
};

export default App;