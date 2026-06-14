select id, email, "passwordHash", role, status, "failedLoginAttempts", "lockoutUntil"
from auth_users
where email in ('admin@maysar.co.tz', 'buyer@maysar.co.tz')
order by email;
