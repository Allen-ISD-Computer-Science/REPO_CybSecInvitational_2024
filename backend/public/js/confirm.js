const inputEmail = document.getElementById("inputEmail");
const inputCode = document.getElementById("inputCode");

const submitButton = document.getElementById("formSubmit");
submitButton.onclick = async (evt) => {
  evt.preventDefault();
  const email = inputEmail.value;
  const code = inputCode.value;

  if (!email || !code) {
    return;
  }

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
  console.log(response);
};
