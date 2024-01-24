const invalidAlert = document.getElementById("invalidAlert");
const badRequestAlert = document.getElementById("badRequestAlert");
invalidAlert.style.display = "none";
badRequestAlert.style.display = "none";

const relativeUrl = host_relative_path;
if (!relativeUrl) relativeUrl = "";

const submitButton = document.getElementById("formSubmit");
submitButton.onclick = async (evt) => {
  evt.preventDefault();
  const username = submitButton.form.username.value;
  const password = submitButton.form.password.value;
  console.log(username, password);

  if (!username || !password) {
    return;
  }

  invalidAlert.style.display = "none";
  badRequestAlert.style.display = "none";

  const response = await fetch(location.protocol + "//" + location.host + relativeUrl + "/login", {
    method: "POST",
    body: JSON.stringify({ username: username, password: password }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });
  console.log(response);
  if (response.ok) {
    window.location.replace(location.protocol + "//" + location.host + "/home");
  } else {
    switch (response.status) {
      case 404:
        console.log("user not found");
        invalidAlert.style.display = "flex";
        break;
      case 401:
        console.log("invalid login");
        invalidAlert.style.display = "";
        break;
      case 400:
        console.log("bad request");
        badRequestAlert.style.display = "";
        break;
      default:
        break;
    }
  }
};
