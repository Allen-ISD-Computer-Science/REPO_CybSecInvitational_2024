import os
import random

def randString(lower, upper):
    randString = ''
    chars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','$','%','^','@','!','#',' ','*','(',')']
    for _ in range(lower, upper):
        randString += chars[random.randint(0, len(chars) - 1)]
    return randString

def createDirs():
    # making directory
    path = '../dirs/' + randString(random.randint(10, 20), random.randint(30, 40)) + '/'
    os.mkdir(path)

    # making files
    for _ in range(0, 10):
        newFile = open(randString(random.randint(15, 25), random.randint(35, 45)))
        
        # making message
        for _ in range(0, random.randint(100, 150)):
            newFile.write(f'{randString(random.randint(100, 250))}\n')

createDirs()