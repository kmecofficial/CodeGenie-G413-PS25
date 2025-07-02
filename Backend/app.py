from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import generate_code

app = Flask(__name__)
CORS(app)

@app.route('/generate-snippet', methods=['POST'])
def generate_snippet():
    try:
        print("Received a request to /generate-snippet")

        if not request.is_json:
            print("Invalid request: not JSON")
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json()
        print("Request data:", data)

        context = data.get("context", "")
        language = data.get("language", "python")

        if not context:
            print("Missing context in request")
            return jsonify({"error": "Context is required"}), 400

        print(f"Generating code for language: {language}")
        code = generate_code(context, language)

        print("Code generation successful")
        return jsonify({"code": code})

    except KeyError as ke:
        print(f"KeyError: {ke}")
        return jsonify({"error": f"Missing field: {str(ke)}"}), 400

    except Exception as e:
        print(f"Exception occurred: {e}")
        return jsonify({"error": "Something went wrong", "details": str(e)}), 500

if __name__ == '__main__':
    print("Server is starting...")
    app.run(debug=True)
