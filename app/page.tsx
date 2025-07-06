// src/app/page.tsx

"use client"; // Essential for using useState, useEffect, and other client-side hooks

import React, { useState, useEffect, useCallback } from 'react';
// Note: No need to import specific fonts here, they are handled in layout.tsx

// --- Interfaces based on API-Sports American Football v1 documentation ---
// Note: API-Sports uses a `response` array wrapper in their JSON.

// Player Interface
interface ApiSportsPlayer {
    id: number;
    name: string; // Full name as returned by API
    firstname: string;
    lastname: string;
    birth: {
        date: string; // e.g., "1999-01-15"
        country: string;
    };
    height: {
        feet: number | null;
        inches: number | null;
    };
    weight: {
        pounds: number | null;
    };
    college: string; // This API explicitly has a college field for players
    draft: {
        round: number | null;
        pick: number | null;
        team: ApiSportsTeam | null;
    };
    // Position object might be slightly different here
    position: {
        name: string; // e.g., "Quarterback"
        abbr: string; // e.g., "QB"
    };
    team: {
        id: number;
        name: string; // e.g., "LSU Tigers"
        logo: string;
    };
    jersey?: number;
    season: number; // The season this player data corresponds to (important for filtering)
}

// Team Interface (for college filter)
interface ApiSportsTeam {
    id: number;
    name: string; // e.g., "LSU Tigers"
    logo: string;
    country: {
        id: number;
        name: string;
        code: string;
    };
    // ... other team details
}

// FilterSidebar Props
interface FilterSidebarProps {
    onApplyFilters: (filters: { college: string; year: string; position: string; playerName: string }) => void;
    colleges: { name: string; id: number }[]; // Now passing objects with name and ID
    years: string[];
    positions: string[];
    isLoadingFilters: boolean;
    onResetFilters: () => void;
    currentCollege: string;
    currentYear: string;
    currentPosition: string;
    currentSearchName: string;
}

// PlayerCard Props
interface PlayerCardProps {
    player: ApiSportsPlayer;
}

// PlayerResults Props
interface PlayerResultsProps {
    players: ApiSportsPlayer[];
    isLoadingPlayers: boolean;
    error: string | null;
}

// --- PlayerCard Component ---
const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
    return (
        <div className="player-card">
            <h4>{player.name}</h4>
            <p>{player.college || 'N/A College'} | {player.position?.abbr || 'N/A Pos'} | {player.season} Season</p>
            {player.jersey && <p>Jersey: #{player.jersey}</p>}
            {/* Add more player details if desired, e.g., height/weight */}
        </div>
    );
};

// --- PlayerResults Component ---
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
            <h2>College Football Player Profiles</h2>
            <div className="player-grid">
                {players.length > 0 ? (
                    players.map((player) => (
                        <PlayerCard key={player.id} player={player} />
                    ))
                ) : (
                    <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No College Football players found matching your criteria. Try adjusting your filters.</p>
                )}
            </div>
        </main>
    );
};

// --- FilterSidebar Component ---
const FilterSidebar: React.FC<FilterSidebarProps> = ({
    onApplyFilters,
    colleges,
    years,
    positions,
    isLoadingFilters,
    onResetFilters,
    currentCollege,
    currentYear,
    currentPosition,
    currentSearchName,
}) => {
    const [collegeValue, setCollegeValue] = useState<string>(currentCollege);
    const [yearValue, setYearValue] = useState<string>(currentYear);
    const [positionValue, setPositionValue] = useState<string>(currentPosition);
    const [playerNameValue, setPlayerNameValue] = useState<string>(currentSearchName);

    // Update local state when parent's current filters change (e.g., after a reset)
    useEffect(() => {
        setCollegeValue(currentCollege);
    }, [currentCollege]);
    useEffect(() => {
        setYearValue(currentYear);
    }, [currentYear]);
    useEffect(() => {
        setPositionValue(currentPosition);
    }, [currentPosition]);
    useEffect(() => {
        setPlayerNameValue(currentSearchName);
    }, [currentSearchName]);


    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault(); // Prevent page reload
        onApplyFilters({
            college: collegeValue,
            year: yearValue,
            position: positionValue,
            playerName: playerNameValue.trim(),
        });
    };

    const handleReset = () => {
        setCollegeValue('');
        setYearValue('');
        setPositionValue('');
        setPlayerNameValue('');
        onResetFilters();
    };

    return (
        <aside className="filter-sidebar">
            <h2>College Football Player Filters</h2>
            <form onSubmit={handleSubmit} className="filter-form">
                {isLoadingFilters ? (
                    <div className="loading-spinner">Loading filters...</div>
                ) : (
                    <>
                        <div className="filter-group">
                            <h3>College Team</h3>
                            <select value={collegeValue} onChange={(e) => setCollegeValue(e.target.value)}>
                                <option value="">All Colleges</option>
                                {colleges.map((college) => (
                                    <option key={college.id} value={college.name}>{college.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <h3>Season (Year)</h3>
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

// --- Main App Component (now the default export for the page) ---
const CollegeFootballApp: React.FC = () => {
    const [appliedFilters, setAppliedFilters] = useState({
        college: '',
        year: '',
        position: '',
        playerName: '',
    });

    const [players, setPlayers] = useState<ApiSportsPlayer[]>([]);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
    const [playerError, setPlayerError] = useState<string | null>(null);

    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    const [apiColleges, setApiColleges] = useState<{ name: string; id: number }[]>([]);
    const [apiYears, setApiYears] = useState<string[]>([]);
    const [apiPositions, setApiPositions] = useState<string[]>([]);

    // Store the mapping of college name to ID for API requests
    const [collegeNameToIdMap, setCollegeNameToIdMap] = useState<Map<string, number>>(new Map());

    // --- API-Sports American Football v1 KEY & HOST ---
    // YOUR API KEY IS EMBEDDED HERE
    const API_SPORTS_API_KEY = 'f307e2d6f7c992f91cdcf3abb81d3fad';
    const API_SPORTS_API_HOST = 'v1.american-football.api-sports.io';
    const API_SPORTS_BASE_URL = `https://${API_SPORTS_API_HOST}`;

    // NCAAF League ID (You'd typically fetch this from /leagues once)
    // Based on API-Sports American Football documentation example for 'NCAAF', ID is 1.
    const NCAAF_LEAGUE_ID = 1;

    // 1. Fetch data for filter dropdowns (runs once on mount)
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setIsLoadingFilters(true);
            try {
                // Fetch Seasons (Years) for NCAAF League
                const yearsResponse = await fetch(`${API_SPORTS_BASE_URL}/seasons?league=${NCAAF_LEAGUE_ID}`, {
                    headers: {
                        'x-rapidapi-key': API_SPORTS_API_KEY,
                        'x-rapidapi-host': API_SPORTS_API_HOST,
                    },
                });
                if (!yearsResponse.ok) throw new Error(`API Error fetching years: ${yearsResponse.status} ${yearsResponse.statusText}`);
                const yearsData: { response: number[] } = await yearsResponse.json();
                const filteredYears = yearsData.response
                    .filter(year => year <= new Date().getFullYear()) // Only show current/past years
                    .map(year => year.toString())
                    .sort((a, b) => parseInt(b) - parseInt(a));
                setApiYears(filteredYears);

                // Fetch Teams (Colleges) for NCAAF League (use the most recent season available for teams)
                // Using a default of current year if filteredYears is empty.
                const seasonForTeams = filteredYears.length > 0 ? filteredYears[0] : new Date().getFullYear().toString();
                const teamsResponse = await fetch(`${API_SPORTS_BASE_URL}/teams?league=${NCAAF_LEAGUE_ID}&season=${seasonForTeams}`, {
                    headers: {
                        'x-rapidapi-key': API_SPORTS_API_KEY,
                        'x-rapidapi-host': API_SPORTS_API_HOST,
                    },
                });
                if (!teamsResponse.ok) throw new Error(`API Error fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}`);
                const teamsData: { response: ApiSportsTeam[] } = await teamsResponse.json();
                const collegesList = teamsData.response
                    .map(team => ({ name: team.name, id: team.id }))
                    .sort((a, b) => a.name.localeCompare(b.name));
                setApiColleges(collegesList);

                const nameToIdMap = new Map<string, number>();
                collegesList.forEach(c => nameToIdMap.set(c.name, c.id));
                setCollegeNameToIdMap(nameToIdMap);


                // Fetch Positions
                // This API doesn't seem to have a dedicated /positions endpoint.
                // We'll fetch players for a recent season and extract unique positions from them.
                // This might be rate-limited, so for POC, a common list is often safer.
                // Let's try to fetch a small set of players to get positions if possible, otherwise fall back.
                const positionsList: string[] = [];
                try {
                    const playersForPositionsResponse = await fetch(`${API_SPORTS_BASE_URL}/players?league=${NCAAF_LEAGUE_ID}&season=${seasonForTeams}&limit=100`, { // Fetch a small batch
                        headers: {
                            'x-rapidapi-key': API_SPORTS_API_KEY,
                            'x-rapidapi-host': API_SPORTS_API_HOST,
                        },
                    });
                     if (playersForPositionsResponse.ok) {
                        const playersForPositionsData: { response: ApiSportsPlayer[] } = await playersForPositionsResponse.json();
                        const uniquePositions = new Set<string>();
                        playersForPositionsData.response.forEach(p => {
                            if (p.position?.abbr) {
                                uniquePositions.add(p.position.abbr);
                            }
                        });
                        positionsList.push(...Array.from(uniquePositions).sort());
                    } else {
                        console.warn(`Could not fetch players for positions: ${playersForPositionsResponse.statusText}. Using common positions list.`);
                    }
                } catch (posError) {
                    console.warn("Error fetching positions from players API, using common list:", posError);
                }

                // Fallback to common positions if API fetching failed or was empty
                if (positionsList.length === 0) {
                     const commonPositions = [
                        'QB', 'RB', 'WR', 'TE', 'C', 'G', 'T', 'DE', 'DT', 'LB', 'CB', 'S',
                        'K', 'P', 'LS', 'ATH', 'DL', 'DB', 'FB', 'OT', 'OG', 'C', 'DT', 'DE',
                        'OLB', 'ILB', 'CB', 'SS', 'FS'
                    ];
                    setApiPositions(Array.from(new Set(commonPositions)).sort());
                } else {
                    setApiPositions(positionsList);
                }


            } catch (error: any) {
                console.error('Error fetching filter options:', error);
                setPlayerError(`Failed to load filter options: ${error.message || 'Unknown error'}`);
            } finally {
                setIsLoadingFilters(false);
            }
        };

        fetchFilterOptions();
    }, [API_SPORTS_API_KEY, API_SPORTS_API_HOST]); // Dependencies for useEffect

    // 2. Fetch players based on applied filters (runs when appliedFilters state changes)
    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        setPlayerError(null);
        setPlayers([]); // Clear previous results

        // Only fetch if at least one filter is applied or player name is entered
        const isAnyFilterApplied = Object.values(appliedFilters).some(value => value !== '');
        if (!isAnyFilterApplied) {
            setIsLoadingPlayers(false);
            return;
        }

        try {
            // Construct query parameters for the /players endpoint
            const queryParams = new URLSearchParams();
            queryParams.append('league', NCAAF_LEAGUE_ID.toString()); // Always filter by NCAAF league

            if (appliedFilters.year) {
                queryParams.append('season', appliedFilters.year);
            }
            if (appliedFilters.college) {
                // Get the team ID from the college name
                const teamId = collegeNameToIdMap.get(appliedFilters.college);
                if (teamId) {
                    queryParams.append('team', teamId.toString());
                } else {
                    // This might happen if the selected college isn't in the map (e.g., stale data)
                    // You could show an error or just proceed without a team filter
                    setPlayerError(`Selected college "${appliedFilters.college}" not found. Please try another.`);
                    setIsLoadingPlayers(false);
                    return;
                }
            }
            if (appliedFilters.position) {
                queryParams.append('position', appliedFilters.position); // API uses abbr (e.g., 'QB')
            }
            if (appliedFilters.playerName) {
                queryParams.append('search', appliedFilters.playerName); // API uses 'search' for player name
            }

            const url = `${API_SPORTS_BASE_URL}/players?${queryParams.toString()}`;

            const response = await fetch(url, {
                headers: {
                    'x-rapidapi-key': API_SPORTS_API_KEY,
                    'x-rapidapi-host': API_SPORTS_API_HOST,
                },
            });

            if (!response.ok) {
                const errorBody = await response.text(); // Get raw error message from API
                throw new Error(`API Error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
            }

            const data: { response: ApiSportsPlayer[] } = await response.json();

            let finalPlayers = data.response || [];

            // Perform client-side filtering if necessary, or refine search results
            // The API handles search well, but a final check for robustness
            if (appliedFilters.playerName) {
                 const searchLower = appliedFilters.playerName.toLowerCase();
                 finalPlayers = finalPlayers.filter(p =>
                     p.name.toLowerCase().includes(searchLower) ||
                     (p.firstname && p.firstname.toLowerCase().includes(searchLower)) ||
                     (p.lastname && p.lastname.toLowerCase().includes(searchLower))
                 );
            }

            setPlayers(finalPlayers);

        } catch (error: any) {
            console.error('Error fetching players:', error);
            setPlayerError(error.message || 'Failed to fetch players. Check API key and network.');
            setPlayers([]);
        } finally {
            setIsLoadingPlayers(false);
        }
    }, [appliedFilters, API_SPORTS_API_KEY, API_SPORTS_API_HOST, collegeNameToIdMap]); // Dependencies for useCallback

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
                <h1>College Football Player Search</h1>
                <p>Find college players by team, season, position, or name.</p>
            </header>

            <div className="main-container">
                <FilterSidebar
                    onApplyFilters={handleApplyFilters}
                    colleges={apiColleges}
                    years={apiYears}
                    positions={apiPositions}
                    isLoadingFilters={isLoadingFilters}
                    onResetFilters={handleResetAllFilters}
                    currentCollege={appliedFilters.college}
                    currentYear={appliedFilters.year}
                    currentPosition={appliedFilters.position}
                    currentSearchName={appliedFilters.playerName}
                />
                <PlayerResults
                    players={players}
                    isLoadingPlayers={isLoadingPlayers}
                    error={playerError}
                />
            </div>

            <footer>
                <p>&copy; 2025 College Football Player Database POC</p>
            </footer>
        </div>
    );
};

export default CollegeFootballApp; // Export the main component as default