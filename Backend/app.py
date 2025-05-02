from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import generate_code  

app = Flask(__name__)
CORS(app)

@app.route('/generate-snippet', methods=['POST'])
def generate_snippet():
    try:
        data = request.get_json()
        context = data.get("context", "")
        language = data.get("language", "python")

        if not context:
            return jsonify({"error": "Context is required"}), 400

        generated_code = generate_code(context, language)

        return jsonify({"code": generated_code})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)