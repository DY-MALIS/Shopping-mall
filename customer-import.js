(function(root){
  'use strict';
  const MAX_ROWS = 2000;
  const digits = value => String(value == null ? '' : value).replace(/[០-៩]/g, c => String(c.charCodeAt(0)-0x17e0));
  const clean = value => String(value == null ? '' : value).replace(/^\uFEFF/, '').trim();
  const key = value => clean(value).normalize('NFC').replace(/\s+/g,' ').toLowerCase();
  const nameHeaders = ['name','customer','customer name','full name','ឈ្មោះ','ឈ្មោះអតិថិជន','អតិថិជន'];
  const phoneHeaders = ['phone','phone number','telephone','mobile','tel','លេខទូរស័ព្ទ','ទូរស័ព្ទ'];
  const isPhone = value => /^\+?[\d\s().-]{6,24}$/.test(digits(value)) && digits(value).replace(/\D/g,'').length >= 6;
  function csv(text, separator){
    const rows=[]; let row=[], cell='', quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){
        if(quoted && text[i+1]==='"'){cell+='"';i++;}
        else if(quoted || !cell) quoted=!quoted;
        else cell+=c;
      }else if(!quoted && (c===separator || c==='\n' || c==='\r')){
        row.push(cell);cell='';
        if(c!==separator){rows.push(row);row=[];if(c==='\r' && text[i+1]==='\n')i++;}
      }else cell+=c;
    }
    if(quoted) throw Error('CSV មានសញ្ញា " មិនគ្រប់គូ។ សូមពិនិត្យឯកសារ។');
    if(cell || row.length){row.push(cell);rows.push(row);}
    return rows;
  }
  function rowsToCustomers(rows){
    const result=[]; let nameColumn=0,phoneColumn=-1,header=false;
    for(const raw of rows){
      const row=raw.map(clean); if(!row.some(Boolean))continue;
      const ni=row.findIndex(c=>nameHeaders.includes(key(c)));
      const pi=row.findIndex(c=>phoneHeaders.includes(key(c)));
      if(ni>=0){nameColumn=ni;phoneColumn=pi;header=row.length>1;continue;}
      if(row.length===1 && phoneHeaders.includes(key(row[0])))continue;
      let name=row[nameColumn]||'',phone=phoneColumn>=0?(row[phoneColumn]||''):'';
      if(!header){
        const cells=row.filter(Boolean);
        if(cells.length>1 && /^\d+$/.test(digits(cells[0])))cells.shift();
        name=cells[0]||'';phone=cells.slice(1).find(isPhone)||'';
        if(cells.length===1){
          if(isPhone(name)){
            if(result.length && !result[result.length-1].phone)result[result.length-1].phone=digits(name);
            continue;
          }
          const match=digits(name).match(/^(.*?)\s+(\+?\d[\d ().-]{5,23})$/);
          if(match && isPhone(match[2])){name=name.slice(0,match[1].length);phone=match[2];}
          name=name.replace(/^\s*[\d០-៩]+[.)、]\s*/, '').replace(/^[•●▪]\s*/, '');
        }
      }
      name=clean(name);phone=digits(clean(phone));
      if(!name || !/[\p{L}]/u.test(name))continue;
      result.push({name,phone});
      if(result.length>MAX_ROWS)throw Error('សូមនាំចូលមិនលើស ២០០០ នាក់ក្នុងមួយលើក។');
    }
    return result;
  }
  function textToCustomers(text){
    const first=text.split(/\r?\n/).find(line=>line.trim())||'';
    const separator=['\t',',',';'].find(s=>first.includes(s));
    return rowsToCustomers(separator?csv(text,separator):text.split(/\r?\n/).map(line=>[line]));
  }
  function unique(rows, existing){
    const seen=new Set(existing.map(c=>key(c.name)));let skipped=0;
    const added=[];
    for(const c of rows){
      if(!clean(c.name))continue;
      const k=key(c.name);
      if(seen.has(k)){skipped++;continue;}
      seen.add(k);added.push({name:clean(c.name),phone:digits(clean(c.phone))});
    }
    return {added,skipped};
  }
  const loads={};
  function script(url, globalName){
    if(root[globalName])return Promise.resolve(root[globalName]);
    if(!loads[url])loads[url]=new Promise((resolve,reject)=>{
      const el=document.createElement('script');el.src=url;
      const timer=setTimeout(()=>{el.remove();delete loads[url];reject(Error('ការទាញយកកម្មវិធីអានឯកសារយឺតពេក។ សូមពិនិត្យអ៊ីនធឺណិត ហើយសាកល្បងម្ដងទៀត។'));},20000);
      el.onload=()=>{clearTimeout(timer);resolve(root[globalName]);};
      el.onerror=()=>{clearTimeout(timer);delete loads[url];el.remove();reject(Error('មិនអាចទាញយកកម្មវិធីអានឯកសារ។ សូមពិនិត្យអ៊ីនធឺណិត។'));};
      document.head.appendChild(el);
    });
    return loads[url];
  }
  async function read(file){
    if(!file || file.size>10*1024*1024)throw Error('សូមជ្រើសឯកសារទំហំមិនលើស 10 MB។');
    const ext=file.name.split('.').pop().toLowerCase();let rows;
    if(['txt','csv','tsv'].includes(ext))rows=textToCustomers(await file.text());
    else if(ext==='docx'){
      const mammoth=await script('https://cdn.jsdelivr.net/npm/mammoth@1.10.0/mammoth.browser.min.js','mammoth');
      const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
      rows=textToCustomers(result.value);
    }else if(['xlsx','xls'].includes(ext)){
      const XLSX=await script('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js','XLSX');
      const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});rows=[];
      for(const name of workbook.SheetNames){
        rows.push(...rowsToCustomers(XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,raw:false,defval:''})));
        if(rows.length>MAX_ROWS)throw Error('សូមនាំចូលមិនលើស ២០០០ នាក់ក្នុងមួយលើក។');
      }
    }else if(ext==='pdf'){
      const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs';
      const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
      let text='';
      try{
        const pdf=await task.promise;
        if(pdf.numPages>100)throw Error('PDF ត្រូវមានមិនលើស ១០០ ទំព័រ។');
        for(let p=1;p<=pdf.numPages;p++){
          const page=await pdf.getPage(p),content=await page.getTextContent();let lastY=null;
          for(const item of content.items){
            if(!('str' in item))continue;
            const y=item.transform[5];
            if(lastY!==null && Math.abs(y-lastY)>3)text+='\n';
            text+=item.str+' ';lastY=y;
            if(item.hasEOL){text+='\n';lastY=null;}
          }
          text+='\n';page.cleanup();
        }
      }finally{await task.destroy();}
      rows=textToCustomers(text);
      if(!rows.length)throw Error('PDF នេះមិនមានអក្សរដែលអាចអានបាន។ បើជារូបស្កេន សូមបម្លែងដោយ OCR ឬប្រើ Word/Excel/TXT ជំនួស។');
    }else throw Error('គាំទ្រ DOCX, PDF, XLSX, XLS, CSV, TSV និង TXT។ សម្រាប់ Word .doc ចាស់ សូម Save As ជា .docx។');
    if(!rows.length)throw Error('រកមិនឃើញឈ្មោះអតិថិជនទេ។ សូមរៀបចំមួយឈ្មោះក្នុងមួយបន្ទាត់ ឬប្រើតារាងឈ្មោះ និងទូរស័ព្ទ។');
    return rows;
  }
  const api={read,textToCustomers,rowsToCustomers,unique,csv};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  else root.CustomerImport=api;
})(typeof window==='undefined'?globalThis:window);
