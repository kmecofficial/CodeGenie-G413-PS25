from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import generate_code,tokenizer,model
import re

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

@app.route('/generate', methods=['POST'])
def generate_multiple_approaches():
    data = request.get_json()
    prompt = data.get('prompt', '').strip()
    language = data.get('language', '').strip()

    if not prompt:
        return jsonify({'error': 'Prompt is required.'}), 400
    if not language:
        return jsonify({'error': 'Language is required.'}), 400

    multi_prompt = (
        f"The user has selected the following {language} function or class definition:\n"
        f"\n{prompt}\n\n"
        f"Generate exactly 3 distinct {language} code-only implementations for the body of this function/class.\n"
        f"Do NOT include the function/class signature ({prompt}) in the generated solutions themselves, only the implementation details.\n"
        "Label each solution using comments ONLY:\n"
        "Solution 1: Using functions\n"
        "Solution 2: Using recursion\n"
        "Solution 3: Using iteration\n\n"
        "Each solution must begin with the exact same signature as the input.\n"
        "Output only clean code blocks, no explanations, no markdown, and no extra text."
    )

    try:
        messages = [{'role': 'user', 'content': multi_prompt}]
        inputs = tokenizer.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt").to(model.device)

        outputs = model.generate(
            inputs,
            max_new_tokens=700,
            do_sample=False,
            top_k=50,
            top_p=0.95,
            num_return_sequences=1,
            eos_token_id=tokenizer.eos_token_id
        )

        generated_text = tokenizer.decode(outputs[0][len(inputs[0]):], skip_special_tokens=True).strip()
        cleaned_output = re.sub(r'```(?:[a-zA-Z]+)?\n?', '', generated_text).replace("<|end|>", "").strip()

        print(f"🧠 Generated:\n{cleaned_output}")
        return jsonify({'response': cleaned_output})

    except Exception as e:
        print(f"❌ Error in generation: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Server is starting...")
    app.run(debug=True)
