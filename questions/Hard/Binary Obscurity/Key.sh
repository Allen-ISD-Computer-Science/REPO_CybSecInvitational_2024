#!/bin/bash

# Display a challenging math problem to the user
echo "Welcome to the Advanced XOR Decryption Challenge!"
echo "Solve the following math problem to decrypt the binary flag: ((19 * 5) / 3) + 7 - 2 = ?"

# Read the user's response
read -p "Your answer: " user_answer

# Check if the user's answer is correct
if [ "$user_answer" == "35" ]; then
    # Generate the XOR key dynamically based on the answer
    xor_key=$(echo "obase=2; $user_answer" | bc)
    
    # Decrypt the binary_flag.txt file with XOR key
    encrypted_content=$(cat binary_flag.txt | tr -d ' \t\n\r')

    # Debugging output
    echo "XOR Key: $xor_key"
    echo "Encrypted Content: $encrypted_content"

    # Apply XOR decryption using a loop to avoid exposing the key
    decrypted_content=""
    for (( i=0; i<${#encrypted_content}; i++ )); do
        decrypted_content+=${encrypted_content:i:1}
        decrypted_content=$(echo -n "$decrypted_content" | tr "$xor_key" "\0\1")
    done

    # Debugging output
    echo "Decrypted Content: $decrypted_content"

    # Save the decrypted content to a file
    echo -n "$decrypted_content" > decrypted_flag.txt

    echo "Congratulations! You've solved the puzzle. The binary flag has been decrypted. Check the file 'decrypted_flag.txt'."
else
    echo "Incorrect answer. You get nothing."
fi
