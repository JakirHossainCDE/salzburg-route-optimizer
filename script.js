// Initialize Mapbox
mapboxgl.accessToken = MAPBOX_TOKEN;
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [13.0550, 47.8095],  // Salzburg center
    zoom: 13
});

// DOM Elements
const greenSlider = document.getElementById('greenness-slider');
const socialSlider = document.getElementById('sociability-slider');
const quietSlider = document.getElementById('quietness-slider');
const greenValue = document.getElementById('greenness-value');
const socialValue = document.getElementById('sociability-value');
const quietValue = document.getElementById('quietness-value');
const optimizeBtn = document.getElementById('optimize-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const messageBox = document.getElementById('message-box');
const attractionsList = document.getElementById('attractions-list');

// Update slider values
greenSlider.addEventListener('input', () => greenValue.textContent = greenSlider.value);
socialSlider.addEventListener('input', () => socialValue.textContent = socialSlider.value);
quietSlider.addEventListener('input', () => quietValue.textContent = quietSlider.value);

// Load Salzburg data on startup
document.addEventListener('DOMContentLoaded', () => {
    loadSalzburg();
});

// Load Salzburg data
function loadSalzburg() {
    showLoading("Loading Salzburg data...");
    selectedAttractions = [];
    clearMap();
    
    setTimeout(() => {
        populateAttractionsList();
        hideLoading();
    }, 500);
}

// Populate attractions list with Salzburg locations
function populateAttractionsList() {
    attractionsList.innerHTML = '';
    
    // Salzburg attractions with coordinates (city center only)
    const attractions = [
        {id: 1, name: 'Salzburg Cathedral', icon: 'place-of-worship', lat: 47.7981, lng: 13.0466},
        {id: 2, name: 'Hohensalzburg Fortress', icon: 'landmark', lat: 47.7942, lng: 13.0503},
        {id: 3, name: 'Mirabell Palace', icon: 'landmark', lat: 47.8058, lng: 13.0436},
        {id: 4, name: 'Mozarts Geburtshaus', icon: 'music', lat: 47.8000, lng: 13.0436},
        {id: 5, name: 'Getreidegasse', icon: 'shopping-bag', lat: 47.7995, lng: 13.0401}
    ];
    
    attractions.forEach(attr => {
        const item = document.createElement('div');
        item.className = 'attraction-item';
        item.dataset.id = attr.id;
        item.innerHTML = `
            <i class="fas fa-${attr.icon}"></i>
            <span>${attr.name}</span>
        `;
        
        item.addEventListener('click', () => {
            if (selectedAttractions.includes(attr.id)) {
                selectedAttractions = selectedAttractions.filter(id => id !== attr.id);
                item.classList.remove('selected');
            } else {
                selectedAttractions.push(attr.id);
                item.classList.add('selected');
            }
        });
        
        attractionsList.appendChild(item);
    });
}

// Optimize route button handler
optimizeBtn.addEventListener('click', () => {
    if (selectedAttractions.length < 2) {
        showMessage("Please select at least 2 attractions", "error");
        return;
    }
    
    // Get preferences
    const preferences = {
        greenness: parseInt(greenSlider.value),
        sociability: parseInt(socialSlider.value),
        quietness: parseInt(quietSlider.value)
    };
    
    // Get attraction data
    const attractions = Array.from(attractionsList.children)
        .filter(item => selectedAttractions.includes(parseInt(item.dataset.id)))
        .map(item => {
            const id = parseInt(item.dataset.id);
            const name = item.querySelector('span').textContent;
            const attraction = attractions.find(a => a.id === id);
            return {
                id,
                name,
                lat: attraction.lat,
                lng: attraction.lng
            };
        });
    
    // Send request to backend
    showLoading("Optimizing your Salzburg route...");
    
    fetch(`${API_BASE_URL}/optimize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            attractions,
            preferences
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            displayRoute(data.route);
            displayPOIs(data.pois);
            displayComparison(data.comparison);
            showMessage("Salzburg route optimized!", "success");
        } else {
            showMessage(data.message || "Optimization failed", "error");
        }
    })
    .catch(error => {
        showMessage("Failed to optimize route", "error");
        console.error("Optimization error:", error);
    })
    .finally(() => {
        hideLoading();
    });
});

// Display route on map
function displayRoute(routeData) {
    // Clear existing route
    if (map.getSource('route')) {
        map.removeLayer('route');
        map.removeSource('route');
    }
    
    // Add new route
    map.addSource('route', {
        type: 'geojson',
        data: {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: routeData.path
            }
        }
    });
    
    map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#007BFF',
            'line-width': 5,
            'line-opacity': 0.7
        }
    });
    
    // Update distance display
    document.getElementById('route-distance').textContent = 
        `${(routeData.distance / 1000).toFixed(1)} km`;
    
    // Fit map to route bounds
    const bounds = routeData.path.reduce((bounds, coord) => {
        return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds());
    
    map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
    });
}

// Display POIs on map
function displayPOIs(pois) {
    // Clear existing POIs
    if (map.getSource('pois')) {
        map.removeLayer('pois');
        map.removeSource('pois');
    }
    
    // Add new POIs
    map.addSource('pois', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: pois.map(poi => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [poi.lng, poi.lat]
                },
                properties: {
                    name: poi.name,
                    type: poi.type
                }
            }))
        }
    });
    
    map.addLayer({
        id: 'pois',
        type: 'circle',
        source: 'pois',
        paint: {
            'circle-radius': 8,
            'circle-color': [
                'match',
                ['get', 'type'],
                'food', '#FF5722',
                'attraction', '#2196F3',
                'shop', '#9C27B0',
                '#607D8B'
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });
    
    // Add interactivity
    map.on('click', 'pois', (e) => {
        const name = e.features[0].properties.name;
        const type = e.features[0].properties.type;
        
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<b>${name}</b><br>Type: ${type}`)
            .addTo(map);
    });
}

// Display comparison metrics
function displayComparison(comparison) {
    document.getElementById('extra-distance').textContent = comparison.distance_diff;
    document.getElementById('greenness-gain').textContent = comparison.green_gain;
    document.getElementById('social-gain').textContent = comparison.social_gain;
    document.getElementById('quiet-gain').textContent = comparison.quiet_gain;
}

// Utility functions
function showLoading(message) {
    loadingText.textContent = message;
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    messageBox.className = type;
    messageBox.classList.remove('hidden');
    
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 5000);
}

function clearMap() {
    // Clear routes
    if (map.getSource('route')) {
        map.removeLayer('route');
        map.removeSource('route');
    }
    
    // Clear POIs
    if (map.getSource('pois')) {
        map.removeLayer('pois');
        map.removeSource('pois');
    }
    
    // Reset info display
    document.getElementById('route-distance').textContent = '-';
    document.getElementById('extra-distance').textContent = '-';
    document.getElementById('greenness-gain').textContent = '-';
    document.getElementById('social-gain').textContent = '-';
    document.getElementById('quiet-gain').textContent = '-';
}

// Initialize
map.on('load', () => {
    loadSalzburg();
});
