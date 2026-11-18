// Recent poses come exclusively from replayed controls, never from the visual
// WebSocket channel. Compare the same simulation tick on both participants.
function record(member) {
  const s=member.state,p=s.player;
  const pose={tick:s.tick,x:p.x,y:p.y,face:p.face,swing:s.tick<s.hammerUntil?s.hammerUntil-18:0,
    protected:s.tick<s.hitUntil||s.tick<s.rivalHitUntil,stunned:s.tick<s.stunUntil,lives:s.lives,done:s.done};
  s.combatHistory ||= [];
  s.combatHistory.push(pose);
  if(s.combatHistory.length>90)s.combatHistory.shift();
  return pose;
}
function resolve(room,member,members,now,events) {
  const pose=record(member),wallTick=Math.floor((now-new Date(room.starts_at).getTime())*.06);
  if(wallTick-pose.tick>60)return; // Late reconnects cannot land retroactive blows.
  function strike(attacker,a,target,b) {
    const targetState=target.state;
    if(!a.swing||a.done||a.stunned||b.done||b.protected||attacker.state.done||targetState.done)return;
    const distance=(b.x-a.x)*a.face;
    if(distance<0||distance>55||Math.abs(a.y-b.y)>31)return;
    if(targetState.lives!==b.lives||targetState.tick<targetState.hitUntil)return;
    const id=attacker.participant_id+':'+a.swing+':'+target.participant_id;
    const impacts=targetState.impacts;
    if(impacts.some(impact=>impact.id===id))return;
    const tick=Math.max(pose.tick,targetState.tick)+1;
    if(tick<targetState.rivalHitUntil||impacts.some(impact=>tick<impact.tick+45))return;
    const impact={id,tick,direction:a.face,attacker_id:attacker.participant_id,target_id:target.participant_id};
    impacts.push(impact);events.push(impact);
  }
  for(const other of members) {
    if(other===member)continue;
    const peer=other.state.combatHistory?.find(p=>p.tick===pose.tick);
    if(!peer)continue;
    strike(member,pose,other,peer);
    strike(other,peer,member,pose);
  }
}
module.exports={resolve};
