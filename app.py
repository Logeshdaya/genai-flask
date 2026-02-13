import fal_client # <--- We are using Fal.ai
import google.generativeai as genai
import os
import re
import json
import time
import requests
import base64
import io
from PIL import Image
from PIL import Image, ImageOps, ImageDraw, ImageFont
from io import BytesIO
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

# =====================================================================
# --- 🔑 YOUR API KEYS ---
# =====================================================================
os.environ["GOOGLE_API_KEY"] = "AIzaSyDJ_ut2EFSyZQCd3xXKMRCyvW1z75GXPk8" 
os.environ["FAL_KEY"] = "d83761de-8bb0-4507-93bd-48e580b743d7:28e0ccec86e5113e64f38338d00e1bcf" 
# =====================================================================

# =====================================================================
# FLASK APP SETUP
# =====================================================================
app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app) 

# =====================================================================
# 🛠️ SYSTEM LOGGING
# =====================================================================
def log_event(agent_name, action, duration):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"📊 [SYSTEM - {timestamp}] {agent_name}: {action} | Duration: {duration:.2f}s")

# =====================================================================
# AGENT 1: STRATEGIC ANALYSER
# =====================================================================
class MarketingStrategyAgent:
    def __init__(self):
        try:
            genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
            self.model = genai.GenerativeModel(model_name="gemini-2.5-flash")
            print("AGENT 1: Marketing Strategy Agent Initialized.")
        except Exception as e:
            print(f"AGENT 1 ERROR: {e}")
            self.model = None

    def run(self, raw_prompt, style_preset="Cinematic"):
        start_time = time.time()
        if not self.model: return {"error": "Agent 1 not configured"}
        
        system_prompt = f"""
        You are a Senior Marketing Strategist. 
        Input: A raw idea for an ad.
        Style: {style_preset}
        
        Task:
        1. Create a detailed Image Prompt.
        2. Write a catchy Headline (max 8 words).
        3. Define the Target Audience.
        4. Write short Ad Copy (max 20 words).
        
        Output strictly in JSON format:
        {{
            "image_prompt": "...",
            "headline": "...",
            "target_audience": "...",
            "ad_copy": "..."
        }}
        """
        
        try:
            response = self.model.generate_content(f"{system_prompt}\n\nUSER PROMPT: {raw_prompt}")
            cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
            strategy_data = json.loads(cleaned_text)
            
            log_event("Agent 1", "Strategy Generated", time.time() - start_time)
            return strategy_data
        except Exception as e:
            print(f"[Agent 1] ERROR: {e}")
            return None

# =====================================================================
# AGENT 2: THE CRITIC
# =====================================================================
class CriticAgent:
    def __init__(self):
        self.model = genai.GenerativeModel(model_name="gemini-2.5-flash")

    def run(self, strategy_data):
        start_time = time.time()
        print("[Agent 2] Critiquing content for safety and quality...")
        
        prompt = f"Review this image prompt for safety. If it contains violence or nudity, rewrite it to be safe. Otherwise return it exactly as is. Prompt: {strategy_data['image_prompt']}"
        
        try:
            response = self.model.generate_content(prompt)
            validated_prompt = response.text.strip()
            
            strategy_data['image_prompt'] = validated_prompt
            
            log_event("Agent 2", "Quality Check Passed", time.time() - start_time)
            return strategy_data
        except:
            return strategy_data

# =====================================================================
# AGENT 3: IMAGE GENERATOR (UPDATED FOR INPAINTING)
# =====================================================================
class ImageGeneratorAgent:
    def __init__(self):
        print("AGENT 3: Image Generator Initialized (Fal.ai).")

    def run(self, pipeline_data):
        start_time = time.time()
        selected_model = pipeline_data['selected_model']
        print(f"\n[Agent 3] Generating image with {selected_model}...")
        
        try:
            arguments = {
                "prompt": pipeline_data["image_prompt"],
                "aspect_ratio": "3:4"
            }
            
            if pipeline_data.get("image_base64"):
                print("[Agent 3] Image-to-Image mode activated.")
                arguments["image_url"] = pipeline_data["image_base64"]
            
            result = fal_client.subscribe(selected_model, arguments=arguments)
            image_url = result['images'][0]['url']
            
            response = requests.get(image_url)
            image_bytes = BytesIO(response.content)
            
            pipeline_data["image_bytes"] = image_bytes
            log_event("Agent 3", "Image Created", time.time() - start_time)
            return pipeline_data
            
        except Exception as e:
            print(f"[Agent 3] ERROR: {e}")
            return None 

    # --- NEW: INPAINTING METHOD (FLUX GENERAL / DEV) ---
    def run_inpainting(self, image_b64, mask_b64, prompt):
        start_time = time.time()
        
        # USE THIS ID: It is the standard public endpoint for Flux Inpainting
        model_id = "fal-ai/flux-general/inpainting"
        
        print(f"\n[Agent 3] Inpainting with {model_id}...")
        
        try:
            # 1. Add Headers if missing (Fal requires 'data:image/...' prefix)
            if "data:image" not in image_b64:
                image_data_uri = f"data:image/png;base64,{image_b64}"
            else:
                image_data_uri = image_b64

            if "data:image" not in mask_b64:
                mask_data_uri = f"data:image/png;base64,{mask_b64}"
            else:
                mask_data_uri = mask_b64

            # 2. Setup Arguments
            arguments = {
                "prompt": prompt,
                "image_url": image_data_uri,
                "mask_url": mask_data_uri,
                "sync_mode": True,
                "num_inference_steps": 28,  # Standard for Flux Dev
                "guidance_scale": 3.5,      # Lower guidance is better for Dev
                "strength": 1.0,            # 1.0 = Replace masked area completely
                "enable_safety_checker": False # Optional: prevents false positives
            }
            
            # 3. Call Fal.ai
            result = fal_client.subscribe(model_id, arguments=arguments)
            
            # 4. Extract Output URL
            if 'images' in result and len(result['images']) > 0:
                output_url = result['images'][0]['url']
            elif 'image' in result:
                output_url = result['image']['url']
            else:
                print(f"[Agent 3] Unexpected JSON format: {result}")
                return None
            
            # 5. Download & Save
            response = requests.get(output_url)
            unique_name = f"inpaint_{int(time.time())}.png"
            save_path = os.path.join('static', 'generated', unique_name)
            
            with open(save_path, "wb") as f:
                f.write(response.content)

            log_event("Agent 3", "Inpainting Complete", time.time() - start_time)
            return f"/static/generated/{unique_name}"
            
        except Exception as e:
            print(f"[Agent 3] Inpaint ERROR: {e}")
            import traceback
            traceback.print_exc()
            return None
# =====================================================================
# AGENT 4: DESIGN REFINEMENT
# =====================================================================
class DesignRefinementAgent:
    def __init__(self):
        print("AGENT 4: Design Refinement Initialized (Pillow).")
        self.output_dir = os.path.join('static', 'generated')
        os.makedirs(self.output_dir, exist_ok=True)
        
    def run(self, data):
        start_time = time.time()
        print("\n[Agent 4] Starting design composition...")
        try:
            image_bytes = data["image_bytes"]
            with Image.open(image_bytes) as img:
                # 1. Resize
                img_resized = ImageOps.fit(img, (768, 1024), Image.LANCZOS)
                
                # 2. Add Border
                border_top_side = 40
                border_bottom = 160 
                img_with_border = ImageOps.expand(img_resized, border=(border_top_side, border_top_side, border_top_side, border_bottom), fill='white')
                
                draw = ImageDraw.Draw(img_with_border)
                
                # 3. Add Headline
                headline_text = data.get("headline", "Generated Ad")
                try:
                    font_large = ImageFont.truetype("arial.ttf", 40)
                    font_small = ImageFont.truetype("arial.ttf", 24)
                except:
                    font_large = ImageFont.load_default()
                    font_small = ImageFont.load_default()

                draw.text((50, img_with_border.height - 130), f"📢 {headline_text}", fill="black", font=font_large)
                
                audience_text = f"Target: {data.get('target_audience', 'General')}"
                draw.text((50, img_with_border.height - 70), audience_text, fill="gray", font=font_small)

                # Save
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"campaign_{timestamp}.jpg"
                output_path = os.path.join(self.output_dir, filename)
                img_with_border.save(output_path, "JPEG", quality=95)
                
                web_path = f"/static/generated/{filename}"
                data["final_web_path"] = web_path
                
                log_event("Agent 4", "Composition Complete", time.time() - start_time)
                return data
        except Exception as e:
            print(f"[Agent 4] ERROR: {e}")
            return None

# =====================================================================
# --- (Pre-load Agents) ---
# =====================================================================
agent1 = MarketingStrategyAgent()
agent2 = CriticAgent()
agent3 = ImageGeneratorAgent()
agent4 = DesignRefinementAgent()

# =====================================================================
# --- API ENDPOINTS ---
# =====================================================================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/conceptualize', methods=['POST'])
def api_conceptualize():
    try:
        data = request.json
        raw_prompt = data.get('raw_prompt')
        style = data.get('style', 'Cinematic')

        strategy = agent1.run(raw_prompt, style)
        if not strategy: return jsonify({"error": "Strategy Failed"}), 500
        
        final_strategy = agent2.run(strategy)
        
        return jsonify(final_strategy)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate', methods=['POST'])
def api_generate():
    try:
        data = request.json
        pipeline_data = {
            "image_prompt": data.get('edited_prompt'),
            "headline": data.get('headline'),
            "target_audience": data.get('target_audience'),
            "selected_model": data.get('selected_model'),
            "image_base64": data.get('image_base64')
        }

        step3_output = agent3.run(pipeline_data)
        if not step3_output: return jsonify({"error": "Image Gen Failed"}), 500
        
        step4_output = agent4.run(step3_output)
        
        if step4_output:
            return jsonify({"final_web_path": step4_output["final_web_path"]})
        else:
            return jsonify({"error": "Refinement Failed"}), 500
            
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/inpaint', methods=['POST'])
def api_inpaint():
    try:
        data = request.json
        image_b64 = data.get('image')
        mask_b64 = data.get('mask')
        prompt = data.get('prompt')

        if not image_b64 or not mask_b64:
             return jsonify({"error": "Missing image or mask data"}), 400

        # Optional: Decode here if agent3 expects PIL images
        # img_bytes = base64.b64decode(image_b64)
        # mask_bytes = base64.b64decode(mask_b64)
        # pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        # pil_mask = Image.open(io.BytesIO(mask_bytes)).convert("RGB")

        # Pass the raw base64 strings if agent3 handles decoding internally:
        result_path = agent3.run_inpainting(image_b64, mask_b64, prompt)
        
        if result_path:
            return jsonify({"success": True, "image_path": result_path})
        else:
            return jsonify({"error": "Inpainting failed"}), 500
    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"error": str(e)}), 500

# =====================================================================
# --- RUN THE APP ---
# =====================================================================
if __name__ == '__main__':
    app.run(debug=True, port=5000)