curl -X POST '{backend_url}/auth/customer/emailpass' \
-H 'Content-Type: application/json' \
--data-raw '{
  "email": "customer@gmail.com",
  "password": "supersecret"
}'