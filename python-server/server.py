import io
import logging
import base64
import requests
import json
import os
import urllib.parse
import random # Added for cache-busting Pollinations
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from rembg import remove
from PIL import Image
from deep_translator import GoogleTranslator
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

# ---------------- Logging ----------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------- App ----------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- API Configurations ----------------
# 1. Cloudflare Workers AI (Priority 1 - Keep this if you have keys!)
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "")
CF_MODEL = "@cf/leonardo/phoenix-1.0"

# 2. Hugging Face Inference
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
# CHANGED: Updated to Hugging Face's brand new router domain!
HF_MODEL_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0"

# OpenRouter Configuration
OPENROUTER_API_KEY = os.getenv(
    "OPENROUTER_API_KEY",""
)

client = None
if OPENROUTER_API_KEY:
    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
        logger.info("OpenRouter Client Configured Successfully")
    except Exception as e:
        logger.error(f"Failed to configure OpenRouter: {e}")

# ---------------- Models ----------------
class GenerateRequest(BaseModel):
    prompt: str
    category: str

class LocalizeRequest(BaseModel):
    text: str
    languages: list[str]

class MessageRequest(BaseModel):
    message: str

# ---------------- Style Presets ----------------
STYLE_PRESETS = {
    "Illustration": ", flat vector art, simple geometric shapes, clean lines, white background, adobe illustrator style",
    "Icon": ", app icon style, minimal, centered, thick lines, flat color, white background",
    "Background Element": ", decorative abstract shape, memphis design pattern, minimal, white background",
    "UI Graphic": ", ui sticker, modern web design element, flat, vibrant colors, white background",
    "Product Element": ", realistic isolated object, studio lighting, high detail, white background, 8k",
    "Decorative Shape": ", simple abstract blob, organic shape, solid color, flat, white background"
}

# ---------------- Image Generation Cascade Logic ----------------
def is_valid_image(byte_data):
    try:
        Image.open(io.BytesIO(byte_data)).verify()
        return True
    except Exception:
        return False

def generate_image_cascade(prompt: str, width=512, height=512):
    # 1️⃣ Cloudflare Workers AI
    if CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN:
        try:
            logger.info("Attempt 1: Cloudflare Workers AI")
            url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{CF_MODEL}"
            headers = {"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"}
            res = requests.post(url, headers=headers, json={"prompt": prompt}, timeout=30)
            if res.status_code == 200 and is_valid_image(res.content):
                return res.content
            logger.warning(f"Cloudflare failed. Status: {res.status_code}")
        except Exception as e:
            logger.warning(f"Cloudflare Exception: {e}")

    # 2️⃣ Hugging Face Free Inference
    if HF_API_TOKEN:
        try:
            logger.info("Attempt 2: Hugging Face API")
            headers = {"Authorization": f"Bearer {HF_API_TOKEN}","Content-Type": "application/json"}
            # Hugging Face sometimes needs the prompt in 'inputs'
            res = requests.post(HF_MODEL_URL, headers=headers, json={"inputs": prompt}, timeout=60)
            if res.status_code == 200 and is_valid_image(res.content):
                return res.content
            logger.warning(f"Hugging Face failed. Status: {res.status_code} - {res.text}")
        except Exception as e:
            logger.warning(f"Hugging Face Exception: {e}")

    # 3️⃣ Pollinations.ai (No-Auth Fallback)
    try:
        logger.info("Attempt 3: Pollinations.ai (No-Auth Fallback)")
        safe_prompt = urllib.parse.quote(prompt)
        # CHANGED: Added a random seed cache-buster to bypass their 500 server caching errors
        seed = random.randint(1, 100000)
        url = f"https://image.pollinations.ai/prompt/{safe_prompt}?nologo=true&seed={seed}"
        
        # CHANGED: Added a standard browser User-Agent so they don't block Python requests
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        res = requests.get(url, headers=headers, timeout=45)
        
        if res.status_code == 200 and is_valid_image(res.content):
            return res.content
        logger.error(f"Pollinations failed. Status: {res.status_code}")
    except Exception as e:
        logger.error(f"Pollinations Exception: {e}")

    return None

# ---------------- Routes ----------------
@app.get("/")
def root():
    return {"status": "Backend running (OpenRouter + Triple-Cascade Gen + Loc)"}

@app.post("/localize")
async def localize_text(request: LocalizeRequest):
    results = {}
    lang_map = {
        "Hindi": "hi", "Bengali": "bn", "Telugu": "te", "Marathi": "mr",
        "Tamil": "ta", "Urdu": "ur", "Gujarati": "gu", "Malayalam": "ml",
        "Kannada": "kn", "Assamese": "as", "Konkani": "gom", "Manipuri": "mni",
        "Punjabi": "pa", "Kashmiri": "ks", "Odia": "or", "Sanskrit": "sa",
        "Sindhi": "sd", "Nepali": "ne", "Bodo": "brx", "Dogri": "doi",
        "Maithili": "mai", "Santali": "sat"
    }
    
    # FIX: Isolate the try/except blocks inside the loop. 
    # If one language fails (rate limit), it won't break the successful ones!
    for lang_name in request.languages:
        target_code = lang_map.get(lang_name, "en")
        try:
            translated = GoogleTranslator(source='auto', target=target_code).translate(request.text)
            results[lang_name] = translated
        except Exception as e:
            logger.error(f"Translation failed for {lang_name}: {e}")
            results[lang_name] = request.text # Fallback to original text for just this failure

    return results

@app.post("/generate")
async def generate_asset(request: GenerateRequest):
    logger.info(f"Received request: {request.prompt} [{request.category}]")
    try:
        style_suffix = STYLE_PRESETS.get(request.category, STYLE_PRESETS["Illustration"])
        enhanced_prompt = request.prompt + style_suffix
        
        image_data = generate_image_cascade(enhanced_prompt)
        
        if not image_data:
            raise Exception("All image generation providers failed.")
            
        input_image = Image.open(io.BytesIO(image_data))
        output_image = remove(input_image)
        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format="PNG")
        img_byte_arr.seek(0)
        return Response(content=img_byte_arr.getvalue(), media_type="image/png")
    except Exception as e:
        logger.error(f"Processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================================
#  FEATURE 3: SMART TEMPLATE PIPELINE
# =========================================================================

def fallback_intent_logic(message: str):
    logger.info("Engaging Rule-Based Fallback.")
    msg = message.lower()
    plan = {
        "headline": "New Update",
        "body_text": message,
        "bg_prompt": "abstract geometric background, soft pastel colors, minimal, high quality",
        "hero_prompt": "3d render of a notification bell icon, isolated on white background",
        "text_color_hex": "#333333",
        "font_vibe": "Modern"
    }
    
    if "diwali" in msg or "festival" in msg:
        plan["headline"] = "Happy Diwali"
        plan["bg_prompt"] = "dark background with glowing decorative lights, bokeh, festival pattern"
        plan["hero_prompt"] = "traditional diya oil lamp, glowing flame, 3d render, isolated on white background"
        plan["text_color_hex"] = "#FFD700"
        plan["font_vibe"] = "Traditional"
    elif "party" in msg:
        plan["headline"] = "Let's Celebrate!"
        plan["bg_prompt"] = "festive confetti background, bokeh, celebration"
        plan["hero_prompt"] = "birthday cake with candles, 3d render, isolated on white background"
        plan["text_color_hex"] = "#FF00FF"
        plan["font_vibe"] = "Playful"
    elif "sale" in msg:
        plan["headline"] = "Special Offer"
        plan["bg_prompt"] = "dynamic speed lines background, red and yellow"
        plan["hero_prompt"] = "shopping bags, 3d render, isolated on white background"
        plan["text_color_hex"] = "#FF0000"
        plan["font_vibe"] = "Bold"
        
    return plan

def generate_prompts_with_llm(user_message: str):
    if not client:
        return fallback_intent_logic(user_message)

    system_instruction = """
    You are an expert Creative Director. Analyze the request and output JSON only.
    Output Keys:
    1. 'headline': Catchy title (max 5 words).
    2. 'body_text': Polished message text (max 15 words).
    3. 'bg_prompt': Stable Diffusion prompt for BACKGROUND (abstract/texture/blurred).
    4. 'hero_prompt': Stable Diffusion prompt for FOREGROUND OBJECT (must say 'isolated on white background').
    5. 'text_color_hex': Best contrasting text color for the background (e.g., '#FFFFFF' or '#333333').
    6. 'font_vibe': One of ['Bold', 'Elegant', 'Playful', 'Modern', 'Handwritten', 'Traditional'].
    """
    
    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b:free",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": f"User Request: {user_message}"}
            ],
            temperature=0.7
        )
        content = completion.choices[0].message.content
        clean_json = content.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
        
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        return fallback_intent_logic(user_message)


@app.post("/process-message")
async def process_message(request: MessageRequest):
    logger.info(f"--- Pipeline Started: {request.message} ---")

    plan = generate_prompts_with_llm(request.message)

    bg_raw_bytes = generate_image_cascade(plan["bg_prompt"])
    bg_b64 = ""
    if bg_raw_bytes:
        try:
            bg_img = Image.open(io.BytesIO(bg_raw_bytes))
            byte_io = io.BytesIO()
            bg_img.save(byte_io, format="PNG")
            bg_b64 = base64.b64encode(byte_io.getvalue()).decode('utf-8')
        except Exception as e:
            logger.error(f"Background processing failed: {e}")

    hero_raw_bytes = generate_image_cascade(plan["hero_prompt"])
    hero_b64 = ""
    if hero_raw_bytes:
        try:
            input_img = Image.open(io.BytesIO(hero_raw_bytes))
            output_img = remove(input_img)
            byte_io = io.BytesIO()
            output_img.save(byte_io, format="PNG")
            hero_b64 = base64.b64encode(byte_io.getvalue()).decode('utf-8')
        except Exception as e:
            logger.error(f"Hero processing failed: {e}")

    return {
        "status": "success",
        "plan": plan,
        "assets": {
            "background": bg_b64,
            "hero": hero_b64
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)