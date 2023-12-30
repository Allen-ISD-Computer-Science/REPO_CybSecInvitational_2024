# File: key_challenge.sh

#!/bin/bash

# Display a more challenging puzzle to the user
echo "Welcome to the Advanced XOR Key Challenge!"
echo "To obtain the XOR key, solve the following puzzle Round to Highest Integer:"
echo "(((2^4 + 5) * 3) / 2) + (7 % 3) - 1 = ?"

# Read the user's response
read -p "Your answer: " user_answer

# Check if the user's answer is correct
if [ "$user_answer" == "32" ]; then
    # Provide the correct XOR key
    echo "Congratulations! You've solved the puzzle. Here is your XOR key: 0101"
else
    echo "Incorrect answer. Keep trying!"
fi
