<>
  <meta charSet="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CFB Player Search POC</title>
  <style
    dangerouslySetInnerHTML={{
      __html:
        "\n        /* Basic CSS for layout only - no fancy styling */\n        body {\n            font-family: Arial, sans-serif;\n            margin: 0;\n            padding: 0;\n            background-color: #f4f4f4;\n            display: flex;\n            flex-direction: column;\n            min-height: 100vh;\n        }\n\n        header {\n            background-color: #333;\n            color: #fff;\n            padding: 15px 20px;\n            text-align: center;\n            font-size: 1.8em;\n            box-shadow: 0 2px 5px rgba(0,0,0,0.2);\n        }\n\n        .main-container {\n            display: flex;\n            flex-grow: 1; /* Allows it to take up remaining vertical space */\n            padding: 20px;\n            gap: 20px; /* Space between filter sidebar and results */\n        }\n\n        .filter-sidebar {\n            flex: 0 0 280px; /* Fixed width for desktop, but allows shrinking */\n            background-color: #fff;\n            border-radius: 8px;\n            box-shadow: 0 2px 5px rgba(0,0,0,0.1);\n            padding: 20px;\n            display: flex;\n            flex-direction: column;\n            gap: 20px; /* Space between filter groups */\n        }\n\n        .filter-group {\n            border-bottom: 1px solid #eee;\n            padding-bottom: 15px;\n        }\n\n        .filter-group:last-child {\n            border-bottom: none; /* No border for the last group */\n            padding-bottom: 0;\n        }\n\n        .filter-group h3 {\n            margin-top: 0;\n            margin-bottom: 10px;\n            color: #555;\n            font-size: 1.1em;\n        }\n\n        .filter-group select {\n            width: 100%;\n            padding: 8px;\n            border: 1px solid #ccc;\n            border-radius: 4px;\n            background-color: #f9f9f9;\n            font-size: 0.9em;\n        }\n\n        .player-results {\n            flex-grow: 1; /* Takes up remaining horizontal space */\n            background-color: #fff;\n            border-radius: 8px;\n            box-shadow: 0 2px 5px rgba(0,0,0,0.1);\n            padding: 20px;\n        }\n\n        .player-grid {\n            display: grid;\n            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); /* Responsive grid */\n            gap: 20px;\n        }\n\n        .player-card {\n            border: 1px solid #ddd;\n            border-radius: 6px;\n            padding: 15px;\n            text-align: center;\n            background-color: #fdfdfd;\n            box-shadow: 0 1px 3px rgba(0,0,0,0.05);\n            transition: transform 0.2s ease-in-out;\n        }\n\n        .player-card:hover {\n            transform: translateY(-3px);\n            box-shadow: 0 4px 8px rgba(0,0,0,0.1);\n        }\n\n        .player-card h4 {\n            margin-top: 0;\n            margin-bottom: 5px;\n            color: #333;\n        }\n\n        .player-card p {\n            margin: 0;\n            color: #666;\n            font-size: 0.85em;\n        }\n\n        footer {\n            background-color: #333;\n            color: #fff;\n            text-align: center;\n            padding: 15px 20px;\n            margin-top: 20px;\n        }\n\n        /* Basic Mobile Responsiveness (Conceptual - for smaller screens) */\n        @media (max-width: 768px) {\n            .main-container {\n                flex-direction: column; /* Stack filter and results vertically */\n                padding: 15px;\n            }\n\n            .filter-sidebar {\n                flex: 0 0 auto; /* Allow sidebar to take auto height */\n                width: 100%; /* Take full width */\n                margin-bottom: 20px; /* Space below filters when stacked */\n            }\n\n            /* Could add a toggle button for filters on mobile */\n        }\n    "
    }}
  />
  <header>
    <h1>CFB Player Database</h1>
  </header>
  <div className="main-container">
    <aside className="filter-sidebar">
      <h2>Filters</h2>
      <div className="filter-group">
        <h3>College Played For</h3>
        <select id="college-filter">
          <option value="">All Colleges</option>
          <option value="LSU">LSU</option>
          <option value="Michigan">Michigan</option>
          <option value="Ohio State">Ohio State</option>
        </select>
      </div>
      <div className="filter-group">
        <h3>Year of Stats Recorded</h3>
        <select id="year-filter">
          <option value="">All Years</option>
          <option value={2019}>2019</option>
          <option value={2018}>2018</option>
          <option value={2017}>2017</option>
          <option value={2016}>2016</option>
        </select>
      </div>
      <div className="filter-group">
        <h3>Football Position</h3>
        <select id="position-filter">
          <option value="">All Positions</option>
          <option value="QB">Quarterback (QB)</option>
          <option value="RB">Running Back (RB)</option>
          <option value="WR">Wide Receiver (WR)</option>
          <option value="TE">Tight End (TE)</option>
          <option value="OL">Offensive Line (OL)</option>
          <option value="DL">Defensive Line (DL)</option>
          <option value="LB">Linebacker (LB)</option>
          <option value="DB">Defensive Back (DB)</option>
          <option value="S">Safety (S)</option>
          <option value="CB">Cornerback (CB)</option>
          <option value="K">Kicker (K)</option>
          <option value="P">Punter (P)</option>
          <option value="ATH">Athlete (ATH)</option>
        </select>
      </div>
    </aside>
    <main className="player-results">
      <h2>Player Profiles</h2>
      <div className="player-grid" id="player-list">
        <div className="player-card">
          <h4>Joe Burrow</h4>
          <p>LSU | QB | 2019 Season</p>
          <p>OVR: 99</p>
        </div>
        <div className="player-card">
          <h4>Jabrill Peppers</h4>
          <p>Michigan | ATH | 2016 Season</p>
          <p>OVR: 97</p>
        </div>
        <div className="player-card">
          <h4>Player Name 3</h4>
          <p>College | Pos | Year</p>
          <p>OVR: 85</p>
        </div>
        <div className="player-card">
          <h4>Player Name 4</h4>
          <p>College | Pos | Year</p>
          <p>OVR: 90</p>
        </div>
      </div>
      <p style={{ textAlign: "center", marginTop: 30, color: "#888" }}>
        (Results will update based on filters)
      </p>
    </main>
  </div>
  <footer>
    <p>© 2025 CFB Player Database POC. All rights reserved.</p>
  </footer>
</>
