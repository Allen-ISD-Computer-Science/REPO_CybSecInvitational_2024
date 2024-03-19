document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission

    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    if (username === 'admin' && password === 'admin') {
        alert('AHSINV{f70a24be15ddd3e29081b6560cf57bc6}');
    } else {
        location.reload(); // Refresh the page
    }
});