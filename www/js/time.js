// Set the end date for the countdown (in UTC to ensure compatibility with all timezones)
var endDate = new Date("2024-04-27T08:00:00Z").getTime();
// var endDate = Date.now() + 604_800_000;

// Update the countdown every second
function formatTime(time, amount) {
    return ("00" + time).slice(-amount);
}

const countdowns = document.getElementsByClassName("countdown");

let prevTime = Date.now();
function updateTime() {
    let timeLeft = endDate - Date.now();

    let days = Math.floor(timeLeft / (86_400 * 1000));
    timeLeft %= 86_400 * 1000;
    let hours = Math.floor(timeLeft / (3_600 * 1000));
    timeLeft %= 3_600 * 1000;
    let minutes = Math.floor(timeLeft / (60 * 1000));
    timeLeft %= 60 * 1000;
    let seconds = Math.floor(timeLeft / 1000);
    timeLeft %= 1000;

    for (let countdown of countdowns) {
    if (timeLeft < 0) {
        countdown.innerHTML = "EVENT STARTED !!!";
        countdown.classList.add("text-danger");
        countdown.style.animation = "glow-danger 10s ease-in-out infinite alternate";
        return;
    }

    var now = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });

    // Display the countdown in the specified format
    countdown.innerHTML = formatTime(days, 2) + " : " + formatTime(hours, 2) + " : " + formatTime(minutes, 2) + " : " + formatTime(seconds, 2) + " : " + formatTime(timeLeft, 3);
    }

    window.requestAnimationFrame(updateTime);
}

updateTime();