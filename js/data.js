/* Provider contract: getDashboard({days}) -> Promise<DashboardData>.
   Replace SnapshotProvider with an Apps Script adapter when a real endpoint is approved. */
window.DataCenterData = (() => {
  const plural=new Intl.PluralRules("bg-BG");
  const word=(n,forms)=>forms[{one:0,few:1,many:2,other:2}[plural.select(Math.abs(n))]];
  const count=(n,forms)=>new Intl.NumberFormat("bg-BG").format(n)+' '+word(n,forms);
  const channels = [
    {name:"Органично търсене",color:'#0558a4',visits:18420,leads:552,change:14.8},
    {name:"Контекстна реклама",color:'#00a0e3',visits:12860,leads:489,change:8.2},
    {name:"Директни посещения",color:'#70b4d5',visits:9840,leads:187,change:5.6},
    {name:"Реферален трафик",color:'#95a8cd',visits:4120,leads:82,change:-3.1},
    {name:"Социални мрежи",color:'#c3d4e2',visits:3000,leads:38,change:12.4}
  ];
  function getSiteHealth(days,dates) {
    // Synthetic checks only; routes below illustrate service categories, not a live crawl.
    const intervalMinutes=5,checksPerDay=24*60/intervalMinutes;
    const history=Array.from({length:180},(_,i)=>({date:dates[i],checks:checksPerDay,failed:i===176?2:i===163?1:i%41===0?3:0,lcp:Number((3.8-i*.005+Math.sin(i*.5)*.16+(i===176?.7:0)).toFixed(2)),seo:i>=170?5:i>=140?6:8,formChecks:60,formFailed:i>=177?1:i%29===0?2:0})).map(r=>({...r,availability:(1-r.failed/r.checks)*100,downtimeMinutes:r.failed*intervalMinutes}));
    const current=history.slice(-days),previous=history.slice(-2*days,-days),sum=(rows,key)=>rows.reduce((s,r)=>s+r[key],0);
    const summarize=rows=>({availability:(1-sum(rows,'failed')/sum(rows,'checks'))*100,lcp:sum(rows,'lcp')/rows.length,seo:rows.at(-1).seo,formRate:(1-sum(rows,'formFailed')/sum(rows,'formChecks'))*100,checks:sum(rows,'checks'),failed:sum(rows,'failed'),downtimeMinutes:sum(rows,'downtimeMinutes'),formChecks:sum(rows,'formChecks'),formFailed:sum(rows,'formFailed')});
    const incident=history.filter(r=>r.failed>0).at(-1),incidentDate=new Date(incident.date+'T00:00:00Z').toLocaleDateString("bg-BG",{timeZone:'UTC'});
    const problems=[
      {id:'cloud-form',page:"Облачна инфраструктура",path:'/cloud/',problem:"Грешка при изпращане на формуляра в мобилен сценарий",severity:"Критична",impact:"Риск от загуба на запитвания за избор на облачна инфраструктура.",status:"В процес на работа",category:"Формуляри",action:"Проверете обработката на телефонния номер и отговора на сървъра в мобилния формуляр. След отстраняване на грешката повторете всичките 12 сценария.",evidence:"Последно изпълнение: 11 от 12 сценария са успешни; грешка при валидиране на телефонния номер на стъпката за изпращане."},
      {id:'mobile-lcp',page:"Колокация на оборудване",path:'/data-center/colocation/',problem:"Основното съдържание се появява бавно на мобилни устройства",severity:"Висока",impact:"Посетителят чака по-дълго за описанието на условията за колокация и изчисляването на цената.",status:"Планирано",category:"Скорост",action:"Определете LCP елемента, проверете зареждането на изображенията и блокиращите ресурси. След установяване на причината извършете оптимизация и повторете мобилното измерване.",evidence:"Последен мобилен LCP на страницата: 3,6 с. Графиката показва средната стойност за пет ключови страници."},
      {id:'seo-description',page:"Четири страници с услуги",path:'/cloud/ · /backup/ · /dedicated/ · /telecom/',problem:"Липсват метаописания на 4 страници",severity:"Средна",impact:"Описанията в резултатите от търсене може да представят по-неясно стойността на B2B услугите.",status:"Нова",category:'SEO',count:4,action:"Подгответе четири уникални метаописания с предназначението на услугата и предложение за консултация.",evidence:"В одита са установени 4 липсващи описания. Това са 4 от 5 текущи SEO грешки."},
      {id:'seo-title',page:"Резервно копиране",path:'/backup/',problem:"Title дублира заглавието на страницата за облачни услуги",severity:"Средна",impact:"За търсачките и клиентите е по-трудно да разграничат облачните услуги от резервното копиране.",status:"В процес на работа",category:'SEO',count:1,action:"Уточнете title на страницата за резервно копиране и проверете уникалността му.",evidence:"Един дублиран title в одита. Заедно с 4 липсващи метаописания — 5 SEO грешки."},
      {id:'availability',page:"Всички ключови страници",path:"HTTP контрол",problem:"Кратковременно прекъсване на достъпността на 13 октомври",severity:"Висока",impact:"По време на две проверки през пет минути част от посетителите може да не са успели да отворят уебсайта.",status:"Отстранена",category:"Достъпност",action:"Проверете причината за отговорите 5xx и запазете контрола на достъпността след промяната в конфигурацията.",evidence:incidentDate+': '+incident.failed+" неуспешни проверки от "+incident.checks+". Моделиран престой: "+incident.downtimeMinutes+" минути ("+intervalMinutes+" минути за неуспешна проверка), а не точна продължителност на инцидента. Инцидентът е отстранен."}
    ];
    const forms=[["Облачна инфраструктура",'/cloud/',"Избор на конфигурация",1,'cloud-form'],["Колокация на оборудване",'/data-center/colocation/',"Изчисляване на колокацията",0,null],["Самостоятелен физически сървър",'/dedicated/',"Запитване за сървър",0,null],["Свързаност за бизнеса",'/telecom/',"Проверка на свързаността",0,null],["Резервно копиране",'/backup/',"Получаване на консултация",0,null]].map(([page,path,label,failed,problemId],i)=>({id:'form-'+i,page,path,label,checks:12,passed:12-failed,failed,problemId,status:failed?"Има грешка":"Работи",time:'16.10.2026, 09:00 МСК',description:failed?"Мобилен сценарий: грешка при валидиране на телефонния номер при изпращане.":"Сценариите за валидиране, изпращане и показване на потвърждение са успешни на компютър и мобилно устройство.",action:failed?problems[0].action:"Продължете контрола на формуляра след публикуване на промените."}));
    return {intervalMinutes,checksPerDay,current:summarize(current),previous:summarize(previous),series:current,previousSeries:previous,problems,forms,checkedAt:'16.10.2026, 09:00 МСК',workingForms:forms.filter(f=>f.checks>0&&f.passed===f.checks).length,totalForms:forms.length};
  }
  class SnapshotProvider {
    async getDashboard({days=30}={}) {
      if(![7,30,90].includes(days)) throw new Error("Неподдържан период");
      // One deterministic 180-day ledger: every period and channel uses the same facts.
      const colocation=await window.DataCenterColocation.provider.getDashboard({days});
      const noise=(day,channel,salt=0)=>{let n=Math.imul(day+379,374761393)^Math.imul(channel+31,668265263)^Math.imul(salt+1,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296};
      const ledger=Array.from({length:180},(_,i)=>{
        const date=new Date(Date.UTC(2026,3,20+i));
        const weekday=[.82,1.04,1.08,1.05,1.02,.95,.85][date.getUTCDay()];
        const demand=.91+noise(i,9)*.18+(i===167?.13:i===158?-.12:0);
        const rows=channels.map((c,j)=>{
          const visits=Math.round(c.visits/30*(.88+i*.0011)*weekday*demand*(.91+noise(i,j)*.18));
          const leads=Math.round(visits*c.leads/c.visits*(.96+i*.00065)*(.83+noise(i,j,1)*.34));
          return {visits,leads};
        });
        return {date:date.toISOString().slice(0,10),rows,changes:colocation.allEvents.filter(e=>e.date===date.toISOString().slice(0,10)).length};
      });
      const current=ledger.slice(-days), prior=ledger.slice(-days*2,-days);
      const siteHealth=getSiteHealth(days,ledger.map(d=>d.date));
      const sum=(items,key)=>items.reduce((a,d)=>a+d.rows.reduce((s,r)=>s+r[key],0),0);
      const percent=(a,b)=>b?(a/b-1)*100:0;
      const rows=channels.map((c,j)=>{
        const total=(items,key)=>items.reduce((s,d)=>s+d.rows[j][key],0);
        const visits=total(current,'visits');
        return {...c,visits,leads:total(current,'leads'),previousVisits:total(prior,'visits'),previousLeads:total(prior,'leads'),change:Number(percent(visits,total(prior,'visits')).toFixed(1))};
      });
      const traffic=current.map(d=>sum([d],'visits')), leadSeries=current.map(d=>sum([d],'leads'));
      const visits=sum(current,'visits'),leads=sum(current,'leads'),previousVisits=sum(prior,'visits'),previousLeads=sum(prior,'leads');
      const conversion=leads/visits*100,previousConversion=previousLeads/previousVisits*100;
      const changes=colocation.current.changes,previousChanges=colocation.previous.changes;
      const best=rows.reduce((a,b)=>a.leads/a.visits>b.leads/b.visits?a:b);
      const overviewSignals=[
        {title:percent(leads,previousLeads)>percent(visits,previousVisits)&&percent(leads,previousLeads)>0?"Запитванията нарастват по-бързо от посещаемостта":"Запитвания: оценете промяната в търсенето",priority:percent(leads,previousLeads)<0?"Висок":"Среден",status:"За проверка",fact:count(leads,["запитване","запитвания","запитвания"])+" · запитвания "+(percent(leads,previousLeads)>0?'+':'')+percent(leads,previousLeads).toFixed(1).replace('.',',')+'% · посетители '+(percent(visits,previousVisits)>0?'+':'')+percent(visits,previousVisits).toFixed(1).replace('.',',')+"% спрямо предходните "+days+" дни",description:"Съпоставени са темповете на промяна на запитванията и аудиторията за равни периоди. Увеличеният брой не потвърждава качеството на потенциалните клиенти.",action:"Определете каналите и целевите страници, довели до ръст на запитванията, и проверете качеството на потенциалните клиенти."},
        {title:"Четири страници се нуждаят от SEO описания",priority:"Среден",status:"Планирано",fact:siteHealth.problems.find(p=>p.id==='seo-description').count+" липсващи метаописания",description:"Страниците с услуги може да представят по-неясно предложението в резултатите от търсене.",action:"Подгответе уникални описания и повторете проверката.",view:'health'},
        {view:'competitors',title:"Сравнение на предложенията за Colocation",priority:"Среден",status:"За сравнение",fact:colocation.registryCount+" компании · "+colocation.offers.filter(o=>o.confirmed).length+" варианта за колокация",description:"Минималната цена не обяснява разликите в конфигурацията и условията за плащане.",action:"Изберете еднакъв формат и ресурси, след което уточнете цената при операторите."},
        {title:"Канал с най-висока конверсия",priority:"Нисък",status:"Нова",fact:best.name+' · '+(best.leads/best.visits*100).toFixed(2).replace('.',',')+'%',description:"Конверсията на канала е отношението между броя запитвания и броя посетители. Показателят не отчита разходите за привличане и качеството на потенциалните клиенти.",action:"Проверете разходите и качеството на запитванията от контекстната реклама, преди да разширите рекламните кампании."}
      ].map((s,i)=>({...s,date:current.at(-1-i).date,time:new Date(current.at(-1-i).date+'T00:00:00Z').toLocaleDateString("bg-BG",{timeZone:'UTC'}),id:'overview-signal-'+i}));
      return {days,visits,leads,conversion,changes,previousVisits,previousLeads,previousConversion,previousChanges,deltas:[percent(visits,previousVisits),percent(leads,previousLeads),conversion-previousConversion,previousChanges===null?null:changes-previousChanges],channels:rows,competitors:[],events:colocation.events,actions:overviewSignals,overviewSignals,siteHealth,dates:current.map(d=>d.date),previousDates:prior.map(d=>d.date),traffic,leadSeries,conversionSeries:traffic.map((v,i)=>leadSeries[i]/v*100),changeSeries:current.map(d=>changes===null?null:d.changes),previous:prior.map(d=>sum([d],'visits')),previousLeadSeries:prior.map(d=>sum([d],'leads'))};
    }
  }
  return {provider:new SnapshotProvider(),word,count};
})();
