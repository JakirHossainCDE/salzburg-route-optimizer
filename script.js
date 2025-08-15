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
    
    // Clear previous state
    selectedAttractions = [];
    clearMap();
    
    // Load attractions and set map view
    setTimeout(() => {
        populateAttractionsList();
        hideLoading();
    }, 500);
}

// Populate attractions list with Salzburg locations
function populateAttractionsList() {
    attractionsList.innerHTML = '';
    
    // Salzburg attractions with coordinates
    const attractions = [
        {id: 1, name: 'Salzburg Cathedral', icon: 'place-of-worship', lat: 47.7981, lng: 13.0466},
        {id: 2, name: 'Hohensalzburg Fortress', icon: 'landmark', lat: 47.7942, lng: 13.0503},
        {id: 3, name: 'Mirabell Palace', icon: 'landmark', lat: 47.8058, lng: 13.0436},
        {id: 4, name: 'Mozarts Geburtshaus', icon: 'music', lat: 47.8000, lng: 13.0436},
        {id: 5, name: 'Getreidegasse', icon: 'shopping-bag', lat: 47.7995, lng: 13.0401},
        {id: 6, name: 'Hellbrunn Palace', icon: 'landmark', lat: 47.7622, lng: 13.0606},
        {id: 7, name: 'Mönchsberg', icon: 'mountain', lat: 47.7953, lng: 13.0414},
        {id: 8, name: 'Salzach River Cruise', icon: 'ship', lat: 47.8030, lng: 13.0410}
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
            // Find coordinates in the predefined list
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

// Rest of the file remains the same (displayRoute, displayPOIs, etc.)