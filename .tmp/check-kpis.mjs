import 'dotenv/config';
const res = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({email:'admin@maysar.co.tz', password:'Maysar@2024!'})
});
const { accessToken } = await res.json();

const kpis = await fetch('http://localhost:3000/api/analytics/platform/kpis', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
const data = await kpis.json();
console.log('Status:', kpis.status);
console.log('Error:', JSON.stringify(data.error || data).slice(0, 800));
