const FLIGHT_CONFIG = window.FLIGHT_CONFIG || {};

function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = body.classList.contains('dark-mode');
    
    if (isDarkMode) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('darkMode', 'false');
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
    }
    
    updateMapStyle();
}

function loadDarkModePreference() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    }
}

function updateMapStyle() {
    if (!window.flightMap) return;
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const styles = isDarkMode ? darkMapStyles : lightMapStyles;
    window.flightMap.setOptions({ 
        styles: styles,
        mapTypeControl: false
    });
}

const darkMapStyles = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9080' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3751ff' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
    { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] }
];

const lightMapStyles = [];

let planeMarkers = {};
let markerCluster = null;
let infoWindow = null;
let allFlights = [];

let filteredFlights = [];

function createCustomClusterIcon(count) {
    const size = count < 10 ? 40 : count < 100 ? 50 : 60;
    const colors = {
        small: { bg: '#9C27B0', border: '#7B1FA2', text: '#FFFFFF' },
        medium: { bg: '#E91E63', border: '#C2185B', text: '#FFFFFF' },
        large: { bg: '#FF5722', border: '#E64A19', text: '#FFFFFF' }
    };
    
    let colorSet;
    if (count < 10) colorSet = colors.small;
    else if (count < 100) colorSet = colors.medium;
    else colorSet = colors.large;
    
    const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad${count}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${colorSet.bg};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${colorSet.border};stop-opacity:1" />
                </linearGradient>
            </defs>
            <polygon points="${size/2},${size*0.15} ${size*0.85},${size*0.4} ${size*0.85},${size*0.75} ${size/2},${size*0.9} ${size*0.15},${size*0.75} ${size*0.15},${size*0.4}" 
                     fill="url(#grad${count})" 
                     stroke="#FFFFFF" 
                     stroke-width="2.5"/>
            <text x="50%" y="50%" 
                  text-anchor="middle" 
                  dominant-baseline="central" 
                  font-family="Arial, sans-serif" 
                  font-size="${count < 100 ? '14' : '16'}" 
                  font-weight="bold" 
                  fill="${colorSet.text}">${count}</text>
        </svg>
    `;
    
    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(size, size),
        anchor: new google.maps.Point(size / 2, size / 2)
    };
}

class CustomClusterRenderer {
    render(cluster, stats, map) {
        const count = cluster.count;
        const position = cluster.position;
        const icon = createCustomClusterIcon(count);
        
        return new google.maps.Marker({
            position,
            icon: icon,
            label: {
                text: String(count),
                color: '#FFFFFF',
                fontSize: count < 100 ? '14px' : '16px',
                fontWeight: 'bold'
            },
            zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
            title: `${count} flights`,
            map: map
        });
    }
}

const customClusterRenderer = new CustomClusterRenderer();

function applyFilters() {
    const filterJets = document.getElementById('filter-jets').checked;
    const filterProps = document.getElementById('filter-props').checked;
    const filterHelis = document.getElementById('filter-helis').checked;
    const filterHeavy = document.getElementById('filter-heavy').checked;
    const minAltitude = parseInt(document.getElementById('filter-altitude').value);
    const filterEurope = document.getElementById('filter-europe').checked;
    const filterWorldwide = document.getElementById('filter-worldwide').checked;

    document.getElementById('altitude-display').textContent = minAltitude + 'm';

    filteredFlights = allFlights.filter(flight => {
        if (!flight[5] || !flight[6]) return false;

        const speed = flight[9] || 0;
        const altitude = flight[7] || 0;
        const lat = flight[6];

        let typeMatch = false;
        if (speed >= 250 && filterHeavy) typeMatch = true;
        if (speed > 200 && speed < 250 && filterJets) typeMatch = true;
        if (speed > 80 && speed <= 200 && filterProps) typeMatch = true;
        if (speed <= 80 && filterHelis) typeMatch = true;

        if (!typeMatch) return false;

        if (altitude < minAltitude) return false;

        const isEurope = lat >= 35 && lat <= 70;
        if (filterEurope && filterWorldwide) {
        } else if (filterEurope && !filterWorldwide) {
            if (!isEurope) return false;
        } else if (filterWorldwide && !filterEurope) {
            if (isEurope) return false;
        } else {
            return false;
        }

        return true;
    });

    renderFilteredMarkers();
}

function renderFilteredMarkers() {
    Object.values(planeMarkers).forEach(marker => {
        marker.setVisible(false);
    });

    const visibleMarkers = [];
    filteredFlights.forEach(flight => {
        const id = flight[0];
        if (planeMarkers[id]) {
            planeMarkers[id].setVisible(true);
            visibleMarkers.push(planeMarkers[id]);
        }
    });

    if (markerCluster) {
        markerCluster.clearMarkers();
        markerCluster = new markerClusterer.MarkerClusterer({
            map: window.flightMap,
            markers: visibleMarkers,
            renderer: customClusterRenderer
        });
    }

    console.log("Filtered planes:", visibleMarkers.length);
}

function resetFilters() {
    document.getElementById('filter-jets').checked = true;
    document.getElementById('filter-props').checked = true;
    document.getElementById('filter-helis').checked = true;
    document.getElementById('filter-heavy').checked = true;
    document.getElementById('filter-europe').checked = true;
    document.getElementById('filter-worldwide').checked = true;
    document.getElementById('filter-altitude').value = 0;

    applyFilters();
}

function searchPlane() {
    const searchInput = document.getElementById('search-callsign').value.toUpperCase().trim();
    
    if (!searchInput) {
        alert('Please enter a callsign');
        return;
    }

    const foundFlight = allFlights.find(flight => {
        if (flight[1]) {
            return flight[1].toUpperCase().includes(searchInput);
        }
        return false;
    });

    if (!foundFlight || !foundFlight[5] || !foundFlight[6]) {
        alert(`Plane with callsign "${searchInput}" not found`);
        return;
    }

    const position = { lat: foundFlight[6], lng: foundFlight[5] };
    window.flightMap.panTo(position);
    window.flightMap.setZoom(10);

    const planeId = foundFlight[0];
    if (planeMarkers[planeId]) {
        showFlightInfo(planeMarkers[planeId], foundFlight);
    }

    document.getElementById('search-callsign').value = '';
}

function updateStats(flights) {
    let jetCount = 0;
    let propCount = 0;
    let heliCount = 0;
    let heavyCount = 0;
    let totalAltitude = 0;
    let validAltitudeCount = 0;

    flights.forEach(flight => {
        if (flight[5] && flight[6]) {
            const speed = flight[9] || 0;
            const altitude = flight[7];

            if (speed >= 250) {
                heavyCount++;
            } else if (speed > 200) {
                jetCount++;
            } else if (speed > 80) {
                propCount++;
            } else {
                heliCount++;
            }

            if (altitude && altitude > 0) {
                totalAltitude += altitude;
                validAltitudeCount++;
            }
        }
    });

    const totalPlanes = flights.filter(f => f[5] && f[6]).length;
    const avgAltitude = validAltitudeCount > 0 ? Math.round(totalAltitude / validAltitudeCount) : 0;

    document.getElementById('stat-total').textContent = totalPlanes;
    document.getElementById('stat-avg-altitude').textContent = avgAltitude + 'm';
    document.getElementById('stat-jets').textContent = jetCount;
    document.getElementById('stat-props').textContent = propCount;
    document.getElementById('stat-helis').textContent = heliCount;
    document.getElementById('stat-heavy').textContent = heavyCount;
}

function guessTypeFromSpeed(speed) {
    if (!speed) return 'JET';
    
    if (speed >= 250) return 'HEAVY';      
    if (speed > 200) return 'JET';        
    if (speed > 80) return 'PROP';        
    return 'HELI';                       
}

function getIconByType(type) {
    const typeStr = type.toUpperCase();
    const icons = FLIGHT_CONFIG.icons || {};
    
    if (typeStr === 'HEAVY') {
        return icons.heavy || '/icons/heavy.png';
    } else if (typeStr === 'PROP') {
        return icons.propeller || '/icons/propeller.png';
    } else if (typeStr === 'HELI') {
        return icons.helicopter || '/icons/helicopter.png';
    }
    
    return icons.jet || '/icons/jet.png';
}

async function getdata(){
    const response = await fetch("/plane.json");
    const data = await response.json();
    return data;
}

async function updateFlights() {
    if (!window.flightMap) return;

    const data = await getdata();
    const flights = data.states || [];
    
    allFlights = flights;

    updateStats(flights);

    const newMarkers = {};

    flights.forEach(flight => {
        if (flight[5] && flight[6]) {
            const id = flight[0];
            const position = { lat: flight[6], lng: flight[5] };
            const speed = flight[9] || 0;
            const planeType = guessTypeFromSpeed(speed);

            if (planeMarkers[id]) {
                planeMarkers[id].setPosition(position);
                newMarkers[id] = planeMarkers[id];
            } else {
                const marker = new google.maps.Marker({
                    position,
                    icon: {
                        url: getIconByType(planeType),
                        scaledSize: new google.maps.Size(32, 32),
                        origin: new google.maps.Point(0, 0),
                        anchor: new google.maps.Point(16, 16)
                    },
                    title: flight[1] || 'Flight'
                });
                
                marker.addListener('click', function() {
                    showFlightInfo(marker, flight);
                });
                
                newMarkers[id] = marker;
            }
        }
    });

    for (let id in planeMarkers) {
        if (!newMarkers[id]) {
            planeMarkers[id].setMap(null);
        }
    }

    planeMarkers = newMarkers;

    if (markerCluster) {
        markerCluster.clearMarkers();
    }

    markerCluster = new markerClusterer.MarkerClusterer({
        map: window.flightMap,
        markers: Object.values(planeMarkers),
        renderer: customClusterRenderer
    });

    console.log("Updated planes:", Object.keys(planeMarkers).length);

    applyFilters();
}

function showFlightInfo(marker, flight) {
    if (infoWindow) {
        infoWindow.close();
    }

    const callsign = flight[1] ? flight[1].trim() : 'N/A';
    const country = flight[2] || 'Unknown';
    const latitude = flight[6] ? flight[6].toFixed(4) : 'N/A';
    const longitude = flight[5] ? flight[5].toFixed(4) : 'N/A';
    const altitude = flight[7] ? Math.round(flight[7]) : 'N/A';
    const velocity = flight[9] ? Math.round(flight[9]) : 'N/A';
    const verticalRate = flight[11] ? Math.round(flight[11]) : 0;
    const onGround = flight[8];
    
    let status = 'In Flight';
    if (onGround) {
        status = 'On Ground';
    } else if (altitude < 300) {
        if (verticalRate < -2) {
            status = 'Landing';
        } else if (verticalRate > 2) {
            status = 'Taking Off';
        }
    }

    const content = `
        <div style="font-family: Arial; font-size: 12px; width: 200px;">
            <strong>${callsign}</strong><br>
            <small>Origin: ${country}</small><br>
            <strong style="color: ${status === 'On Ground' ? '#ff6b6b' : status === 'Landing' ? '#ffa500' : status === 'Taking Off' ? '#4CAF50' : '#2196F3'};">${status}</strong><br>
            <hr style="margin: 5px 0;">
            <strong>Location:</strong><br>
            Lat: ${latitude}°<br>
            Lng: ${longitude}°<br>
            <strong>Altitude:</strong> ${altitude} m<br>
            <strong>Velocity:</strong> ${velocity} m/s
        </div>
    `;

    infoWindow = new google.maps.InfoWindow({
        content: content
    });

    infoWindow.open(window.flightMap, marker);
}

function waitForMap() {
    if (window.flightMap) {
        updateFlights();
    } else {
        setTimeout(waitForMap, 100);
    }
}

window.addEventListener('load', function() {
    loadDarkModePreference();
    setTimeout(waitForMap, 500);
});
