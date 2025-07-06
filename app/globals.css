/*
 * Styles for the vibrant, filter-only layout
 * Save this as a .css file (e.g., globals.css or App.css)
 */

:root {
    --color-primary: #007bff; /* A bright blue */
    --color-secondary: #ff5722; /* Vibrant orange */
    --color-background: #e0f2f7; /* Light blue tint */
    --color-card-bg: #ffffff;
    --color-text-dark: #2c3e50; /* Darker text for contrast */
    --color-text-light: #ecf0f1;
    --color-accent-green: #28a745; /* Success green */
    --color-accent-purple: #6f42c1; /* Deep purple */
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 0;
    background-color: var(--color-background);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    color: var(--color-text-dark);
}

header {
    background-image: linear-gradient(to right, var(--color-primary), var(--color-accent-purple));
    color: var(--color-text-light);
    padding: 25px 20px;
    text-align: center;
    font-size: 1.8em;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    margin-bottom: 20px; /* Space below header */
}

header h1 {
    margin: 0;
    font-size: 2.2em;
    letter-spacing: 1px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

header p {
    margin: 5px 0 0;
    font-size: 0.9em;
    opacity: 0.9;
}

.main-container {
    display: flex;
    justify-content: center; /* Center the filter sidebar */
    align-items: flex-start; /* Align to the top */
    flex-grow: 1;
    padding: 20px;
    /* Removed gap as there's only one main column now */
}

.filter-sidebar {
    flex: 0 0 350px; /* Wider for better visual impact */
    background-color: var(--color-card-bg);
    border-radius: 12px; /* More rounded corners */
    box-shadow: 0 6px 15px rgba(0,0,0,0.15); /* More prominent shadow */
    padding: 30px; /* More internal padding */
    display: flex;
    flex-direction: column;
    gap: 25px; /* Increased space between filter groups */
    border: 1px solid rgba(0,0,0,0.05); /* Subtle border */
}

.filter-group {
    border-bottom: 2px solid var(--color-background); /* Thicker separator */
    padding-bottom: 20px;
}

.filter-group:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.filter-group h3 {
    margin-top: 0;
    margin-bottom: 12px;
    color: var(--color-primary); /* Use primary color for headings */
    font-size: 1.25em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.filter-group select {
    width: 100%;
    padding: 12px; /* Larger padding for better touch targets */
    border: 2px solid var(--color-accent-purple); /* Border with accent color */
    border-radius: 8px; /* More rounded input fields */
    background-color: #f8fcfd; /* Very light background for inputs */
    font-size: 1.05em;
    color: var(--color-text-dark);
    appearance: none; /* Remove default arrow */
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%232c3e50%22%20d%3D%22M287%2069.4L146.2%20209.2%205.4%2069.4c-6.8-6.8-17.7-6.8-24.5%200s-6.8%2017.7%200%2024.5l141.6%20141.6c6.8%206.8%2017.7%206.8%2024.5%200L287%2093.9c6.9-6.8%206.9-17.7.1-24.5z%22%2F%3E%3C%2Fsvg%3E');
    background-repeat: no-repeat;
    background-position: right 15px center;
    background-size: 1em;
    cursor: pointer;
    transition: all 0.3s ease;
}

.filter-group select:focus {
    outline: none;
    border-color: var(--color-secondary); /* Highlight on focus */
    box-shadow: 0 0 0 3px rgba(255, 87, 34, 0.3); /* Soft glow */
}


footer {
    background-color: var(--color-text-dark); /* Dark footer */
    color: var(--color-text-light);
    text-align: center;
    padding: 15px 20px;
    margin-top: 30px; /* More space above footer */
    box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
}

/* Mobile Responsiveness (adjust flex direction and width) */
@media (max-width: 768px) {
    .main-container {
        flex-direction: column;
        align-items: center; /* Center filter sidebar horizontally */
        padding: 15px;
    }

    .filter-sidebar {
        flex: 0 0 auto;
        width: 100%; /* Take full width on small screens */
        max-width: 350px; /* But don't stretch too wide on larger mobiles */
        margin-bottom: 20px;
        padding: 25px 20px;
    }

    header h1 {
        font-size: 1.8em;
    }
}
