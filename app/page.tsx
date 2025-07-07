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

    // Update local state when props from parent change (e.g., after reset)
    useEffect(() => {
        // These logs help debug if the FilterSidebar receives correct data
        console.log("FilterSidebar received colleges prop:", colleges);
        console.log("FilterSidebar colleges.length:", colleges.length);

        setCollegeValue(currentCollege);
    }, [currentCollege, currentYear, currentPosition, currentSearchName, colleges]);

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

    // --- API Configuration ---
    // These constants are now used only for fetching filter options directly
    // The player search will go through your proxy.
    // The actual CFBD_API_KEY is now in your .env.local and used by the proxy route.
    const CFBD_API_KEY = '92cDQTO7wJWHaqwFq9FBkJYIG/yWei+B5QihvcPX81fn332tSeamNOzyVT0FGUT9'; // Keep this here for filter options fetch
    const CFBD_BASE_URL = 'https://api.collegefootballdata.com'; // Keep this here for filter options fetch


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
                console.log("1. Raw teamsData from API:", teamsData);

                const filteredTeams = teamsData.filter(
                    (team) => {
                        const classification = team.classification?.toUpperCase();
                        const isFbsFcs = classification === 'FBS' || classification === 'FCS';
                        return isFbsFcs;
                    }
                ).sort((a, b) => a.school.localeCompare(b.school));

                console.log("2. Filtered FBS/FCS Teams:", filteredTeams);

                const nameToIdMap = new Map<string, number>();
                const collegesForDropdown = filteredTeams.map(team => {
                    nameToIdMap.set(team.school, team.id);
                    return { name: team.school, id: team.id };
                });

                console.log("3. Colleges prepared for dropdown:", collegesForDropdown);
                setApiColleges(collegesForDropdown);
                setCollegeNameToIdMap(nameToIdMap);
                console.log("4. CFBD College to ID Map built:", nameToIdMap);


                // --- Fetch Positions from a known list (CFBD doesn't have a direct /positions endpoint) ---
                const commonPositions = [
                    'QB', 'K', 'P', 'LS', 'RB', 'FB', 'WR', 'TE', 'C', 'OG', 'OT', 'OL',
                    'DE', 'DT', 'DL', 'LB', 'ILB', 'OLB', 'CB', 'S', 'DB', 'FS', 'SS',
                    'ATH', 'PK', 'ST'
                ].sort();

                setApiPositions(commonPositions);

            } catch (error: any) {
                console.error('Error in fetchFilterOptions:', error);
                setPlayerError(`Failed to load initial filter options: ${error.message || 'Unknown error'}. Please check your API key and network connection.`);
            } finally {
                setIsLoadingFilters(false);
            }
        };

        fetchFilterOptions();
    }, [CFBD_API_KEY, CFBD_BASE_URL]); // Keep these dependencies for the filter options fetch

    // 2. Fetch players based on applied filters (now uses the proxy)
    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        setPlayerError(null);
        setPlayers([]); // Clear previous results

        const hasActiveFilters = Object.values(appliedFilters).some(value => value !== '') || appliedFilters.playerName !== '';
        if (!hasActiveFilters) {
            setIsLoadingPlayers(false);
            return;
        }

        try {
            const queryParams = new URLSearchParams();
            const seasonToQuery = appliedFilters.year || (apiYears.length > 0 ? apiYears[0] : '2024');
            queryParams.append('year', seasonToQuery);
            if (appliedFilters.college) {
                queryParams.append('team', appliedFilters.college);
            }
            if (appliedFilters.position) {
                queryParams.append('position', appliedFilters.position);
            }
            if (appliedFilters.playerName) {
                queryParams.append('search', appliedFilters.playerName);
            }

            // --- IMPORTANT CHANGE: Call your internal Next.js API proxy route ---
            const url = `/api/cfbd-proxy?${queryParams.toString()}`;
            console.log("Fetching players via proxy URL:", url); // DEBUG LOG

            const response = await fetch(url, {
                // No Authorization or Cache-Control headers needed here; proxy handles them server-side
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Error from proxy: ${response.status} ${response.statusText}. Details:`, errorBody);
                throw new Error(`Proxy error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
            }

            const data: CfbdPlayer[] = await response.json();

            setPlayers(data || []);
            console.log("Fetched players via proxy:", data); // DEBUG LOG

        } catch (error: any) {
            console.error('Error fetching players:', error);
            setPlayerError(error.message || 'Failed to fetch players. Check network or server logs.');
            setPlayers([]);
        } finally {
            setIsLoadingPlayers(false);
        }
    }, [appliedFilters, apiYears]); // Dependencies updated: removed CFBD_API_KEY, CFBD_BASE_URL


    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers, appliedFilters, isLoadingFilters]);


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