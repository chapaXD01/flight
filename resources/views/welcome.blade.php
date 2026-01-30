<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flight Tracker</title>
    <link rel="stylesheet" href="{{ asset('css/styles.css') }}">
</head>
<body class="light-mode">
    <button class="dark-mode-toggle" onclick="toggleDarkMode()">🌙 Dark Mode</button>
    
    <div class="filter-panel">
        <h3>🔧 Filter Planes</h3>
        
        <div class="filter-section">
            <label class="filter-label">Aircraft Type</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <input type="checkbox" id="filter-jets" checked onchange="applyFilters()">
                    <label for="filter-jets">✈️ Jets</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="filter-props" checked onchange="applyFilters()">
                    <label for="filter-props">🚁 Props</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="filter-helis" checked onchange="applyFilters()">
                    <label for="filter-helis">🛩️ Helicopters</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="filter-heavy" checked onchange="applyFilters()">
                    <label for="filter-heavy">🛫 Heavy</label>
                </div>
            </div>
        </div>

        <div class="filter-section">
            <label class="filter-label">Minimum Altitude (m)</label>
            <input type="range" id="filter-altitude" min="0" max="15000" step="500" value="0" class="filter-slider" onchange="applyFilters()">
            <div class="altitude-info">
                <span id="altitude-display">0m</span> and above
            </div>
        </div>

        <div class="filter-section">
            <label class="filter-label">Region</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <input type="checkbox" id="filter-europe" checked onchange="applyFilters()">
                    <label for="filter-europe">🇪🇺 Europe</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="filter-worldwide" checked onchange="applyFilters()">
                    <label for="filter-worldwide">🌍 Worldwide</label>
                </div>
            </div>
        </div>

        <button class="filter-btn" onclick="resetFilters()">Reset Filters</button>
    </div>
    
    <div class="stats-panel">
        <h3>✈️ Live Flight Stats</h3>
        <div class="search-section">
            <input 
                type="text" 
                id="search-callsign" 
                class="search-input"
                placeholder="🔍 Search callsign..." 
                onkeypress="if(event.key==='Enter') searchPlane()"
            >
            <button 
                onclick="searchPlane()" 
                class="search-btn"
            >
                Search
            </button>
        </div>
        <div class="stat-row">
            <span class="stat-label">Total Planes:</span>
            <span class="stat-value" id="stat-total">0</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Avg Altitude:</span>
            <span class="stat-value" id="stat-avg-altitude">0m</span>
        </div>
        <div class="stat-breakdown">
            <div class="breakdown-item">
                <div class="breakdown-item-label">Jets</div>
                <div class="breakdown-item-value" id="stat-jets">0</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-item-label">Props</div>
                <div class="breakdown-item-value" id="stat-props">0</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-item-label">Helicopters</div>
                <div class="breakdown-item-value" id="stat-helis">0</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-item-label">Heavy</div>
                <div class="breakdown-item-value" id="stat-heavy">0</div>
            </div>
        </div>
    </div>
    
    <x-maps-google
        :centerPoint="['lat' => 52.16, 'long' => 5]"
        :zoomLevel="6"
        :mapType="'terrain'"
        :markers="[]"
        :fitToBounds="false"
    ></x-maps-google>

    <script>
        window.FLIGHT_CONFIG = {
            icons: {
                jet: "{{ asset('icons/jet.png') }}",
                heavy: "{{ asset('icons/heavy.png') }}",
                propeller: "{{ asset('icons/propeller.png') }}",
                helicopter: "{{ asset('icons/helicopter.png') }}"
            }
        };
    </script>
    
    <script src="{{ asset('js/flight-tracker.js') }}"></script>
</body>
</html>