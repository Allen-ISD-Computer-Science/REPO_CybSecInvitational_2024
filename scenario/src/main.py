import asyncio
import socketio

sio = socketio.AsyncClient()

# base
@sio.event
async def connect():
    print('connection established')

    token = open("token.txt","r")
    print(token.read())
    #attempt login after connection
    print("Enter your username: ")
    username = input()
    print("Enter your password: ")
    password = input()

    result = await attemptLogin("username", "password")
    print(result)
    

@sio.event
async def disconnect():
    print('disconnected from server')

# login
async def attemptLogin(username, password):
    print("attempting login")
    await sio.emit("scenario_login", {"username": username, "password": password})

@sio.event
async def scenario_on_login(data):
    print("Login Attempt :", data)

# else

async def main():
    await sio.connect('http://localhost:11278')
    await sio.wait()

if __name__ == '__main__':
    asyncio.run(main())