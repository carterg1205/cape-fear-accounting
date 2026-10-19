// Generates SQL locally; does not contact any service. Feed the SQL to Wrangler.
import { randomBytes, pbkdf2Sync, randomUUID } from 'node:crypto';
const [email,name,role='student']=process.argv.slice(2);
const pass=process.env.CFO_PASSPHRASE;
if(!email||!name||!['student','instructor','owner'].includes(role)||!pass||pass.length<16)throw Error('Usage: CFO_PASSPHRASE=<unique 16+ character secret> node scripts/provision-user.mjs email "Full Name" student|instructor|owner');
const salt=randomBytes(24).toString('hex'),hash=pbkdf2Sync(pass,salt,100000,32,'sha256').toString('hex'),id=randomUUID();
const q=s=>"'"+s.replaceAll("'","''")+"'";
console.log(`INSERT INTO users(id,name,email,role,salt,password_hash) VALUES(${[id,name,email.toLowerCase(),role,salt,hash].map(q).join(',')});`);
console.log(`INSERT INTO enrollments VALUES(${q(id)},'acg201');`);
if(role==='instructor')console.log(`UPDATE sections SET instructor_id=${q(id)} WHERE id='acg201';`);
