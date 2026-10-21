window.DataCenterColocation.provider=new DataCenterColocation.ReadOnlyProvider({read:async()=>DataCenterScenario,adapt:value=>value,clock:()=>new Date(DataCenterScenario.referenceDate)});
window.DataCenterLocalColocation={ready:Promise.resolve()};
