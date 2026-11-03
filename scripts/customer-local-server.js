process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='development';process.env.PORT='3051';
process.env.JWT_SECRET='local-customer-integration-only';process.env.PUBLIC_APP_URL='http://127.0.0.1:3051';
process.env.CORS_ORIGINS='http://localhost:8081,http://127.0.0.1:8081,http://localhost:3051,http://127.0.0.1:3051';
process.env.CUSTOMER_LOCAL_MAILBOX='true';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {app}=require('../backend/src/app');
app.listen(3051,'127.0.0.1',()=>console.log('Qori Customer local API: http://127.0.0.1:3051. OTP mailbox: .local-customer/mailbox.'));
