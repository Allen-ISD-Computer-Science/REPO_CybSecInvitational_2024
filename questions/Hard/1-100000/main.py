import random
guess = int(input("Guess a random number between 1-100 and win the code: "))#AHSINV{e86597c1c6891d84afa86b2d049072d6}
random_in_range = random.randint(1, 100000) # Replace with your actual random number generation code
password = "AHSINV{e86597c1c6891d84afa86b2d049072d6}"

if guess == random_in_range:
    print("Congratulations! You guessed correctly. Here's the password:", password)
else:
    print("sry, try again")