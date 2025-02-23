import os
import logging
from flask import Flask, render_template, request, jsonify
from flask_pymongo import PyMongo
from datetime import datetime
from ai_services import AIVerificationSystem
from dotenv import load_dotenv
from flask_cors import CORS
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")

# Configure MongoDB
app.config["MONGO_URI"] = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/ai_verification")
mongo = PyMongo(app)

# Initialize AI verification system
ai_system = AIVerificationSystem()
executor = ThreadPoolExecutor()

@app.route('/')
def index():
    return render_template('index.html')

def run_async(func):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(func)
    loop.close()
    return result

@app.route('/api/verify', methods=['POST'])
def verify_response():
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        mode = data.get('mode', 'general')

        logger.info(f"Received query: {query}")

        if not query:
            return jsonify({"error": "Query is required"}), 400

        # Run async verification in a thread
        result = executor.submit(run_async, ai_system.verify_response(query, mode)).result()
        logger.info(f"AI response: {result}")
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify({
            "response": "### Error\n\n* Server error occurred",
            "confidence": 0.0,
            "source": "error",
            "mode": "general",
            "model_confidences": []
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)