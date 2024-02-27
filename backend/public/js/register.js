async function sendRequest() {
  let registrants = [
    {
      email: register1Email.value,
      firstName: register1FirstName.value,
      lastName: register1LastName.value,
      school: register1School.value,
      gradeLevel: register1Grade.value,
      shirtSize: register1ShirtSize.value,
      dietaryRestriction: register1DietaryRestriction.value,
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
      dietaryRestriction: register2DietaryRestriction.value,
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
  return response;
}

const register1FirstName = document.getElementById("register_1_first_name");
const register1LastName = document.getElementById("register_1_last_name");
const register1Email = document.getElementById("register_1_email");
const register1EmailConfirm = document.getElementById("register_1_email_confirm");
const register1School = document.getElementById("register_1_school");
const register1Grade = document.getElementById("register_1_grade");
const register1ShirtSize = document.getElementById("register_1_shirt_size");
const register1DietaryRestriction = document.getElementById("register_1_dietary_restriction");

const register2FirstName = document.getElementById("register_2_first_name");
const register2LastName = document.getElementById("register_2_last_name");
const register2Email = document.getElementById("register_2_email");
const register2EmailConfirm = document.getElementById("register_2_email_confirm");
const register2School = document.getElementById("register_2_school");
const register2Grade = document.getElementById("register_2_grade");
const register2ShirtSize = document.getElementById("register_2_shirt_size");
const register2DietaryRestriction = document.getElementById("register_2_dietary_restriction");

const registerSubmit = document.getElementById("register_submit");

const problemAlert = document.getElementById("problem_alert");
function alertProblem(message) {
  problemAlert.textContent = message;
  problemAlert.style.display = "block";
}

function isRegister1Valid() {
  return register1FirstName.value && register1LastName.value && register1Email.value && register1EmailConfirm.value && register1School.value && register1Grade.value && register1ShirtSize.value && register1DietaryRestriction.value;
}

function isRegister2Valid() {
  return register2FirstName.value && register2LastName.value && register2Email.value && register2EmailConfirm.value && register2School.value && register2Grade.value && register2ShirtSize.value && register2DietaryRestriction.value;
}

function isSecondMember() {
  return register2FirstName.value || register2LastName.value || register2Email.value || register2EmailConfirm.value || register2School.value || register2Grade.value || register2ShirtSize.value || register2DietaryRestriction.value;
}

function resetMember2() {
  register2FirstName.value = "";
  register2LastName.value = "";
  register2Email.value = "";
  register2EmailConfirm.value = "";
  register2School.value = "";
  register2Grade.value = "";
  register2ShirtSize.value = "";
  register2DietaryRestriction.value = "";
}

let allowedDomains = [/@student.allenisd.org\s*$/, /@lovejoyisd.com\s*$/, /@student.mckinneyisd.net\s*$/, /@wylieisd.net\s*$/, /@mypisd.net\s*$/, /@friscoisd.org\s*$/];
function checkEmailDomain(email) {
  for (let regexDomain of allowedDomains) {
    if (regexDomain.test(email)) {
      return true;
    }
  }
  return false;
}

var sent = false;
registerSubmit.onclick = async (evt) => {
  if (sent) return;
  evt.preventDefault();

  if (isSecondMember()) {
    secondMember = true;
  } else {
    secondMember = false;
  }

  if (!isRegister1Valid()) {
    alertProblem("Missing parameters for member 1!");
    return;
  }

  if (register1Email.value != register1EmailConfirm.value) {
    alertProblem("Confirm Emails are not the same for member 1!");
    return;
  }

  if (secondMember && !isRegister2Valid()) {
    alertProblem("Missing parameters for member 2!");
    return;
  } else if (secondMember && register2Email.value != register2EmailConfirm.value) {
    alertProblem("Confirm Emails are not the same for member 2!");
    return;
  }

  if (register1Email == register2Email) {
    alertProblem("Multiple members can not have the same email!");
    return;
  }

  if (!checkEmailDomain(register1Email.value)) {
    alertProblem("Email Domain Not Allowed");
    return;
  }
  if (secondMember) {
    if (!checkEmailDomain(register2Email.value)) {
      alertProblem("Email Domain Not Allowed");
      return;
    }
  }

  sent = true; //debounce
  let response = await sendRequest();
  if (!response.ok) {
    alertProblem(await response.text());
  } else if (response.ok) {
    window.location.href = "confirm";
  }
  sent = false;
};

const addMemberButton = document.getElementById("addMemberButton");
const removeMemberButton = document.getElementById("removeMemberButton");
const addMemberMenu = document.getElementById("addMember");

document.getElementById("removeMemberButton").addEventListener("click", () => {
  resetMember2();

  addMemberButton.classList.replace("d-none", "d-flex");
  removeMemberButton.classList.replace("d-flex", "d-none");
  addMemberMenu.classList.replace("d-inline", "d-none");
});

document.getElementById("addMemberButton").addEventListener("click", () => {
  addMemberButton.classList.replace("d-flex", "d-none");
  removeMemberButton.classList.replace("d-none", "d-flex");
  addMemberMenu.classList.replace("d-none", "d-inline");
});
