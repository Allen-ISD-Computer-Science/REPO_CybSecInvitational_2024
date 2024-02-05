async function sendRequest() {
  let registrants = [
    {
      email: register1Email.value,
      firstName: register1FirstName.value,
      lastName: register1LastName.value,
      school: register1School.value,
      gradeLevel: register1Grade.value,
      shirtSize: register1ShirtSize.value,
    },
  ];

  if (secondMember && register1Email.value !== register2Email.value) {
    registrants.push({
      email: register2Email.value,
      firstName: register2FirstName.value,
      lastName: register2LastName.value,
      school: register2School.value,
      gradeLevel: register2Grade.value,
      shirtSize: register2ShirtSize.value,
    });
  }

  const response = await fetch("register", {
    method: "POST",
    body: JSON.stringify({
      registrants: registrants,
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

const register2FirstName = document.getElementById("register_2_first_name");
const register2LastName = document.getElementById("register_2_last_name");
const register2Email = document.getElementById("register_2_email");
const register2EmailConfirm = document.getElementById("register_2_email_confirm");
const register2School = document.getElementById("register_2_school");
const register2Grade = document.getElementById("register_2_grade");
const register2ShirtSize = document.getElementById("register_2_shirt_size");

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

let secondMember = false;
document.getElementById("removeMemberButton").addEventListener("click", () => {
  secondMember = false;
  document.getElementById("addMemberButton").style.display = "inline";
  document.getElementById("removeMemberButton").style.display = "none";
  document.getElementById("addMember").style.display = "none";
});

document.getElementById("addMemberButton").addEventListener("click", () => {
  secondMember = true;
  document.getElementById("addMemberButton").style.display = "none";
  document.getElementById("removeMemberButton").style.display = "inline";
  document.getElementById("addMember").style.display = "inline";
});
