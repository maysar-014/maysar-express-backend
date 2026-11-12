const loginRes = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ email: 'enabler@maysar.co.tz', password: 'Maysar@2024!' })
});
const loginData = await loginRes.json();
const token = loginData.accessToken || loginData.token;
console.log('Login:', loginRes.status, token ? 'token ok' : 'no token');
if (!token) process.exit(1);

// Try with user ID
const r1 = await fetch(`http://localhost:3000/api/enabler/enablers/usr_01KRFZ1E8HMAE7MMH175PJ9337`, {
  headers: { Authorization: `Bearer ${token}` }
});
const d1 = await r1.json();
console.log('By user ID:', r1.status, JSON.stringify(d1).slice(0, 150));

// Try with profile ID
const r2 = await fetch(`http://localhost:3000/api/enabler/enablers/enb_pro_01M3G5E19K8TC5SCDFQZCXZ6DY`, {
  headers: { Authorization: `Bearer ${token}` }
});
const d2 = await r2.json();
console.log('By profile ID:', r2.status, JSON.stringify(d2).slice(0, 150));
