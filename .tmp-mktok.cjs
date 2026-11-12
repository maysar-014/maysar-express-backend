const jwt = require('jsonwebtoken');
const secret = '976b5ecd916f944651855111f3cf7010ed7bc56c4e3d703523caa300eec216e67652bd44305c30a1cef5cdc0f59a902111183d88f61940fd1e4b7c65c758034b';
const t = jwt.sign({ userId: 'usr_test_seller_123', email: 's@t.com', roles: ['seller'] }, secret, { expiresIn: '1h' });
require('fs').writeFileSync('.tmp-tok.txt', t);
console.log('ok', t.length);
