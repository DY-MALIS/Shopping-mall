const assert=require('node:assert/strict');
const api=require('../customer-import.js');
assert.deepEqual(api.textToCustomers('ឈ្មោះ,លេខទូរស័ព្ទ\nសុខ សាន,០១២៣៤៥៦៧៨\n"Chan, Dara",012999888'),[
  {name:'សុខ សាន',phone:'012345678'},{name:'Chan, Dara',phone:'012999888'}]);
assert.deepEqual(api.textToCustomers('1. Sok San 012 345 678\n2. Chan Dara'),[
  {name:'Sok San',phone:'012 345 678'},{name:'Chan Dara',phone:''}]);
assert.deepEqual(api.textToCustomers('Name\n\nPhone\n\nSok San\n\n012345678'),[{name:'Sok San',phone:'012345678'}]);
assert.deepEqual(api.rowsToCustomers([['No','Phone','Name'],['1','012345678','Sok']]),[{name:'Sok',phone:'012345678'}]);
assert.deepEqual(api.textToCustomers('Name;Phone\r\nSok;012345678'),[{name:'Sok',phone:'012345678'}]);
assert.equal(api.unique([{name:' Sok   San ',phone:''},{name:'Other',phone:'០១២'},{name:'Other',phone:'999'}],[{name:'sok san'}]).skipped,2);
assert.equal(api.unique([{name:'<img onerror=alert(1)>',phone:''}],[]).added[0].name,'<img onerror=alert(1)>');
assert.throws(()=>api.csv('"broken',','));
assert.throws(()=>api.rowsToCustomers(Array.from({length:2001},()=>['Name A'])));
assert.deepEqual(api.textToCustomers(''),[]);
(async()=>{
  await assert.rejects(api.read({name:'a.doc',size:1}),/DOCX/);
  await assert.rejects(api.read({name:'a.txt',size:11*1024*1024}),/10 MB/);
  assert.deepEqual(await api.read({name:'a.txt',size:10,text:async()=> 'Sok San'}),[{name:'Sok San',phone:''}]);
  console.log('PASS customer import: Khmer, CSV quoting, headers, Word-style paragraphs, phone numbers, duplicates, limits, unsupported files');
})();
