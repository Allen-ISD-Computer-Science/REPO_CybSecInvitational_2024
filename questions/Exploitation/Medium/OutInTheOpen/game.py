import sys
import random

def main():
    print("Let's play a game! Guess an integer between 1 and 10, and if you guess the right number, you win!")
    answer = input("Your guess: ")
    myNum = random.randint(1, 10)
    try:
        answer = int(answer)
    except:
        print("Your number was not an integer.")
        sys.exit(0)
    if (answer < 1) or (answer > 10):
        print("Integer must be between 1 and 10.")
        sys.exit(0)
    if answer == myNum:
        print("Congratulations!")
    else:
        print(f"Try again. My number was {myNum}.")
    sys.exit(0)

main()
