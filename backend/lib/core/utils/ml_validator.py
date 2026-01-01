# from textblob import TextBlob

# def is_content_safe(text):
#     """
#     Analyzes text sentiment.
#     Returns False if the text is highly negative (bullying/toxic).
#     Returns True if the text is neutral or positive.
#     """
#     if not text:
#         return False
        
#     analysis = TextBlob(text)
    
#     # Polarity range: -1.0 (Very Negative) to 1.0 (Very Positive)
#     # We set a threshold of -0.5 to catch obvious toxicity
#     sentiment_score = analysis.sentiment.polarity
    
#     print(f"DEBUG: Text='{text}', Score={sentiment_score}") # Helpful for your demo
    
#     if sentiment_score < -0.5:
#         return False
    
#     return True