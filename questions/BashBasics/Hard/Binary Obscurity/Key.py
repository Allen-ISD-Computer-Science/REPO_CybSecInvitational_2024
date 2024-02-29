def xor_binary(binary_string, key):
    result = ""
    key_length = len(key)
    for i in range(len(binary_string)):
        result += str(int(binary_string[i]) ^ int(key[i % key_length]))
    return result

def binary_to_text(binary_string):
    text = ""
    for i in range(0, len(binary_string), 8):
        byte = binary_string[i:i+8]
        text += chr(int(byte, 2))
    return text

def main():
    input_file = input("Enter the name of the file containing binary data: ")

    with open(input_file, 'r') as file:
        binary_data = file.read().strip()

    key = "0101"
    result_binary = xor_binary(binary_data, key)
    translated_text = binary_to_text(result_binary)

    print("Translated text:")
    print(translated_text)

if __name__ == "__main__":
    main()
