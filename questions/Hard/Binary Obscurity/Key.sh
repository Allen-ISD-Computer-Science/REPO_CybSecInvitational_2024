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

    # Perform XOR decryption using bash arithmetic
    decrypted_content=""
    for ((i=0; i<${#encrypted_content}; i++)); do
        decrypted_content+=${encrypted_content:i:1}
        decrypted_content=$((16#${decrypted_content} ^ 16#${xor_key}))
        decrypted_content=$(printf "%x" "$decrypted_content")
    done

    # Convert the decrypted hex content to binary
    decrypted_content=$(echo "ibase=16;obase=2;$decrypted_content" | bc)

    # Print the decrypted content
    echo "Congratulations! You've solved the puzzle. The binary flag has been decrypted:"
    echo "$decrypted_content"
else
    echo "Incorrect answer. You get nothing."
fi


