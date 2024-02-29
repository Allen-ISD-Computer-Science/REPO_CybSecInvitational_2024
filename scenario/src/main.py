import asyncio
import socketio
import datetime

sio = socketio.AsyncClient()

@sio.event
async def connect():
    print('connection established')

    #attempt login after connection
    print("Enter your username: ")
    username = input()
    print("Enter your password: ")
    password = input()

    await attemptLogin(username, password)

async def attemptLogin(username, password):
    await sio.emit("scenario_login", {"username": username, "password": password})

@sio.event
async def scenario_on_login(data):
    if data['ok']:
        date = datetime.datetime.fromtimestamp(data["expirationTime"]/1000.0)
        print("Successfully Logged In!")
        print("Token expires at: "  + date.strftime("%b %d %I %M %S"))
    else:
        print(data["message"])

    await sio.disconnect()

async def main():
    await sio.connect('http://localhost:11278')
    await sio.wait()

if __name__ == '__main__':
    asyncio.run(main())