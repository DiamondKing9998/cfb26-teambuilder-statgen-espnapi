"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// --- Interfaces for CollegeFootballData.com API (REVISED for CFBD Player API) ---
// This interface now reflects the data structure we expect from CFBD's /players endpoint
// after it's been mapped in your /api/main-api/route.ts
interface CfbdPlayer {
    id: string; // athlete_id from CFBD, converted to string
    firstName: string; // first_name from CFBD
    lastName: string; // last_name from CFBD
    fullName: string; // Constructed from first_name and last_name in proxy
    position: { displayName: string }; // position from CFBD
    jersey: string; // jersey from CFBD, converted to string
    team: { displayName: string; slug: string }; // team (school name) from CFBD
    weight: number | null; // weight from CFBD
    height: number | null; // height from CFBD
    hometown: string | null; // Placeholder for now, CFBD provides city/state separately
    teamColor: string | null; // Not directly from CFBD players endpoint
    teamColorSecondary: string | null; // Not directly from CFBD players endpoint
}

// This still aligns with CFBD team data returned by the 'teams' target in your /api/main-api route
interface CfbdTeam {
    id: number;
    school: string;
    mascot: string | null;
    abbreviation: string | null;
    alt_name1: string | null;
    alt_name2: string | null;
    alt_name3: string | null;
    conference: string | null;
    division: string | null;
    classification: string | null;
    color: string | null;
    alt_color: string | null;
    logos: string[] | null;
    twitter: string | null;
    location: {
        venue_id: number | null;
        name: string | null;
        city: string | null;
        state: string | null;
        zip: string | null;
        country_code: string | null;
        latitude: number | null;
        longitude: number | null;
        elevation: number | null;
        capacity: number | null;
        year_constructed: number | null;
        grass: boolean | null;
        dome: boolean | null;
    } | null;
}

// And the FormattedTeamForFrontend interface from your route.ts
interface FormattedTeamForFrontend {
    id: string;
    collegeDisplayName: string; // <--- This is the new property name for the frontend to use
    mascot: string;
    conference: string;
    classification: string;
    color: string;
    alternateColor: string;
    logo: string;
    darkLogo: string;
}

// --- Component Props Interfaces ---
interface FilterSidebarProps {
    onApplyFilters: (filters: { college: string; year: string; position: string; playerName: string; maxPlayers: number }) => void;
    colleges: { name: string; id: string }[];
    years: string[];
    positions: string[];
    isLoadingFilters: boolean;
    onResetFilters: () => void;
    currentCollege: string;
    currentYear: string;
    currentPosition: string;
    currentSearchName: string;
    currentMaxPlayers: number;
}

interface PlayerCardProps {
    player: CfbdPlayer;
    searchYear: string;
}

interface PlayerResultsProps {
    players: CfbdPlayer[];
    isLoadingPlayers: boolean;
    error: string | null;
    currentSearchYear: string;
    sortBy: string;
    setSortBy: React.Dispatch<React.SetStateAction<string>>;
    sortOrder: 'asc' | 'desc';
    setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
    hasSearched: boolean;
}


// --- PlayerCard Component (Uses .player-card class from globals.css) ---
const PlayerCard: React.FC<PlayerCardProps> = ({ player, searchYear }) => {
    const displayName = player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'N/A Name';

    const encodedPlayer = encodeURIComponent(JSON.stringify(player));

    return (
        <Link href={`/player/${player.id}?player=${encodedPlayer}&year=${searchYear}`}>
            <div className="player-card">
                <h4>{displayName}</h4>
                <p>{player.team?.displayName || 'N/A Team'} | {player.position?.displayName || 'N/A Pos'} | {searchYear || 'N/A Season'}</p>
                {player.jersey !== 'N/A' && <p>Jersey: #{player.jersey}</p>}
                {/* Re-added height/weight as CFBD player endpoint provides them */}
                {player.height !== null && player.weight !== null && (
                    <p>Height: {Math.floor(player.height / 12)}'{player.height % 12}" | Weight: {player.weight} lbs</p>
                )}
            </div>
        </Link>
    );
};


// --- PlayerResults Component (Uses .player-results and .player-grid from globals.css) ---
const PlayerResults: React.FC<PlayerResultsProps> = ({
    players,
    isLoadingPlayers,
    error,
    currentSearchYear,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    hasSearched
}) => {
    if (!hasSearched && !isLoadingPlayers && !error && players.length === 0) {
        return (
            <main className="player-results">
                <h2 className="text-[var(--color-primary)]">Player Results</h2>
                <p className="loading-message">Use the search filters to find players.</p>
            </main>
        );
    }

    if (isLoadingPlayers) {
        return (
            <main className="player-results">
                <h2 className="text-[var(--color-primary)]">Player Results</h2>
                <div className="loading-message">Loading players...</div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="player-results">
                <h2 className="text-[var(--color-primary)]">Player Results</h2>
                <div className="error-message">Error fetching players: {error}</div>
            </main>
        );
    }

    return (
        <main className="player-results">
            <h2 className="text-[var(--color-primary)]">College Football Player Profiles</h2>

            {players.length > 0 && (
                <div className="flex justify-end items-center mb-4 gap-2">
                    <label htmlFor="sortBy" className="text-sm font-semibold text-[var(--color-text-default)]">Sort By:</label>
                    <select
                        id="sortBy"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="p-2 border border-[var(--color-input-border)] rounded-md bg-[var(--color-input-bg)] text-[var(--color-text-default)] cursor-pointer"
                    >
                        <option value="lastName">Last Name</option>
                        <option value="firstName">First Name</option>
                        <option value="position">Position</option>
                        <option value="jersey">Jersey Number</option>
                    </select>

                    <label htmlFor="sortOrder" className="sr-only">Sort Order</label>
                    <select
                        id="sortOrder"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                        className="p-2 border border-[var(--color-input-border)] rounded-md bg-[var(--color-input-bg)] text-[var(--color-text-default)] cursor-pointer"
                    >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </div>
            )}

            <div className="player-grid">
                {players.length > 0 ? (
                    players.map((player) => (
                        <PlayerCard key={player.id} player={player} searchYear={currentSearchYear} />
                    ))
                ) : (
                    <p className="loading-message">No College Football players found matching your criteria. Try adjusting your filters.</p>
                )}
            </div>
        </main>
    );
};

// --- FilterSidebar Component (Uses .filter-sidebar, .filter-group, etc. from globals.css) ---
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
    currentMaxPlayers,
}) => {
    const [collegeValue, setCollegeValue] = useState<string>(currentCollege);
    const [playerNameValue, setPlayerNameValue] = useState<string>(currentSearchName);
    const [maxPlayersValue, setMaxPlayersValue] = useState<number>(currentMaxPlayers);

    useEffect(() => {
        setCollegeValue(currentCollege);
    }, [currentCollege]);

    useEffect(() => {
        setPlayerNameValue(currentSearchName);
    }, [currentSearchName]);

    useEffect(() => {
        setMaxPlayersValue(currentMaxPlayers);
    }, [currentMaxPlayers]);


    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onApplyFilters({
            college: collegeValue,
            year: '2024',
            position: '',
            playerName: playerNameValue.trim(),
            maxPlayers: maxPlayersValue,
        });
    };

    const handleReset = () => {
        setCollegeValue('');
        setPlayerNameValue('');
        setMaxPlayersValue(50); // RESET TO DEFAULT
        onResetFilters();
    };

    return (
        <aside className="filter-sidebar">
            <h2>College Football Player Filters</h2>
            <form onSubmit={handleSubmit} className="filter-form">
                {isLoadingFilters ? (
                    <div className="loading-message">Loading filters...</div>
                ) : (
                    <>
                        <div className="filter-group">
                            <h3>College Team</h3>
                            <select
                                value={collegeValue}
                                onChange={(e) => setCollegeValue(e.target.value)}
                            >
                                <option value="">All Colleges</option>
                                {colleges.length > 0 ? (
                                    colleges.map((college) => (
                                        <option key={college.id} value={college.name}>{college.name}</option>
                                    ))
                                ) : (
                                    <option value="" disabled>No teams loaded</option>
                                )}
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

                        <div className="filter-group">
                            <h3>Max Players Listed</h3>
                            <select
                                value={maxPlayersValue}
                                onChange={(e) => setMaxPlayersValue(parseInt(e.target.value))}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
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


// --- Main App Component (Uses .App, .main-container, header, footer from globals.css) ---
const CollegeFootballApp: React.FC = () => {
    const DEFAULT_PLAYER_SEARCH_YEAR = '2024';
    const DEFAULT_MAX_PLAYERS = 50;

    const [appliedFilters, setAppliedFilters] = useState({
        college: '',
        year: DEFAULT_PLAYER_SEARCH_YEAR,
        position: '',
        playerName: '',
        maxPlayers: DEFAULT_MAX_PLAYERS,
    });

    const [players, setPlayers] = useState<CfbdPlayer[]>([]);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
    const [playerError, setPlayerError] = useState<string | null>(null);

    const [sortBy, setSortBy] = useState<string>('lastName');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const [hasSearched, setHasSearched] = useState(false);


    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    const [apiColleges, setApiColleges] = useState<{ name: string; id: string }[]>([]);
    const [apiYears, setApiYears] = useState<string[]>([]);
    const [apiPositions, setApiPositions] = useState<string[]>([]);

    const [collegeNameToIdMap, setCollegeNameToIdMap] = useState<Map<string, string>>(new Map());


    // 1. Fetch data for filter dropdowns (runs once on mount)
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setIsLoadingFilters(true);
            setPlayerError(null);

            try {
                // --- Generate Years 1940-Current Year ---
                const startYear = 1940;
                const endYear = new Date().getFullYear();
                const generatedYears: string[] = [];
                for (let year = endYear; year >= startYear; year--) {
                    generatedYears.push(year.toString());
                }
                setApiYears(generatedYears);

                // --- Fetch Teams from CFBD API via Proxy ---
                const currentYearForTeams = '2024';
                const teamsProxyUrl = `/api/main-api?target=teams&year=${currentYearForTeams}`;

                console.log(`[DEBUG page.tsx] Fetching teams for year: ${currentYearForTeams} via proxy: ${teamsProxyUrl}`);
                const teamsResponse = await fetch(teamsProxyUrl);

                if (!teamsResponse.ok) {
                    const errorBody = await teamsResponse.text();
                    console.error(`Error from proxy when fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}. Details:`, errorBody);
                    throw new Error(`Proxy error fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}. Details: ${errorBody}`);
                }

                const teamsData: FormattedTeamForFrontend[] = await teamsResponse.json();
                console.log("Raw teamsData from API (for filters) via proxy:", teamsData);

                const fbsTeams = teamsData.filter(team => team.classification?.toUpperCase() === 'FBS');
                const fcsTeams = teamsData.filter(team => team.classification?.toUpperCase() === 'FCS');

                fbsTeams.sort((a, b) => a.collegeDisplayName.localeCompare(b.collegeDisplayName));
                fcsTeams.sort((a, b) => a.collegeDisplayName.localeCompare(b.collegeDisplayName));

                const sortedAndFilteredTeams = [...fbsTeams, ...fcsTeams];
                
                const nameToIdMap = new Map<string, string>();
                const collegesForDropdown = sortedAndFilteredTeams.map(team => {
                    nameToIdMap.set(team.collegeDisplayName, team.id);
                    return { name: team.collegeDisplayName, id: team.id };
                });

                setApiColleges(collegesForDropdown);
                setCollegeNameToIdMap(nameToIdMap);

                // --- Fetch Positions from a known list ---
                const commonPositions = [
                    'QB', 'K', 'P', 'LS', 'RB', 'FB', 'WR', 'TE', 'C', 'OG', 'OT', 'OL',
                    'DE', 'DT', 'DL', 'LB', 'ILB', 'OLB', 'CB', 'S', 'DB', 'FS', 'SS',
                    'ATH', 'PK', 'ST'
                ].sort();

                setApiPositions(commonPositions);

            } catch (error: any) {
                console.error('Error in fetchFilterOptions:', error);
                setPlayerError(`Failed to load initial filter options: ${error.message || 'Unknown error'}.`);
            } finally {
                setIsLoadingFilters(false);
            }
        };

        fetchFilterOptions();
    }, []);

    // 2. Fetch players based on applied filters
    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        setPlayerError(null);
        setPlayers([]); // Clear previous results immediately

        const hasActiveFilters = appliedFilters.college !== '' || appliedFilters.playerName !== '' || appliedFilters.maxPlayers !== DEFAULT_MAX_PLAYERS;
        
        if (!hasActiveFilters && !hasSearched) {
            setIsLoadingPlayers(false);
            return;
        }

        try {
            const queryParams = new URLSearchParams();
            queryParams.append('target', 'players');

            const seasonToQuery = appliedFilters.year;
            queryParams.append('year', seasonToQuery);

            if (appliedFilters.college) {
                // IMPORTANT: For CFBD /players endpoint, 'team' parameter expects the full school name.
                // appliedFilters.college already holds the school's display name (e.g., "Auburn").
                queryParams.append('team', appliedFilters.college);
                console.log(`[DEBUG page.tsx] Searching players for college name: ${appliedFilters.college}`);
            }
            if (appliedFilters.playerName) {
                queryParams.append('search', appliedFilters.playerName);
            }
            queryParams.append('limit', appliedFilters.maxPlayers.toString());

            

            console.log("[DEBUG page.tsx] appliedFilters.college before sending to proxy:", appliedFilters.college);
            const url = `/api/main-api?${queryParams.toString()}`;
            console.log("[DEBUG page.tsx] Full players proxy URL being sent:", url);    

            const response = await fetch(url);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Error from proxy: ${response.status} ${response.statusText}. Details:`, errorBody);
                throw new Error(`Proxy error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
            }

            const data: CfbdPlayer[] = await response.json();

            setPlayers(data || []);
            console.log("[DEBUG page.tsx] Fetched players via proxy:", data);

        } catch (error: any) {
            console.error('Error fetching players:', error);
            setPlayerError(error.message || 'Failed to fetch players. Check network or server logs.');
            setPlayers([]);
        } finally {
            setIsLoadingPlayers(false);
        }
    }, [appliedFilters, hasSearched]);

    // Trigger player fetch when filters change or initially if a default search should occur
    useEffect(() => {
        if (hasSearched || appliedFilters.college !== '' || appliedFilters.playerName !== '' || appliedFilters.maxPlayers !== DEFAULT_MAX_PLAYERS) {
            fetchPlayers();
        }
    }, [fetchPlayers, appliedFilters.college, appliedFilters.playerName, appliedFilters.maxPlayers, hasSearched]);


    const handleApplyFilters = useCallback((filters: { college: string; year: string; position: string; playerName: string; maxPlayers: number }) => {
        setAppliedFilters(prevFilters => ({
            ...prevFilters,
            college: filters.college,
            playerName: filters.playerName,
            maxPlayers: filters.maxPlayers,
            year: DEFAULT_PLAYER_SEARCH_YEAR,
            position: '',
        }));
        setHasSearched(true);
    }, []);

    const handleResetAllFilters = useCallback(() => {
        setAppliedFilters({ 
            college: '', 
            year: DEFAULT_PLAYER_SEARCH_YEAR,
            position: '', 
            playerName: '',
            maxPlayers: DEFAULT_MAX_PLAYERS,
        });
        setPlayers([]);
        setPlayerError(null);
        setSortBy('lastName');
        setSortOrder('asc');
        setHasSearched(false);
    }, []);

    // Sorting Logic Function
    const getSortedPlayers = useCallback((playersToSort: CfbdPlayer[]) => {
        if (!playersToSort || playersToSort.length === 0) {
            return [];
        }

        return [...playersToSort].sort((a, b) => {
            let valA: any, valB: any;

            const getSortValue = (player: CfbdPlayer, key: string) => {
                switch (key) {
                    case 'lastName':
                        return player.lastName || '';
                    case 'firstName':
                        return player.firstName || '';
                    case 'position':
                        return player.position?.displayName || '';
                    case 'jersey':
                        // Handle conversion from string 'jersey' to number for sorting
                        const jerseyA = player.jersey !== 'N/A' ? parseInt(player.jersey, 10) : 0;
                        const jerseyB = player.jersey !== 'N/A' ? parseInt(player.jersey, 10) : 0;
                        return jerseyA - jerseyB;
                    default:
                        return '';
                }
            };

            valA = getSortValue(a, sortBy);
            valB = getSortValue(b, sortBy);

            if (typeof valA === 'string' && typeof valB === 'string') {
                const comparison = valA.localeCompare(valB);
                return sortOrder === 'asc' ? comparison : -comparison;
            } else {
                // This branch will primarily be hit for 'jersey' which is already a numerical comparison result
                const comparison = valA - valB;
                return sortOrder === 'asc' ? comparison : -comparison;
            }
        });
    }, [sortBy, sortOrder]);

    const sortedPlayers = getSortedPlayers(players);

    return (
        <div className="App">
            <header>
                <h1>CFB26 Teambuilder</h1>
                <p>College Football Player Search (CFBD API)</p>
                <p>Find college players by team or name.</p>
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
                    currentMaxPlayers={appliedFilters.maxPlayers}
                />
                <PlayerResults
                    players={sortedPlayers}
                    isLoadingPlayers={isLoadingPlayers}
                    error={playerError}
                    currentSearchYear={appliedFilters.year}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    hasSearched={hasSearched}
                />
            </div>

            <footer>
                <p>&copy; 2025 College Football Player Database POC</p>
            </footer>
        </div>
    );
};

export default CollegeFootballApp;