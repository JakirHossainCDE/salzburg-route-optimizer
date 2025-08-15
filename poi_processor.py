import osmnx as ox
from geopy.distance import great_circle
import config
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_pois_near_route(route, radius=config.POI_SEARCH_RADIUS):
    """Get POIs near the optimized route for any city"""
    try:
        if len(route) < 2:
            return []
            
        logger.info(f"Finding POIs near route with {len(route)} points")
        
        # Create route buffer (simplified convex hull)
        lats = [p[0] for p in route]
        lngs = [p[1] for p in route]
        bbox = (min(lats), min(lngs), max(lats), max(lngs))
        
        # Get POIs within bounding box
        pois = ox.geometries_from_bbox(
            north=bbox[2], 
            south=bbox[0], 
            east=bbox[3], 
            west=bbox[1], 
            tags=config.SOCIAL_TAGS
        )
        
        # Filter POIs near route
        results = []
        for _, row in pois.iterrows():
            try:
                poi_point = (row.geometry.centroid.y, row.geometry.centroid.x)
                
                # Find closest point on route
                min_dist = min(great_circle(poi_point, route_point).meters 
                            for route_point in route)
                
                if min_dist <= radius:
                    results.append({
                        'name': row.get('name', 'Unnamed POI'),
                        'type': get_poi_type(row),
                        'lat': row.geometry.centroid.y,
                        'lng': row.geometry.centroid.x,
                        'distance': min_dist
                    })
            except Exception as e:
                logger.warning(f"Skipping POI: {str(e)}")
        
        # Sort by distance and limit results
        results.sort(key=lambda x: x['distance'])
        logger.info(f"Found {len(results)} POIs near route")
        return results[:20]  # Return top 20 POIs
        
    except Exception as e:
        logger.error(f"POI processing failed: {str(e)}")
        return []

def get_poi_type(osm_row):
    """Categorize POI based on OSM tags"""
    if 'amenity' in osm_row:
        if osm_row['amenity'] in ['cafe', 'restaurant', 'food_court', 'ice_cream']:
            return 'food'
        return osm_row['amenity']
    if 'leisure' in osm_row:
        return 'leisure'
    if 'tourism' in osm_row:
        return 'attraction'
    if 'shop' in osm_row:
        return 'shop'
    return 'other'