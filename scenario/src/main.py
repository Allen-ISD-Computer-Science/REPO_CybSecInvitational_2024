import socketio
import time
import requests
import datetime

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
            session.cookies.set("LoginToken", token)
            result = session.post(host + "checkLogin", timeout=request_timeout)

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

def command_service_solarpanels_report(tokens):
    try:
        result = session.post(host + "scenario/service/solarpanels/report", timeout=request_timeout)

        if not result.ok:
            print(result.text)
            return
        data = result.json()
        # pprint(data)
        for section in data:
            panels = data[section]
            result = section + " = "

            count = 1
            for panel in panels:
                state = panels[panel]
                result += panel + ":" + str(state)

                if count < len(panels):
                    result += ", "

                count += 1
            print(result)

    except TimeoutError:
        print("Request Timed Out")

def command_service_solarpanels_status(tokens):
    try:
        groupName = tokens[3]
        id = tokens[4]

        try:
            result = session.post(host + "scenario/service/solarpanels/status", {"groupName": groupName, "panelId": id}, timeout=request_timeout)
            print(result.text)
        except TimeoutError:
            print("Request Timed Out")
    except IndexError:
        print("Invalid Arguments")

def command_service_solarpanels_reboot(tokens):
    try:
        groupName = tokens[3]
        id = tokens[4]

        try:
            result = session.post(host + "scenario/service/solarpanels/reboot", {"groupName": groupName, "panelId": id}, timeout=request_timeout)
            print(result.text)
        except TimeoutError:
            print("Request Timed Out")
    except IndexError:
        print("Invalid Arguments")

def command_service_solarpanels_repair(tokens):
    try:
        groupName = tokens[3]
        id = tokens[4]

        try:
            result = session.post(host + "scenario/service/solarpanels/repair", {"groupName": groupName, "panelId": id}, timeout=request_timeout)
            print(result.text)
        except TimeoutError:
            print("Request Timed Out")
    except IndexError:
        print("Invalid Arguments")

serviceSolarPanelCommands = {
    "report": command_service_solarpanels_report,
    "status": command_service_solarpanels_status,
    "reboot": command_service_solarpanels_reboot,
    "repair": command_service_solarpanels_repair
}

def command_service_solarpanels(tokens):
    try:
        serviceSolarPanelCommands[tokens[2]](tokens)
    except IndexError:
        print("Solar Panel Service Command Not Found")
#endregion

#region repairService

def command_service_repair_report(tokens):
        try:
            result = session.post(host + "scenario/service/repair/report", timeout=request_timeout)
            data = result.json()
            for key in data:
                print(key + ":")
                value = data[key]
                for operation in value:
                    if operation is None:
                        continue
                    else:
                        startTime = operation["startTime"]
                        duration = operation["duration"]
                        started = operation["started"]
                        label = operation["label"]
                        output = ""

                        output += f"Type: {label} "
                        output += f"Started: {started} "
                        output += f"Duration: {duration} "

                        if startTime:
                            now = int(datetime.datetime.now().timestamp() * 1000)
                            millis = duration - (now - startTime)
                            seconds=(millis/1000)%60
                            seconds = int(seconds)
                            minutes=(millis/(1000*60))%60
                            minutes = int(minutes)
                            output += f"Time Till Completion: {minutes}:{seconds} "

                        print(output)
                print("")
        except TimeoutError:
            print("Request Timed Out")
        except IndexError:
            print("Returned Data Mismatch")

serviceRepairCommands = {
    "report": command_service_repair_report
}

def command_service_repair(tokens):
    try:
        serviceRepairCommands[tokens[2]](tokens)
    except IndexError:
        print("Repair Service Command Not Found")

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
    "solarpanels": command_service_solarpanels,
    "repair": command_service_repair
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
    "exit": command_exit,
    "login": command_login,
    "clear": command_clear,
    "service": command_service
}

def parseCommand():
    command = input(">>> ")
    tokens = command.split(" ")
    time.sleep(0.5)
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