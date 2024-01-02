import sys

def main():
    answer = input("What is the MD5 checksum value of the game.py file?\n")
    if answer == 'd340275758fafeea59c619b20d585cdf':
        file = open('Flag.txt', 'r')
        print(file.readline())
    else:
        print("Try again.")
    sys.exit(0)

main()
