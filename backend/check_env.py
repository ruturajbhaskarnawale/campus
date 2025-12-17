import sys
print(sys.executable)
print(sys.path)
try:
    import textblob
    print("TextBlob imported successfully")
except ImportError as e:
    print(f"ImportError: {e}")
