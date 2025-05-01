from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import logging
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

MODEL_NAME = "deepseek-ai/deepseek-coder-1.3b-instruct"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

try:
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        padding_side='left',
        truncation_side='left',
        trust_remote_code=True
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32
    ).to(DEVICE)

    logger.info(f"Model loaded successfully on {DEVICE.upper()}")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    raise

@app.route('/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        max_length = min(int(data.get('max_length', 200)), 1024)

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400

        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
            return_attention_mask=True
        ).to(DEVICE)

        with torch.no_grad():
            outputs = model.generate(
                input_ids=inputs.input_ids,
                attention_mask=inputs.attention_mask,
                pad_token_id=tokenizer.eos_token_id,
                max_length=max_length,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                num_beams=3,
                num_return_sequences=1,
                repetition_penalty=1.2,
                early_stopping=True,
            )

        raw_output = tokenizer.decode(outputs[0], skip_special_tokens=True, clean_up_tokenization_spaces=True)

        # Extract only code using a simple heuristic (you can improve it if needed)
        code_blocks = re.findall(r"```(?:python)?\n(.*?)```", raw_output, re.DOTALL)
        if code_blocks:
            code_only = code_blocks[0].strip()
        else:
            # Fallback: extract from first def/class/print etc.
            lines = raw_output.splitlines()
            code_lines = [line for line in lines if line.strip().startswith(("def ", "class ", "print", "import", "#", "from ", "for ", "if ", "while ", "return"))]
            code_only = "\n".join(code_lines).strip()

        return jsonify({
            "generated_text": code_only,
            "status": "success"
        })

    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
