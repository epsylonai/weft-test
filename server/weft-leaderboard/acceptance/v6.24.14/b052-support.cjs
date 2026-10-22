'use strict';
const fs=require('node:fs'),path=require('node:path'),{buildSync}=require('esbuild'),root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);const m={exports:{}};new Function('module','exports','require',buildSync({entryPoints:[path.resolve(root,file)],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'}).outputFiles[0].text)(m,m.exports,require);cache.set(file,m.exports);return m.exports;}
const e=load('../../B-004/engine/index.ts'),api=load('src/run.ts'),ctrl=load('src/run-controller.ts'),score=load('src/score-config.ts'),world=load('src/world-config.ts'),wire=load('src/leaderboard-wire.ts'),online=load('src/leaderboard-online-proof.ts'),DATE='2026-10-22T09:00:00.000Z';
function setup(options={}){return ctrl.createRunController({date:()=>DATE,delay:async()=>{},allowHugo:()=>false,allowWindow:()=>false,playMode:()=> 'classic',loader:()=>{throw Error('Endless descriptor must use shared canonical generation');},...options});}
const proof=c=>api.generateRunBoard(c.get().board.state.rules,c.get().board.descriptor),play=(c,line)=>line.forEach(m=>c.commit(m)),clone=x=>JSON.parse(JSON.stringify(x));
function greedy(c,choice=0){while(c.get().board.state.terminal==='active'){const s=c.get().board.state,legal=e.legalMoves(s);c.commit(s.spoolIndex<s.spool.length?{type:'draw'}:{type:'play',position:legal[choice%legal.length]});}}
const write=(f,x)=>{fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true});fs.writeFileSync(path.join(root,f),JSON.stringify(x,null,2)+'\n');};
module.exports={fs,path,root,load,e,api,ctrl,score,world,wire,online,DATE,setup,proof,play,clone,greedy,write};
