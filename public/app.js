const $=s=>document.querySelector(s);
const date=$("#date"), content=$("#content"), loading=$("#loading"), why=$("#why");
function todayVN(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date())}
function vnDate(iso){return new Intl.DateTimeFormat("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(iso+"T12:00:00+07:00"))}
function tags(el,arr){el.innerHTML=arr.map(x=>`<span class="tag">${x}</span>`).join("")}
async function load(){
  loading.hidden=false;content.hidden=true;why.hidden=true;
  const r=await fetch("/api/day?date="+date.value); const d=await r.json();
  $("#solar").textContent=vnDate(d.date); $("#label").textContent=d.label;
  $("#dot").style.background=d.score>=72?"#5c8b68":d.score>=52?"#b29855":"#a9645e";
  $("#lunar").textContent=`Âm lịch: ${d.lunar.day}/${Math.abs(d.lunar.month)}/${d.lunar.year}`;
  $("#canchi").textContent=`Can Chi: ${d.canChi}`;
  tags($("#good"),d.recommended);tags($("#bad"),d.avoid);
  $("#route").textContent=`Trực ${d.duty}`;$("#star").textContent=`Thần trực nhật: ${d.twelveStar} · ${d.ecliptic}`;
  $("#sources").innerHTML=d.evidence.map(x=>`<div class="source"><b>${x.label}</b><small>${x.note}</small></div>`).join("")+`<p><small>${d.disclaimer}</small></p>`;
  loading.hidden=true;content.hidden=false;
}
date.value=todayVN(); load();
date.addEventListener("change",load);$("#todayBtn").onclick=()=>{date.value=todayVN();load()};$("#whyBtn").onclick=()=>{why.hidden=!why.hidden;why.scrollIntoView({behavior:"smooth",block:"nearest"})};