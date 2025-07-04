from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import load_model, generate_multiple_approaches, generate_code
app = Flask(__name__)

CORS(app)

@app.route('/')
def home():
    """
    Home route for the Flask application.
    Returns a simple message to indicate the server is running.
    """
    return "Flask server is working!"

@app.route('/generate', methods=['POST'])
def generate_code_snippet_multiple_approaches():
    """
    Handles POST requests to generate multiple code approaches based on a prompt.
    Expects a JSON payload with 'prompt' and 'language'.
    """
    print("Received a request to /generate")

    data = request.get_json()
    print(f"Received data: {data}")

    if not data:
        return jsonify({'error': 'Request body must be valid JSON.'}), 400

    prompt = data.get('prompt', '').strip()
    language = data.get('language', '').strip()

    if not prompt:
        return jsonify({'error': 'Prompt is required.'}), 400
    if not language:
        return jsonify({'error': 'Language is required.'}), 400

    try:
        
        code_response = generate_multiple_approaches(prompt, language)
        if code_response.startswith("Error:"):
            return jsonify({'error': code_response}), 500
        return jsonify({'response': code_response})

    except Exception as e:
        print(f"An error occurred in the Flask route /generate: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/generate-snippet', methods=['POST'])
def generate_single_code_snippet():
    """
    Handles POST requests to generate a single code snippet based on context.
    Expects a JSON payload with 'context' and 'language'.
    """
    try:
        print("Received a request to /generate-snippet")

        if not request.is_json:
            print("Invalid request: not JSON")
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json()
        print("Request data:", data)

        context = data.get("context", "").strip()
        language = data.get("language", "python").strip()

        if not context:
            print("Missing context in request")
            return jsonify({"error": "Context is required"}), 400

        print(f"Generating code for language: {language} with context: {context}")
       
        code = generate_code(context, language)

        print("Code generation successful for /generate-snippet")
        return jsonify({"code": code})

    except KeyError as ke:
        print(f"KeyError in /generate-snippet: {ke}")
        return jsonify({"error": f"Missing field: {str(ke)}"}), 400

    except Exception as e:
        print(f"Exception occurred in /generate-snippet: {e}")
        return jsonify({"error": "Something went wrong", "details": str(e)}), 500

if __name__ == '__main__':
    
    print("Server is starting...")
    load_model()

    
    app.run(port=5000, debug=True, use_reloader=False)