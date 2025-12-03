# ml/risk_agent.py
import json
import os
import google.generativeai as genai

# Make sure GEMINI_API_KEY is in your environment variables or config.py
# from config import GEMINI_API_KEY 
# genai.configure(api_key=GEMINI_API_KEY)

# Or simpler for now if you set it in env:
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def evaluate_application_risk(customer_data: dict, model_prediction: int, model_probability: float):
    """
    Uses Gemini 1.5 Flash to act as a Senior Credit Risk Analyst.
    """
    
    risk_label = "High Risk" if model_prediction == 1 else "Low Risk"
    
    # We use a Pydantic-like structure description in the prompt for Gemini
    prompt = f"""
    You are a Senior Credit Risk Officer agent named 'SmartCredit Bot'.
    
    Task: Analyze the following loan application and provide a brief assessment.
    
    Context:
    - The ML Model has classified this as: **{risk_label}** (Probability of Default: {model_probability:.2%}).
    - Applicant Data: {json.dumps(customer_data)}
    
    Return a JSON object with this exact schema:
    {{
        "assessment_summary": "1-2 sentence summary",
        "key_concerns": ["concern 1", "concern 2"],
        "positive_factors": ["factor 1", "factor 2"],
        "recommendation": "Approve", "Reject", or "Manual Review",
        "confidence_score": 0 to 100 (integer)
    }}
    """

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Parse the JSON string from Gemini
        return json.loads(response.text)
        
    except Exception as e:
        print(f"Agent Error: {e}")
        return {
            "assessment_summary": "Agent unavailable. Please rely on model score.",
            "key_concerns": ["Agent Error"],      
            "positive_factors": [],               
            "recommendation": "Manual Review",
            "confidence_score": 0
        }