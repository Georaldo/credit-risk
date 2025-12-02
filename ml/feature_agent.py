import pandas as pd
import json
from openai import OpenAI
from config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

def detect_features_and_target(df):
    sample = df.head(8).to_dict(orient="records")

    prompt = f"""
    You are an ML engineer.
    Given the dataset sample below, identify:

    - target column
    - feature columns
    - ml_task (classification or regression)
    - recommended_models list

    Return JSON only.

    Dataset sample:
    {json.dumps(sample)}
    """

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role":"user","content":prompt}],
        temperature=0
    )

    content = resp.choices[0].message.content.strip()

    return json.loads(content)
