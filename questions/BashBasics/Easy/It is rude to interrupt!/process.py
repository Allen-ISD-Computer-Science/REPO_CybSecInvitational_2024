import time
import random

excuses = ["Downloading assets...", "Installing packages...", "Loading registers...", "Fixing errors...", "Resolving progress conflicts...", "Detecting hardware...", "Validating OS...", "Sending Data..."]

try:
    while True:
        print(excuses[random.randint(0, len(excuses) - 1)])
        time.sleep(random.randint(1, 10) / 10)
except:
    print("\nWhy did you interrupt me?\nAHSINV{b944c6b22abbd13bdc8f17c816bffdb7}")