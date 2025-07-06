// At the very top of the file, before any imports
"use client";

import React, { useState } from 'react';

// Define interfaces for props and data if this were a more complete app
interface Player {
    name: string;
    college: string;
    position: string;
    year: string;
    ovr: number;
}

interface PlayerCardProps {
    player: Player;
}

interface FilterSidebarProps {
    onFilterChange: (filters: { college: string; year: string; position: string }) => void;
    colleges: string[];
    years: string[];
    positions: string[];
}

interface PlayerResultsProps {
    players: Player[];
}

// --- PlayerCard Component ---
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
// This component also uses useState internally, but because its parent (App) is
// marked "use client", it will also be a client component.
// You could also explicitly add "use client" here, but it's often more efficient
// to mark higher-level components as client boundaries and let children inherit.
const FilterSidebar: React.FC<FilterSidebarProps> = ({ onFilterChange, colleges, years, positions }) => {
    const [selectedCollege, setSelectedCollege] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedPosition, setSelectedPosition] = useState<string>('');

    // This effect ensures filters are applied when selection changes
    React.useEffect(() => {
        onFilterChange({
            college: selectedCollege,
            year: selectedYear,
            position: selectedPosition,
        });
    }, [selectedCollege, selectedYear, selectedPosition, onFilterChange]);


    return (
        <aside className="filter-sidebar">
            <h2>Filters</h2>

            <div className="filter-group">
                <h3>College Played For</h3>
                <select id="college-filter" value={selectedCollege} onChange={(e) => setSelectedCollege(e.target.value)}>
                    <option value="">All Colleges</option>
                    {colleges.map((college) => (
                        <option key={college} value={college}>{college}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <h3>Year of Stats Recorded</h3>
                <select id="year-filter" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    <option value="">All Years</option>
                    {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <h3>Football Position</h3>
                <select id="position-filter" value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
                    <option value="">All Positions</option>
                    {positions.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                    ))}
                </select>
            </div>
        </aside>
    );
};

// --- PlayerResults Component ---
const PlayerResults: React.FC<PlayerResultsProps> = ({ players }) => {
    return (
        <main className="player-results">
            <h2>Player Profiles</h2>
            <div className="player-grid" id="player-list">
                {players.length > 0 ? (
                    players.map((player) => (
                        <PlayerCard key={`${player.name}-${player.year}-${player.college}`} player={player} />
                    ))
                ) : (
                    <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No players found matching your filters.</p>
                )}
            </div>
            <p style={{ textAlign: 'center', marginTop: '30px', color: '#888' }}>(Results will update based on filters)</p>
        </main>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
    // Dummy data for demonstration
    const allPlayers: Player[] = [
        { name: 'Joe Burrow', college: 'LSU', position: 'QB', year: '2019', ovr: 99 },
        { name: 'Jabrill Peppers', college: 'Michigan', position: 'ATH', year: '2016', ovr: 97 },
        { name: 'Player Name 3', college: 'Ohio State', position: 'RB', year: '2018', ovr: 85 },
        { name: 'Player Name 4', college: 'LSU', position: 'WR', year: '2019', ovr: 90 },
        { name: 'Player Name 5', college: 'Michigan', position: 'DL', year: '2017', ovr: 92 },
    ];

    // State to hold filtered players
    const [filteredPlayers, setFilteredPlayers] = useState<Player[]>(allPlayers);

    // Dummy filter options (in a real app, these might be derived from allPlayers or fetched)
    const availableColleges = ['LSU', 'Michigan', 'Ohio State'];
    const availableYears = ['2019', '2018', '2017', '2016'];
    const availablePositions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'S', 'CB', 'K', 'P', 'ATH'];


    const handleFilterChange = (filters: { college: string; year: string; position: string }) => {
        let currentFiltered = allPlayers;

        if (filters.college) {
            currentFiltered = currentFiltered.filter(player => player.college === filters.college);
        }
        if (filters.year) {
            currentFiltered = currentFiltered.filter(player => player.year === filters.year);
        }
        if (filters.position) {
            currentFiltered = currentFiltered.filter(player => player.position === filters.position);
        }
        setFilteredPlayers(currentFiltered);
    };

    return (
        <div className="App">
            <header>
                <h1>CFB Player Database</h1>
            </header>

            <div className="main-container">
                <FilterSidebar
                    onFilterChange={handleFilterChange}
                    colleges={availableColleges}
                    years={availableYears}
                    positions={availablePositions}
                />
                <PlayerResults players={filteredPlayers} />
            </div>

            <footer>
                <p>&copy; 2025 CFB Player Database POC. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default App;
