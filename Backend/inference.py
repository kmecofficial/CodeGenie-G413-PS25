from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import re

model_name = "deepseek-ai/deepseek-coder-1.3b-instruct"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float16, device_map="auto")

def generate_code(context: str, language: str = "python"):
    prompt = f"<|system|>\nYou are a coding assistant. Only return valid {language} code with no explanations or comments.\n<|user|>\n{context}\n<|assistant|>"

    inputs = tokenizer(prompt, return_tensors='pt').to("cuda")
    outputs = model.generate(**inputs, max_new_tokens=1024, temperature=0.3, top_p=0.9, do_sample=True)

    result = tokenizer.decode(outputs[0], skip_special_tokens=True)
    generated = result.split("<|assistant|>")[-1].strip()

    match = re.search(r"```(?:\w+)?\n(.+?)```", generated, re.DOTALL)
    if match:
        return match.group(1).strip()
    else:
        return generated 
