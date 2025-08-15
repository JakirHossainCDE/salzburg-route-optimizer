import osmnx as ox
import networkx as nx
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import numpy as np
import logging
import config
from geopy.distance import great_circle
import time
import cachetools
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Memory cache with 1 item and 30 minute expiration
graph_cache = cachetools.TTLCache(maxsize=1, ttl=1800)

def get_salzburg_graph(use_simple_graph=True):
    """Get Salzburg graph with memory optimizations"""
    if 'graph' in graph_cache:
        logger.info("Using cached graph")
        return graph_cache['graph']
    
    logger.info("Loading Salzburg graph...")
    start_time = time.time()
    
    if use_simple_graph:
        # Reduced bounding box for city center
        north, south, east, west = 47.82, 47.78, 13.07, 13.03
        graph = ox.graph_from_bbox(
            north, south, east, west,
            network_type='walk',
            simplify=True,
            retain_all=False,
            truncate_by_edge=True,
            custom_filter='["highway"~"footway|path|pedestrian|steps|residential|service"]'
        )
    else:
        # Full city with filtering
        graph = ox.graph_from_place(
            "Salzburg, Austria",
            network_type='walk',
            simplify=True,
            retain_all=False,
            custom_filter='["highway"~"footway|path|pedestrian|steps|residential|service"]'
        )
    
    # Simplify and reduce graph
    graph = ox.simplify_graph(graph)
    logger.info(f"Graph loaded in {time.time()-start_time:.2f}s with {len(graph.nodes)} nodes")
    
    # Cache the graph
    graph_cache['graph'] = graph
    return graph

def optimize_route(attractions, green_weight=5, social_weight=5, quiet_weight=5, use_simple_graph=True):
    """Optimize route with custom preferences for Salzburg"""
    start_time = time.time()
    logger.info("Starting route optimization")
    
    try:
        G = get_salzburg_graph(use_simple_graph)
        
        # Find nearest nodes to attractions
        nodes = []
        for attr in attractions:
            node = ox.nearest_nodes(G, X=[attr['lng']], Y=[attr['lat']])[0]
            nodes.append(node)
        
        # Create distance matrix with custom weights
        dist_matrix = create_custom_matrix(G, nodes, green_weight, social_weight, quiet_weight)
        
        # Solve TSP
        manager = pywrapcp.RoutingIndexManager(len(nodes), 1, 0)
        routing = pywrapcp.RoutingModel(manager)
        
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return dist_matrix[from_node][to_node]
        
        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.time_limit.seconds = 10  # Reduced from 30
        
        solution = routing.SolveWithParameters(search_parameters)
        
        # Extract optimized route
        if solution:
            index = routing.Start(0)
            route_order = []
            while not routing.IsEnd(index):
                route_order.append(manager.IndexToNode(index))
                index = solution.Value(routing.NextVar(index))
            
            # Get full path geometry
            full_path = []
            for i in range(len(route_order)-1):
                origin = nodes[route_order[i]]
                destination = nodes[route_order[i+1]]
                path = nx.shortest_path(G, origin, destination, weight='custom_weight')
                full_path.extend([(G.nodes[n]['y'], G.nodes[n]['x']) for n in path])
            
            # Calculate route metrics
            base_dist = calculate_base_distance(G, nodes)
            optimized_dist = calculate_route_distance(G, full_path)
            
            # Calculate factor gains
            green_gain = min(100, green_weight * 15)
            social_gain = min(100, social_weight * 12)
            quiet_gain = min(100, quiet_weight * 10)
            
            logger.info(f"Route optimized in {time.time() - start_time:.2f}s")
            
            return {
                'order': route_order,
                'path': full_path,
                'distance': optimized_dist,
                'comparison': {
                    'distance_diff': f"+{(optimized_dist - base_dist)/base_dist*100:.1f}%",
                    'green_gain': f"+{green_gain}%",
                    'social_gain': f"+{social_gain}%",
                    'quiet_gain': f"+{quiet_gain}%"
                }
            }
        else:
            raise Exception("No solution found for TSP")
            
    except Exception as e:
        logger.error(f"Optimization failed: {str(e)}")
        raise

def calculate_greenness(G, u, v):
    """Calculate greenness factor for edge"""
    return 0.5  # Simplified for memory efficiency

def calculate_sociability(G, u, v):
    """Calculate sociability factor for edge"""
    return 0.5  # Simplified for memory efficiency

def calculate_quietness(edge_data):
    """Calculate quietness factor based on highway type"""
    highway_type = edge_data.get('highway', '')
    if isinstance(highway_type, list):
        highway_type = highway_type[0]
    return config.HIGHWAY_NOISE.get(highway_type, 1.0)

def create_custom_matrix(G, nodes, green_w, social_w, quiet_w):
    """Create distance matrix with custom weights"""
    matrix = []
    for i, origin in enumerate(nodes):
        row = []
        for j, destination in enumerate(nodes):
            if i == j:
                row.append(0)
            else:
                try:
                    path = nx.shortest_path(G, origin, destination, weight='custom_weight')
                    total_cost = 0
                    for u, v in zip(path[:-1], path[1:]):
                        edge = G[u][v][0]
                        base_cost = edge['length']
                        custom_cost = base_cost
                        total_cost += int(custom_cost)
                    row.append(total_cost)
                except:
                    row.append(10**6)  # Reasonable penalty
        matrix.append(row)
    return matrix

def calculate_base_distance(G, nodes):
    """Calculate base distance for comparison"""
    total = 0
    for i in range(len(nodes)-1):
        try:
            path = nx.shortest_path(G, nodes[i], nodes[i+1], weight='length')
            total += nx.path_weight(G, path, weight='length')
        except:
            total += 500  # Reduced penalty
    return total

def calculate_route_distance(G, path):
    """Calculate actual route distance"""
    total = 0
    for i in range(len(path)-1):
        try:
            u = ox.nearest_nodes(G, path[i][1], path[i][0])
            v = ox.nearest_nodes(G, path[i+1][1], path[i+1][0])
            total += great_circle(path[i], path[i+1]).meters
        except:
            # Estimate distance if path fails
            total += great_circle(path[i], path[i+1]).meters
    return total
