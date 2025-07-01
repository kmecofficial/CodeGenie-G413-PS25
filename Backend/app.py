from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import generate_code

app = Flask(__name__)
CORS(app)

@app.route('/generate-snippet', methods=['POST'])
def generate_snippet():
    try:
        print("\nReceived a request to /generate-snippet")

        if not request.is_json:
            print("\nInvalid request: not JSON")
            return jsonify({"\nerror": "Request must be JSON"}), 400

        data = request.get_json()
        print("\nRequest data:", data)

        context = data.get("context", "")
        language = data.get("language", "python")

        if not context:
            print("\nMissing context in request")
            return jsonify({"\nerror": "Context is required"}), 400

        print(f"\nGenerating code for language: {language}")
        code = generate_code(context, language)

        print("\nCode generation successful")
        return jsonify({"\ncode": code})

    except KeyError as ke:
        print(f"\nKeyError: {ke}")
        return jsonify({"\nerror": f"Missing field: {str(ke)}"}), 400

    except Exception as e:
        print(f"\nException occurred: {e}")
        return jsonify({"\nerror": "Something went wrong", "details": str(e)}), 500

if __name__ == '__main__':
    print("\nServer is starting...\n")
    app.run(debug=True)
