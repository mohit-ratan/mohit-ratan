UPDATE users
SET email_verified = 1,
    verification_token = NULL,
    verification_expires = NULL
WHERE email = 'mohit.mummidi@gmail.com';
