"use client"; // Essential for using useState and other client-side hooks

import React, { useState, useEffect, useMemo } from 'react';

// --- Interfaces (remain the same as they define data structure) ---
interface Player {
    name: string;
    college: string;
    position: string;
    year: string;
    ovr: number;
}

// PlayerCardProps and PlayerResultsProps are now conceptually unused in this layout,
// but kept for reference if you ever re-add the display section.
interface PlayerCardProps {
    player: Player;
}

interface FilterSidebarProps {
    onFilterChange: (filters: { college: string; year: string; position: string }) => void;
    colleges: string[];
    years: string[];
    positions: string[];
    // Optionally, pass current selected values if needed for external reset/display
    currentCollege: string;
    currentYear: string;
    currentPosition: string;
}

// Removed PlayerResultsProps as the section is gone

// --- PlayerCard Component (defined but not used in this layout) ---
// Kept for conceptual understanding if you wanted to bring back player display later
const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
    return (
        <div className="player-card">
            <h4>{player.name}</h4>
            <p>{player.college} | {player.position} | {player.year} Season</p>
            <p>OVR: {player.ovr}</p>
        </div>
    );
};

// --- FilterSidebar Component ---
const FilterSidebar: React.FC<FilterSidebarProps> = ({
    onFilterChange,
    colleges,
    years,
    positions,
    currentCollege,
    currentYear,
    currentPosition
}) => {
    // State managed by parent, values passed down. Local state here is for select input values.
    const [collegeValue, setCollegeValue] = useState<string>(currentCollege);
    const [yearValue, setYearValue] = useState<string>(currentYear);
    const [positionValue, setPositionValue] = useState<string>(currentPosition);

    // Update parent's filters whenever a local selection changes
    useEffect(() => {
        onFilterChange({
            college: collegeValue,
            year: yearValue,
            position: positionValue,
        });
    }, [collegeValue, yearValue, positionValue, onFilterChange]);

    return (
        <aside className="filter-sidebar">
            <h2>Filter Players</h2> {/* More action-oriented title */}

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
        </aside>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
    // Dummy data (can be moved or fetched)
    const allPlayers: Player[] = [
        { name: 'Joe Burrow', college: 'LSU', position: 'QB', year: '2019', ovr: 99 },
        { name: 'Jabrill Peppers', college: 'Michigan', position: 'ATH', year: '2016', ovr: 97 },
        { name: 'Player Name 3', college: 'Ohio State', position: 'RB', year: '2018', ovr: 85 },
        { name: 'Player Name 4', college: 'LSU', position: 'WR', year: '2019', ovr: 90 },
        { name: 'Player Name 5', college: 'Michigan', position: 'DL', year: '2017', ovr: 92 },
        { name: 'Player Name 6', college: 'Texas A&M', position: 'LB', year: '2019', ovr: 88 },
        { name: 'Player Name 7', college: 'USC', position: 'CB', year: '2017', ovr: 86 },
        { name: 'Player Name 8', college: 'Clemson', position: 'DE', year: '2018', ovr: 91 },
    ];

    // State to hold current filter selections
    const [filters, setFilters] = useState({
        college: '',
        year: '',
        position: '',
    });

    // Derive available filter options from allPlayers data
    const availableColleges = useMemo(() => {
        const colleges = new Set(allPlayers.map(p => p.college));
        return Array.from(colleges).sort();
    }, [allPlayers]);

    const availableYears = useMemo(() => {
        const years = new Set(allPlayers.map(p => p.year));
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
    }, [allPlayers]);

    const availablePositions = useMemo(() => {
        const positions = new Set(allPlayers.map(p => p.position));
        return Array.from(positions).sort();
    }, [allPlayers]);

    return (
        <div className="App">
            <header>
                <h1>CFB Player Filter</h1>
                <p>Select criteria to explore player attributes</p>
            </header>

            <div className="main-container">
                <FilterSidebar
                    onFilterChange={setFilters}
                    colleges={availableColleges}
                    years={availableYears}
                    positions={availablePositions}
                    currentCollege={filters.college}
                    currentYear={filters.year}
                    currentPosition={filters.position}
                />
                {/* The Player Results section is explicitly removed here */}
                {/* If you wanted to see the applied filters, you could add: */}
                {/* <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', flexGrow: 1 }}>
                    <h2>Applied Filters:</h2>
                    <p>College: {filters.college || 'N/A'}</p>
                    <p>Year: {filters.year || 'N/A'}</p>
                    <p>Position: {filters.position || 'N/A'}</p>
                </div> */}
            </div>

            <footer>
                <p>&copy; 2025 CFB Player Database POC</p>
            </footer>
        </div>
    );
};

export default App;
