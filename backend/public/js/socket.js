const socket = io();
console.log(socket);
socket.on("connect_error", (err) => {
  console.log(err);
});
