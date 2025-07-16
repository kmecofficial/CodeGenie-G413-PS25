from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import generate_code,tokenizer,model,extract_json_object
import logging
import torch
import re

app = Flask(__name__)
CORS(app)

@app.route('/generate-snippet', methods=['POST'])
def generate_snippet():
    """
    Endpoint to generate a code snippet based on the given context and programming language.

    Expected JSON Input:
        {
            "context": "<description>",
            "language": "<programming language>"
        }

    Returns:
        JSON containing the generated code or an error message.
    """
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

@app.route('/generate-codesuggestion', methods=['POST'])
def generate_codesuggestion():
    """
    Endpoint to generate 3 distinct versions of the same function/class using different coding techniques.
    Expected JSON Input:
        {
            "prompt": "<function or class definition>",
            "language": "<programming language>"
        }
    Returns:
        JSON containing three variations:
            - Using functions
            - Using recursion
            - Using iteration
    """
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

@app.route('/generate-autocomplete', methods=['POST'])
def generate_autocomplete():
    """
    Endpoint to analyze incomplete or incorrect code and return:
        - a debug explanation,
        - a corrected version,
        - a usage explanation,
        - and an example.
    Expected JSON Input:
        {
            "prompt": "<incomplete or incorrect code>"
        }
    Returns:
        JSON with keys: debug_explanation, completed_code, explanation, example.
    """
    try:
        data = request.json
        user_code = data.get("prompt", "")
        if not user_code or not user_code.strip():
            logging.warning("Received an empty prompt.")
            return jsonify({'error': 'Prompt is empty.'}), 400
        prompt_template = f"""You are a highly analytical and precise coding assistant specializing in code completion and error analysis.
Your primary task is to analyze the user's code, identify any issues, and provide a complete, functional version.

First, analyze the user's code for any errors or incompleteness.
- If the code has a clear syntax error (e.g., mismatched brackets, invalid keyword), briefly explain the error.
- If the code is syntactically valid but incomplete (e.g., a function definition without a body), state that the code is incomplete.
- If the code is both syntactically valid and logically complete, you MUST state "No errors found in the code."

After the analysis, provide the fully completed and corrected code.

You MUST respond with a single, raw JSON object. Do not include any other text, comments, markdown, or code outside the JSON.
Ensure the JSON is well-formed and contains ALL of the following keys, in this exact order:

{{
    "debug_explanation": "Your analysis of the code. State if there are syntax errors, if the code is incomplete, or if no errors were found.",
    "completed_code": "The full, autocompleted, and corrected code with proper indentation.",
    "explanation": "A concise explanation of the completed code's functionality, purpose, and how it works.",
    "example": "A practical input/output example demonstrating how to use the code."
}}

User's code to analyze:
{user_code}
JSON Response:
"""
        messages = [{"role": "user", "content": prompt_template}]
        input_ids = tokenizer.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt").to(model.device)
        with torch.no_grad():
            outputs = model.generate(
                input_ids,
                max_new_tokens=1024,
                do_sample=True,
                temperature=0.7,
                top_p=0.95,
                num_return_sequences=1,
                eos_token_id=tokenizer.eos_token_id,
                pad_token_id=tokenizer.eos_token_id
            )
        raw_output_text = tokenizer.decode(outputs[0][input_ids.shape[1]:], skip_special_tokens=True).strip()
        logging.info(f"--- Raw Model Output ---\n{raw_output_text}\n------------------------")
        output_json = extract_json_object(raw_output_text)
        if not output_json:
            logging.error(f"Failed to extract valid JSON from model output. Raw output: {raw_output_text}")
            return jsonify({'error': 'Failed to parse AI model response. Expected JSON but got malformed output.'}), 500
        final_response = {
            "debug_explanation": output_json.get("debug_explanation", "Debug analysis was not provided by the model."),
            "completed_code": output_json.get("completed_code", user_code),
            "explanation": output_json.get("explanation", "No explanation was provided by the model."),
            "example": output_json.get("example", "No example was provided.")
        }
        logging.info(f"Successfully parsed and prepared JSON response: {final_response}")
        return jsonify(final_response)
    except Exception as e:
        logging.error(f"An unexpected error occurred during generation: {e}", exc_info=True)
        return jsonify({'error': f'An unexpected error occurred on the server: {str(e)}'}), 500

if __name__ == '__main__':
    print("Server is starting...")
    app.run(debug=True)
