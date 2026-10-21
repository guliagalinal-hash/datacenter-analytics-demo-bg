/* Read-only presentation adapter. No transport, credentials, scraper or import schema.
   A source-specific `adapt` must be written from an actual export before configuring `read`.
   All field names below belong to the existing dashboard view model, not a Sheets contract. */
window.DataCenterColocation=(()=>{
 const registry=[];
 const groups=[{id:'unit',label:'1U',format:'1U'},{id:'half',label:"Половин сървърен шкаф",format:"Половин сървърен шкаф"},{id:'rack',label:"Цял сървърен шкаф",format:"Цял сървърен шкаф"}];
 const states=["Очаква проверка","Няма данни","Публично обявена цена","Необходимо е уточнение","Цена при запитване","Не е посочено",'BLOCKED',"Продажбите са временно преустановени","Услугата не се предлага"];
 const dateKey=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value))return null;const day=value.slice(0,10);return !isNaN(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day?day:null};
 const url=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};
 const reference=v=>typeof v==='string'&&/^model:[a-z0-9-]+\/\d{4}-\d{2}-\d{2}$/.test(v)?v:url(v);
 const known=v=>v!==null&&v!==undefined&&v!=='';
 const conditionFields=['capacity','location','power','traffic','ip','vat','setupFee','extras','connection','payment'];
 const comparableKey=o=>o.comparisonEligible!==false&&o.confirmed&&o.status==="Публично обявена цена"&&o.price>0&&o.sourceUrl&&o.observedAt&&o.groupId&&o.unit&&o.currency&&conditionFields.every(k=>known(o[k]))?JSON.stringify([o.groupId,o.unit,o.currency,...conditionFields.map(k=>o[k])]):null;
 // Priority policy: sales pause creates a capacity opportunity; other observed changes need review.
 const priorityRules={price:"Среден",new:"Среден",conditions:"Среден",pause:"Висок"};
 const amount=v=>new Intl.NumberFormat("bg-BG").format(v),deltaLabel=v=>(v>0?'+':'')+v.toFixed(1).replace('.',',')+'%';
 function range(days,end){const start=new Date(end+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-days+1);const previousEnd=new Date(start);previousEnd.setUTCDate(previousEnd.getUTCDate()-1);const previousStart=new Date(start);previousStart.setUTCDate(previousStart.getUTCDate()-days);return {start:start.toISOString().slice(0,10),end,previousStart:previousStart.toISOString().slice(0,10),previousEnd:previousEnd.toISOString().slice(0,10)}}
 class ReadOnlyProvider {
   constructor({read=null,adapt=null,clock=()=>new Date()}={}){if(read&&typeof adapt!=='function')throw Error("Източникът изисква адаптер за действително експортираните данни");this.read=read;this.adapt=adapt;this.clock=clock}
   async getDashboard({days=30}={}){
     if(![7,30,90].includes(days))throw Error("Неподдържан период");
     const end=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit'}).format(this.clock());const bounds=range(days,end);
     let draft=null,sourceState=this.read?"Очаква зареждане":"Не е свързан",error=null;
     if(this.read){try{const raw=await this.read({days,...bounds});if(raw!=null){draft=await this.adapt(raw);if(!draft||!Array.isArray(draft.observations)||!Array.isArray(draft.checks))throw Error("Източникът не съдържа проверими наблюдения");sourceState="Данните са заредени"}}catch{error="Източникът не може да бъде прочетен. Актуалните данни не са потвърдени";draft=null}}
     const companies=draft&&Array.isArray(draft.registry)?draft.registry.filter(r=>r&&typeof r.id==='string'&&typeof r.company==='string'&&r.company.trim()):registry;
     const groups=draft?.groups||window.DataCenterScenario?.groups||[]; const names=new Set(companies.map(r=>r.company));
     const observations=(draft?.observations||[]).filter(o=>o&&o.confirmed===true&&typeof o.id==='string'&&names.has(o.company)&&reference(o.sourceUrl)&&dateKey(o.observedAt)&&dateKey(o.observedAt)<=end).map(o=>({...o,company:o.company,sourceUrl:reference(o.sourceUrl),source:reference(o.sourceUrl),observedAt:o.observedAt,groupId:groups.some(g=>g.id===o.groupId)?o.groupId:null,format:groups.find(g=>g.id===o.groupId)?.format||null,status:states.includes(o.status)?o.status:"Няма данни",price:o.status==="Публично обявена цена"&&typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>0?o.price:null})).sort((a,b)=>a.observedAt.localeCompare(b.observedAt));
     const unique=new Map();observations.forEach(o=>unique.set(o.id+'|'+o.observedAt,o));const history=[...unique.values()];
     const checks=(draft?.checks||[]).filter(c=>c&&c.confirmed===true&&names.has(c.company)&&reference(c.sourceUrl)&&dateKey(c.observedAt)&&dateKey(c.observedAt)<=end);
     const latest=new Map();history.forEach(o=>latest.set(o.id,o));
     const offers=[...latest.values()];companies.filter(r=>!offers.some(o=>o.company===r.company)).forEach(r=>offers.push({id:r.id,company:r.company,code:r.code??null,origin:r.origin??null,groupId:null,format:null,price:null,unit:null,conditions:null,connection:null,status:"Очаква проверка",observedAt:null,source:null,sourceUrl:null,confirmed:false}));
     const allEvents=[],priorById=new Map();
     for(const o of history){const p=priorById.get(o.id);priorById.set(o.id,o);if(!p||p.observedAt===o.observedAt||[p.status,o.status].some(s=>['BLOCKED',"Няма данни","Очаква проверка"].includes(s)))continue;
       let type=null,title=null;
       if(p.status==="Услугата не се предлага"&&["Публично обявена цена","Цена при запитване","Не е посочено"].includes(o.status)){type='new';title="Установено е ново предложение"}
       else if(p.status!==o.status&&o.status==="Продажбите са временно преустановени"){type='pause';title="Продажбите са временно преустановени"}
       else if(p.status!==o.status){type='conditions';title="Статусът на предложението е променен"}
       else if(comparableKey(p)&&comparableKey(p)===comparableKey(o)&&p.price!==o.price){type='price';title="Потвърдената цена е променена"}
       else if(conditionFields.some(k=>known(p[k])&&known(o[k])&&JSON.stringify(p[k])!==JSON.stringify(o[k]))){type='conditions';title="Потвърдените условия са променени"}
       if(type){
         const deltaRub=type==='price'?o.price-p.price:null,deltaPercent=type==='price'?deltaRub/p.price*100:null;
         if(type==='price')title="Тарифа "+o.format+' '+(deltaRub>0?"е увеличена":"е намалена")+': '+amount(p.price)+' → '+amount(o.price)+' ₽/мес. ('+deltaLabel(deltaPercent)+')';
         if(type==='new')title="Ново предложение: "+o.format;
         if(type==='pause')title="Временно преустановени продажби: "+o.format;
         allEvents.push({id:o.id+'|'+o.observedAt,offerId:o.id,company:o.company,format:o.format,groupId:o.groupId,date:dateKey(o.observedAt),observedAt:o.observedAt,previousObservedAt:p.observedAt,type,title,label:{new:"Нова услуга",pause:"Временно преустановяване на продажбите",price:'Цена',conditions:'Условия'}[type],priority:priorityRules[type],deltaRub,deltaPercent,source:o.sourceUrl,previousStatus:p.status,currentStatus:o.status,reason:o.changeReason||null,previousObservationId:p.observationId,observationId:o.observationId,from:type==='price'?p.price:null,to:type==='price'?o.price:null});
       }
     }
     const within=(r,a,b)=>dateKey(r.observedAt||r.date)>=a&&dateKey(r.observedAt||r.date)<=b;
     const periodChecks=checks.filter(c=>within(c,bounds.start,end)),periodObservations=history.filter(o=>within(o,bounds.start,end));
     const events=allEvents.filter(e=>within(e,bounds.start,end)).sort((a,b)=>b.observedAt.localeCompare(a.observedAt));
     const summarize=(a,b)=>{const completed=[...checks,...history].filter(c=>within(c,a,b)),obs=history.filter(o=>within(o,a,b));const es=allEvents.filter(e=>within(e,a,b));const usable=o=>!['BLOCKED',"Няма данни","Очаква проверка"].includes(o.status);const hasPairs=obs.some(o=>usable(o)&&history.some(p=>p.id===o.id&&p.observedAt<o.observedAt&&usable(p)));return {monitored:completed.length?new Set(completed.map(c=>c.company)).size:null,changes:hasPairs?es.length:null,newOffers:hasPairs?es.filter(e=>e.type==='new').length:null,important:hasPairs?es.filter(e=>e.priority==="Висок").length:null}};
     const timelines=new Map();periodObservations.forEach(o=>{const day=dateKey(o.observedAt);if(!timelines.has(day))timelines.set(day,{date:day,prices:{}});if(comparableKey(o))timelines.get(day).prices[o.id]=o.price});
     const nextActions={price:["Преразгледайте ценовото позициониране","Сравнете новата такса и конфигурацията със собственото си предложение; вземете предвид ДДС и еднократните плащания."],new:["Проучете новия формат на колокация","Проверете мощността, включените ресурси и целевия сегмент на новото предложение."],pause:["Проверете търсенето на свободен капацитет","Съпоставете собствения си свободен капацитет със сегмента на предложението с временно преустановени продажби."],conditions:["Проверете отново условията за сравнение","Уточнете променените условия, преди да използвате тарифата за ценово сравнение."]};
     const recommendations=events.map(e=>({eventId:e.id,offerId:e.offerId,title:nextActions[e.type][0],reason:e.company+' · '+e.title,action:nextActions[e.type][1],priority:e.priority,status:"За разглеждане"}));
     const latestCheck=[...checks,...history].sort((a,b)=>b.observedAt.localeCompare(a.observedAt))[0]?.observedAt||null;
     return {verifiedAt:draft?.checkedAt||null,originalObservedAt:draft?.originalObservedAt||null,release:draft?.release||null,marketModel:draft?.marketModel||null,registry:companies,groups,states,offers,observations:history,checks,events,allEvents,recommendations,timeline:[...timelines.values()],current:summarize(bounds.start,end),previous:summarize(bounds.previousStart,bounds.previousEnd),...bounds,sourceState,error,latestCheck,registryCount:companies.length,companiesWithResults:new Set(history.map(o=>o.company)).size,importSource:draft?.source||null,importAudit:draft?.audit||null,importRows:draft?.monitoringRows||[],sourcePages:draft?.sourcePages||[],hasPeriodChecks:periodChecks.length>0||periodObservations.length>0};
   }
 }
 return {provider:new ReadOnlyProvider(),ReadOnlyProvider,comparableKey,safeUrl:url,priorityRules};
})();
