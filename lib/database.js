const { neon } = require('@neondatabase/serverless');
function connectionString(){if(process.env.DATABASE_URL)return process.env.DATABASE_URL;const p=process.env;if(p.DATABASE_PGHOST&&p.DATABASE_PGUSER&&p.DATABASE_PGPASSWORD&&p.DATABASE_PGDATABASE){return `postgresql://${encodeURIComponent(p.DATABASE_PGUSER)}:${encodeURIComponent(p.DATABASE_PGPASSWORD)}@${p.DATABASE_PGHOST}${p.DATABASE_PGPORT?':'+p.DATABASE_PGPORT:''}/${p.DATABASE_PGDATABASE}?sslmode=require`}throw new Error('Configure DATABASE_URL or the DATABASE_PG* Neon variables')}
function db(){return neon(connectionString())}
module.exports={db};
