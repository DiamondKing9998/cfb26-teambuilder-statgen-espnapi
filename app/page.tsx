// src/app/page.tsx

"use client"; // Essential for using useState, useEffect, and other client-side hooks

import React, { useState, useEffect, useCallback } from 'react';

// --- Interfaces based on API-Sports American Football v1 documentation ---
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

interface FilterSidebarProps {
    onApplyFilters: (filters: { college: string; year: string; position: string; playerName: string }) => void;
    colleges: { name: string; id: number }[];
    years: string[];
    positions: string[];
    isLoadingFilters: boolean;
    onResetFilters: () => void;
    currentCollege: string;
    currentYear: string;
    currentPosition: string;
    currentSearchName: string;
}

interface PlayerCardProps {
    player: ApiSportsPlayer;
}

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
        event.preventDefault();
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
                            <h3>Season (Year)</h3>
                            <select value={yearValue} onChange={(e) => setYearValue(e.target.value)}>
                                <option value="">All Years</option>
                                {years.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <h3>College Team</h3>
                            <select value={collegeValue} onChange={(e) => setCollegeValue(e.target.value)}>
                                <option value="">All Colleges</option>
                                {/* Sort colleges alphabetically by name for dropdown */}
                                {colleges.sort((a, b) => a.name.localeCompare(b.name)).map((college) => (
                                    <option key={college.id} value={college.name}>{college.name}</option>
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

    const NCAAF_LEAGUE_ID = 1;

    // 1. Fetch data for filter dropdowns (runs once on mount)
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setIsLoadingFilters(true);
            try {
                // --- Generate Years 1998-2025 ---
                const startYear = 1998;
                const currentYear = new Date().getFullYear(); // This will be 2025
                const endYear = 2025; // User requested up to 2025

                const generatedYears: string[] = [];
                for (let year = endYear; year >= startYear; year--) {
                    generatedYears.push(year.toString());
                }
                setApiYears(generatedYears);

                // --- Fetch Teams (Colleges) ---
                // We'll fetch teams for the most recent year (2025) initially.
                // NOTE: If the API does not have team data for 2025 yet, this dropdown will be empty.
                // If it remains empty, try hardcoding `initialSeasonForTeams` to '2024' or '2023'.
                const initialSeasonForTeams = generatedYears.includes(currentYear.toString())
                    ? currentYear.toString()
                    : generatedYears[0] || '2024'; // Fallback if 2025 isn't in generated list for some reason, or list is empty

                console.log(`Fetching initial teams for season: ${initialSeasonForTeams}`); // Debugging
                const teamsResponse = await fetch(`${API_SPORTS_BASE_URL}/teams?league=${NCAAF_LEAGUE_ID}&season=${initialSeasonForTeams}`, {
                    headers: {
                        'x-rapidapi-key': API_SPORTS_API_KEY,
                        'x-rapidapi-host': API_SPORTS_API_HOST,
                    },
                });
                if (!teamsResponse.ok) {
                    const errorBody = await teamsResponse.text();
                    console.error('API Error fetching teams:', errorBody);
                    // Instead of throwing, just log and set empty. User can still select other years.
                    setApiColleges([]);
                    setCollegeNameToIdMap(new Map());
                    // Optionally set a filter error if this is critical
                    // setPlayerError(`Failed to load college teams for ${initialSeasonForTeams}: ${teamsResponse.statusText}`);
                } else {
                    const teamsData: { response: ApiSportsTeam[] } = await teamsResponse.json();
                    const collegesList = (teamsData.response || [])
                        .map(team => ({ name: team.name, id: team.id }))
                        .sort((a, b) => a.name.localeCompare(b.name));
                    setApiColleges(collegesList);

                    const nameToIdMap = new Map<string, number>();
                    collegesList.forEach(c => nameToIdMap.set(c.name, c.id));
                    setCollegeNameToIdMap(nameToIdMap);
                }

                // --- Fetch Positions ---
                // Try to fetch positions from a recent season's players, fall back if necessary.
                const positionsList: string[] = [];
                try {
                    const playersForPositionsResponse = await fetch(`${API_SPORTS_BASE_URL}/players?league=${NCAAF_LEAGUE_ID}&season=${initialSeasonForTeams}&limit=100`, {
                        headers: {
                            'x-rapidapi-key': API_SPORTS_API_KEY,
                            'x-rapidapi-host': API_SPORTS_API_HOST,
                        },
                    });
                     if (playersForPositionsResponse.ok) {
                        const playersForPositionsData: { response: ApiSportsPlayer[] } = await playersForPositionsResponse.json();
                        const uniquePositions = new Set<string>();
                        (playersForPositionsData.response || []).forEach(p => {
                            if (p.position?.abbr) {
                                uniquePositions.add(p.position.abbr);
                            }
                        });
                        positionsList.push(...Array.from(uniquePositions).sort());
                    } else {
                        console.warn(`Could not fetch players for positions for ${initialSeasonForTeams}: ${playersForPositionsResponse.statusText}. Using common positions list.`);
                    }
                } catch (posError) {
                    console.warn("Error fetching positions from players API, using common list:", posError);
                }

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
                console.error('Error in fetchFilterOptions:', error);
                setPlayerError(`Failed to load initial filter options: ${error.message || 'Unknown error'}`);
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

        const isAnyFilterApplied = Object.values(appliedFilters).some(value => value !== '');
        if (!isAnyFilterApplied) {
            setIsLoadingPlayers(false);
            return;
        }

        try {
            const queryParams = new URLSearchParams();
            queryParams.append('league', NCAAF_LEAGUE_ID.toString());

            // Always provide a season when fetching players.
            // If user hasn't selected one, use the latest from our generated list.
            const seasonToQuery = appliedFilters.year || (apiYears.length > 0 ? apiYears[0] : new Date().getFullYear().toString());
            queryParams.append('season', seasonToQuery);

            if (appliedFilters.college) {
                const teamId = collegeNameToIdMap.get(appliedFilters.college);
                if (teamId) {
                    queryParams.append('team', teamId.toString());
                } else {
                    setPlayerError(`Selected college "${appliedFilters.college}" not found in current season's data. Try another year or college.`);
                    setIsLoadingPlayers(false);
                    return;
                }
            }
            if (appliedFilters.position) {
                queryParams.append('position', appliedFilters.position);
            }
            if (appliedFilters.playerName) {
                queryParams.append('search', appliedFilters.playerName);
            }

            const url = `${API_SPORTS_BASE_URL}/players?${queryParams.toString()}`;
            console.log("Fetching players from URL:", url); // <--- IMPORTANT FOR DEBUGGING

            const response = await fetch(url, {
                headers: {
                    'x-rapidapi-key': API_SPORTS_API_KEY,
                    'x-rapidapi-host': API_SPORTS_API_HOST,
                },
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API Error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
            }

            const data: { response: ApiSportsPlayer[] } = await response.json();

            let finalPlayers = data.response || [];

            // Client-side filtering as a fallback/refinement
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
    }, [appliedFilters, API_SPORTS_API_KEY, API_SPORTS_API_HOST, collegeNameToIdMap, apiYears]);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    const handleApplyFilters = useCallback((filters: { college: string; year: string; position: string; playerName: string }) => {
        setAppliedFilters(filters);
    }, []);

    const handleResetAllFilters = useCallback(() => {
        setAppliedFilters({ college: '', year: '', position: '', playerName: '' });
        setPlayers([]);
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

export default CollegeFootballApp;