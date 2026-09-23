const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
let source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(source);
source = source.replace(/\}\)\(\);\s*$/, `globalThis.app = {
  state:()=>({products,transactions,cart,stockMovements,suppliers,manualCustomers,invoiceSeq}),
  addToCart,checkoutCart,deleteProduct,renderAll,renderCart,readNumber,escapeHtml,
  processScanStockCode,processSellStockCode,updatePreview
};})();`);
function boot(storage = new Map()) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: id === 'rangeSelect' ? '7' : '', innerHTML:'', textContent:'', style:{}, dataset:{}, handlers:{}, children:[],
      classList:{add(){},remove(){},toggle(){}},
      addEventListener(type, fn){this.handlers[type]=fn;},
      querySelector(){return element('child');},querySelectorAll(){return [];},
      setAttribute(){},removeAttribute(){},appendChild(child){this.children.push(child);},
      setCustomValidity(msg){this.validationMessage=msg;},reportValidity(){},reset(){},focus(){},remove(){}
    });
    return elements.get(id);
  }
  const context = {document:{getElementById:element,querySelector:element,querySelectorAll:()=>[],
    documentElement:element('root'),addEventListener(){},createElement:()=>element('toast')},
    window:{addEventListener(){},scrollTo(){}},navigator:{},setTimeout(){},clearTimeout(){},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console};
  vm.createContext(context);vm.runInContext(source,context);
  return {app:context.app,el:element,storage,submit:id=>element(id).handlers.submit({preventDefault(){}})};
}
const fresh=boot();
for(const key of ['products','transactions','cart','stockMovements','suppliers','manualCustomers']) assert.equal(fresh.app.state()[key].length,0,key);
assert.equal(fresh.app.state().invoiceSeq,1);
const old=new Map([['shop_data_v1',JSON.stringify({version:1,products:[{name:'Old item'}]})]]);
const reset=boot(old);assert.equal(reset.app.state().products.length,0);
assert.equal(JSON.parse(old.get('shop_data_v1')).version,2);
const a=boot();
for(let i=1;i<=9;i++) a.app.state().products.push({id:'p'+i,name:'Test '+i,cat:'Test',supplier:'',stock:10,reorder:2,price:2,sold30:0,barcode:i===1?'8801234500017':'test-'+i,expiry:null,promoPercent:0});
for(let i=1;i<=4;i++) a.app.state().suppliers.push({id:'s'+i,name:'Supplier '+i,contact:'',phone:'',category:''});
assert.equal(a.app.state().products.length,9);
for(const [id,value] of Object.entries({pfName:'New product',pfCat:'__proto__',pfStock:'abc',pfReorder:'2',pfPrice:'1.25',pfPromo:'0',pfBarcode:'test-barcode'})) a.el(id).value=value;
a.submit('productForm');assert.equal(a.app.state().products.length,9);
a.el('pfStock').value='១០';a.el('pfBarcode').value='8801234500017';
a.submit('productForm');assert.equal(a.app.state().products.length,9);
a.el('pfBarcode').value='test-barcode';a.submit('productForm');
assert.equal(a.app.state().products.length,10);
assert.equal(a.app.state().products[9].stock,10);
a.el('sfName').value='Supplier';a.el('sfContact').value='Contact';a.el('sfPhone').value='123';a.el('sfCategory').value='Category';
a.submit('supplierForm');assert.equal(boot(a.storage).app.state().suppliers.length,5);
for (const bad of ['abc','12abc','-1','1.5','Infinity','1e309','']) {
  a.el('saleQty').value=bad;
  assert.equal(a.app.readNumber('saleQty',1,100,true),null,bad);
}
a.el('saleQty').value='១២';assert.equal(a.app.readNumber('saleQty',1,100,true),12);
a.app.addToCart('p1');a.app.addToCart('p1');
a.app.state().products[0].stock=1;
let count=a.app.state().transactions.length;
a.app.checkoutCart();assert.equal(a.app.state().transactions.length,count);
a.el('posStatus').value='paid';a.app.state().products[0].stock=2;
a.app.checkoutCart();assert.equal(a.app.state().transactions.length,count+1);
assert.equal(a.app.state().products[0].stock,0);
a.el('saleProduct').value='p1';a.el('saleQty').value='8';a.el('saleStatus').value='paid';
a.submit('saleForm');assert.equal(a.app.state().transactions.length,count+1);
a.el('scanStockQty').value='៣';a.app.processScanStockCode('8801234500017');
assert.equal(a.app.state().products[0].stock,3);
a.el('sellStockQty').value='4';a.app.processSellStockCode('8801234500017');
assert.equal(a.app.state().products[0].stock,3);
a.el('saleQty').value='2';a.submit('saleForm');assert.equal(a.app.state().products[0].stock,1);
const attack='"><img src=x onerror=alert(1)>';
a.app.state().products[0].name=attack;
a.el('cfName').value=attack;a.el('cfPhone').value=attack;a.submit('customerForm');
a.app.renderAll();
for(const id of ['invBody','posGrid','catalogGrid','custBody','customerNames']) {
  assert.ok(!a.el(id).innerHTML.includes('<img'),id);
  assert.ok(a.el(id).innerHTML.includes('&lt;img'),id);
}
a.app.addToCart('p1');
const b=boot(a.storage);
assert.equal(b.app.state().products[0].name,attack);
assert.equal(b.app.state().products[0].stock,1);
assert.equal(b.app.state().cart.length,1);
assert.equal(b.app.state().transactions.length,count+2);
assert.equal(typeof b.app.state().transactions[0].time.getTime,'function');
assert.equal(typeof b.app.state().stockMovements[0].time.getTime,'function');
assert.equal(b.app.state().manualCustomers[0].phone,attack);
for(const p of [...b.app.state().products]) b.app.deleteProduct(p.id);
assert.equal(b.app.state().cart.length,0);b.app.updatePreview();
assert.equal(boot(b.storage).app.state().products.length,0);
const broken=new Map([['shop_data_v1','{broken']]);boot(broken);
assert.equal(broken.get('shop_data_v1'),'{broken');
const fullStorage=new Map();fullStorage.set=()=>{throw Error('Quota exceeded');};
const full=boot(fullStorage);assert.ok(full.el('toastWrap').children.length>0);
console.log('PASS: startup, numeric validation, Khmer digits, stock checks, sales, escaping, reload, dates, cart, empty inventory, corrupt storage');
