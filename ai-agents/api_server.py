"""
REST API Server for Marketing Orchestrator
Wraps the orchestrator functionality for frontend integration
"""
import os
import sys
import json
import logging
import time
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Add agents directory to path
agents_dir = Path(__file__).parent / "agents"
if str(agents_dir) not in sys.path:
    sys.path.insert(0, str(agents_dir))

# Import orchestrator functions
from nl_parser import parse_user_input
from Orchestrator import (
    process_campaign_request,
    create_final_instagram_post,
    format_response_for_ui
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])

# Mock context for orchestrator (since we're not using uAgents protocol)
class MockContext:
    """Mock context for orchestrator processing"""
    def __init__(self):
        self.storage = {}
        self.session = "api_session"

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "Marketing Orchestrator API"})

# Fix: process_campaign_request needs to be async but we're calling it synchronously
# We need to create a sync wrapper
import asyncio

def process_campaign_request_sync(ctx, business_type, location, campaign_goals, request_id):
    """Synchronous wrapper for async process_campaign_request"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(
        process_campaign_request(ctx, business_type, location, campaign_goals, request_id)
    )

@app.route('/api/generate-campaign', methods=['POST'])
@app.route('/api/generate-campaign', methods=['POST'])
def generate_campaign():
    """
    Generate Instagram campaign from user prompt
    
    Request body:
    {
        "prompt": "I have a coffee shop in LA, I want to share a post for instagram for christmas..."
    }
    
    Response:
    {
        "success": true,
        "data": {
            "caption": "...",
            "hashtags": [...],
            "post_type": "Reel",
            "image_url": "...",
            "seo_score": 90,
            ...
        },
        "formatted_markdown": "...",
        "processing_time": 44.7
    }
    """
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'prompt' in request body"
            }), 400
        
        user_prompt = data['prompt']
        logger.info(f"Received campaign generation request: {user_prompt[:100]}...")
        
        # Parse user input
        try:
            payload = parse_user_input(user_prompt)
            logger.info(f"Parsed payload: {json.dumps(payload, indent=2)}")
        except Exception as e:
            logger.error(f"Failed to parse user input: {e}")
            return jsonify({
                "success": False,
                "error": f"Failed to parse prompt: {str(e)}"
            }), 400
        
        # Extract campaign parameters
        business_type = payload.get('business_type')
        location = payload.get('location')
        campaign_goals = payload.get('campaign_goals')
        
        if not business_type or not campaign_goals:
            return jsonify({
                "success": False,
                "error": "Could not extract business_type and campaign_goals from prompt"
            }), 400
        
        # Generate request ID
        request_id = f"api_req_{int(time.time())}"
        
        # Track processing time
        start_time = time.time()
        
        # Create mock context
        ctx = MockContext()
        
        # Process campaign through all agents (using sync wrapper)
        logger.info(f"[{request_id}] Starting campaign processing...")
        analysis_data, competitor_data, content_data, seo_data = process_campaign_request_sync(
            ctx, business_type, location, campaign_goals, request_id
        )
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Count competitors
        competitor_count = 0
        if isinstance(competitor_data, dict) and competitor_data.get('competitors'):
            competitor_count = len(competitor_data.get('competitors', []))
        
        # Create final Instagram post
        logger.info(f"[{request_id}] Consolidating final Instagram post...")
        final_post = create_final_instagram_post(analysis_data, content_data, seo_data)
        
        # Format response for UI
        formatted_markdown = format_response_for_ui(
            final_post, analysis_data, content_data, seo_data,
            processing_time=processing_time,
            competitor_count=competitor_count
        )
        
        logger.info(f"[{request_id}] Campaign generation completed in {processing_time:.1f}s")
        
        # Return response
        return jsonify({
            "success": True,
            "data": final_post,
            "formatted_markdown": formatted_markdown,
            "processing_time": processing_time,
            "request_id": request_id
        })
        
    except Exception as e:
        logger.error(f"Error processing campaign request: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('API_PORT', '8001'))
    logger.info(f"Starting Marketing Orchestrator API server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)

