// src/app/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
// Import the CSS Module
import playerCardStyles from './styles/PlayerCard.module.css'; // Corrected import path

// --- Interfaces for CollegeFootballData.com API ---

interface CfbdPlayer {
    id: string;
    team: string;
    name: string;
    firstName: string;
    lastName: string;
    weight: number | null;
    height: number | null;
    jersey: number | null;
    position: string | null;
    hometown: string | null;
    teamColor: string | null;
    teamColorSecondary: string | null;
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
    searchYear: string;
}

interface PlayerResultsProps {
    players: CfbdPlayer[];
    isLoadingPlayers: boolean;
    error: string | null;
    currentSearchYear: string;
}

// --- PlayerCard Component (UPDATED to use CSS Modules) ---
const PlayerCard: React.FC<PlayerCardProps> = ({ player, searchYear }) => {
    const displayName = player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'N/A Name';
    const encodedPlayer = encodeURIComponent(JSON.stringify(player));

    return (
        <Link
            href={`/player/${player.id}?player=${encodedPlayer}&year=${searchYear}`}
            className={playerCardStyles.playerCardLink} // Optional: if you need link-specific styling
        >
            {/* Apply the CSS Module class to the div */}
            <div className={playerCardStyles.playerCard}>
                <h4>{displayName}</h4>
                <p>{player.team || 'N/A Team'} | {player.position || 'N/A Pos'} | {searchYear || 'N/A Season'}</p>
                {player.jersey && <p>Jersey: #{player.jersey}</p>}
                {player.height && player.weight && (
                    <p>Height: {Math.floor(player.height / 12)}'{player.height % 12}" | Weight: {player.weight} lbs</p>
                )}
            </div>
        </Link>
    );
};


// --- PlayerResults Component (UPDATED to use CSS Modules for grid) ---
const PlayerResults: React.FC<PlayerResultsProps> = ({ players, isLoadingPlayers, error, currentSearchYear }) => {
    if (isLoadingPlayers) {
        return (
            <main className="flex-1 p-6 flex items-center justify-center bg-gray-900 text-white">
                <div className="text-xl">Loading players...</div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex-1 p-6 flex items-center justify-center bg-gray-900 text-red-500">
                <div className="text-xl">Error fetching players: {error}</div>
            </main>
        );
    }

    return (
        <main className="flex-1 bg-gray-900 text-white p-6"> {/* Added padding directly here */}
            <h2 className="text-3xl font-bold text-center mb-6 text-blue-400">College Football Player Profiles</h2>
            {/* Use the CSS Module class for the grid */}
            <div className={playerCardStyles.playerGrid}>
                {players.length > 0 ? (
                    players.map((player) => (
                        <PlayerCard key={player.id} player={player} searchYear={currentSearchYear} />
                    ))
                ) : (
                    <p className="text-center text-gray-400" style={{ gridColumn: '1 / -1' }}>No College Football players found matching your criteria. Try adjusting your filters.</p>
                )}
            </div>
        </main>
    );
};

// --- FilterSidebar Component (no changes needed) ---
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
        <aside className="w-full md:w-64 bg-gray-800 p-6 shadow-lg flex-shrink-0">
            <h2 className="text-2xl font-bold mb-6 text-blue-400">College Football Player Filters</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {isLoadingFilters ? (
                    <div className="flex justify-center items-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <>
                        <div className="filter-group">
                            <h3 className="text-lg font-semibold mb-2 text-gray-200">Season (Year)</h3>
                            <select
                                value={yearValue}
                                onChange={(e) => setYearValue(e.target.value)}
                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Years</option>
                                {years.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <h3 className="text-lg font-semibold mb-2 text-gray-200">College Team</h3>
                            <select
                                value={collegeValue}
                                onChange={(e) => setCollegeValue(e.target.value)}
                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                        <div className="filter-group">
                            <h3 className="text-lg font-semibold mb-2 text-gray-200">Position</h3>
                            <select
                                value={positionValue}
                                onChange={(e) => setPositionValue(e.target.value)}
                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Positions</option>
                                {positions.map((pos) => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <h3 className="text-lg font-semibold mb-2 text-gray-200">Player Name</h3>
                            <input
                                type="text"
                                placeholder="First or Last Name"
                                value={playerNameValue}
                                onChange={(e) => setPlayerNameValue(e.target.value)}
                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex flex-col space-y-3 pt-4">
                            <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300">Search Players</button>
                            <button type="button" className="w-full py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition duration-300" onClick={handleReset}>Reset Filters</button>
                        </div>
                    </>
                )}
            </form>
        </aside>
    );
};


// --- Main App Component (Updated with flex layout) ---
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


    // 1. Fetch data for filter dropdowns (runs once on mount) - NOW USES PROXY!
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

                // --- Fetch Teams from CFBD API via Proxy ---
                const currentYearForTeams = '2024';
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

        const hasActiveFilters = Object.values(appliedFilters).some(value => value !== '') || appliedFilters.playerName !== '';
        if (!hasActiveFilters) {
            setIsLoadingPlayers(false);
            return;
        }

        try {
            const queryParams = new URLSearchParams();
            queryParams.append('target', 'players');

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
        <div className="min-h-screen flex flex-col bg-gray-900 text-white"> {/* Updated main container */}
            <header className="bg-gray-800 text-white p-6 shadow-md text-center">
                <h1 className="text-4xl font-extrabold mb-2 text-blue-400">CFB26 Teambuilder</h1>
                <p className="text-xl text-gray-300">College Football Player Search (CFBD API)</p>
                <p className="text-md text-gray-400 mt-2">Find college players by team, season, position, or name.</p>
            </header>

            <div className="flex flex-col md:flex-row flex-1"> {/* Main content area: sidebar and results */}
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
                    currentSearchYear={appliedFilters.year}
                />
            </div>

            <footer className="bg-gray-800 text-gray-400 p-4 text-center text-sm shadow-inner">
                <p>&copy; 2025 College Football Player Database POC</p>
            </footer>
        </div>
    );
};

export default CollegeFootballApp;