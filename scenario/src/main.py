import asyncio
import socketio
import time
import requests

import os
from dotenv import load_dotenv, set_key
load_dotenv("./client.env")

sio = socketio.AsyncClient()
env_path = "client.env"
host = "http://localhost:11278/"

s = requests.Session()

@sio.event
async def connect():
    print('connection established')

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

#attempt login
def attemptLogin():
    print("Enter your username: ")
    username = input()
    print("Enter your password: ")
    password = input()

    print("Attempting Login...")
    response = s.post(host + "login", data={"username": username, "password": password})

    if (response.ok):
        print("Logged in successfully!")

        token = response.cookies.get("LoginToken")
        expires = next(x for x in response.cookies if x.name == 'LoginToken').expires

        writeToEnv("LoginToken", token)
        writeToEnv("LoginTokenExpires", str(expires))

    else:
        print("attempt was unsuccessful, try again")
        attemptLogin()

#init start up logic
def init():
    token = os.getenv("LoginToken")
    expires = float(os.getenv("LoginTokenExpires"))

    if (token is None) or (expires is None):
       attemptLogin()
    elif expires < time.time():
       attemptLogin()
    else:
        s.cookies.set("LoginToken", token)

async def main():
    readEnv() # initialize environment file
    init() # start process

if __name__ == '__main__':
    asyncio.run(main())