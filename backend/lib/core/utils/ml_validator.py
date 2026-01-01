import nltk
import os
from textblob import TextBlob

# ==========================================
# 1. VERCEL DEPLOYMENT PATCH (DO NOT REMOVE)
# ==========================================
# Vercel is read-only, so we must save NLTK data to the temporary folder (/tmp)
nltk_data_path = '/tmp/nltk_data'
if not os.path.exists(nltk_data_path):
    os.makedirs(nltk_data_path)

# Tell NLTK to look in /tmp for its dictionaries
nltk.data.path.append(nltk_data_path)

# Download the necessary dictionaries if they are missing
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', download_dir=nltk_data_path)

try:
    nltk.data.find('corpora/brown')
except LookupError:
    nltk.download('brown', download_dir=nltk_data_path)

# ==========================================
# 2. YOUR VALIDATION LOGIC
# ==========================================
def is_content_safe(text):
    """
    Analyzes text sentiment.
    Returns False if the text is highly negative (bullying/toxic).
    Returns True if the text is neutral or positive.
    """
    if not text:
        return False
        
    try:
        # Create the blob
        analysis = TextBlob(text)
        
        # Polarity range: -1.0 (Very Negative) to 1.0 (Very Positive)
        # We set a threshold of -0.5 to catch obvious toxicity
        sentiment_score = analysis.sentiment.polarity
        
        # Helpful debug print for your logs
        print(f"DEBUG: Text='{text}', Score={sentiment_score}") 
        
        if sentiment_score < -0.5:
            return False
        
        return True

    except Exception as e:
        print(f"⚠️ ML Validator Error: {e}")
        # Fail-safe: If ML crashes, allow the post (better than crashing the app)
        return True
