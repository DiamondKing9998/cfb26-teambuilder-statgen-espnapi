// src/app/api/main-api/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
// Removed: import { headers } from 'next/headers'; // headers is not directly used here, can remove if not needed elsewhere

// --- Manual Team Name Aliases/Exceptions for FBS Teams (for CFBD Name to ESPN Slug) ---
// This map serves as a fallback for specific CFBD team names that do not directly
// or consistently map to an ESPN slug via a simple string match.
// Ordered alphabetically by CFBD Team Name (school).
const CFBD_TO_FBSESPN_ALIAS: { [cfbdName: string]: string } = {
    "Air Force": "air-force-falcons",
    "Akron": "akron-zips",
    "Alabama": "alabama-crimson-tide",
    "Appalachian State": "appalachian-state-mountaineers",
    "Arizona": "arizona-wildcats",
    "Arizona State": "arizona-state-sun-devils",
    "Arkansas": "arkansas-razorbacks",
    "Arkansas State": "arkansas-state-red-wolves",
    "Army": "army-black-knights",
    "Auburn": "auburn-tigers",
    "Ball State": "ball-state-cardinals",
    "Baylor": "baylor-bears",
    "Boise State": "boise-state-broncos",
    "Boston College": "boston-college-eagles",
    "Bowling Green": "bowling-green-falcons",
    "Buffalo": "buffalo-bulls",
    "BYU": "byu-cougars", // CFBD "BYU" -> ESPN "byu-cougars"
    "California": "california-golden-bears",
    "Central Michigan": "central-michigan-chippewas",
    "Charlotte": "charlotte-49ers",
    "Cincinnati": "cincinnati-bearcats",
    "Clemson": "clemson-tigers",
    "Coastal Carolina": "coastal-carolina-chanticleers",
    "Colorado": "colorado-buffaloes",
    "Colorado State": "colorado-state-rams",
    "Connecticut": "connecticut-huskies", // CFBD "Connecticut" -> ESPN "connecticut-huskies"
    "Delaware": "delaware-fightin-blue-hens", // New FBS team as of 2025
    "Duke": "duke-blue-devils",
    "East Carolina": "east-carolina-pirates",
    "Eastern Michigan": "eastern-michigan-eagles",
    "FIU": "fiu-panthers", // CFBD "FIU" -> ESPN "fiu-panthers"
    "Florida": "florida-gators",
    "Florida Atlantic": "florida-atlantic-owls",
    "Florida State": "florida-state-seminoles",
    "Fresno State": "fresno-state-bulldogs",
    "Georgia": "georgia-bulldogs",
    "Georgia Southern": "georgia-southern-eagles",
    "Georgia State": "georgia-state-panthers",
    "Georgia Tech": "georgia-tech-yellow-jackets",
    "Hawaii": "hawaii-rainbow-warriors", // CFBD "Hawaii" -> ESPN "hawaii-rainbow-warriors"
    "Houston": "houston-cougars",
    "Idaho": "idaho-vandals", // While historically FBS, now consistently FCS
    "Illinois": "illinois-fighting-illini",
    "Indiana": "indiana-hoosiers",
    "Iowa": "iowa-hawkeyes",
    "Iowa State": "iowa-state-cyclones",
    "Jacksonville State": "jacksonville-state-gamecocks",
    "James Madison": "james-madison-dukes",
    "Kansas": "kansas-jayhawks",
    "Kansas State": "kansas-state-wildcats",
    "Kennesaw State": "kennesaw-state-owls", // Joining FBS 2024
    "Kent State": "kent-state-golden-flashes",
    "Kentucky": "kentucky-wildcats",
    "Liberty": "liberty-flames",
    "Louisiana": "louisiana-ragin-cajuns", // CFBD "Louisiana" -> ESPN "louisiana-ragin-cajuns"
    "Louisiana Monroe": "louisiana-monroe-warhawks", // CFBD "Louisiana Monroe" -> ESPN "louisiana-monroe-warhawks"
    "Louisiana Tech": "louisiana-tech-bulldogs",
    "Louisville": "louisville-cardinals",
    "LSU": "lsu-tigers",
    "Marshall": "marshall-thundering-herd",
    "Maryland": "maryland-terrapins",
    "Massachusetts": "massachusetts-minutemen", // CFBD "Massachusetts" -> ESPN "massachusetts-minutemen" (UMass)
    "Memphis": "memphis-tigers",
    "Merrimack": "merrimack-warriors", // Transitioning to FBS
    "Miami": "miami-hurricanes", // Miami (FL) - CFBD sometimes just "Miami"
    "Miami (OH)": "miami-oh-redhawks", // CFBD specifies Miami (OH)
    "Michigan": "michigan-wolverines",
    "Michigan State": "michigan-state-spartans",
    "Middle Tennessee": "middle-tennessee-blue-raiders",
    "Minnesota": "minnesota-golden-gophers",
    "Mississippi State": "mississippi-state-bulldogs",
    "Missouri": "missouri-tigers", // Corrected typo
    "Missouri State": "missouri-state-bears", // New FBS team as of 2025
    "Navy": "navy-midshipmen",
    "NC State": "nc-state-wolfpack",
    "Nebraska": "nebraska-cornhuskers",
    "Nevada": "nevada-wolf-pack",
    "New Mexico": "new-mexico-lobos",
    "New Mexico State": "new-mexico-state-aggies",
    "North Carolina": "north-carolina-tar-heels",
    "North Texas": "north-texas-mean-green",
    "Northern Illinois": "northern-illinois-huskies",
    "Northwestern": "northwestern-wildcats",
    "Notre Dame": "notre-dame-fighting-irish",
    "Ohio": "ohio-bobcats",
    "Ohio State": "ohio-state-buckeyes", // Corrected capitalization
    "Oklahoma": "oklahoma-sooners",
    "Oklahoma State": "oklahoma-state-cowboys",
    "Old Dominion": "old-dominion-monarchs",
    "Ole Miss": "ole-miss-rebels", // CFBD "Ole Miss" -> ESPN "ole-miss-rebels"
    "Oregon": "oregon-ducks",
    "Oregon State": "oregon-state-beavers",
    "Penn State": "penn-state-nittany-lions",
    "Pittsburgh": "pittsburgh-panthers",
    "Purdue": "purdue-boilermakers",
    "Rice": "rice-owls",
    "Rutgers": "rutgers-scarlet-knights",
    "Sacramento State": "sacramento-state-hornets", // Transitioning to FBS
    "Sam Houston State": "sam-houston-bearkats",
    "San Diego State": "san-diego-state-aztecs",
    "San Jose State": "san-jose-state-spartans",
    "SMU": "smu-mustangs",
    "South Alabama": "south-alabama-jaguars",
    "South Carolina": "south-carolina-gamecocks",
    "South Florida": "south-florida-bulls", // CFBD "South Florida" -> ESPN "south-florida-bulls"
    "Southern Mississippi": "southern-mississippi-golden-eagles",
    "Stanford": "stanford-cardinal",
    "Syracuse": "syracuse-orange",
    "TCU": "tcu-horned-frogs",
    "Temple": "temple-owls",
    "Tennessee": "tennessee-volunteers",
    "Texas": "texas-longhorns",
    "Texas A&M": "texas-a&m-aggies",
    "Texas State": "texas-state-bobcats",
    "Texas Tech": "texas-tech-red-raiders",
    "Toledo": "toledo-rockets",
    "Troy": "troy-trojans",
    "Tulane": "tulane-green-wave",
    "Tulsa": "tulsa-golden-hurricane",
    "UAB": "uab-blazers", // CFBD "UAB" -> ESPN "uab-blazers"
    "UCF": "ucf-knights", // CFBD "UCF" -> ESPN "ucf-knights"
    "UCLA": "ucla-bruins",
    "UNLV": "unlv-rebels",
    "USC": "usc-trojans", // CFBD "USC" -> ESPN "usc-trojans" (Southern California)
    "UTSA": "utsa-roadrunners",
    "Utah": "utah-utes",
    "Utah State": "utah-state-aggies",
    "Vanderbilt": "vanderbilt-commodores",
    "Virginia": "virginia-cavaliers",
    "Virginia Tech": "virginia-tech-hokies",
    "Wake Forest": "wake-forest-demon-deacons",
    "Washington": "washington-huskies",
    "Washington State": "washington-state-cougars",
    "West Virginia": "west-virginia-mountaineers",
    "Western Kentucky": "western-kentucky-hilltoppers",
    "Western Michigan": "western-michigan-broncos",
    "Wisconsin": "wisconsin-badgers",
    "Wyoming": "wyoming-cowboys",
};

// --- Manual Team Name Aliases/Exceptions for FCS Teams (for CFBD Name to ESPN Slug) ---
const CFBD_TO_FCSESPN_ALIAS: { [cfbdName: string]: string } = {
    "Abilene Christian": "abilene-christian-wildcats",
    "Alabama A&M": "alabama-a&m-bulldogs",
    "Alabama State": "alabama-state-hornets",
    "Albany": "albany-great-danes", // University at Albany
    "Alcorn State": "alcorn-state-braves",
    "Arkansas-Pine Bluff": "arkansas-pine-bluff-golden-lions",
    "Austin Peay": "austin-peay-governors",
    "Bethune-Cookman": "bethune-cookman-wildcats",
    "Brown": "brown-bears",
    "Bryant": "bryant-bulldogs",
    "Bucknell": "bucknell-bison",
    "Butler": "butler-bulldogs",
    "Cal Poly": "cal-poly-mustangs",
    "Campbell": "campbell-fighting-camels",
    "Central Arkansas": "central-arkansas-bears",
    "Central Connecticut": "central-connecticut-state-blue-devils", // CCSU
    "Charleston Southern": "charleston-southern-buccaneers",
    "Chattanooga": "chattanooga-mocs", // UT Chattanooga - Corrected typo
    "The Citadel": "the-citadel-bulldogs",
    "Colgate": "colgate-raiders",
    "Columbia": "columbia-lions",
    "Cornell": "cornell-big-red",
    "Dartmouth": "dartmouth-big-green",
    "Davidson": "davidson-wildcats",
    "Dayton": "dayton-flyers",
    "Delaware State": "delaware-state-hornets",
    "Drake": "drake-bulldogs",
    "Duquesne": "duquesne-dukes",
    "East Tennessee State": "east-tennessee-state-buccaneers", // ETSU
    "East Texas A&M": "texas-a&m-commerce-lions", // CFBD: "East Texas A&M", ESPN: "texas-a&m-commerce-lions"
    "Eastern Illinois": "eastern-illinois-panthers",
    "Eastern Kentucky": "eastern-kentucky-colonels",
    "Eastern Washington": "eastern-washington-eagles",
    "Elon": "elon-phoenix",
    "Florida A&M": "florida-a&m-rattlers",
    "Fordham": "fordham-rams",
    "Furman": "furman-paladins",
    "Gardner-Webb": "gardner-webb-runnin-bulldogs",
    "Georgetown": "georgetown-hoyas",
    "Grambling State": "grambling-state-tigers",
    "Hampton": "hampton-pirates",
    "Harvard": "harvard-crimson",
    "Holy Cross": "holy-cross-crusaders",
    "Houston Christian": "houston-christian-huskies", // Formerly HBU
    "Howard": "howard-bison",
    "Idaho State": "idaho-state-bengals",
    "Illinois State": "illinois-state-redbirds",
    "Incarnate Word": "incarnate-word-cardinals", // UIW
    "Indiana State": "indiana-state-sycamores",
    "Jackson State": "jackson-state-tigers",
    "Lafayette": "lafayette-leopards",
    "Lamar": "lamar-cardinals",
    "Lehigh": "lehigh-mountain-hawks",
    "Lindenwood": "lindenwood-lions",
    "Long Island University": "liu-sharks", // LIU
    "Maine": "maine-black-bears",
    "Marist": "marist-red-foxes",
    "McNeese": "mcneese-cowboys", // McNeese State
    "Mississippi Valley State": "mississippi-valley-state-delta-devils",
    "Monmouth": "monmouth-hawks",
    "Montana": "montana-grizzlies",
    "Montana State": "montana-state-bobcats",
    "Morgan State": "morgan-state-bears",
    "Murray State": "murray-state-racers",
    "New Hampshire": "new-hampshire-wildcats",
    "New Haven": "new-haven-chargers", // New FCS program as of 2025
    "Nicholls": "nicholls-colonels", // Nicholls State
    "Norfolk State": "norfolk-state-spartans",
    "North Carolina A&T": "north-carolina-a&t-aggies",
    "North Carolina Central": "north-carolina-central-eagles",
    "North Dakota": "north-dakota-fighting-hawks", // UND
    "North Dakota State": "north-dakota-state-bison", // NDSU - Corrected slug for clarity
    "Northern Arizona": "northern-arizona-lumberjacks",
    "Northern Colorado": "northern-colorado-bears",
    "Presbyterian": "presbyterian-blue-hose",
    "Portland State": "portland-state-vikings", // Corrected typo
    "Prairie View A&M": "prairie-view-a&m-panthers",
    "Rhode Island": "rhode-island-rams",
    "Richmond": "richmond-spiders",
    "Sacred Heart": "sacred-heart-pioneers",
    "Saint Francis (PA)": "saint-francis-red-flash", // St. Francis (PA)
    "Samford": "samford-bulldogs",
    "South Carolina State": "south-carolina-state-bulldogs",
    "South Dakota": "south-dakota-coyotes", // Corrected typo
    "South Dakota State": "south-dakota-state-jackrabbits",
    "Southeast Missouri State": "southeast-missouri-state-redhawks", // SEMO - Corrected slug for clarity
    "Southeastern Louisiana": "southeastern-louisiana-lions",
    "Southern Illinois": "southern-illinois-salukis",
    "Southern Utah": "southern-utah-thunderbirds",
    "Stephen F. Austin": "stephen-f-austin-lumberjacks", // SFA
    "Stetson": "stetson-hatters",
    "Stony Brook": "stony-brook-seawolves",
    "Tarleton State": "tarleton-state-texans",
    "Tennessee State": "tennessee-state-tigers",
    "Tennessee Tech": "tennessee-tech-golden-eagles",
    "Texas Southern": "texas-southern-tigers",
    "Texas Rio Grande Valley": "texas-rio-grande-valley-vaqueros", // New FCS program as of 2025
    "Towson": "towson-tigers",
    "UC Davis": "uc-davis-aggies",
    "Villanova": "villanova-wildcats",
    "Virginia Military Institute": "vmi-keydets", // VMI
    "Western Carolina": "western-carolina-catamounts",
    "William & Mary": "william-and-mary-tribe", // Corrected for URL slug
    "Wofford": "wofford-terriers",
    "Youngstown State": "youngstown-state-penguins",
    "Yale": "yale-bulldogs",
};

// Define interfaces for type safety

// Interface for the detailed player data from ESPN (used for AI overview)
interface ESPNPlayerDetail {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    position: { displayName: string };
    displayHeight: string;
    displayWeight: string;
    jersey: string;
    hometown: { city: string; state: string };
    team: { displayName: string; logos: { href: string }[]; color: string; alternateColor: string; slug: string };
    college: { year: string; redshirted: boolean };
    recruit: { rating: string | null; positionRank: string | null };
}

// Interface for Players from ESPN Roster (list of players)
interface ESPNRosterPlayer {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    position: { displayName: string };
    jersey: string;
    team: { displayName: string; slug: string };
}

// Interface for Assigned Abilities
interface AssignedAbility {
    name: string;
    tier: string;
    description: string;
}

// Interfaces for College Football Data API (for teams) - Updated to match /teams/fbs more closely
interface CFBDTeam {
    id: number;
    school: string; // Team name
    mascot: string;
    abbreviation: string;
    conference: string;
    division: string; // Added from /teams/fbs
    classification: string | null;
    color: string | null;
    alt_color: string | null;
    logos: string[]; // URLs for logos from /teams/fbs
    location: { city: string, state: string }; // From /teams/fbs
}

// Interface for ESPN Teams API (needed internally for player lookup) - Simplified as we only care about 'team' object
interface ESPNTeamLookupData {
    id: string;
    uid: string;
    slug: string;
    abbreviation: string;
    displayName: string;
    shortDisplayName: string;
    name: string;
    nickname: string;
    location: string;
    color: string;
    alternateColor: string;
    isActive: boolean;
    isAllStar: boolean;
    logos: { href: string; alt: string; rel: string[]; width: number; height: number }[];
    groups?: {
        id: string;
        name: string;
        isConference: boolean;
        isFootballBowlSubdivision: boolean;
        parentGroupId?: string;
    };
}

// Interface for the item wrapper in ESPN team list response
interface ESPNTeamArrayItem {
    team: ESPNTeamLookupData;
}

// NEW: Interface for the formatted team data sent to the frontend
interface FormattedTeamForFrontend {
    id: string;
    collegeDisplayName: string;
    mascot: string;
    conference: string;
    classification: string;
    color: string;
    alternateColor: string;
    logo: string;
    darkLogo: string;
}

const allAbilities = [
    // Quarterbacks
    { name: "Backfield Creator", positions: ["QB"], description: "Exceptional at creating plays from the backfield." },
    { name: "Off Platform", positions: ["QB"], description: "Throws accurately while throwing off-platform." },
    { name: "Pull Down", positions: ["QB"], description: "Can quickly pull the ball down and run." },
    { name: "On Time", positions: ["QB"], description: "Delivers accurate passes with perfect timing." },
    { name: "Sleight Of Hand", positions: ["QB"], description: "Excels at faking handoffs and play-action." },
    { name: "Mobile Deadeye", positions: ["QB"], description: "Maintains accuracy while throwing on the run." },
    { name: "Dual Threat", positions: ["QB"], description: "Effective passer and runner." },
    { name: "Downhill", positions: ["QB"], description: "Picks up extra yards falling forward when scrambling." },
    { name: "Extender", positions: ["QB"], description: "Extends plays outside the pocket effectively." },
    { name: "Option King", positions: ["QB"], description: "Master of option reads and execution." },
    { name: "Dot Dot!", positions: ["QB"], description: "High accuracy on deep throws." },
    { name: "Mobile Resistance", positions: ["QB"], description: "Resists pressure while scrambling." },
    { name: "Pocket Passer", positions: ["QB"], description: "Elite accuracy and decision-making from the pocket." },
    { name: "Resistance", positions: ["QB"], description: "Resists pressure while in the pocket." },
    { name: "Step Up", positions: ["QB"], description: "Steps up in the pocket to avoid edge rushers." },
    { name: "Pure Runner", positions: ["QB"], description: "Elite rushing ability for a QB." },
    { name: "Magician", positions: ["QB"], description: "Creates something out of nothing with incredible plays." },
    { name: "Shifty", positions: ["QB"], description: "Elusive with quick jukes and cuts as a runner." },
    { name: "Side Step", positions: ["QB"], description: "Avoids defenders with quick side steps." },
    { name: "Workhorse", positions: ["QB"], description: "Durable and reliable, can handle heavy workload." },

    // Halfbacks
    { name: "Backfield Threat", positions: ["HB"], description: "Dangerous receiving threat out of the backfield." },
    { name: "360", positions: ["HB"], description: "Can spin out of tackles effectively." },
    { name: "Safety Valve", positions: ["HB", "TE"], description: "Reliable target on short passes when primary reads are covered." },
    { name: "Takeoff", positions: ["HB", "WR", "TE"], description: "Quick acceleration and burst." },
    { name: "Recoup", positions: ["HB", "WR", "TE"], description: "Recovers quickly after taking a hit or making a cut." },
    { name: "Contact Seeker", positions: ["HB"], description: "Actively seeks contact to fall forward for extra yards." },
    { name: "Battering Ram", positions: ["HB"], description: "Breaks tackles with sheer power." },
    { name: "Ball Security", positions: ["HB", "FB"], description: "Protects the ball well to avoid fumbles." },
    { name: "Balanced", positions: ["HB", "WR", "TE", "FB", "OL", "S"], description: "Well-rounded skills in multiple areas." },
    { name: "East/West Playmaker", positions: ["HB"], description: "Excels at making defenders miss with lateral movement." },
    { name: "Arm Bar", positions: ["HB", "WR"], description: "Fights for extra yards by stiff-arming defenders." },
    { name: "Elusive Bruiser", positions: ["HB"], description: "Combines elusiveness with breaking tackles." },
    { name: "Headfirst", positions: ["HB", "WR"], description: "Dives forward to gain extra yards." },
    { name: "North/South", positions: ["HB"], description: "Runs directly upfield, rarely losing yards." },

    // Fullbacks
    { name: "Blocking Strong Grip", positions: ["FB"], description: "Maintains strong blocks against defenders." },
    { name: "Second Level", positions: ["FB", "OL", "TE"], description: "Engages and sustains blocks on second level defenders (LBs, Safeties)." },
    { name: "Pocket Shield", positions: ["FB", "OL"], description: "Provides elite pass protection for the quarterback." },
    { name: "Sidekick", positions: ["FB"], description: "An effective and reliable blocking companion." },
    { name: "Screen Enforcer", positions: ["FB", "OL"], description: "Dominates blocks on screen plays." },
    { name: "Utility", positions: ["FB"], description: "Versatile, can block, run, or catch effectively." },

    // Wide Receivers
    { name: "Contested Specialist", positions: ["WR"], description: "Dominant in contested catch situations." },
    { name: "50/50", positions: ["WR", "TE"], description: "Wins jump balls and contested catches frequently." },
    { name: "Cutter", positions: ["WR", "TE"], description: "Executes sharp, precise cuts on routes." },
    { name: "Double Dip", positions: ["WR", "TE"], description: "Excels at double moves to create separation." },
    { name: "Gadget", positions: ["WR"], description: "Versatile in various offensive packages, including runs." },
    { name: "Sure Hands", positions: ["WR", "TE"], description: "Rarely drops catchable passes." },
    { name: "Physical Route Runner", positions: ["WR", "TE"], description: "Uses physicality to gain separation on routes." },
    { name: "Route Artist", positions: ["WR"], description: "Master of route running, creates consistent separation." },
    { name: "Speedster", positions: ["WR"], description: "Possesses elite straight-line speed." },

    // Tight Ends
    { name: "Wear Down", positions: ["TE", "OL", "DL"], description: "Gradually wears down defenders with sustained effort." },
    { name: "Pure Blocker", positions: ["TE"], description: "An elite run-blocking tight end." },
    { name: "Quick Drop", positions: ["TE", "OL"], description: "Quickly gets into blocking position off the snap." },
    { name: "Vertical Threat", positions: ["TE"], description: "A dangerous deep threat from the tight end position." },

    // Offensive Line
    { name: "Agile", positions: ["OL"], description: "Quick and nimble, excels in pulling or zone schemes." },
    { name: "Option Shield", positions: ["OL"], description: "Maintains blocks effectively on option plays." },
    { name: "Raw Strength", positions: ["OL"], description: "Dominates defenders with sheer power." },
    { name: "Ground N Pound", positions: ["OL"], description: "Excels at opening running lanes in power schemes." },
    { name: "Well Rounded", positions: ["OL"], description: "Strong in both run blocking and pass protection." },

    // Defensive Line
    { name: "Edge Setter", positions: ["DL"], description: "Consistently sets a strong edge against outside runs." },
    { name: "Gap Specialist", positions: ["DL"], description: "Excels at filling and defending specific gaps." },
    { name: "Grip Breaker", positions: ["DL", "LB"], description: "Sheds blockers quickly to get to the ball carrier/QB." },
    { name: "Inside Disruptor", positions: ["DL", "LB"], description: "Penetrates interior offensive line for disruption." },
    { name: "Outside Disruptor", positions: ["DL", "LB"], description: "Excels at pressuring from the edge." },
    { name: "Pocket Disruptor", positions: ["DL"], description: "Consistently collapses the pocket around the QB." },
    { name: "Quick Jump", positions: ["DL", "CB"], description: "Gets an explosive jump off the line of scrimmage." },
    { name: "Power Rusher", positions: ["DL"], description: "Uses strength to bull rush and overwhelm blockers." },
    { name: "Duress", positions: ["DL", "LB"], description: "Applies significant pressure on the quarterback, forcing errant throws." },
    { name: "Take Down", positions: ["DL"], description: "Consistently brings down ball carriers for minimal gain." },
    { name: "Speed Rusher", positions: ["DL"], description: "Uses speed and agility to get around blockers." },

    // Linebackers
    { name: "Lurker", positions: ["LB"], description: "Disguises coverage and surprises quarterbacks." },
    { name: "Tackling Machine", positions: ["LB", "DB"], description: "Consistently makes tackles, rarely missing." },
    { name: "Coverage Specialist", positions: ["LB", "DB"], description: "Excels in pass coverage against receivers and tight ends." },
    { name: "Run Stopper", positions: ["LB", "DL"], description: "Dominant against the run, clogs lanes." },
    { name: "Pass Rush Specialist", positions: ["LB", "DL"], description: "An elite pass rusher from the linebacker position." },

    // Defensive Backs (Cornerbacks & Safeties)
    { name: "Ball Hawk", positions: ["CB", "S"], description: "Instinctively finds and attacks the ball in the air." },
    { name: "Man Coverage", positions: ["CB"], description: "Locks down receivers in man-to-man coverage." },
    { name: "Zone Hawk", positions: ["CB", "S"], description: "Reads and reacts effectively to plays in zone coverage." },
    { name: "Big Hitter", positions: ["S", "LB"], description: "Delivers impactful hits, often forcing fumbles or incompletions." },
    { name: "Return Specialist", positions: ["CB", "S", "WR", "HB"], description: "Elite kick and/or punt returner." },
    { name: "Closer", positions: ["CB", "S"], description: "Finishes plays strong, making critical tackles or deflections." },
    { name: "Decoy", positions: ["CB", "S", "WR"], description: "Draws attention away from other players effectively." },
    { name: "Enforcer", positions: ["S"], description: "Imposes physical will on opposing players." },
    { name: "Versatile", positions: ["CB", "S", "LB"], description: "Can play multiple roles in the secondary or defense." },
    { name: "Pinch", positions: ["CB", "S"], description: "Quickly diagnoses and breaks on short passes." },

    // Kickers & Punters
    { name: "Accurate Kicker", positions: ["K"], description: "High accuracy on field goals and extra points." },
    { name: "Long Range Kicker", positions: ["K"], description: "Can consistently make kicks from long distances." },
    { name: "Hangtime Punter", positions: ["P"], description: "Punts with exceptional hangtime, limiting returns." },
    { name: "Accurate Punter", positions: ["P"], description: "Consistently places punts precisely." },
    { name: "Touchback Specialist", positions: ["K"], description: "Consistently kicks touchbacks on kickoffs." },
];

const tiers = ["Gold", "Silver", "Bronze"];

/**
 * Determines the ESPN team slug for a given CFBD team name.
 * It first checks the manual alias maps (FBS then FCS), then attempts a dynamic lookup
 * within the specified classification (FBS/FCS).
 * @param cfbdTeamName The team name from the CollegeFootballData API.
 * @param classification 'college-football' for FBS, 'fcs-football' for FCS.
 * @returns The ESPN slug for the team, or null if not found.
 */
async function getEspnTeamSlug(cfbdTeamName: string, classification: 'college-football' | 'fcs-football'): Promise<string | null> {
    // 1. Check FBS alias map first (higher priority for common lookups)
    if (CFBD_TO_FBSESPN_ALIAS[cfbdTeamName]) {
        return CFBD_TO_FBSESPN_ALIAS[cfbdTeamName];
    }

    // 2. Check FCS alias map
    if (CFBD_TO_FCSESPN_ALIAS[cfbdTeamName]) {
        return CFBD_TO_FCSESPN_ALIAS[cfbdTeamName];
    }

    // 3. Dynamic lookup (if not found in aliases)
    try {
        // Use the classification in the search URL
        const espnTeamSearchUrl = `http://site.api.espn.com/apis/site/v2/sports/football/${classification}/teams?q=${encodeURIComponent(cfbdTeamName)}`;
        console.log(`[getEspnTeamSlug] Dynamic lookup URL: ${espnTeamSearchUrl}`);
        const response = await fetch(espnTeamSearchUrl);
        if (!response.ok) {
            console.error(`[getEspnTeamSlug] ESPN team search failed for ${cfbdTeamName} (${classification}): ${response.statusText}`);
            return null;
        }
        const data = await response.json();

        if (data.sports && data.sports.length > 0 && data.sports[0].leagues && data.sports[0].leagues.length > 0) {
            const teams = data.sports[0].leagues[0].teams;
            if (teams && teams.length > 0) {
                for (const team of teams) {
                    const teamInfo = team.team;
                    // Prioritize exact slug match if possible, then display names
                    if (
                        teamInfo.slug.toLowerCase() === cfbdTeamName.toLowerCase().replace(/[^a-z0-9]/g, '-') ||
                        teamInfo.displayName.toLowerCase() === cfbdTeamName.toLowerCase() ||
                        teamInfo.shortDisplayName.toLowerCase() === cfbdTeamName.toLowerCase() ||
                        teamInfo.name.toLowerCase() === cfbdTeamName.toLowerCase() ||
                        teamInfo.nickname.toLowerCase() === cfbdTeamName.toLowerCase()
                    ) {
                        return teamInfo.slug;
                    }
                }
                console.warn(`[getEspnTeamSlug] No perfect ESPN slug match for CFBD team "${cfbdTeamName}" in ${classification}, using first result: ${teams[0].team.slug}`);
                return teams[0].team.slug; // Fallback to the first result
            }
        }
    } catch (error) {
        console.error(`[getEspnTeamSlug] Error during dynamic ESPN team lookup for ${cfbdTeamName} (${classification}):`, error);
    }

    console.warn(`[getEspnTeamSlug] Could not find ESPN team slug for CFBD team: ${cfbdTeamName} in ${classification}`);
    return null;
}

/**
 * Fetches player data from ESPN for a given team slug.
 * @param espnTeamSlug The ESPN slug for the team (e.g., "alabama-crimson-tide").
 * @param year The season year (e.g., 2024).
 * @param classification The classification (e.g., "college-football" or "fcs-football").
 * @returns An array of player data, or null if the fetch fails.
 */
async function getEspnPlayers(espnTeamSlug: string, year: number, classification: 'college-football' | 'fcs-football'): Promise<ESPNRosterPlayer[] | null> {
    // ESPN Roster API endpoint. Note: ESPN's public APIs are often unofficial and can change.
    const espnRosterUrl = `https://site.api.espn.com/apis/site/v2/sports/football/${classification}/teams/${espnTeamSlug}/roster?season=${year}`;

    try {
        console.log(`[getEspnPlayers] Fetching ESPN roster for ${espnTeamSlug} (${classification}) for ${year}`);
        const response = await fetch(espnRosterUrl);
        if (!response.ok) {
            console.error(`[getEspnPlayers] Failed to fetch ESPN roster for ${espnTeamSlug}: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();

        let espnPlayersRaw: any[] = [];
        // Common paths to find the athletes array in ESPN's nested JSON
        if (data.athletes) { // Direct 'athletes' array (most common for this endpoint)
            espnPlayersRaw = data.athletes;
        } else if (data.sport?.[0]?.leagues?.[0]?.teams?.[0]?.athletes) {
            espnPlayersRaw = data.sport[0].leagues[0].teams[0].athletes;
        } else if (data.teams?.[0]?.athletes) { // Sometimes it's directly under teams
            espnPlayersRaw = data.teams[0].athletes;
        } else if (data.roster?.[0]?.items) { // Sometimes it's structured like this
            espnPlayersRaw = data.roster[0].items;
        } else if (data.athletes?.items) { // Another common structure
            espnPlayersRaw = data.athletes.items.flatMap((item: any) => item.athletes || []);
        } else {
            console.warn(`[getEspnPlayers] Unexpected ESPN roster data structure for ${espnTeamSlug}. Could not find athletes.`);
            // console.log(JSON.stringify(data, null, 2)); // Uncomment to inspect response
            return []; // Return empty array if no athletes found
        }

        const formattedPlayers: ESPNRosterPlayer[] = espnPlayersRaw.map((player: any) => ({
            id: player.id,
            firstName: player.firstName || '',
            lastName: player.lastName || '',
            fullName: player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim(),
            position: { displayName: player.position?.displayName || 'N/A' },
            jersey: player.jersey || 'N/A',
            team: {
                displayName: player.team?.displayName || espnTeamSlug, // Use player's specific team if available, else fallback
                slug: player.team?.slug || espnTeamSlug
            }
        }));

        return formattedPlayers;

    } catch (error) {
        console.error(`[getEspnPlayers] Error fetching ESPN players for ${espnTeamSlug}:`, error);
        return null;
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const target = searchParams.get('target');
    const playerId = searchParams.get('playerId');
    const year = parseInt(searchParams.get('year') || '2024'); // Default to current year or desired
    const team = searchParams.get('team'); // This is the CFBD team name
    const search = searchParams.get('search'); // Player name search filter
    const division = searchParams.get('division') || 'fbs'; // 'fbs' or 'fcs'

    // Retrieve API keys from environment variables
    const CFBD_API_KEY = process.env.CFBD_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // Check for necessary API keys based on potential usage
    if (!OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OPENAI_API_KEY is not set in environment variables.' }, { status: 500 });
    }
    // CFBD_API_KEY is checked conditionally below

    // Determine ESPN classification based on division parameter
    let espnClassification: 'college-football' | 'fcs-football';
    if (division === 'fbs') {
        espnClassification = 'college-football'; // ESPN uses 'college-football' for FBS
    } else if (division === 'fcs') {
        espnClassification = 'fcs-football'; // ESPN uses 'fcs-football' for FCS
    } else {
        return NextResponse.json({ error: 'Invalid division specified. Use "fbs" or "fcs".' }, { status: 400 });
    }

    // --- Handle different API targets ---

    // 1. Fetch Teams from CFBD API (FBS/FCS Team List Filter data)
    if (target === 'teams') {
        if (!CFBD_API_KEY) {
            return NextResponse.json({ error: 'CFBD_API_KEY is not set for fetching teams.' }, { status: 500 });
        }
        try {
            console.log(`[API Route] Fetching ${division.toUpperCase()} teams from College Football Data API...`);
            // Use /teams/fbs or /teams depending on classification
            const cfbdApiEndpoint = division === 'fbs' ? 'https://api.collegefootballdata.com/teams/fbs' : `https://api.collegefootballdata.com/teams?classification=${division}`;

            const cfbdTeamsResponse = await fetch(cfbdApiEndpoint, {
                headers: {
                    'Authorization': `Bearer ${CFBD_API_KEY}`,
                    'Accept': 'application/json',
                },
            });

            if (!cfbdTeamsResponse.ok) {
                console.error(`Error fetching ${division.toUpperCase()} teams from CFBD: ${cfbdTeamsResponse.status} ${cfbdTeamsResponse.statusText}`);
                const errorText = await cfbdTeamsResponse.text();
                console.error(`CFBD Error Details: ${errorText}`);
                return NextResponse.json({ error: `Failed to fetch teams: ${cfbdTeamsResponse.statusText}` }, { status: cfbdTeamsResponse.status });
            }

            const teamsJson: CFBDTeam[] = await cfbdTeamsResponse.json();
            // console.log('[API Route] Raw CFBD Teams Data (first 5):', JSON.stringify(teamsJson.slice(0,5), null, 2));


            const formattedTeams: FormattedTeamForFrontend[] = teamsJson
                .sort((a, b) => a.school.localeCompare(b.school)) // Sort alphabetically by school name
                .map(team => ({
                    id: team.id.toString(),
                    collegeDisplayName: team.school,
                    mascot: team.mascot || 'N/A', // CFBD /teams/fbs should have mascot
                    conference: team.conference || 'N/A', // CFBD /teams/fbs should have conference
                    classification: team.classification ? team.classification.toUpperCase() : division.toUpperCase(), // Should be FBS/FCS from this endpoint
                    color: team.color || '#000000',
                    alternateColor: team.alt_color || '#FFFFFF',
                    logo: team.logos?.[0] || '', // Primary logo
                    darkLogo: team.logos?.[1] || team.logos?.[0] || '', // Alternative/dark logo
                }));

            return NextResponse.json(formattedTeams);

        } catch (error: any) {
            console.error('[API Route] Error fetching teams:', error);
            return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
        }
    }

    // 2. Fetch Players (Roster data) from ESPN API
    if (target === 'players') {
        if (!team) {
            return NextResponse.json({ error: 'Team name is required for fetching ESPN roster data' }, { status: 400 });
        }

        try {
            // Use the new getEspnTeamSlug function
            const espnTeamSlug = await getEspnTeamSlug(team, espnClassification);

            if (!espnTeamSlug) {
                console.warn(`[API Route] Could not find ESPN team slug for CFBD team: ${team} in ${division} division.`);
                return NextResponse.json({ error: `Could not find ESPN team slug for CFBD team: ${team}` }, { status: 404 });
            }

            console.log(`[API Route] Attempting to fetch roster for ESPN team slug: ${espnTeamSlug} in ${espnClassification}`);
            const formattedPlayers = await getEspnPlayers(espnTeamSlug, year, espnClassification);

            if (formattedPlayers === null) {
                return NextResponse.json({ error: `Failed to retrieve players for ESPN team slug: ${espnTeamSlug}` }, { status: 500 });
            }

            // Filter by search query if present
            const filteredPlayers = search
                ? formattedPlayers.filter(player =>
                    player.fullName.toLowerCase().includes(search.toLowerCase())
                )
                : formattedPlayers;

            return NextResponse.json(filteredPlayers);

        } catch (error: any) {
            console.error('[API Route] Error fetching players:', error);
            return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
        }
    }

    // 3. Generate AI Overview (detailed player data from ESPN)
    if (target === 'ai-overview' || (!target && playerId)) { // playerId check for backward compatibility
        if (!playerId) {
            return NextResponse.json({ error: 'Player ID is required for AI overview' }, { status: 400 });
        }

        try {
            console.log(`[AI Overview API] Fetching player data from ESPN for Player ID: ${playerId}`);
            // Fetch player data from ESPN (using the community-discovered endpoint structure)
            const playerResponse = await fetch(`http://site.api.espn.com/apis/site/v2/sports/football/college-football/athletes/${playerId}`);

            if (!playerResponse.ok) {
                console.error(`Error fetching player data from ESPN: ${playerResponse.status} ${playerResponse.statusText}`);
                return NextResponse.json({ error: `Failed to fetch player data: ${playerResponse.statusText}` }, { status: playerResponse.status });
            }

            const playerJson = await playerResponse.json();
            const player: ESPNPlayerDetail | undefined = playerJson.athletes?.[0]; // Assuming the structure has an 'athletes' array

            if (!player) {
                return NextResponse.json({ error: 'Player not found on ESPN' }, { status: 404 });
            }

            // Extract relevant player details for AI prompt (fixed destructuring aliases)
            const {
                id,
                firstName,
                lastName,
                fullName: name,
                position: { displayName: position },
                displayHeight: height,
                displayWeight: weight,
                jersey,
                hometown: { city: playerHometownCity, state: playerHometownState }, // Aliased for clarity
                team: { displayName: teamName, logos, color, alternateColor },
                college: {
                    year: currentCollegeYear, // Aliased to avoid conflict with `year` query param
                    redshirted: isRedshirtedStatus, // Aliased for clarity
                },
                recruit: {
                    rating: recruitRating, // Aliased for clarity
                    positionRank: recruitArchetype, // Aliased for clarity
                }
            } = player;

            const redshirtedStatusText = isRedshirtedStatus ? 'Yes' : 'No';
            const dealbreaker = null; // No direct mapping from ESPN API for this.

            const teamLogo = logos?.[0]?.href || '';
            const teamDarkLogo = logos?.[1]?.href || logos?.[0]?.href || '';

            const playerClass = currentCollegeYear || 'N/A';

            // Generate AI Overview and Ratings
            const openai = new OpenAI({
                apiKey: OPENAI_API_KEY,
            });

            const prompt = `Generate a concise AI overview, detailed AI ratings (speed, strength, agility, awareness, etc., categorized by offense, defense, and athletic with numerical values 1-99), and a single quality score (1-99) for a college football player based on the following attributes:
            Player Name: ${name}
            Position: ${position}
            Height: ${height}
            Weight: ${weight}
            Jersey: ${jersey}
            Hometown: ${playerHometownCity}, ${playerHometownState}
            Team: ${teamName}
            Player ID: ${id}
            Player Class: ${playerClass}
            Redshirted: ${redshirtedStatusText}
            High School Rating: ${recruitRating ? recruitRating : 'N/A'}
            Archetype: ${recruitArchetype ? recruitArchetype : 'N/A'}

            The AI overview should be a 3-4 sentence paragraph describing the player's overall style, strengths, and potential.
            The AI ratings should be an array of objects, each with a 'category' (e.g., "Offense", "Defense", "Athletic") and a 'stats' array. Each stat should have a 'name' and a 'value' (1-99). The ratings should be comprehensive for their position, and if a stat is not applicable or cannot be inferred, assign a reasonable default (e.g., 50) but prioritize specific, strong ratings where appropriate.
            The player quality score should be a single numerical value between 1 and 99, representing their overall quality.

            Example AI Ratings structure:
            [
                {
                    "category": "Offense",
                    "stats": [
                        {"name": "Throw Power", "value": 85},
                        {"name": "Accuracy", "value": 88}
                    ]
                },
                {
                    "category": "Athletic",
                    "stats": [
                        {"name": "Speed", "value": 90},
                        {"name": "Agility", "value": 85}
                    ]
                }
            ]
            `;

            console.log("[AI Overview API] Sending prompt to OpenAI.");

            const aiResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 700,
                response_format: { type: "json_object" },
            });

            console.log("[AI Overview API] Received response from OpenAI.");

            const parsedResponse = JSON.parse(aiResponse.choices[0].message?.content || '{}');
            const { aiOverview, aiRatings, playerQualityScore } = parsedResponse;

            // Assign abilities based on position and ratings
            const assignedAbilities: AssignedAbility[] = [];
            const playerPosition = position.split(' ')[0]; // Take the first word of the position

            for (const ability of allAbilities) {
                if (ability.positions.includes(playerPosition)) {
                    const randomTierIndex = Math.floor(Math.random() * tiers.length);
                    const assignedTier = tiers[randomTierIndex];

                    assignedAbilities.push({
                        name: ability.name,
                        tier: assignedTier,
                        description: ability.description,
                    });
                }
            }
            console.log(`[AI Overview API] Assigned Abilities:`, assignedAbilities);

            return NextResponse.json({
                aiOverview,
                aiRatings,
                assignedAbilities,
                playerQualityScore,
                playerClass,
                redshirted: redshirtedStatusText,
                highSchoolRating: recruitRating, // Use the aliased variable
                archetype: recruitArchetype, // Use the aliased variable
                dealbreaker,
            });

        } catch (error: any) {
            console.error('[AI Overview API] Error:', error);
            if (error instanceof OpenAI.APIError) {
                console.error(error.status);
                console.error(error.message);
                console.error(error.code);
                console.error(error.type);
                return NextResponse.json(
                    { error: 'OpenAI API Error', details: error.message, code: error.code, type: error.type },
                    { status: error.status || 500 }
                );
            } else {
                return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
            }
        }
    }

    // Fallback for invalid or missing target
    return NextResponse.json({ error: 'Invalid or missing target parameter. Must be "teams", "players", or "ai-overview" with playerId.' }, { status: 400 });
}

// Add a dummy OPTIONS handler for CORS preflight requests if needed (Vercel often handles this, but good practice)
export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}