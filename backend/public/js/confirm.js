const inputEmail = document.getElementById("inputEmail");
const inputCode = document.getElementById("inputCode");

const label = document.getElementById("submit_label");
const spinner = document.getElementById("submit_spinner");
const check = document.getElementById("submit_check");

const problemAlert = document.getElementById("problem_alert");

var sent = false;
const submitButton = document.getElementById("formSubmit");
submitButton.onclick = async (evt) => {
  if (sent) return; //debounce
  problemAlert.style.display = "none";

  evt.preventDefault();
  const email = inputEmail.value;
  const code = inputCode.value;

  if (!email || !code) {
    return;
  }
  label.style.display = "none";
  check.style.display = "none";
  spinner.style.display = "inline-block";

  sent = true;
  const response = await fetch("registerVerify", {
    method: "POST",
    body: JSON.stringify({
      email: email,
      code: code,
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  sent = false;

  console.log(response);

  if (response.ok) {
    spinner.style.display = "none";
    label.style.display = "none";
    check.style.display = "inline-block";
    window.location.href = "/login";
  } else if (!response.ok) {
    problemAlert.style.display = "block";
    problemAlert.textContent = "Failed :(";
    spinner.style.display = "none";
    label.style.display = "block";
    check.style.display = "none";
  }
};
