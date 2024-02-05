async function sendRequest() {
  const response = await fetch("register", {
    method: "POST",
    body: JSON.stringify({
      registrants: [
        {
          email: register1Email.value,
          firstName: register1FirstName.value,
          lastName: register1LastName.value,
          school: register1School.value,
          gradeLevel: register1Grade.value,
          shirtSize: register1ShirtSize.value,
        },
      ],
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });
}

const register1FirstName = document.getElementById("register_1_first_name");
const register1LastName = document.getElementById("register_1_last_name");
const register1Email = document.getElementById("register_1_email");
const register1EmailConfirm = document.getElementById("register_1_email_confirm");
const register1School = document.getElementById("register_1_school");
const register1Grade = document.getElementById("register_1_grade");
const register1ShirtSize = document.getElementById("register_1_shirt_size");

const registerSubmit = document.getElementById("register_submit");

registerSubmit.onclick = function (evt) {
  evt.preventDefault();

  if (register1Email.value != register1EmailConfirm.value) return;
  if (!register1FirstName.value) return;
  if (!register1LastName.value) return;
  if (!register1Email.value) return;
  if (!register1EmailConfirm.value) return;
  if (!register1School.value) return;
  if (!register1Grade.value) return;
  if (!register1ShirtSize.value) return;

  console.log(register1FirstName.value, register1LastName.value, register1Email.value, register1EmailConfirm.value, register1School.value, register1Grade.value, register1ShirtSize.value);

  sendRequest();
};
