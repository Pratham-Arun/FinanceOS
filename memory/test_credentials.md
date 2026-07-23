# Test Credentials

All demo accounts share the password `demo1234` (except admin).

| Role     | Email               | Password  |
|----------|---------------------|-----------|
| Admin    | admin@demo.com      | admin123  |
| Employee | employee@demo.com   | demo1234  |
| Manager  | manager@demo.com    | demo1234  |
| Finance  | finance@demo.com    | demo1234  |

## Auth endpoints
- POST /api/auth/login
- POST /api/auth/register
- GET  /api/auth/me
- POST /api/auth/logout

## Test flow
1. Login as employee -> submit an expense with a receipt image (base64) -> AI processes it
2. Login as manager -> approve/reject
3. Login as finance -> verify + pay
4. Login as admin -> view analytics