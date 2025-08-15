import os
from flask import Flask, render_template_string, request, jsonify
from route_optimizer import optimize_route
from poi_processor import get_pois_near_route
import config
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Memory optimization flag
app.config['USE_SIMPLE_GRAPH'] = True

@app.route('/')
def index():
    with open('index.html', 'r') as f:
        html_content = f.read()
    return render_template_string(html_content, 
                                mapbox_token=config.MAPBOX_TOKEN)

@app.route('/healthz')
def health_check():
    return 'OK', 200

@app.route('/optimize', methods=['POST'])
def optimize():
    data = request.json
    try:
        attractions = data['attractions']
        preferences = data['preferences']
        
        # Optimize route with custom weights
        optimized_route = optimize_route(
            attractions,
            green_weight=preferences['greenness'],
            social_weight=preferences['sociability'],
            quiet_weight=preferences['quietness'],
            use_simple_graph=app.config['USE_SIMPLE_GRAPH']
        )
        
        # Get POIs near the optimized route
        pois = get_pois_near_route(optimized_route['path'])
        
        return jsonify({
            'status': 'success',
            'route': optimized_route,
            'pois': pois,
            'comparison': optimized_route['comparison']
        })
        
    except Exception as e:
        logging.error(f"Optimization failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f"Route optimization failed: {str(e)}"
        }), 500

def log_memory():
    try:
        import resource
        usage = resource.getrusage(resource.RUSAGE_SELF)
        mem_mb = usage.ru_maxrss / 1024  # Convert KB to MB
        logging.info(f"Memory usage: {mem_mb:.2f} MB")
    except:
        pass

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    log_memory()
    app.run(host='0.0.0.0', port=port, debug=False)
