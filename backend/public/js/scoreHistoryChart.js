// Set new default font family and font color to mimic Bootstrap's default styling
(Chart.defaults.global.defaultFontFamily = "Nunito"), '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
Chart.defaults.global.defaultFontColor = "#858796";

// Area Chart Example
var ctx = document.getElementById("myAreaChart");
var myLineChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Puzzle Points",
        lineTension: 0.3,
        backgroundColor: "rgba(78, 115, 223, .05)",
        borderColor: "rgba(78, 115, 223, 1)",
        pointRadius: 3,
        pointBackgroundColor: "rgba(78, 115, 223, 1)",
        pointBorderColor: "rgba(78, 115, 223, 1)",
        pointHoverRadius: 3,
        pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
        pointHoverBorderColor: "rgba(78, 115, 223, 1)",
        pointHitRadius: 10,
        pointBorderWidth: 2,
        data: [0, 50, 100, 150, 200, 210, 270, 300, 500],
        stack: "accumulative",
      },
      {
        label: "Scenario Points",
        lineTension: 0.3,
        backgroundColor: "rgba(28, 200, 138, .05)",
        borderColor: "rgba(28, 200, 138, 1)",
        pointRadius: 3,
        pointBackgroundColor: "rgba(28, 200, 138, 1)",
        pointBorderColor: "rgba(28, 200, 138, 1)",
        pointHoverRadius: 3,
        pointHoverBackgroundColor: "rgba(28, 200, 138, 1)",
        pointHoverBorderColor: "rgba(28, 200, 138, 1)",
        pointHitRadius: 10,
        pointBorderWidth: 2,
        data: [0, 50, 100, 150, 200, 210, 270, 300, 500],
        stack: "accumulative",
      },
    ],
  },
  options: {
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 25,
        top: 25,
        bottom: 0,
      },
    },
    scales: {
      xAxes: [
        {
          time: {
            unit: "date",
          },
          gridLines: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            maxTicksLimit: 10,
          },
        },
      ],
      yAxes: [
        {
          stacked: true,

          ticks: {
            maxTicksLimit: 10,
            padding: 5,
          },
          gridLines: {
            color: "rgb(234, 236, 244)",
            zeroLineColor: "rgb(234, 236, 244)",
            drawBorder: false,
            borderDash: [2],
            zeroLineBorderDash: [2],
          },
        },
      ],
    },
    legend: {
      display: false,
    },
    tooltips: {
      backgroundColor: "rgb(255,255,255)",
      bodyFontColor: "#858796",
      titleMarginBottom: 10,
      titleFontColor: "#6e707e",
      titleFontSize: 14,
      borderColor: "#dddfeb",
      borderWidth: 1,
      xPadding: 15,
      yPadding: 15,
      displayColors: false,
      intersect: false,
      mode: "index",
      caretPadding: 10,
    },
  },
});

let history = localStorage.getItem("point_history");
!history ? (pointHistory = []) : (pointHistory = JSON.parse(history));

function clearLocalStorage() {
  localStorage.removeItem("point_history");
}

function addDataPoint() {
  pointHistory.push({
    time: Date.now(),
    puzzle_points: user.puzzle_points,
    scenario_points: user.scenario_points,
  });
}

function writeToLocalStorage() {
  localStorage.setItem("point_history", JSON.stringify(pointHistory));
}

function getCurrentTime(now) {
  let hour = now.getHours();
  let minute = now.getMinutes();

  return ("0" + hour).slice(-2) + ":" + ("0" + minute).slice(-2);
}

function updateThenRenderChart() {
  let labels = [];
  let puzzleLabels = [];
  let scenarioLabels = [];

  pointHistory.forEach((val, index) => {
    labels.push(getCurrentTime(new Date(val.time)));
    puzzleLabels.push(val.puzzle_points);
    scenarioLabels.push(val.scenario_points);
  });

  myLineChart.data.labels = labels;
  myLineChart.data.datasets.forEach((dataset) => {
    if (dataset.label == "Puzzle Points") {
      dataset.data = puzzleLabels;
    } else if (dataset.label == "Scenario Points") {
      dataset.data = scenarioLabels;
    }
  });

  myLineChart.update();
}

updateThenRenderChart();

var count = 0;
document.addEventListener("user-updated", () => {
  count += 1;
  if (count < 10) {
    return;
  }
  count = 0;
  addDataPoint();
  writeToLocalStorage();
  updateThenRenderChart();
});
