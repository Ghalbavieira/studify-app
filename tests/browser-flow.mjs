import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const bin=process.env.AGENT_BROWSER_BIN;
if(!bin)throw new Error('Set AGENT_BROWSER_BIN to agent-browser.js');
const session='studify-flow';
const run=(...args)=>execFileSync(process.execPath,[bin,'--session',session,...args],{encoding:'utf8',timeout:60000});
const evaluate=code=>run('eval',code);
const text=()=>run('get','text','body');
const click=label=>run('find','role','button','click','--name',label,'--exact');
try{
 run('--init-script',resolve('tests/browser-mock.js'),'open','http://localhost:3000/login');
 run('find','label','E-mail','fill','fixture@example.test');run('find','label','Senha','fill','fixture-only-password');click('Entrar');run('wait','--url','**/dashboard');
 assert.match(text(),/Foco de hoje/i); console.log('PASS login fixture + Home');
 run('open','http://localhost:3000/estudos');run('wait','1000');click('Iniciar');run('wait','1200');click('Pausar');
 run('pushstate','/dashboard');run('wait','700');assert.match(text(),/Retomar sessão/);console.log('PASS timer + pause + navigation');
 run('open','http://localhost:3000/estudos');run('wait','700');assert.match(text(),/Continuar/);click('Finalizar');run('find','label','Questões fora do Studify','fill','20');run('find','label','Acertos','fill','11');click('Salvar sessão');run('wait','700');assert.match(text(),/Sessão registrada/);console.log('PASS restore + finish + save');
 click('Refazer sessão');run('wait','1200');click('Finalizar');click('Salvar sessão');run('wait','700');assert.match(evaluate('JSON.parse(sessionStorage.getItem("fixture.study")).data.sessions.length'),/2/);console.log('PASS retry preserves two sessions');
 for(const path of ['/dashboard','/materias','/plano','/revisoes','/analises','/edital','/questoes','/questoes/listas','/planos','/comunidade','/perfil','/configuracoes']){
  run('open',`http://localhost:3000${path}`);run('wait','700');assert.doesNotMatch(text(),/Application error|Runtime Error/);
  for(const [w,h]of [[390,844],[768,1024],[1440,1000]]){run('set','viewport',String(w),String(h));assert.match(evaluate('document.documentElement.scrollWidth <= innerWidth'),/true/);}
  console.log(`PASS responsive ${path}`);
 }
 run('open','http://localhost:3000/planos');run('wait','500');assert.match(text(),/15 dias restantes/);evaluate('sessionStorage.setItem("fixture.plan","free")');run('reload');run('wait','700');assert.match(text(),/Seu plano: Free/);console.log('PASS trial and Free fixture states');
 run('open','http://localhost:3000/dashboard');run('wait','500');run('set','viewport','1440','1000');click('Sair');run('wait','--url','**/login');run('back');run('wait','700');assert.doesNotMatch(text(),/Concurso de teste/);console.log('PASS logout + back hides private data');
 console.log(run('errors'));
}finally{run('close');}
