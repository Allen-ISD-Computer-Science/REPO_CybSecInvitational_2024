// Call the dataTables jQuery plugin
$(document).ready(function () {
  const table = $("#dataTable").DataTable();

  setTimeout(function () {
    console.log("clearing");
    table.clear();
    table.draw(false);
  }, 10000);
});
