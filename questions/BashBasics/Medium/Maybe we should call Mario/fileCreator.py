import os
import random

def randomizedString(lower, upper):
    chars = [
                'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
                'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z', 
                '@','\'','#','\\','%','$','&','*','(',')'
            ]
    strings = ''
    for _ in range(0, random.randint(lower, upper)):
        strings += chars[random.randint(0, len(chars) - 1)]
    return strings

dirArray = []

for _ in range(0, 69):
    directory = randomizedString(15, 25)
    os.mkdir(directory)
    dirArray.append(directory)

for dir in dirArray:
    newFile = open(f"{dir}/{randomizedString(30, 40)}.txt", "w")
    newFile.write(randomizedString(5000, 10000))
    newFile.close()