import base64
def decode_from_base64(encoded_string):
    # Convert the encoded string to bytes
    encoded_bytes = encoded_string.encode('utf-8')
    
    # Decode the Base64 bytes
    decoded_bytes = base64.b64decode(encoded_bytes)
    
    # Convert the bytes back to a string
    decoded_string = decoded_bytes.decode('utf-8')
    
    return decoded_string
def read_file_content(file_path):
    with open(file_path, 'r') as file:
        content = file.read()
    return content
# Example usage
input_string = read_file_content("key")

decoded_string = decode_from_base64(input_string)

print("Original string:", input_string)

print("Decoded string:", decoded_string)
