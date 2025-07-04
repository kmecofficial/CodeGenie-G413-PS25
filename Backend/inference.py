from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import re
import os

tokenizer = None
model = None
model_name = "deepseek-ai/deepseek-coder-1.3b-instruct" 

def load_model():
    global tokenizer, model
    if tokenizer is not None and model is not None:
        print("Model and tokenizer already loaded.")
        return

    try:

        tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            trust_remote_code=True, 
            torch_dtype=torch.float16, 
            device_map="auto" 
        )
        print(f"Model loaded successfully on device: {model.device}")
    except Exception as e:
        print(f"Error loading model: {e}")
        
        raise RuntimeError(f"\nError loading model : {e}") 
def generate_multiple_approaches(prompt: str, language: str) -> str:
    """
    Generates multiple code approaches based on a prompt using the loaded model.
    """
    if model is None or tokenizer is None:
        return "Error: Model not loaded. Please check server logs."

    if not prompt:
        return "Error: Prompt is required."
    if not language:
        return "Error: Language is required."

    
    multi_prompt = (
        f"The user has selected the following {language} function or class definition:\n"
        f"```\n{prompt}\n```\n"
        f"Generate exactly 3 distinct {language} code-only implementations for the *body* of this function/class.\n"
        f"Do NOT include the function/class signature (`{prompt}`) in the generated solutions themselves, only the implementation details.\n"
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

        print(f"Generated text (cleaned):\n{cleaned_output}")
        return cleaned_output

    except Exception as e:
        print(f"An error occurred during code generation: {e}")
        return f"Error during code generation: {str(e)}"

def generate_code(context: str, language: str = "python") -> str:
    """
    Generates a single code snippet based on context using the loaded model.
    """
    if model is None or tokenizer is None:
        return "Error: Model not loaded. Please check server logs."

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