import time
import random
import hashlib

def find_matching_line(file_path, expected_md5):
    with open(file_path, 'r') as file:
        for line in file:
            line = line.strip()  # Remove leading/trailing whitespace
            line_md5 = hashlib.md5(line.encode()).hexdigest()
            if line_md5 == expected_md5:
                return line
    return None

excuses = ["Downloading assets...", "Installing packages...", "Loading registers...", "Fixing errors...", "Resolving progress conflicts...", "Detecting hardware...", "Validating OS...", "Sending Data..."]
flag = find_matching_line("./Flags.txt","fea9d9b9442424bd9c94b3de637d3075")

try:
    while True:
        print(excuses[random.randint(0, len(excuses) - 1)])
        time.sleep(random.randint(1, 10) / 10)
except KeyboardInterrupt:
    print("\nWhy did you interrupt me?\n", flag)
