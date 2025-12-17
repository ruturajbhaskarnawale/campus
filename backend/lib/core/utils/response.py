from flask import jsonify

def success_response(data=None, status=200):
    """Return a standardized success envelope."""
    return jsonify({"success": True, "data": data, "error": None}), status

def error_response(message, status=400):
    """Return a standardized error envelope."""
    return jsonify({"success": False, "data": None, "error": message}), status
