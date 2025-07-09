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
    onApplyFilters: (filters: { college: string }) => void;
    colleges: { name: string; id: number }[];
    isLoadingFilters: boolean;
    onResetFilters: () => void;
    currentCollege: string;
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
    const displayName = player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'N/A Name';
    const encodedPlayer = encodeURIComponent(JSON.stringify(player));

    return (
        <Link href={`/player/${player.id}?player=${encodedPlayer}&year=${searchYear}`}>
            <div className="player-card">
                <h4>{displayName}</h4>
                <p>{player.team || 'N/A Team'} | {player.position || 'N/A Pos'} | {searchYear || 'N/A Season'}</p>
                {player.jersey !== null && <p>Jersey: #{player.jersey}</p>}
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
    isLoadingFilters,
    onResetFilters,
    currentCollege,
}) => {
    const [collegeValue, setCollegeValue] = useState<string>(currentCollege);

    useEffect(() => {
        setCollegeValue(currentCollege);
    }, [currentCollege]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onApplyFilters({
            college: collegeValue,
        });
    };

    const handleReset = () => {
        setCollegeValue('');
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
                                        <option
                                            key={college.id}
                                            value={college.name}
                                        >
                                            {college.name || `Team ID: ${college.id}`}
                                        </option>
                                    ))
                                ) : (
                                    <option value="" disabled>No teams loaded</option>
                                )}
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
    const [appliedFilters, setAppliedFilters] = useState({
        college: '',
        year: '2025',
    });

    const [players, setPlayers] = useState<CfbdPlayer[]>([]);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
    const [playerError, setPlayerError] = useState<string | null>(null);

    const [sortBy, setSortBy] = useState<string>('lastName');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const [hasSearched, setHasSearched] = useState(false);


    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    const [apiColleges, setApiColleges] = useState<{ name: string; id: number }[]>([]);
    const [collegeNameToIdMap, setCollegeNameToIdMap] = useState<Map<string, number>>(new Map());


    // 1. Fetch data for filter dropdowns (runs once on mount) - NOW USES PROXY!
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setIsLoadingFilters(true);
            setPlayerError(null);

            try {
                const currentYearForTeams = '2024'; // Keeping it 2024 as it has more stable data
                const teamsProxyUrl = `/api/ai-overview?target=teams&year=${currentYearForTeams}`;

                console.log(`[UI - Fetch Filter Options] Fetching teams for year: ${currentYearForTeams} via proxy: ${teamsProxyUrl}`);
                const teamsResponse = await fetch(teamsProxyUrl);

                if (!teamsResponse.ok) {
                    const errorBody = await teamsResponse.text();
                    console.error(`[UI - Fetch Filter Options] Error from proxy when fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}. Details:`, errorBody);
                    throw new Error(`Proxy error fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}. Details: ${errorBody}`);
                }

                const teamsData: CfbdTeam[] = await teamsResponse.json();
                console.log("[UI - Fetch Filter Options] Raw teamsData from API (for filters) via proxy:", teamsData);

                // --- DEBUG STEP 1: Raw FBS/FCS teams before any sorting/mapping ---
                const rawFbsFcsTeams = teamsData.filter(team => {
                    const classification = team.classification?.toLowerCase();
                    return (classification === 'fbs' || classification === 'fcs') && team.school && typeof team.id === 'number';
                });
                console.log("[UI - DEBUG] Raw filtered FBS/FCS teams (before custom sort):", rawFbsFcsTeams.map(t => ({ school: t.school, classification: t.classification })));
                // --- END DEBUG STEP 1 ---


                const nameToIdMap = new Map<string, number>();
                const collegesForDropdown: { name: string; id: number }[] = [];

                // Filter for FBS/FCS and valid data, then sort as requested
                const filteredAndSortedTeams = teamsData
                    .filter(
                        (team) => {
                            const classification = team.classification?.toLowerCase();
                            const isValid = (classification === 'fbs' || classification === 'fcs') && team.school && typeof team.id === 'number';
                            return isValid;
                        }
                    )
                    .sort((a, b) => {
                        const classA = a.classification?.toLowerCase();
                        const classB = b.classification?.toLowerCase();

                        // FBS comes before FCS
                        if (classA === 'fbs' && classB === 'fcs') return -1;
                        if (classA === 'fcs' && classB === 'fbs') return 1;

                        // Within the same classification, sort alphabetically by school name
                        const schoolA = a.school || '';
                        const schoolB = b.school || '';
                        return schoolA.localeCompare(schoolB);
                    });

                filteredAndSortedTeams.forEach(team => {
                    nameToIdMap.set(team.school, team.id);
                    collegesForDropdown.push({ name: team.school, id: team.id });
                });

                setApiColleges(collegesForDropdown);
                setCollegeNameToIdMap(nameToIdMap);

                // --- DEBUG STEP 2: Final sorted FBS/FCS teams for dropdown ---
                console.log("[UI - DEBUG] Final sorted FBS/FCS teams for dropdown:", collegesForDropdown);
                // --- END DEBUG STEP 2 ---

            } catch (error: any) {
                console.error('[UI - Fetch Filter Options] Error in fetchFilterOptions:', error);
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
        setPlayers([]);

        const hasCollege = appliedFilters.college !== '';

        if (!hasCollege && !hasSearched) {
            setIsLoadingPlayers(false);
            return;
        }

        try {
            const queryParams = new URLSearchParams();
            queryParams.append('target', 'players');

            const seasonToQuery = '2025';
            queryParams.append('year', seasonToQuery);

            if (appliedFilters.college) {
                queryParams.append('team', appliedFilters.college);
            }

            const url = `/api/ai-overview?${queryParams.toString()}`;
            console.log("[UI - Fetch Players] Fetching players via proxy URL:", url);

            const response = await fetch(url);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[UI - Fetch Players] Error from proxy: ${response.status} ${response.statusText}. Details:`, errorBody);
                throw new Error(`Proxy error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
            }

            const data: CfbdPlayer[] = await response.json();

            setPlayers(data || []);
            console.log("[UI - Fetch Players] Fetched players via proxy:", data);

        } catch (error: any) {
            console.error('[UI - Fetch Players] Error fetching players:', error);
            setPlayerError(error.message || 'Failed to fetch players. Check network or server logs.');
            setPlayers([]);
        } finally {
            setIsLoadingPlayers(false);
        }
    }, [appliedFilters, hasSearched]);


    // Trigger player fetch when filters change or initially if a default search should occur
    useEffect(() => {
        const shouldFetch = hasSearched || (appliedFilters.college !== '');

        if (shouldFetch) {
            fetchPlayers();
        }
    }, [fetchPlayers, appliedFilters, hasSearched]);


    const handleApplyFilters = useCallback((filters: { college: string }) => {
        setAppliedFilters(prevFilters => ({
            ...prevFilters,
            college: filters.college,
        }));
        setHasSearched(true);
    }, []);

    const handleResetAllFilters = useCallback(() => {
        setAppliedFilters({ college: '', year: '2025' });
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
                        return player.position || '';
                    case 'jersey':
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
            } else {
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
                <p>Find college players by team for the 2025 season.</p>
            </header>

            <div className="main-container">
                <FilterSidebar
                    onApplyFilters={handleApplyFilters}
                    colleges={apiColleges}
                    isLoadingFilters={isLoadingFilters}
                    onResetFilters={handleResetAllFilters}
                    currentCollege={appliedFilters.college}
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