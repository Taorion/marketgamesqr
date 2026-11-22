const fs=require('node:fs'),path=require('node:path');
const config=JSON.parse(fs.readFileSync(process.argv[2]||path.join(__dirname,'../docs/qori-play/costs.example.json'),'utf8'));
for(const value of Object.values(config))if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error('All inputs must be finite non-negative numbers');
const player=config.screens*config.hours_per_day*3600*config.days*config.snapshots_per_second*config.snapshot_bytes/1e9;
const controllers=config.sessions*config.session_seconds*config.snapshots_per_second*config.snapshot_bytes/1e9;
const storage=config.sessions*config.stored_bytes_per_session/1e9;
const total=config.compute+config.database+config.observability+config.support+(player+controllers)*config.egress_per_gb+storage*config.storage_per_gb_month;
console.log(JSON.stringify({estimate_only:true,prices_supplied:total>0,player_gb:player,controller_gb:controllers,storage_gb:storage,total,per_screen:config.screens?total/config.screens:null,per_session:config.sessions?total/config.sessions:null,excludes:['TLS/HTTP overhead','assets','indexes/WAL/backups','taxes','reward funding']},null,2));
