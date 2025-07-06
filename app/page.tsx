"use client"; // Essential for using useState and other client-side hooks

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Interfaces ---
// Assuming a simplified player structure for filter purposes
interface Player {
    id: number; // Unique player ID from API
    name: string;
    teamId?: number; // Optional team ID
    college?: string; // College might not be directly available for all players in all APIs
    position: string;
    season: string; // The year/season the player data pertains to
}

// Interfaces for fetched filter options
interface ApiResponseCollege {
    id: number;
    name: string;
}

interface ApiResponseSeason {
    year: string;
}

interface FilterSidebarProps {
    onFilterChange: (filters: { college: string; year: string; position: string }) => void;
    colleges: string[];
    years: string[];
    positions: string[];
    currentCollege: string;
    currentYear: string;
    currentPosition: string;
    isLoadingFilters: boolean; // Indicate if filters are being loaded
    onResetFilters: () => void; // Add a reset function
}

// --- FilterSidebar Component (remains largely the same, but handles loading state) ---
const FilterSidebar: React.FC<FilterSidebarProps> = ({
    onFilterChange,
    colleges,
    years,
    positions,
    currentCollege,
    currentYear,
    currentPosition,
    isLoadingFilters,
    onResetFilters
}) => {
    const [collegeValue, setCollegeValue] = useState<string>(currentCollege);
    const [yearValue, setYearValue] = useState<string>(currentYear);
    const [positionValue, setPositionValue] = useState<string>(currentPosition);

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


    // This useEffect ensures filters are applied when selection changes
    useEffect(() => {
        onFilterChange({
            college: collegeValue,
            year: yearValue,
            position: positionValue,
        });
    }, [collegeValue, yearValue, positionValue, onFilterChange]);


    return (
        <aside className="filter-sidebar">
            <h2>Filter Players</h2>

            {isLoadingFilters ? (
                <div className="loading-spinner">Loading filters...</div>
            ) : (
                <>
                    <div className="filter-group">
                        <h3>College</h3>
                        <select value={collegeValue} onChange={(e) => setCollegeValue(e.target.value)}>
                            <option value="">All Colleges</option>
                            {colleges.map((college) => (
                                <option key={college} value={college}>{college}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <h3>Year</h3>
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
                    <button className="reset-button" onClick={onResetFilters}>Reset Filters</button>
                </>
            )}
        </aside>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
    const [filters, setFilters] = useState({
        college: '',
        year: '',
        position: '',
    });
    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    const [apiColleges, setApiColleges] = useState<string[]>([]);
    const [apiYears, setApiYears] = useState<string[]>([]);
    const [apiPositions, setApiPositions] = useState<string[]>([]);

    // This is where you would fetch data from the API
    useEffect(() => {
        const fetchFilterData = async () => {
            setIsLoadingFilters(true);
            try {
                // --- CONCEPTUAL API CALLS ---
                // Replace with your actual API key and endpoint URLs
                // For API-Sports (Football v3):
                const API_KEY = 'f307e2d6f7c992f91cdcf3abb81d3fad';
                const API_HOST = 'v3.football.api-sports.io'; // or api-football-v1.p.rapidapi.com

                // Fetch Leagues/Teams (to infer colleges if available, or just common college names)
                // API-Sports doesn't have a direct 'college' filter for NCAA.
                // For NCAA data, SportsDataIO (college football API) would be better.
                // Let's simulate for this example:
                const dummyColleges = ['LSU', 'Michigan', 'Ohio State', 'Alabama', 'Clemson', 'Texas A&M', 'USC'];
                setApiColleges(dummyColleges.sort());

                // Fetch Seasons (Years)
                // Example API-Sports endpoint: https://v3.football.api-sports.io/leagues/seasons?league={COLLEGE_LEAGUE_ID}
                // For NCAA (API-Sports NFL/NCAA provides seasons for NFL, might have limited NCAA info)
                // For SportsDataIO, you'd fetch seasons for college football specifically.
                const dummyYears = ['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016'];
                setApiYears(dummyYears.sort((a, b) => parseInt(b) - parseInt(a))); // Sort descending

                // Fetch Players (to get distinct positions)
                // Example API-Sports endpoint: https://v3.football.api-sports.io/players?league={LEAGUE_ID}&season={SEASON}
                // You'd typically fetch players for a given league/season and extract unique positions.
                const dummyPositions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'ATH', 'K', 'P'];
                setApiPositions(dummyPositions.sort());

            } catch (error) {
                console.error('Error fetching filter data:', error);
                // Handle error (e.g., show error message to user)
            } finally {
                setIsLoadingFilters(false);
            }
        };

        fetchFilterData();
    }, []); // Empty dependency array means this runs once on mount

    const handleResetFilters = useCallback(() => {
        setFilters({ college: '', year: '', position: '' });
    }, []);

    // The `filteredPlayers` logic is removed as we're not displaying them,
    // but the `filters` state still updates based on user selections.

    return (
        <div className="App">
            <header>
                <h1>CFB Player Filter</h1>
                <p>Select criteria to explore player attributes</p>
            </header>

            <div className="main-container">
                <FilterSidebar
                    onFilterChange={setFilters}
                    colleges={apiColleges}
                    years={apiYears}
                    positions={apiPositions}
                    currentCollege={filters.college}
                    currentYear={filters.year}
                    currentPosition={filters.position}
                    isLoadingFilters={isLoadingFilters}
                    onResetFilters={handleResetFilters}
                />
            </div>

            <footer>
                <p>&copy; 2025 CFB Player Database POC</p>
            </footer>
        </div>
    );
};

export default App;
