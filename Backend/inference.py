from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import re

model_name = "deepseek-ai/deepseek-coder-1.3b-instruct"

try:
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16,
        device_map="auto"
    )
except Exception as e:
    raise RuntimeError(f"\nError loading model : {e}")

def generate_code(context: str, language: str = "python") -> str:
    if not context or not isinstance(context, str):
        return "\nError: Invalid input context. Empty text given."

    try:
        prompt = (
            f"<|system|>\nYou are a coding assistant. "
            f"Only return valid {language} code with no explanations or comments.\n"
            f"<|user|>\n{context}\n<|assistant|>"
        )

        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        outputs = model.generate(
            **inputs,
            max_new_tokens=1024,
            temperature=0.2,
            top_p=0.7,
            do_sample=True
        )

        generated = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print("Raw generated output:\n", generated)

        match = re.search(r"```(?:\w+)?\n(.+?)```", generated, re.DOTALL)
        if match:
            extracted_code = match.group(1).strip()
            print("Extracted code block:\n", extracted_code)
            return extracted_code
        else:
            print("No fenced code block found. Returning full output.\n")
            return generated.strip()

    except Exception as e:
        print("Error during code generation:", str(e))
        return f"\nError during code generation: {str(e)}"
