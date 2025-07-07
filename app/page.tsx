// src/app/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import './globals.css';

// --- Interfaces for CollegeFootballData.com API ---

// UPDATED: Based on the /player/search endpoint response
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
    hometown: string | null; // e.g., "Plymouth" (New field)
    teamColor: string | null; // e.g., "#00274c" (New field)
    teamColorSecondary: string | null; // e.g., "#ffcb05" (New field)
}

// NEW INTERFACE: Added CfbdTeam definition for the teams API response
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
    classification: string | null; // e.g., "FBS", "FCS"
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
    players: CfbdPlayer[];
    isLoadingPlayers: boolean;
    error: string | null;
    currentSearchYear: string; // Added to pass down to PlayerCard
}

// --- PlayerCard Component ---
const PlayerCard: React.FC<PlayerCardProps> = ({ player, searchYear }) => {
    // Use player.name if available, otherwise combine firstName and lastName
    const displayName = player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'N/A Name';

    return (
        <div className="player-card">
            <h4>{displayName}</h4>
            {/* Display searchYear instead of player.year */}
            <p>{player.team || 'N/A Team'} | {player.position || 'N/A Pos'} | {searchYear || 'N/A Season'}</p>
            {player.jersey && <p>Jersey: #{player.jersey}</p>}
            {player.height && player.weight && (
                <p>Height: {Math.floor(player.height / 12)}'{player.height % 12}" | Weight: {player.weight} lbs</p>
            )}
            {player.hometown && <p>Hometown: {player.hometown}</p>}
            {player.teamColor && (
                <div style={{ display: 'flex', marginTop: '5px', gap: '5px', justifyContent: 'center' }}>
                    <div style={{ width: '20px', height: '20px', backgroundColor: player.teamColor, border: '1px solid #ddd' }} title="Primary Team Color"></div>
                    {player.teamColorSecondary && (
                        <div style={{ width: '20px', height: '20px', backgroundColor: player.teamColorSecondary, border: '1px solid #ddd' }} title="Secondary Team Color"></div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- PlayerResults Component ---
const PlayerResults: React.FC<PlayerResultsProps> = ({ players, isLoadingPlayers, error, currentSearchYear }) => {
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
                        // Pass currentSearchYear to PlayerCard
                        <PlayerCard key={player.id} player={player} searchYear={currentSearchYear} />
                    ))
                ) : (
                    <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No College Football players found matching your criteria. Try adjusting your filters.</p>
                )}
            </div>
        </main>
    );
};

// --- FilterSidebar Component (no changes needed here from previous version) ---
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
                                {colleges.length > 0 ? (
                                    colleges.map((college) => (
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


// --- Main App Component ---
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

    const [collegeNameToIdMap, setCollegeNameToIdMap] = useState<Map<string, number>>(new Map());

    // Keeping these here for the filter options fetch which still hits CFBD directly (client-side)
    const CFBD_API_KEY = '92cDQTO7wJWHaqwFq9FBkJYIG/yWei+B5QihvcPX81fn332tSeamNOzyVT0FGUT9';
    const CFBD_BASE_URL = 'https://api.collegefootballdata.com';


    // 1. Fetch data for filter dropdowns (runs once on mount)
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setIsLoadingFilters(true);
            setPlayerError(null);

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
                const currentYearForTeams = '2024';

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

                const teamsData: CfbdTeam[] = await teamsResponse.json(); // Now CfbdTeam is defined
                console.log("Raw teamsData from API (for filters):", teamsData);

                const filteredTeams = teamsData.filter(
                    (team) => {
                        const classification = team.classification?.toUpperCase();
                        const isFbsFcs = classification === 'FBS' || classification === 'FCS';
                        return isFbsFcs;
                    }
                ).sort((a, b) => a.school.localeCompare(b.school));

                const nameToIdMap = new Map<string, number>();
                const collegesForDropdown = filteredTeams.map(team => {
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

    // 2. Fetch players based on applied filters (uses the proxy)
    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        setPlayerError(null);
        setPlayers([]);

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
                // The /player/search endpoint might not support position directly
                // You might need to filter by position client-side or check CFBD docs for another endpoint
                // For now, it will be sent, but might be ignored by CFBD API
                queryParams.append('position', appliedFilters.position);
            }
            if (appliedFilters.playerName) {
                // The /player/search endpoint expects 'searchTerm' for player name
                // Our client-side page.tsx sends it as 'search', so proxy maps 'search' to 'searchTerm'
                queryParams.append('search', appliedFilters.playerName);
            }


            const url = `/api/cfbd-proxy?${queryParams.toString()}`;
            console.log("Fetching players via proxy URL:", url);

            const response = await fetch(url); // No headers needed here; proxy handles them

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
    }, [appliedFilters, apiYears]);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers, appliedFilters, isLoadingFilters]);


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
                    currentSearchYear={appliedFilters.year} // Pass the year from filters
                />
            </div>

            <footer>
                <p>&copy; 2025 College Football Player Database POC</p>
            </footer>
        </div>
    );
};

export default CollegeFootballApp;