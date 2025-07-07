// src/app/page.tsx

"use client"; // Essential for using useState, useEffect, and other client-side hooks

import React, { useState, useEffect, useCallback } from 'react';
import './globals.css'; // Assuming you have some global styles here

// --- Interfaces for CollegeFootballData.com API ---

interface CfbdTeam {
    id: number;
    school: string; // Team name (e.g., "LSU")
    mascot: string;
    abbreviation: string;
    alt_name1: string | null;
    alt_name2: string | null;
    alt_name3: string | null;
    classification: 'FBS' | 'FCS' | 'II' | 'III' | string | null; // Added 'string' as a fallback type if API returns unexpected string
    conference: string;
    division: string;
    color: string | null;
    alt_color: string | null;
    logos: string[] | null; // Array of logo URLs
    twitter: string | null;
    venue_id: number;
    year: number; // The season this team data is for
}

interface CfbdPlayer {
    id: number;
    first_name: string;
    last_name: string;
    home_city: string | null;
    home_state: string | null;
    home_country: string | null;
    home_latitude: number | null;
    home_longitude: number | null;
    height: number | null; // inches
    weight: number | null; // pounds
    jersey: number | null;
    position: string | null; // e.g., "QB", "RB"
    squad_id: number; // Team ID for the player's team roster (CFBD API might use team.id directly)
    team: string; // Team name (e.g., "LSU") - this is the school name from CfbdTeam.school
    year: number; // The season this player data is for
    current_p5_school: boolean | null; // Indicates if currently at Power 5 school
    transfer_status: string | null; // e.g., "active", "out"
    usage: {
        overall: number; // Player's overall usage
        quarterback: number;
        offense: number;
        defense: number;
        specialTeams: number;
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
}

interface PlayerResultsProps {
    players: CfbdPlayer[];
    isLoadingPlayers: boolean;
    error: string | null;
}

// --- PlayerCard Component ---
const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
    return (
        <div className="player-card">
            <h4>{`${player.first_name || ''} ${player.last_name || ''}`.trim() || 'N/A Name'}</h4>
            <p>{player.team || 'N/A Team'} | {player.position || 'N/A Pos'} | {player.year || 'N/A Season'}</p>
            {player.jersey && <p>Jersey: #{player.jersey}</p>}
            {player.height && player.weight && (
                <p>Height: {Math.floor(player.height / 12)}'{player.height % 12}" | Weight: {player.weight} lbs</p>
            )}
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
    colleges, // Make sure 'colleges' is destructured here
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

    // Update local state when props from parent change (e.g., after reset)
    useEffect(() => {
        console.log("FilterSidebar received colleges prop:", colleges); // DEBUG LOG
        console.log("FilterSidebar colleges.length:", colleges.length); // DEBUG LOG

        setCollegeValue(currentCollege);
    }, [currentCollege, currentYear, currentPosition, currentSearchName, colleges]); // ADD 'colleges' to dependency array

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
                                {/* Ensure colleges array is not empty before mapping */}
                                {colleges.length > 0 ? (
                                    colleges.map((college) => (
                                        // Use college.name as key since IDs might not be unique if fetched from different years
                                        <option key={college.name} value={college.name}>{college.name}</option>
                                    ))
                                ) : (
                                    <option value="" disabled>No teams loaded</option>
                                )}
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

    const [players, setPlayers] = useState<CfbdPlayer[]>([]);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
    const [playerError, setPlayerError] = useState<string | null>(null);

    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    const [apiColleges, setApiColleges] = useState<{ name: string; id: number }[]>([]);
    const [apiYears, setApiYears] = useState<string[]>([]);
    const [apiPositions, setApiPositions] = useState<string[]>([]);

    // Store the mapping of college name to ID for API requests
    const [collegeNameToIdMap, setCollegeNameToIdMap] = useState<Map<string, number>>(new Map());

    // --- CollegeFootballData.com API KEY & HOST ---
    // Make sure this key is correct and active.
    const CFBD_API_KEY = '92cDQTO7wJWHaqwFq9FBkJYIG/yWei+B5QihvcPX81fn332tSeamNOzyVT0FGUT9';
    const CFBD_BASE_URL = 'https://api.collegefootballdata.com';

    // 1. Fetch data for filter dropdowns (runs once on mount)
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setIsLoadingFilters(true);
            setPlayerError(null); // Clear any previous player errors

            try {
                // --- Generate Years 1940-2025 ---
                const startYear = 1940;
                const endYear = 2025;
                const generatedYears: string[] = [];
                for (let year = endYear; year >= startYear; year--) {
                    generatedYears.push(year.toString());
                }
                setApiYears(generatedYears);

                // --- Fetch Teams from CFBD API (FBS & FCS) ---
                // IMPORTANT: If 2025 data seems incomplete or classifications are missing,
                // temporarily change `currentYearForTeams` to '2024' or '2023'.
                // Some APIs don't fully populate future season data (like classifications) until closer to the season.
                const currentYearForTeams = '2024'; // Recommended to use a recent, fully populated year for initial team list

                console.log(`Fetching teams for year: ${currentYearForTeams}`);
                const teamsResponse = await fetch(`${CFBD_BASE_URL}/teams?year=${currentYearForTeams}`, {
                    headers: {
                        'Authorization': `Bearer ${CFBD_API_KEY}`,
                    },
                });

                if (!teamsResponse.ok) {
                    const errorBody = await teamsResponse.text();
                    console.error(`CFBD API Error fetching teams (${currentYearForTeams}):`, teamsResponse.status, teamsResponse.statusText, errorBody);
                    throw new Error(`Failed to load college teams from CFBD API for ${currentYearForTeams}. Status: ${teamsResponse.status}.`);
                }

                const teamsData: CfbdTeam[] = await teamsResponse.json();
                console.log("1. Raw teamsData from API:", teamsData); // DEBUG LOG - Examine this for classification values!

                const filteredTeams = teamsData.filter(
                    (team) => {
                        // Ensure classification is a string before comparison, and handle potential variations
                        const classification = team.classification?.toUpperCase(); // Convert to uppercase for robust comparison
                        const isFbsFcs = classification === 'FBS' || classification === 'FCS';
                        // UNCOMMENT BELOW FOR VERY VERBOSE DEBUGGING OF EACH TEAM'S CLASSIFICATION
                        // console.log(`Team: ${team.school}, Classification: ${team.classification} (Upper: ${classification}), Is FBS/FCS: ${isFbsFcs}`);
                        return isFbsFcs;
                    }
                ).sort((a, b) => a.school.localeCompare(b.school)); // Sort alphabetically

                console.log("2. Filtered FBS/FCS Teams:", filteredTeams); // DEBUG LOG

                const nameToIdMap = new Map<string, number>();
                const collegesForDropdown = filteredTeams.map(team => {
                    nameToIdMap.set(team.school, team.id);
                    return { name: team.school, id: team.id };
                });

                console.log("3. Colleges prepared for dropdown:", collegesForDropdown); // DEBUG LOG
                setApiColleges(collegesForDropdown);
                setCollegeNameToIdMap(nameToIdMap);
                console.log("4. CFBD College to ID Map built:", nameToIdMap); // DEBUG LOG


                // --- Fetch Positions from a known list (CFBD doesn't have a direct /positions endpoint) ---
                const commonPositions = [
                    'QB', 'K', 'P', 'LS', 'RB', 'FB', 'WR', 'TE', 'C', 'OG', 'OT', 'OL',
                    'DE', 'DT', 'DL', 'LB', 'ILB', 'OLB', 'CB', 'S', 'DB', 'FS', 'SS',
                    'ATH', 'PK', 'ST' // Added ST for Special Teams, adjusted order for common sense
                ].sort(); // Keep them sorted

                setApiPositions(commonPositions);

            } catch (error: any) {
                console.error('Error in fetchFilterOptions:', error);
                setPlayerError(`Failed to load initial filter options: ${error.message || 'Unknown error'}. Please check your API key and network connection.`);
            } finally {
                setIsLoadingFilters(false);
            }
        };

        fetchFilterOptions();
    }, [CFBD_API_KEY, CFBD_BASE_URL]);


    // 2. Fetch players based on applied filters (runs when appliedFilters state changes)
    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        setPlayerError(null);
        setPlayers([]);

        // Don't fetch players if no filters are applied initially
        const isAnyFilterApplied = Object.values(appliedFilters).some(value => value !== '') || appliedFilters.playerName !== '';
        if (!isAnyFilterApplied) {
            setIsLoadingPlayers(false);
            return;
        }

        try {
            const queryParams = new URLSearchParams();

            // Season is required for CFBD /players endpoint
            // If no year selected, default to the latest year available or a common one like 2024
            const seasonToQuery = appliedFilters.year || (apiYears.length > 0 ? apiYears[0] : '2024');
            queryParams.append('year', seasonToQuery);

            if (appliedFilters.college) {
                // For players endpoint, CFBD often prefers 'team' (school name) or 'teamId'
                // Using 'team' (school name) here as it's directly from the dropdown.
                queryParams.append('team', appliedFilters.college);
            }

            if (appliedFilters.position) {
                queryParams.append('position', appliedFilters.position);
            }

            // CFBD's /players endpoint has a 'search' parameter for player names (first or last)
            if (appliedFilters.playerName) {
                queryParams.append('search', appliedFilters.playerName);
            }

            const url = `${CFBD_BASE_URL}/players?${queryParams.toString()}`;
            console.log("Fetching players from CFBD URL:", url); // DEBUG LOG

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`,
                },
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`CFBD API Error fetching players: ${response.status} ${response.statusText}. Details:`, errorBody);
                throw new Error(`CFBD API Error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
            }

            const data: CfbdPlayer[] = await response.json(); // CFBD /players returns an array directly

            setPlayers(data || []);
            console.log("Fetched players:", data); // DEBUG LOG

        } catch (error: any) {
            console.error('Error fetching players:', error);
            setPlayerError(error.message || 'Failed to fetch players. Check API key and network.');
            setPlayers([]);
        } finally {
            setIsLoadingPlayers(false);
        }
    }, [appliedFilters, CFBD_API_KEY, CFBD_BASE_URL, collegeNameToIdMap, apiYears]);

    useEffect(() => {
        // Only fetch players if there are active filters or a player name search
        const hasActiveFilters = Object.values(appliedFilters).some(value => value !== '') || appliedFilters.playerName !== '';
        // Only trigger fetchPlayers if filters are active OR it's the very first load and no filters are set yet
        // and we are not in the middle of loading initial filter options
        if (hasActiveFilters || (!isLoadingFilters && players.length === 0 && !playerError && !appliedFilters.college && !appliedFilters.year && !appliedFilters.position && !appliedFilters.playerName)) {
            fetchPlayers();
        }
    }, [fetchPlayers, appliedFilters, isLoadingFilters, players.length, playerError]);


    const handleApplyFilters = useCallback((filters: { college: string; year: string; position: string; playerName: string }) => {
        setAppliedFilters(filters);
    }, []);

    const handleResetAllFilters = useCallback(() => {
        setAppliedFilters({ college: '', year: '', position: '', playerName: '' });
        setPlayers([]); // Clear players on reset
        setPlayerError(null); // Clear error on reset
    }, []);

    return (
        <div className="App">
            <header>
                <h1>College Football Player Search (CFBD API)</h1>
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