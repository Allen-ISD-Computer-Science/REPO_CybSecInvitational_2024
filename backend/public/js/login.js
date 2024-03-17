const badRequestAlert = document.getElementById("badRequestAlert");
badRequestAlert.style.display = "none";

const form = document.getElementById("formSubmit");
async function attemptLogin() {
  const username = form.username.value;
  const password = form.password.value;
  console.log(username, password);

  if (!username || !password) {
    return;
  }

  badRequestAlert.style.display = "none";

  const response = await fetch("login", {
    method: "POST",
    body: JSON.stringify({ username: username, password: password }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });
  console.log(response);
  if (response.ok) {
    window.location.replace("home");
  } else {
    badRequestAlert.style.display = "flex";
    badRequestAlert.textContent = await response.text();
  }
}

form.addEventListener("submit", function (event) {
  event.preventDefault();
  console.log("submitting");
  attemptLogin();
});
