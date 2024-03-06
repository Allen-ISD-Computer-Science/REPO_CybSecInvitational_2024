import socketio
import time
import requests
import datetime

from pprint import pprint

import atexit

import os
from dotenv import load_dotenv, set_key
load_dotenv("./client.env")

sio = socketio.AsyncClient()
env_path = "client.env"
host = "http://localhost:11278/"

session = requests.Session()

def writeToEnv(key, value):
    set_key(env_path, key, value)

def readEnv():
    with open(env_path, "r") as f:
        for line in f.readlines():
            try:
                key, value = line.split('=')
                os.putenv(key, value)
            except ValueError:
                # syntax error
                pass

def checkToken():
    token = os.getenv("LoginToken")
    expires = os.getenv("LoginTokenExpires")

    if (token is None) or (expires is None):
        return False
    elif float(expires) < time.time():
        return False
    else:
        return True

def command_test():
    print("test command ran")
    print(session.cookies.get_dict())
    pprint(session.post(host + "getPuzzle", data={"name":"templatePuzzleName"}).json())

def command_exit():
    print("Exiting")
    exit()

def command_login():
    if not checkToken():
        attemptLogin()
    else:
        print("Already Logged In")

def command_info():
    print(f'Token Expires: {datetime.datetime.fromtimestamp(float(os.getenv("LoginTokenExpires"))).isoformat()}')

def command_help():
    print(
        """
        help
        log
        test
        exit
        login
        """
        )

def parseCommand():
    command = input(">>> ")
    tokens = command.split(" ")
    match tokens[0]:
        case "help":
            command_help()
        case "info":
            command_info()
        case "test":
           command_test()
        case "exit":
            command_exit()
        case "login":
            command_login()
        case _:
            print("Invalid Command")

    parseCommand()



#attempt login
def attemptLogin():
    print("Enter your username: ")
    username = input()
    print("Enter your password: ")
    password = input()

    print("Attempting Login...")
    response = session.post(host + "login", data={"username": username, "password": password})

    if (response.ok):
        print("Logged in successfully!")

        token = response.cookies.get("LoginToken")
        expires = next(x for x in response.cookies if x.name == 'LoginToken').expires

        writeToEnv("LoginToken", token)
        writeToEnv("LoginTokenExpires", str(expires))

        session.cookies.set("LoginToken", token)
    else:
        print("attempt was unsuccessful, try again")
        attemptLogin()


#init start up logic
def init():
    if not checkToken():
        attemptLogin()
    else:
        token = os.getenv("LoginToken")
        session.cookies.set("LoginToken", token)

    parseCommand()

def main():
    readEnv() # initialize environment file
    init() # start process

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("Closing Script")