# Configuration settings
DEFAULT_CITY = "Salzburg, Austria"
MAPBOX_TOKEN = "pk.eyJ1IjoiamFraXJob3NzYWluNTIiLCJhIjoiY21lYng0dXQzMTRzYjJqcXVuaGdlMjZyZyJ9.p9X8xLZPuYCnY1sjPDMT8Q"  # Replace with your token

# OSM Feature Tags
GREEN_TAGS = {
    'landuse': ['forest', 'meadow', 'grass', 'recreation_ground', 'vineyard'],
    'leisure': ['park', 'garden', 'golf_course', 'playground'],
    'natural': ['wood', 'tree', 'tree_row', 'scrub', 'heath'],
    'tourism': ['camp_site']
}

SOCIAL_TAGS = {
    'amenity': ['cafe', 'restaurant', 'bar', 'pub', 'food_court', 'ice_cream'],
    'shop': ['bakery', 'gift', 'clothes', 'supermarket', 'convenience'],
    'tourism': ['gallery', 'museum', 'viewpoint', 'attraction', 'zoo'],
    'leisure': ['sports_centre', 'stadium', 'swimming_pool', 'dance']
}

QUIET_TAGS = {
    'highway': ['footway', 'path', 'pedestrian', 'steps', 'track'],
    'motor_vehicle': ['no'],
    'access': ['private', 'permissive']
}

# OSM Highway Noise Levels
HIGHWAY_NOISE = {
    'motorway': 2.0,
    'trunk': 1.8,
    'primary': 1.5,
    'secondary': 1.3,
    'tertiary': 1.2,
    'residential': 1.0,
    'service': 0.8,
    'footway': 0.5,
    'path': 0.4,
    'pedestrian': 0.3
}

# Route parameters
MAX_ROUTE_DISTANCE = 10000  # 10km maximum route distance
POI_SEARCH_RADIUS = 200  # meters