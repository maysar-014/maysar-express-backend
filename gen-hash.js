const bcrypt = require('bcrypt');
bcrypt.hash('Maysar@2024!', 12).then(h => console.log(h));
