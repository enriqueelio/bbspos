const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.$connect().then(() => {
  return p.$`SELECT column_name FROM information_schema.columns WHERE table_name='User'`;
}).then(columns => {
  console.log('Columnas User:', columns);
  p.$disconnect();
}).catch(e => {
  console.error(e);
  p.$disconnect();
  process.exit(1);
});