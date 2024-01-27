to initialize the backend type this command
npm i
this will install any dependencies that the backend has

to run the server type this command
npm run server

this will start a nodemon instance which will automatically restart the node server when a change is detected on one of the files

to start the server in an environment where nodemon can not be run type this command
node index.js

the config file is used to hold non sensitive data
a .env file is needed for sensitive data such as passwords and usernames
