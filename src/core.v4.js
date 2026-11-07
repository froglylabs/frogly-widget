// Frogly widget core, version 4, frozen.
//
// These are the exact bytes that were served at w/core.v4.js before version 5.
// Pages that pasted the version 4 line pinned it with an integrity value, and
// the browser refuses the file if one byte differs, so this string must never
// change. The worker keeps serving it at the old address. New installs get
// core.js, which is version 5. A test checks this file against its published
// hash: sha256 1b56a92e09febdd1207d9fabaa8a2b6fc76da048e58c8b1bf1b58b734f9dd006.

export const CORE_V4_VERSION = 4;

export const CORE_V4_SCRIPT = `(function(){
try{
if(window.__coreBoot)return;
window.__coreBoot=1;
var HOST_RE=/^[a-z0-9.-]{3,80}$/;
var REV_RE=/^[0-9a-f]{32}$/;
var PATH_RE=/^\\/[A-Za-z0-9._~\\/-]{0,200}$/;
var FIELD_RE=/^[A-Za-z0-9_-]{1,64}$/;
var TOKEN_RE=/^[A-Za-z0-9_.-]{8,80}$/;
var SIGS=[
{id:"signature_sql",pid:"sql",re:/\\b(union\\s+select|or\\s+1\\s*=\\s*1|drop\\s+table|;\\s*--|information_schema)\\b/i},
{id:"signature_script",pid:"script",re:/<\\s*script\\b|javascript\\s*:|onerror\\s*=/i},
{id:"signature_prompt",pid:"prompt",re:/ignore\\s+(?:all\\s+)?(?:previous|prior)\\s+instructions|disregard\\s+(?:all\\s+)?(?:previous|prior|your)\\s+instructions|system\\s+prompt/i}
];
var FOOTER=["Staff","Partners","Status","Docs","Portal"];
var SID_RE=/^[A-Za-z0-9_-]{8,80}$/;
function okSid(value){return fits(value,SID_RE);}
function looks(value,re){try{return re.exec(value)!==null;}catch(e){return false;}}
function str(value,max){return typeof value==="string"&&value.length<=max;}
function fits(value,re){return typeof value==="string"&&looks(value,re);}
function validItem(item){
if(!item||typeof item!=="object")return false;
if(!str(item.kind,20))return false;
if(!fits(item.rev,REV_RE))return false;
if(!fits(item.path,PATH_RE))return false;
if(!str(item.label,80))return false;
if(!str(item.text,400))return false;
if(item.name!==undefined&&!str(item.name,64))return false;
return true;
}
function validHint(hint){
if(hint===undefined)return true;
if(!hint||typeof hint!=="object")return false;
if(hint.host!==undefined&&!fits(hint.host,HOST_RE))return false;
if(hint.token!==undefined&&!fits(hint.token,TOKEN_RE))return false;
if(hint.portal!==undefined&&!fits(hint.portal,PATH_RE))return false;
return true;
}
function validCfg(cfg,site){
if(!cfg||typeof cfg!=="object")return false;
if(cfg.v!==3||cfg.site_id!==site)return false;
if(!fits(cfg.portal_host,HOST_RE))return false;
if(!str(cfg.event_token,512))return false;
if(cfg.forms!==true&&cfg.forms!==false)return false;
if(!validHint(cfg.hint))return false;
if(!cfg.pack||typeof cfg.pack!=="object")return false;
if(!(cfg.pack.items instanceof Array)||cfg.pack.items.length<6||cfg.pack.items.length>40)return false;
var i;
for(i=0;i<cfg.pack.items.length;i++){if(!validItem(cfg.pack.items[i]))return false;}
return true;
}
function parseCfg(txt,site){
if(!txt||txt.length>65536)return null;
if(txt.indexOf("<")>=0||txt.indexOf(">")>=0)return null;
if(txt.toLowerCase().indexOf("javascript"+":")>=0)return null;
var cfg;
try{cfg=JSON.parse(txt);}catch(e){return null;}
return validCfg(cfg,site)?cfg:null;
}
var self=document.currentScript;
if(!self){
var all=document.getElementsByTagName("script");
for(var si=0;si<all.length;si++){if(all[si].getAttribute&&all[si].getAttribute("data-cfg")){self=all[si];break;}}
}
if(!self||!self.getAttribute)return;
var SITE=self.getAttribute("data-cfg")||"";
if(!okSid(SITE))return;
var HOST="";
try{HOST=new URL(self.src).origin;}catch(e){return;}
var START=Date.now();
var CFG_URL=HOST+"/cfg/"+encodeURIComponent(SITE)+".json";
function load(done){
try{
fetch(CFG_URL,{mode:"cors",credentials:"omit"}).then(function(r){
return r&&r.ok?r.text():null;
}).then(function(txt){done(parseCfg(txt,SITE));}).catch(function(){done(null);});
}catch(e){done(null);}
}
load(function(cfg){if(cfg)boot(cfg,SITE,START);});
function boot(cfg,SITE,START){
var API="https://"+cfg.portal_host;
var ITEMS=cfg.pack.items;
var TOKEN=cfg.event_token||"";
var FORMS=cfg.forms!==false;
var HINT=cfg.hint||{};
var SEED=SITE+"|"+String(cfg.pack.week||"")+"|"+String(cfg.pack.rotation||0);
var BUDGET=50;
var firstTouch=false;
function task(fn){var t=Date.now();try{fn(function(){return Date.now()-t>=BUDGET;});}catch(e){}}
function sessionKey(){
try{
var existing=sessionStorage.getItem("cfg_sid");
if(existing&&okSid(existing))return existing;
var bytes=new Uint8Array(16);
crypto.getRandomValues(bytes);
var hex="";
for(var i=0;i<bytes.length;i++){var h=bytes[i].toString(16);hex+=(h.length===1?"0":"")+h;}
sessionStorage.setItem("cfg_sid",hex);
return hex;
}catch(err){
var fb="";
while(fb.length<24){fb+=Math.random().toString(16).slice(2).replace(/[^a-z0-9]/g,"");}
return fb.slice(0,32);
}
}
var SID=sessionKey();
function urlOf(item){
return API+item.path+"?s="+encodeURIComponent(SITE)+"&rev="+encodeURIComponent(item.rev)+"&k="+encodeURIComponent(SID);
}
function fill(text,item){
var u=urlOf(item);
return String(text||"").split("{url}").join(u).split("{rev}").join(item.rev);
}
function send(eventType,rev,signalClass,extra){
try{
var path="/";
try{if(location&&typeof location.pathname==="string"&&location.pathname.charAt(0)==="/"&&location.pathname.indexOf("..")===-1){path=location.pathname.slice(0,201);}}catch(e){}
var body={site_id:SITE,session_key:SID,event_type:eventType,path:path,core_version:4};
if(TOKEN)body.token=TOKEN;
if(rev)body.rev=rev;
if(signalClass)body.signal_class=signalClass;
if(extra){for(var k in extra){if(Object.prototype.hasOwnProperty.call(extra,k)&&extra[k]!=null)body[k]=extra[k];}}
var p=fetch(API+"/v1/events",{method:"POST",mode:"cors",credentials:"omit",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
if(p&&p.catch)p.catch(function(){});
}catch(err){}
}
task(function(){send("check_in",null,null,null);});
try{setInterval(function(){load(function(next){if(next)TOKEN=next.event_token||"";});},480000);}catch(e){}
function byKind(kind){var r=[],i;for(i=0;i<ITEMS.length;i++)if(ITEMS[i].kind===kind)r.push(ITEMS[i]);return r;}
function pickFooter(){
var a=0,i;for(i=0;i<SEED.length;i++)a=(a*31+SEED.charCodeAt(i))%FOOTER.length;
var b=(a+1+(SEED.length%3))%FOOTER.length;if(b===a)b=(b+1)%FOOTER.length;
return [FOOTER[a],FOOTER[b]];
}
function arm(){
try{
if(!document||!document.body||!document.createElement)return;
var links=byKind("link");
var fields=byKind("field");
var comments=byKind("comment");
var configs=byKind("config");
var creds=byKind("credential");
var notes=byKind("agent_note");
var taken=false,moved=false,fast=false,scripted=false,gaps=[],lastKey=0,missSent={};
function miss(cls){if(taken||missSent[cls])return;missSent[cls]=1;send("miss",null,cls,null);}
function automated(){try{if(navigator&&navigator.webdriver)return true;}catch(e){}return fast||scripted;}
function noteTaken(item,eventType){
taken=true;
var signal=null;if(!automated()&&moved)signal="person_touch";
var extra=null;
if(!firstTouch){firstTouch=true;extra={ms_to_first_touch:Math.max(0,Date.now()-START)};}
send(eventType,item.rev,signal,extra);
}
function report(){
if(taken)return;
try{if(navigator&&navigator.webdriver)miss("webdriver");}catch(e){}
if(fast)miss("fast_navigation");
if(scripted)miss("scripted_typing");
}
var css="position:absolute;left:-10000px;top:0;width:1px;height:1px;overflow:hidden;";
function attr(el,name){return (el&&el.getAttribute&&el.getAttribute(name))||"";}
function hide(el){el.setAttribute("aria-hidden","true");el.setAttribute("tabindex","-1");el.setAttribute("data-keep","1");el.style.cssText=css;}
function linkOf(item,label,rel){
var anchor=document.createElement("a");
anchor.setAttribute("href",urlOf(item));
anchor.setAttribute("rel",rel);
anchor.textContent=label;
anchor.addEventListener("click",function(){try{noteTaken(item,"asset_open");}catch(e){}});
return anchor;
}
var box=document.createElement("div");
hide(box);
task(function(over){
if(over())return;
var i,anchor;
for(i=0;i<links.length&&i<2;i++){
if(over())return;
anchor=linkOf(links[i],links[i].label,"nofollow noindex");
hide(anchor);
box.appendChild(anchor);
}
});
task(function(over){
if(over()||!document.createComment)return;
var i,item;
for(i=0;i<comments.length&&i<2;i++){
if(over())return;
item=comments[i];
box.appendChild(document.createComment(" "+fill(item.text,item)+" "));
}
});
task(function(over){
if(over())return;
var obj={},i,item;
for(i=0;i<configs.length;i++){item=configs[i];obj[item.name||"backup_code"]=fill(item.text,item);}
if(typeof HINT.host==="string")obj.internal_host=HINT.host;
if(typeof HINT.token==="string")obj.service_token=HINT.token;
if(typeof HINT.portal==="string")obj.portal=API+HINT.portal+"?s="+encodeURIComponent(SITE)+"&k="+encodeURIComponent(SID);
var pre=document.createElement("pre");
pre.textContent=JSON.stringify(obj);
hide(pre);
box.appendChild(pre);
});
task(function(over){
if(over())return;
var note=notes[0];
if(!note)return;
var p=document.createElement("p");
p.textContent=fill(note.text,note);
hide(p);
box.appendChild(p);
});
function formOf(over,items,fallback,eventType,noted){
if(over()||!items.length)return;
var form=document.createElement("form");
form.setAttribute("method","post");
form.setAttribute("action",urlOf(items[0]));
form.setAttribute("autocomplete","off");
hide(form);
var i,item,note,input;
for(i=0;i<items.length;i++){
if(over())return;
item=items[i];
if(noted){
note=document.createElement("p");
note.textContent=fill(item.text,item);
hide(note);
form.appendChild(note);
}
input=document.createElement("input");
input.setAttribute("type","text");
input.setAttribute("name",item.name||fallback);
input.setAttribute("autocomplete","off");
hide(input);
form.appendChild(input);
}
form.addEventListener("submit",function(ev){try{ev.preventDefault();for(var n=0;n<items.length;n++)noteTaken(items[n],eventType);}catch(e){}});
box.appendChild(form);
}
task(function(over){formOf(over,fields,"backup_email","field_post",false);});
task(function(over){formOf(over,creds,"login","session_post",true);});
task(function(over){
if(over())return;
var count=(box.childNodes&&box.childNodes.length)||0;
if(count)document.body.appendChild(box);
});
task(function(over){
if(over())return;
var pair=pickFooter();
var visible=[creds.length?creds[0]:(links[1]||null),configs.length?configs[0]:(notes[1]||null)];
var made=[],tries=0,wait=false,sawFoot=false;
function tags(el,name){try{return el.getElementsByTagName(name);}catch(e){return [];}}
function cs(el){try{return window.getComputedStyle(el);}catch(e){return null;}}
function last(list){return list.length?list[list.length-1]:null;}
function shell(el){
var s=el&&cs(el);if(!s)return false;
if(s.position==="fixed"||s.position==="absolute")return true;
var o=s.overflowY||s.overflow||"visible";
return o!=="visible"&&el.scrollHeight>el.clientHeight+1;
}
function wear(from,to){if(typeof from.className==="string")to.className=from.className;}
function build(host,sib,li){
var i,a,wrap,n=0;
for(i=0;i<visible.length&&i<2;i++){
if(!visible[i])continue;
a=linkOf(visible[i],pair[i]||"Status","nofollow");
a.setAttribute("data-keep","1");
var s=sib&&cs(sib);
if(s){wear(sib,a);a.style.cssText="font-size:"+s.fontSize+";color:"+s.color+";text-decoration:"+s.textDecorationLine+";margin:"+s.margin+";";}
else a.style.cssText="color:inherit;text-decoration:none;margin-right:12px;";
wrap=a;
if(li){wrap=document.createElement("li");wear(li,wrap);wrap.setAttribute("data-keep","1");wrap.appendChild(a);}
host.appendChild(wrap);
made.push(wrap);
n++;
}
return n;
}
function place(){
var c=document.body.children,i,first=null;
for(i=0;c&&i<c.length;i++){if(c[i].tagName!=="SCRIPT"&&attr(c[i],"data-keep")!=="1"){first=c[i];break;}}
var foot=last(tags(document,"footer")),host=foot||tags(document,"main")[0]||first,near=null,li=null,all,block;
if(foot)sawFoot=true;else if(sawFoot)return;
if(!host||(!foot&&!(host.children&&host.children.length)))return;
if(shell(host)||(first&&first!==host&&first.contains(host)&&shell(first)))return;
if(foot){
all=tags(foot,"a");
if(all.length>1){near=last(all).parentNode;while(near&&near!==foot&&tags(near,"a").length<2)near=near.parentNode;near=near||foot;}
}
if(near){
if(near.tagName==="UL"||near.tagName==="OL")li=last(tags(near,"li"));
build(near,last(tags(near,"a")),li);
return;
}
block=document.createElement("div");
block.setAttribute("data-keep","1");
block.style.cssText="margin:12px 0;font-size:12px;color:inherit;";
if(build(block,null,null)){host.appendChild(block);made=[block];}
}
function settle(){
wait=false;
var i,n,w,all,foot=last(tags(document,"footer")),ok=made.length>0&&(!foot||foot.contains(made[0]));
for(i=0;i<made.length;i++){if(!document.body.contains(made[i]))ok=false;}
if(ok||tries++>=50)return;
all=tags(document.body,"a");
for(i=all.length-1;i>=0;i--){
n=all[i];
if(attr(n,"data-keep")!=="1"||attr(n,"aria-hidden")==="true")continue;
w=n.parentNode;
if(w&&w!==document.body&&attr(w,"data-keep")==="1")n=w;
if(n.parentNode)n.parentNode.removeChild(n);
}
made=[];
try{place();}catch(e){}
}
function recheck(){if(wait)return;wait=true;setTimeout(settle,300);}
place();
try{if(window.MutationObserver)new MutationObserver(recheck).observe(document.body,{childList:true,subtree:true});}catch(e){}
});
task(function(over){
if(over())return;
try{
var raw=sessionStorage.getItem("cfg_nav")||"";
var now=Date.now();
var parts=raw?raw.split(","):[];
parts.push(String(now));
if(parts.length>8)parts=parts.slice(parts.length-8);
sessionStorage.setItem("cfg_nav",parts.join(","));
var recent=0,i;
for(i=0;i<parts.length;i++){if(now-(+parts[i])<=5000)recent++;}
if(recent>=6)fast=true;
}catch(e){}
var touch=["pointerdown","pointermove","scroll","wheel","touchstart"],ti;
for(ti=0;ti<touch.length;ti++)document.addEventListener(touch[ti],function(){moved=true;},false);
document.addEventListener("keydown",function(ev){
try{
var target=ev&&ev.target;
if(attr(target,"data-keep")==="1")return;
var now=Date.now();
if(lastKey){gaps.push(now-lastKey);if(gaps.length>12)gaps.shift();}
lastKey=now;
if(gaps.length>=6){var sum=0,g;for(g=0;g<gaps.length;g++)sum+=gaps[g];if(sum/gaps.length<20){scripted=true;miss("scripted_typing");}}
if(!scripted)moved=true;
}catch(e){}
},false);
document.addEventListener("submit",function(ev){
task(function(inner){
if(inner())return;
var form=ev.target;
if(!form||!form.querySelectorAll)return;
if(attr(form,"data-keep")==="1")return;
if(!FORMS)return;
if(!moved)miss("no_pointer_before_submit");
var all=form.querySelectorAll("input,textarea,select");
var i,f,t,blob;
for(i=0;i<all.length;i++){
f=all[i];
t=(attr(f,"type")||"text").toLowerCase();
blob=(attr(f,"name")+" "+attr(f,"autocomplete")).toLowerCase();
if(t==="password"||t==="email"||t==="tel")return;
if(looks(blob,/pass|email|card|cc-|cvc|cvv|iban|routing|account|ssn|payment|credit/))return;
}
var seen={};
for(i=0;i<all.length;i++){
if(inner())return;
f=all[i];
t=(attr(f,"type")||"text").toLowerCase();
var tag=String(f.tagName||"").toUpperCase();
if(tag&&tag!=="TEXTAREA"&&!(tag==="INPUT"&&(t==="text"||t==="search")))continue;
if(!tag&&t!=="text"&&t!=="search")continue;
var val=f.value||"";
if(!val||val.length>2000)continue;
var name=attr(f,"name");
for(var s=0;s<SIGS.length;s++){
if(seen[SIGS[s].id])continue;
if(SIGS[s].re.exec(val)){
seen[SIGS[s].id]=1;
var extra={matched:true,pattern_id:SIGS[s].pid};
if(looks(name,FIELD_RE))extra.field_name=name;
send(SIGS[s].id,null,null,extra);
miss("injection");
}
}
}
report();
});
},false);
document.addEventListener("pagehide",function(){try{report();}catch(e){}},false);
});
}catch(err){}
}
if(document.readyState==="loading"){
document.addEventListener("DOMContentLoaded",function(){try{arm();}catch(err){}});
}else{
arm();
}
}
}catch(e){}
})();
`;
