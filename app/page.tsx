// src/app/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// --- Interfaces for CollegeFootballData.com API ---
interface CfbdPlayer { // This now maps to ESPNRosterPlayer from your ai-overview/route.ts
    id: string;
    firstName: string;
    lastName: string;
    fullName: string; // The combined name
    position: { displayName: string };
    jersey: string; // ESPN returns string for jersey
    team: { displayName: string; slug: string }; // Basic team info from ESPN
    // These fields are from CFBD and might not be present in ESPN roster data, consider if you need them.
    // They will likely be 'undefined' or 'null' if not explicitly mapped in your /api/main-api route for 'players' target.
    weight: number | null;
    height: number | null;
    hometown: string | null; // This would need to be constructed from ESPN's city/state
    teamColor: string | null;
    teamColorSecondary: string | null;
}

interface CfbdTeam { // This still aligns with CFBD team data returned by the 'teams' target in your /api/main-api route
    id: number; // Assuming your proxy still returns number ID for teams
    school: string; // This is the 'name' property from the mapped FormattedTeamForFrontend
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
    onApplyFilters: (filters: { college: string; year: string; position: string; playerName: string; maxPlayers: number }) => void; // MODIFIED
    // Update colleges type to match FormattedTeamForFrontend's relevant properties
    colleges: { name: string; id: string }[]; // ID is string now from FormattedTeamForFrontend
    years: string[];
    positions: string[];
    isLoadingFilters: boolean;
    onResetFilters: () => void;
    currentCollege: string;
    currentYear: string; // Still passed but not used in rendering
    currentPosition: string; // This prop is still passed, but not used internally in FilterSidebar's state
    currentSearchName: string;
    currentMaxPlayers: number; // ADDED
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
    // Fallback if fullName is not directly available, construct from first/last
    const displayName = player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'N/A Name';

    // Encode the entire player object and the search year for the player details page
    const encodedPlayer = encodeURIComponent(JSON.stringify(player));

    return (
        // Link wraps the div to make the entire card clickable
        <Link href={`/player/${player.id}?player=${encodedPlayer}&year=${searchYear}`}>
            {/* The div inside the Link gets the styling from globals.css */}
            <div className="player-card">
                <h4>{displayName}</h4>
                {/* Use player.team.displayName as per ESPNRosterPlayer */}
                <p>{player.team?.displayName || 'N/A Team'} | {player.position?.displayName || 'N/A Pos'} | {searchYear || 'N/A Season'}</p>
                {player.jersey !== 'N/A' && <p>Jersey: #{player.jersey}</p>} {/* ESPN jersey is string */}
                {/* Height/Weight are not directly available from ESPNRosterPlayer, will be N/A. */}
                {/* If you need them here, you'd need to modify your /api/main-api to fetch ESPNPlayerDetail for all roster entries, which is inefficient. */}
                {/* Or fetch it on the detail page. For now, they will show as N/A unless you re-add them to ESPNRosterPlayer interface if possible. */}
                {/* For demonstration, I'm removing height/weight from this card as ESPNRosterPlayer doesn't have them. */}
                {/* {player.height !== null && player.weight !== null && (
                    <p>Height: {Math.floor(player.height / 12)}'{player.height % 12}" | Weight: {player.weight} lbs</p>
                )} */}
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
    currentMaxPlayers, // ADDED
}) => {
    const [collegeValue, setCollegeValue] = useState<string>(currentCollege);
    const [playerNameValue, setPlayerNameValue] = useState<string>(currentSearchName);
    const [maxPlayersValue, setMaxPlayersValue] = useState<number>(currentMaxPlayers); // ADDED

    // Update internal state when props from parent (CollegeFootballApp) change
    useEffect(() => {
        setCollegeValue(currentCollege);
    }, [currentCollege]);

    useEffect(() => {
        setPlayerNameValue(currentSearchName);
    }, [currentSearchName]);

    useEffect(() => { // ADDED
        setMaxPlayersValue(currentMaxPlayers);
    }, [currentMaxPlayers]);


    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onApplyFilters({
            college: collegeValue,
            year: '2024', // <--- HARDCODE YEAR HERE FOR PLAYER SEARCH
            position: '', // Hardcode empty as it's removed from UI
            playerName: playerNameValue.trim(),
            maxPlayers: maxPlayersValue, // ADDED
        });
    };

    const handleReset = () => {
        setCollegeValue('');
        setPlayerNameValue('');
        setMaxPlayersValue(50); // RESET TO DEFAULT, MODIFIED
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

                        {/* ADDED: Max Players Listed Filter */}
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
    // HARDCODE THE YEAR FOR PLAYER SEARCHES HERE TO '2024'
    const DEFAULT_PLAYER_SEARCH_YEAR = '2024';
    const DEFAULT_MAX_PLAYERS = 50; // ADDED DEFAULT FOR MAX PLAYERS

    const [appliedFilters, setAppliedFilters] = useState({
        college: '',
        year: DEFAULT_PLAYER_SEARCH_YEAR, // <--- Initialize with 2024
        position: '',
        playerName: '',
        maxPlayers: DEFAULT_MAX_PLAYERS, // ADDED
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
    // Updated type for apiColleges to match FormattedTeamForFrontend
    const [apiColleges, setApiColleges] = useState<{ name: string; id: string }[]>([]);
    const [apiYears, setApiYears] = useState<string[]>([]); // Still fetched but not used for filtering
    const [apiPositions, setApiPositions] = useState<string[]>([]); // Still fetched but not used for filtering

    const [collegeNameToIdMap, setCollegeNameToIdMap] = useState<Map<string, string>>(new Map()); // Changed to string for ID


    // 1. Fetch data for filter dropdowns (runs once on mount) - NOW USES CORRECT PROXY PATH!
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setIsLoadingFilters(true);
            setPlayerError(null);

            try {
                // --- Generate Years 1940-Current Year ---
                const startYear = 1940;
                const endYear = new Date().getFullYear(); // Up to current year
                const generatedYears: string[] = [];
                for (let year = endYear; year >= startYear; year--) {
                    generatedYears.push(year.toString());
                }
                setApiYears(generatedYears);

                // --- Fetch Teams from CFBD API via Proxy ---
                // Keeping 2024 for teams dropdown fetch (as per previous instructions/working state)
                const currentYearForTeams = '2024';
                const teamsProxyUrl = `/api/main-api?target=teams&year=${currentYearForTeams}`;

                console.log(`[DEBUG page.tsx] Fetching teams for year: ${currentYearForTeams} via proxy: ${teamsProxyUrl}`); // Added debug log
                const teamsResponse = await fetch(teamsProxyUrl);

                if (!teamsResponse.ok) {
                    const errorBody = await teamsResponse.text();
                    console.error(`Error from proxy when fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}. Details:`, errorBody);
                    throw new Error(`Proxy error fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}. Details: ${errorBody}`);
                }

                // Expecting FormattedTeamForFrontend[] from your /api/main-api route
                const teamsData: FormattedTeamForFrontend[] = await teamsResponse.json();
                console.log("Raw teamsData from API (for filters) via proxy:", teamsData);

                // --- Filtering for ONLY FBS and FCS classifications ---
                const fbsTeams = teamsData.filter(team => team.classification?.toUpperCase() === 'FBS');
                const fcsTeams = teamsData.filter(team => team.classification?.toUpperCase() === 'FCS');

                fbsTeams.sort((a, b) => a.collegeDisplayName.localeCompare(b.collegeDisplayName));
                fcsTeams.sort((a, b) => a.collegeDisplayName.localeCompare(b.collegeDisplayName));

                const sortedAndFilteredTeams = [...fbsTeams, ...fcsTeams];
                
                const nameToIdMap = new Map<string, string>(); // Changed to string for ID
                const collegesForDropdown = sortedAndFilteredTeams.map(team => {
                    nameToIdMap.set(team.collegeDisplayName, team.id); // Use collegeDisplayName for map key
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

    // 2. Fetch players based on applied filters - NOW USES PROXY WITH 'players' TARGET!
    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        setPlayerError(null);
        setPlayers([]); // Clear previous results immediately

        const hasActiveFilters = appliedFilters.college !== '' || appliedFilters.playerName !== '' || appliedFilters.maxPlayers !== DEFAULT_MAX_PLAYERS; // MODIFIED
        // Only return if no filters are set AND no search has been initiated (initial load)
        if (!hasActiveFilters && !hasSearched) {
            setIsLoadingPlayers(false);
            return;
        }

        try {
            const queryParams = new URLSearchParams();
            queryParams.append('target', 'players');

            // --- Use the appliedFilters.year for player search (which is now hardcoded to 2024) ---
            const seasonToQuery = appliedFilters.year;
            queryParams.append('year', seasonToQuery);

            if (appliedFilters.college) {
                queryParams.append('team', appliedFilters.college);
            }
            if (appliedFilters.playerName) {
                queryParams.append('search', appliedFilters.playerName);
            }
            // ADDED: Max Players parameter to the API request
            queryParams.append('limit', appliedFilters.maxPlayers.toString());


            const url = `/api/main-api?${queryParams.toString()}`;
            console.log("[DEBUG page.tsx] Full players proxy URL being sent:", url); // Added debug log

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
    }, [appliedFilters, hasSearched]); // Removed apiYears from dependencies as it's no longer used for player year logic

    // Trigger player fetch when filters change or initially if a default search should occur
    useEffect(() => {
        // Only trigger fetch if a search has been initiated or filters are present
        if (hasSearched || appliedFilters.college !== '' || appliedFilters.playerName !== '' || appliedFilters.maxPlayers !== DEFAULT_MAX_PLAYERS) { // MODIFIED
            fetchPlayers();
        }
    }, [fetchPlayers, appliedFilters.college, appliedFilters.playerName, appliedFilters.maxPlayers, hasSearched]); // MODIFIED DEPENDENCIES


    const handleApplyFilters = useCallback((filters: { college: string; year: string; position: string; playerName: string; maxPlayers: number }) => { // MODIFIED
        setAppliedFilters(prevFilters => ({
            ...prevFilters,
            college: filters.college,
            playerName: filters.playerName,
            maxPlayers: filters.maxPlayers, // ADDED
            // Keep the year fixed to DEFAULT_PLAYER_SEARCH_YEAR from state initialization
            year: DEFAULT_PLAYER_SEARCH_YEAR,
            position: '',
        }));
        setHasSearched(true);
    }, []);

    const handleResetAllFilters = useCallback(() => {
        setAppliedFilters({ 
            college: '', 
            year: DEFAULT_PLAYER_SEARCH_YEAR, // Reset to 2024
            position: '', 
            playerName: '',
            maxPlayers: DEFAULT_MAX_PLAYERS, // ADDED
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
                        // ESPN jersey is a string, handle conversion and potential 'N/A'
                        const jerseyA = player.jersey !== 'N/A' ? parseInt(player.jersey, 10) : 0;
                        const jerseyB = player.jersey !== 'N/A' ? parseInt(player.jersey, 10) : 0;
                        return jerseyA - jerseyB; // Direct numerical comparison
                    default:
                        return '';
                }
            };

            valA = getSortValue(a, sortBy);
            valB = getSortValue(b, sortBy);

            if (typeof valA === 'string' && typeof valB === 'string') {
                const comparison = valA.localeCompare(valB);
                return sortOrder === 'asc' ? comparison : -comparison;
            } else { // Assuming numerical for jersey, already handled in getSortValue for jersey case
                const comparison = valA - valB;
                return sortOrder === 'asc' ? comparison : -comparison;
            }
        });
    }, [sortBy, sortOrder]);

    // Apply sorting to the players whenever the players array or sort criteria change
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
                    currentYear={appliedFilters.year} // This will now correctly reflect 2024
                    currentPosition={appliedFilters.position}
                    currentSearchName={appliedFilters.playerName}
                    currentMaxPlayers={appliedFilters.maxPlayers} // ADDED
                />
                <PlayerResults
                    players={sortedPlayers}
                    isLoadingPlayers={isLoadingPlayers}
                    error={playerError}
                    currentSearchYear={appliedFilters.year} // This will also correctly reflect 2024
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