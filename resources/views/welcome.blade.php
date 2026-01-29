<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    {{-- Google Maps --}}
    {{-- Single map with all features combined --}}
    <x-maps-google
        :centerPoint="['lat' => 52.16, 'long' => 5]"
        :zoomLevel="6"
        :mapType="'roadmap'"
        :markers="[]"
        :fitToBounds="false"
    ></x-maps-google>

    <script>
        async function getdata(){
            const response = await fetch("/plane.json");
            const data = await response.json();
            return data;
        }


        async function addFlightMarkers() {
            if (!window.flightMap) {
                console.error('Map not initialized yet');
                return;
            }

            try {
                const data = await getdata();
                const flights = data.states || [];
                const bounds = new google.maps.LatLngBounds();
                let markerCount = 0;
                
                flights.forEach(function(flight) {
                    if (flight[5] && flight[6]) { 
                        const marker = new google.maps.Marker({
                            position: {
                                lat: flight[6],
                                lng: flight[5]
                            },
                            map: window.flightMap,
                            icon: "{{ asset('icons/flight.png') }}",
                            title: flight[1] || 'Flight'
                        });
                        bounds.extend({lat: flight[6], lng: flight[5]});
                        markerCount++;
                    }
                });
                
             
                if (markerCount > 0) {
                    window.flightMap.fitBounds(bounds);
                }
            } catch (error) {
                console.error('Error fetching flight data:', error);
            }

        }

        
        function waitForMap() {
            if (window.flightMap) {
                addFlightMarkers();
            } else {
                setTimeout(waitForMap, 100);
            }
        }

        
        window.addEventListener('load', function() {
            setTimeout(waitForMap, 500);
        });
    </script>
</body>
</html>
</html>