import fs from 'node:fs';
import {Simulation,benchmarkInput} from '../shared/simulation.js';
const root=new URL('../',import.meta.url),rules=JSON.parse(fs.readFileSync(new URL('shared/rules.json',root))),cases=[];
for(let difficulty=0;difficulty<3;difficulty++){
 const s=new Simulation(rules,difficulty);s.start();const samples=[];
 for(let tick=1;tick<=10801;tick++){s.step(rules.fixedStep,benchmarkInput(s));if(tick%1200===0||tick===10801)samples.push({tick,...s.snapshot()});}
 cases.push({difficulty,samples});
}
const result=JSON.stringify({seed:rules.seed,cases},null,2);
fs.writeFileSync(new URL('verification/simulation-conformance.json',root),result);
fs.writeFileSync(new URL('unity/Assets/Editor/simulation-conformance.json',root),result);
console.log('30 checkpoints prepared for native C# conformance validation');
