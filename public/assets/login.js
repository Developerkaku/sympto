document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();

    if (name && email) {
        // Store the data in localStorage
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);

        // Redirect to index.html
        window.location.href += 'predict';
    } else {
        alert('Please fill in both fields.');
    }
});