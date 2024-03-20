import socketio
import time
import requests
import datetime
import numpy as np

from pprint import pprint

import atexit

from cryptography.fernet import Fernet

import os
from dotenv import load_dotenv, set_key
load_dotenv("./client.env")

sio = socketio.AsyncClient()

# Config
env_path = "client.env"
host = "http://localhost:11278/"

users_path = "./etc/pwd.txt"


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

## Users
def encrypt(message: bytes, key: bytes) -> bytes:
    return Fernet(key).encrypt(message)

def decrypt(token: bytes, key: bytes) -> bytes:
    return Fernet(key).decrypt(token)

def addUser(username: str, password: str):
    dateString = str(datetime.datetime.today().timestamp())

    file = open(users_path, "a")
    file.write(f'{username}:{password}:{dateString}\n')

def findUser(username: str):
    file = open(users_path, "r")
    for number, line in enumerate(file):
        tokens = line.strip().split(":")
        try:
            if tokens[0] == username:
                return number
        except:
            pass

def removeUser(username: str):
    lineNum = findUser(username)
    if lineNum is None:
        return
    file = open(users_path, "rw")
    for number, line in enumerate(file):
        if (number != lineNum):
            file.write(line)

def getUsers():
    users = []
    file = open(users_path, "r")
    for line in file:
        tokens = line.strip().split(":")

        if tokens[0] == ">>":
            continue

        print(line.strip())


def command_users(tokens):
    try :
        match tokens[1]:
            case "add":
                addUser(tokens[2], tokens[3])
            case "get":
                getUsers()
            case "remove":
                removeUser(tokens[2])
            case _:
                print("Invalid Flag")
    except IndexError:
        users = getUsers()

## Debug
def command_test(tokens):
    print("test command ran")
    print(session.cookies.get_dict())
    pprint(session.post(host + "getPuzzle", data={"name":"templatePuzzleName"}).json())

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
        return True

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
        """
        )

## Clear Screen
def command_clear(tokens):
    os.system("cls")

commands = {
    "help": command_help,
    "info": command_info,
    "test": command_test,
    "exit": command_exit,
    "login": command_login,
    "clear": command_clear,
    "users": command_users
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