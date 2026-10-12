// يعمل فقط على Render: يبدّل مزود قاعدة البيانات إلى postgresql قبل البناء
// محلياً يبقى sqlite دون أي تغيير. (Render يستنسخ نسخة جديدة كل نشر، فالتعديل آمن)
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!schema.includes('provider = "sqlite"')) {
  console.log('prepare-postgres: provider is not sqlite, nothing to do');
  process.exit(0);
}

schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
fs.writeFileSync(schemaPath, schema);
console.log('prepare-postgres: provider switched to postgresql');
