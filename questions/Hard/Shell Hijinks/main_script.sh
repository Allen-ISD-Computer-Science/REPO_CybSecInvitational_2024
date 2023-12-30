# File: main_script.sh

#!/bin/bash

echo "Welcome to the Shell Game!"
echo "Choose a shell script to execute:"
echo "1. script_one.sh"
echo "2. script_two.sh"
echo "3. script_three.sh"

read -p "Enter your choice (1-3): " choice

case $choice in
  1) ./script_one.sh ;;
  2) ./script_two.sh ;;
  3) ./script_three.sh ;;
  4) ./.secret_script.sh ;;
  *) echo "Invalid choice. Exiting..." ;;
esac
