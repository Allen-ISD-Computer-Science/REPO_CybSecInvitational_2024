import socketio
import time
import requests
import datetime
import numpy as np

from pprint import pprint

import os
from dotenv import load_dotenv, set_key
load_dotenv("./client.env")

sio = socketio.AsyncClient()

# Config
env_path = "client.env"
host = "http://localhost:11278/"

users_path = "./etc/pwd.txt"
request_timeout = 5

session = requests.Session()

# Environment Handling
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

# Commands

## Debug
def command_test(tokens):
    print("test command ran")
    print(session.cookies.get_dict())
    pprint(session.post(host + "getPuzzle", data={"name":"templatePuzzleName"}, timeout=request_timeout).json)

## Exit
def command_exit(tokens):
    print("Exiting")
    exit()

## Login Handling
def checkToken():
    token = os.getenv("LoginToken")
    expires = os.getenv("LoginTokenExpires")

    if (token is None) or (expires is None):
        return False
    elif float(expires) < time.time():
        return False
    else:
        try:
            print(token)
            session.cookies.set("LoginToken", token)
            result = session.post(host + "checkLogin", timeout=request_timeout)
            print(result.ok)
            if result.ok:
                return True
            else:
                return False
        except:
            return False

def command_login(tokens):
    if not checkToken():
        attemptLogin()
    else:
        print("Already Logged In")

## System Info
def command_info(tokens):
    expireTime = datetime.datetime.fromtimestamp(float(os.getenv("LoginTokenExpires")))
    now = datetime.datetime.today()
    diff = expireTime - now
    print(f'Token Expires At: {expireTime.isoformat()}')
    print(f'Token Expires In: {diff.seconds} seconds')

## Generic Help
def command_help(tokens):
    print(
        """
        help
        info
        test
        exit
        login
        clear
        service
        """
        )

## Clear Screen
def command_clear(tokens):
    os.system("cls")

#region Service

#region Solar Panel Service

def command_service_solarpanels_summary(tokens):
    try:
        result = session.post(host + "getReport", timeout=request_timeout)
        if not result.ok:
            print(result.text)
            return

        pprint(result.json())
    except TimeoutError:
        print("Request Timed Out, Please Try Again")

serviceSolarPanelCommands = {
    "summary": command_service_solarpanels_summary
}

def command_service_solarpanels(tokens):
    try:
        serviceSolarPanelCommands[tokens[2]](tokens)
    except IndexError:
        print("Solar Panel Service Command Not Found")
#endregion

def command_service_help(tokens):
    print(
        """
        help
        solarpanels
        """
        )

serviceCommands = {
    "help": command_service_help,
    "solarpanels": command_service_solarpanels
}

def command_service(tokens):
    try:
        try:
            serviceCommands[tokens[1]](tokens)
        except IndexError:
            print("Service Command Not Found")

    except IndexError:
        print("Missing Arguments")
#endregion

commands = {
    "help": command_help,
    "info": command_info,
    "test": command_test,
    "exit": command_exit,
    "login": command_login,
    "clear": command_clear,
    "service": command_service
}

def parseCommand():
    command = input(">>> ")
    tokens = command.split(" ")
    try:
        command = commands[tokens[0]]
        command(tokens)
    except KeyError:
        print("Invalid Command")
    except:
        raise

    parseCommand()

#attempt login
def attemptLogin():
    print("Enter your username: ")
    username = input()
    print("Enter your password: ")
    password = input()

    print("Attempting Login...")
    response = session.post(host + "login", data={"username": username, "password": password}, timeout=request_timeout)

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