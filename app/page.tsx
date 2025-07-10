// src/app/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// --- Interfaces for CollegeFootballData.com API ---

interface CfbdPlayer {
    id: string; // Changed from number to string based on sample data
    team: string; // e.g., "Michigan"
    name: string; // Full name, e.g., "Aidan Hutchinson"
    firstName: string; // e.g., "Aidan"
    lastName: string;  // e.g., "Hutchinson"
    weight: number | null; // e.g., 269
    height: number | null; // e.g., 78 (inches)
    jersey: number | null; // e.g., 97
    position: string | null; // e.g., "DL"
    hometown: string | null; // e.g., "Plymouth"
    teamColor: string | null; // e.g., "#00274c"
    teamColorSecondary: string | null; // e.g., "#ffcb05"
}

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
        timezone: string | null;
        latitude: number | null;
        longitude: number | null;
        elevation: number | null;
        capacity: number | null;
        year_constructed: number | null;
        grass: boolean | null;
        dome: boolean | null;
    } | null;
}

// --- Component Props Interfaces ---
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
    player: CfbdPlayer;
    searchYear: string; // Added to display the year from the search filter
}

interface PlayerResultsProps {
    players: CfbdPlayer[]; // These players will already be sorted by the parent
    isLoadingPlayers: boolean;
    error: string | null;
    currentSearchYear: string;
    // New props for sorting controls
    sortBy: string;
    setSortBy: React.Dispatch<React.SetStateAction<string>>;
    sortOrder: 'asc' | 'desc';
    setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
    hasSearched: boolean; // To know if a search has been performed
}


// --- PlayerCard Component (Uses .player-card class from globals.css) ---
const PlayerCard: React.FC<PlayerCardProps> = ({ player, searchYear }) => {
    // Fallback if firstName/lastName are null, use 'name' if available, otherwise 'N/A Name'
    const displayName = player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'N/A Name';

    // Encode the entire player object and the search year for the player details page
    // Using encodeURIComponent on JSON.stringify is robust for complex objects
    const encodedPlayer = encodeURIComponent(JSON.stringify(player));

    return (
        // Link wraps the div to make the entire card clickable
        <Link href={`/player/${player.id}?player=${encodedPlayer}&year=${searchYear}`}>
            {/* The div inside the Link gets the styling from globals.css */}
            <div className="player-card">
                <h4>{displayName}</h4>
                <p>{player.team || 'N/A Team'} | {player.position || 'N/A Pos'} | {searchYear || 'N/A Season'}</p>
                {player.jersey !== null && <p>Jersey: #{player.jersey}</p>} {/* Only display if not null */}
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
    // If no search has been performed yet, show the initial message
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

            {/* Sorting Options UI - only show if players are found */}
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

            <div className="player-grid"> {/* Uses the .player-grid class */}
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
    years, // Still passed but not used in rendering
    positions, // Still passed but not used in rendering
    isLoadingFilters,
    onResetFilters,
    currentCollege,
    currentYear, // Still passed but not used in rendering
    currentPosition, // Still passed but not used in rendering
    currentSearchName,
}) => {
    const [collegeValue, setCollegeValue] = useState<string>(currentCollege);
    // Removed yearValue and setYearValue as they are no longer rendered
    const [positionValue, setPositionValue] = useState<string>(currentPosition); // Keeping for now, will remove in next step
    const [playerNameValue, setPlayerNameValue] = useState<string>(currentSearchName);

    // Update internal state when props from parent (CollegeFootballApp) change
    useEffect(() => {
        setCollegeValue(currentCollege);
    }, [currentCollege]);

    // Removed useEffect for yearValue
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
            year: '', // Hardcode empty as it's removed from UI
            position: '', // Hardcode empty as it's removed from UI
            playerName: playerNameValue.trim(),
        });
    };

    const handleReset = () => {
        setCollegeValue('');
        // setYearValue(''); // No longer needed
        setPositionValue(''); // No longer needed
        setPlayerNameValue('');
        onResetFilters(); // Trigger reset in parent
    };

    return (
        <aside className="filter-sidebar"> {/* Uses the .filter-sidebar class */}
            <h2>College Football Player Filters</h2>
            <form onSubmit={handleSubmit} className="filter-form"> {/* Uses the .filter-form class */}
                {isLoadingFilters ? (
                    <div className="loading-message">Loading filters...</div>
                ) : (
                    <>
                        {/* Removed Season (Year) filter group */}

                        <div className="filter-group">
                            <h3>College Team</h3>
                            <select
                                value={collegeValue}
                                onChange={(e) => setCollegeValue(e.target.value)}
                            >
                                <option value="">All Colleges</option>
                                {colleges.length > 0 ? (
                                    colleges.map((college) => (
                                        <option key={college.name} value={college.name}>{college.name}</option>
                                    ))
                                ) : (
                                    <option value="" disabled>No teams loaded</option>
                                )}
                            </select>
                        </div>

                        {/* Removed Position filter group */}

                        <div className="filter-group">
                            <h3>Player Name</h3>
                            <input
                                type="text"
                                placeholder="First or Last Name"
                                value={playerNameValue}
                                onChange={(e) => setPlayerNameValue(e.target.value)}
                            />
                        </div>

                        <div className="button-group"> {/* Uses the .button-group class */}
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
    const [appliedFilters, setAppliedFilters] = useState({
        college: '',
        year: '', // Keeping here for interface consistency, but will always be empty from FilterSidebar
        position: '', // Keeping here for interface consistency, but will always be empty from FilterSidebar
        playerName: '',
    });

    const [players, setPlayers] = useState<CfbdPlayer[]>([]);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
    const [playerError, setPlayerError] = useState<string | null>(null);

    // New state for sorting
    const [sortBy, setSortBy] = useState<string>('lastName'); // Default sort by last name
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Default ascending

    // State to track if a search has been performed
    const [hasSearched, setHasSearched] = useState(false);


    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    const [apiColleges, setApiColleges] = useState<{ name: string; id: number }[]>([]);
    const [apiYears, setApiYears] = useState<string[]>([]); // Still fetched but not used for filtering
    const [apiPositions, setApiPositions] = useState<string[]>([]); // Still fetched but not used for filtering

    const [collegeNameToIdMap, setCollegeNameToIdMap] = useState<Map<string, number>>(new Map());


    // 1. Fetch data for filter dropdowns (runs once on mount) - NOW USES CORRECT PROXY PATH!
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setIsLoadingFilters(true);
            setPlayerError(null);

            try {
                // --- Generate Years 1940-2025 ---
                const startYear = 1940;
                const endYear = new Date().getFullYear(); // Up to current year
                const generatedYears: string[] = [];
                for (let year = endYear; year >= startYear; year--) {
                    generatedYears.push(year.toString());
                }
                setApiYears(generatedYears); // Still store, but year filter will be hardcoded

                // --- Fetch Teams from CFBD API via Proxy ---
                const currentYearForTeams = '2024'; // Using a fixed year for teams for now
                const teamsProxyUrl = `/api/cfbd-proxy?target=teams&year=${currentYearForTeams}`;

                console.log(`Fetching teams for year: ${currentYearForTeams} via proxy: ${teamsProxyUrl}`);
                const teamsResponse = await fetch(teamsProxyUrl);

                if (!teamsResponse.ok) {
                    const errorBody = await teamsResponse.text();
                    console.error(`Error from proxy when fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}. Details:`, errorBody);
                    throw new Error(`Proxy error fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}. Details: ${errorBody}`);
                }

                const teamsData: CfbdTeam[] = await teamsResponse.json();
                console.log("Raw teamsData from API (for filters) via proxy:", teamsData);

                // --- MODIFICATION START ---
                // Separate FBS and FCS teams, then sort each group, then concatenate
                const fbsTeams = teamsData.filter(team => team.classification?.toUpperCase() === 'FBS');
                const fcsTeams = teamsData.filter(team => team.classification?.toUpperCase() === 'FCS');

                fbsTeams.sort((a, b) => a.school.localeCompare(b.school));
                fcsTeams.sort((a, b) => a.school.localeCompare(b.school));

                // Concatenate FBS first, then FCS
                const sortedAndFilteredTeams = [...fbsTeams, ...fcsTeams];
                // --- MODIFICATION END ---


                const nameToIdMap = new Map<string, number>();
                const collegesForDropdown = sortedAndFilteredTeams.map(team => { // Use sortedAndFilteredTeams here
                    nameToIdMap.set(team.school, team.id);
                    return { name: team.school, id: team.id };
                });

                setApiColleges(collegesForDropdown);
                setCollegeNameToIdMap(nameToIdMap);


                // --- Fetch Positions from a known list ---
                const commonPositions = [
                    'QB', 'K', 'P', 'LS', 'RB', 'FB', 'WR', 'TE', 'C', 'OG', 'OT', 'OL',
                    'DE', 'DT', 'DL', 'LB', 'ILB', 'OLB', 'CB', 'S', 'DB', 'FS', 'SS',
                    'ATH', 'PK', 'ST'
                ].sort();

                setApiPositions(commonPositions); // Still store, but position filter will be hardcoded

            } catch (error: any) {
                console.error('Error in fetchFilterOptions:', error);
                setPlayerError(`Failed to load initial filter options: ${error.message || 'Unknown error'}.`);
            } finally {
                setIsLoadingFilters(false);
            }
        };

        fetchFilterOptions();
    }, []);

    // 2. Fetch players based on applied filters - NOW USES PROXY WITH 'players' TARGET!
    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        setPlayerError(null);
        setPlayers([]); // Clear previous results immediately

        const hasActiveFilters = appliedFilters.college !== '' || appliedFilters.playerName !== ''; // Check only college and player name
        if (!hasActiveFilters && !hasSearched) { // Only return if no filters are set and no search has been initiated
            setIsLoadingPlayers(false);
            return;
        }

        try {
            const queryParams = new URLSearchParams();
            queryParams.append('target', 'players');

            // Always query for a default year, or the one from appliedFilters if it somehow gets set externally
            const seasonToQuery = appliedFilters.year || (apiYears.length > 0 ? apiYears[0] : '2024');
            queryParams.append('year', seasonToQuery);

            if (appliedFilters.college) {
                queryParams.append('team', appliedFilters.college);
            }
            // Removed appliedFilters.position check
            if (appliedFilters.playerName) {
                queryParams.append('search', appliedFilters.playerName);
            }

            const url = `/api/cfbd-proxy?${queryParams.toString()}`;
            console.log("Fetching players via proxy URL:", url);

            const response = await fetch(url);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Error from proxy: ${response.status} ${response.statusText}. Details:`, errorBody);
                throw new Error(`Proxy error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
            }

            const data: CfbdPlayer[] = await response.json();

            setPlayers(data || []);
            console.log("Fetched players via proxy:", data);

        } catch (error: any) {
            console.error('Error fetching players:', error);
            setPlayerError(error.message || 'Failed to fetch players. Check network or server logs.');
            setPlayers([]);
        } finally {
            setIsLoadingPlayers(false);
        }
    }, [appliedFilters, apiYears, hasSearched]); // Added hasSearched to dependencies

    // Trigger player fetch when filters change or initially if a default search should occur
    useEffect(() => {
        if (hasSearched || appliedFilters.college !== '' || appliedFilters.playerName !== '') { // Only trigger if search initiated or relevant filters are set
            fetchPlayers();
        }
    }, [fetchPlayers, appliedFilters.college, appliedFilters.playerName, hasSearched]);


    const handleApplyFilters = useCallback((filters: { college: string; year: string; position: string; playerName: string }) => {
        // Only update college and playerName in appliedFilters
        setAppliedFilters(prevFilters => ({
            ...prevFilters,
            college: filters.college,
            playerName: filters.playerName,
            year: '', // Ensure year is reset to empty string in applied filters if it's no longer selectable
            position: '', // Ensure position is reset to empty string in applied filters if it's no longer selectable
        }));
        setHasSearched(true); // Mark that a search has been initiated
    }, []);

    const handleResetAllFilters = useCallback(() => {
        setAppliedFilters({ college: '', year: '', position: '', playerName: '' });
        setPlayers([]);
        setPlayerError(null);
        setSortBy('lastName'); // Reset sort options
        setSortOrder('asc'); // Reset sort options
        setHasSearched(false); // Reset search state
    }, []);

    // Sorting Logic Function
    const getSortedPlayers = useCallback((playersToSort: CfbdPlayer[]) => {
        if (!playersToSort || playersToSort.length === 0) {
            return [];
        }

        return [...playersToSort].sort((a, b) => {
            let valA: any, valB: any;

            // Handle potential null values for sorting keys
            const getSortValue = (player: CfbdPlayer, key: string) => {
                switch (key) {
                    case 'lastName':
                        return player.lastName || '';
                    case 'firstName':
                        return player.firstName || '';
                    case 'position':
                        return player.position || '';
                    case 'jersey':
                        // Use 0 for null/invalid jersey numbers to sort them consistently (e.g., at the beginning/end)
                        return player.jersey !== null ? parseInt(player.jersey.toString(), 10) : 0;
                    default:
                        return '';
                }
            };

            valA = getSortValue(a, sortBy);
            valB = getSortValue(b, sortBy);

            if (typeof valA === 'string' && typeof valB === 'string') {
                const comparison = valA.localeCompare(valB);
                return sortOrder === 'asc' ? comparison : -comparison;
            } else { // Assuming numerical for jersey
                const comparison = valA - valB;
                return sortOrder === 'asc' ? comparison : -comparison;
            }
        });
    }, [sortBy, sortOrder]); // Re-memoize if sort criteria change

    // Apply sorting to the players whenever the players array or sort criteria change
    const sortedPlayers = getSortedPlayers(players);

    return (
        <div className="App"> {/* Uses the .App class from globals.css */}
            <header> {/* Uses the header class from globals.css */}
                <h1>CFB26 Teambuilder</h1>
                <p>College Football Player Search (CFBD API)</p>
                <p>Find college players by team or name.</p>
            </header>

            <div className="main-container"> {/* Uses the .main-container class from globals.css */}
                <FilterSidebar
                    onApplyFilters={handleApplyFilters}
                    colleges={apiColleges}
                    years={apiYears} // Still passed, but not used in FilterSidebar for rendering
                    positions={apiPositions} // Still passed, but not used in FilterSidebar for rendering
                    isLoadingFilters={isLoadingFilters}
                    onResetFilters={handleResetAllFilters}
                    currentCollege={appliedFilters.college}
                    currentYear={appliedFilters.year} // Still passed, but not used in FilterSidebar for rendering
                    currentPosition={appliedFilters.position} // Still passed, but not used in FilterSidebar for rendering
                    currentSearchName={appliedFilters.playerName}
                />
                <PlayerResults
                    players={sortedPlayers} // Pass the already sorted players
                    isLoadingPlayers={isLoadingPlayers}
                    error={playerError}
                    currentSearchYear={appliedFilters.year} // Year might be empty string now, will default to 2024 in PlayerCard via 'N/A Season'
                    // Pass sorting state and setters to PlayerResults
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    hasSearched={hasSearched}
                />
            </div>

            <footer> {/* Uses the footer class from globals.css */}
                <p>&copy; 2025 College Football Player Database POC</p>
            </footer>
        </div>
    );
};

export default CollegeFootballApp;