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

function getDirectionFromHeading(heading) {
    if (!heading && heading !== 0) return 'Unknown';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(heading / 22.5) % 16;
    return directions[index];
}

function formatLastContact(timestamp) {
    if (!timestamp) return 'N/A';
    
    const lastContact = new Date(timestamp * 1000);
    const now = new Date();
    const diffSeconds = Math.floor((now - lastContact) / 1000);
    
    let timeAgo = '';
    if (diffSeconds < 60) {
        timeAgo = `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        timeAgo = `${minutes}m ago`;
    } else if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600);
        timeAgo = `${hours}h ago`;
    } else {
        const days = Math.floor(diffSeconds / 86400);
        timeAgo = `${days}d ago`;
    }
    
    const dateStr = lastContact.toLocaleString();
    return `${dateStr} (${timeAgo})`;
}

async function getdata(){
    const response = await fetch("https://opensky-network.org/api/states/all");
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
        markers: Object.values(planeMarkers)
    });

    console.log("Updated planes:", Object.keys(planeMarkers).length);
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
    const heading = flight[10];
    const direction = getDirectionFromHeading(heading);
    const lastContact = flight[4];
    const lastContactFormatted = formatLastContact(lastContact);
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
            <strong>Velocity:</strong> ${velocity} m/s<br>
            <strong>Direction:</strong> ${direction}<br>
            <strong>Heading:</strong> ${heading !== null && heading !== undefined ? Math.round(heading) + '°' : 'N/A'}<br>
            <strong>Last Contact:</strong><br>
            <small>${lastContactFormatted}</small>
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
        setInterval(updateFlights, 2000);
    } else {
        setTimeout(waitForMap, 100);
    }
}

window.addEventListener('load', function() {
    loadDarkModePreference();
    setTimeout(waitForMap, 500);
});
