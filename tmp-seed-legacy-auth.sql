insert into auth_users (
  id,
  email,
  "passwordHash",
  role,
  status,
  "phoneNumber",
  "isEmailVerified",
  "isPhoneVerified",
  "failedLoginAttempts",
  "lockoutUntil",
  "lastLoginAt",
  "passwordChangedAt",
  "twoFactorEnabled",
  "twoFactorSecret",
  "createdAt",
  "updatedAt"
) values
  ('usr_01KTCNKTF1MJFY3JHGJNKSYG1E', 'admin@maysar.co.tz', '$2b$12$EchM7/A.cnhoNWCvLPLhrOanMuG/GnUqC3xnlarBaFp7fpprMgqFK', 'system', 'active', '+255700000001', true, true, 0, null, null, null, false, null, now(), now()),
  ('usr_01KRFXQZC36NK3CDEWJJS21RP8', 'buyer@maysar.co.tz', '$2b$12$EchM7/A.cnhoNWCvLPLhrOanMuG/GnUqC3xnlarBaFp7fpprMgqFK', 'buyer', 'active', '+255700000002', true, true, 0, null, null, null, false, null, now(), now())
on conflict (email) do update set
  "passwordHash" = excluded."passwordHash",
  role = excluded.role,
  status = excluded.status,
  "phoneNumber" = excluded."phoneNumber",
  "isEmailVerified" = excluded."isEmailVerified",
  "isPhoneVerified" = excluded."isPhoneVerified",
  "failedLoginAttempts" = excluded."failedLoginAttempts",
  "lockoutUntil" = excluded."lockoutUntil",
  "lastLoginAt" = excluded."lastLoginAt",
  "passwordChangedAt" = excluded."passwordChangedAt",
  "twoFactorEnabled" = excluded."twoFactorEnabled",
  "twoFactorSecret" = excluded."twoFactorSecret",
  "updatedAt" = excluded."updatedAt";
