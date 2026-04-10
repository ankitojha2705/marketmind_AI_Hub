"""REST API server for Marketing Orchestrator."""
import os
import sys
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

from Orchestrator import (
    run_step2_analysis,
    run_step3_generation,
    process_campaign_request,
    create_final_instagram_post,
    format_response_for_ui,
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

import asyncio


def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@app.route('/api/step2/analyze', methods=['POST'])
def step2_analyze():
    try:
        data = request.get_json()
        if not data or not isinstance(data.get("campaign"), dict):
            return jsonify({"success": False, "error": "Missing campaign payload"}), 400
        request_id = f"analyze_{int(time.time())}"
        start_time = time.time()
        ctx = MockContext()
        analysis_data = _run_async(
            run_step2_analysis(ctx, data, request_id)
        )
        processing_time = time.time() - start_time
        return jsonify({
            "success": True,
            "analysis": analysis_data,
            "processing_time": processing_time,
            "request_id": request_id,
        })
    except Exception as e:
        logger.error("Error processing step2 analysis request: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/step3/generate', methods=['POST'])
def step3_generate():
    try:
        data = request.get_json()
        if not data or not isinstance(data.get("campaign"), dict):
            return jsonify({"success": False, "error": "Missing campaign payload"}), 400
        if not isinstance(data.get("analysis"), dict):
            return jsonify({"success": False, "error": "Missing analysis payload"}), 400

        request_id = f"generate_{int(time.time())}"
        start_time = time.time()
        ctx = MockContext()
        result = _run_async(run_step3_generation(ctx, data, request_id))
        processing_time = time.time() - start_time

        return jsonify({
            "success": True,
            "data": result,
            "processing_time": processing_time,
            "request_id": request_id,
        })
    except Exception as e:
        logger.error("Error processing step3 generation request: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/generate-campaign', methods=['POST'])
def generate_campaign_legacy():
    """Legacy single-shot endpoint retained for manual debugging."""
    try:
        data = request.get_json()
        business_type = data.get("business_type")
        location = data.get("location")
        campaign_goals = data.get("campaign_goals")
        if not business_type or not campaign_goals:
            return jsonify({"success": False, "error": "Missing business_type or campaign_goals"}), 400

        request_id = f"legacy_{int(time.time())}"
        start_time = time.time()
        ctx = MockContext()
        analysis_data, competitor_data, content_data, seo_data = _run_async(
            process_campaign_request(ctx, business_type, location, campaign_goals, request_id)
        )
        processing_time = time.time() - start_time
        competitor_count = len(competitor_data.get("competitors", [])) if isinstance(competitor_data, dict) else 0
        final_post = create_final_instagram_post(analysis_data, content_data, seo_data)
        formatted_markdown = format_response_for_ui(
            final_post,
            analysis_data,
            content_data,
            seo_data,
            processing_time=processing_time,
            competitor_count=competitor_count,
        )
        return jsonify(
            {
                "success": True,
                "data": final_post,
                "formatted_markdown": formatted_markdown,
                "processing_time": processing_time,
                "request_id": request_id,
            }
        )
    except Exception as e:
        logger.error("Error processing legacy request: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('API_PORT', '8001'))
    logger.info(f"Starting Marketing Orchestrator API server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)

