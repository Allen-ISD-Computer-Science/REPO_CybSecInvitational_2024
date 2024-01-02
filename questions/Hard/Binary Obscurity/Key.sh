#!/bin/bash

# Display a math problem to the user
echo "Welcome to the XOR Decryption Challenge!"
echo "Solve the following math problem to decrypt the binary flag: 2 + 2 = ?"

# Read the user's response
read -p "Your answer: " user_answer

# XOR key is '0101'
xor_key="0101"

# Check if the user's answer is correct
if [ "$user_answer" -eq 4 ]; then
    # Decrypt the binary_flag.txt file with XOR key
    encrypted_content=$(cat binary_flag.txt | tr -d ' \t\n\r')
    
    # Perform XOR decryption using printf and awk
    decrypted_content=$(printf "%s" "$encrypted_content" | awk -v xor_key="$xor_key" '{ for(i=1; i<=length; i++) printf "%c", substr($0,i,1) == substr(xor_key,i,1) ? 0 : 1 }')

    # Print the decrypted content
    echo "Congratulations! You've solved the puzzle. The binary flag has been decrypted:"
    echo "$decrypted_content"
else
    echo "Incorrect answer. You get nothing."
fi

