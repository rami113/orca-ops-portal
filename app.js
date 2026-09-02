const REQUIRED_ITEMS=[
  'Vessel GA',
  'Bridge Console GA',
  'Next 2–3 upcoming port calls + corresponding agent details for each port',
  'Cable penetration',
  'VSAT routing',
  'Power connection',
  'Proposed monitor location photos',
  'Proposed Seapod location photos',
  'Docs acknowledgement'
];
console.log("ORCA v35.23 fix: attachments deduped by filename+size everywhere — same file no longer shows twice when merged across messages/threads");
window.ORCA_FIX_VERSION="v35.23";

// ── Ops Hub SSO — silent login from hub token ─────────────────────────────────
// When arriving from the Ops Hub, a token is passed via ?sso_token=
// We use it to fetch the user profile and log in silently — no sign-in screen.
window._ssoHandled=false;
(function(){
  const params=new URLSearchParams(window.location.search);
  const ssoToken=params.get('sso_token');
  if(!ssoToken)return;
  // Set flag immediately — blocks trySilentSignIn from firing a popup
  window._ssoHandled=true;
  // Clean the token from the URL immediately so it's not visible
  window.history.replaceState({},'',window.location.pathname);
  // Wait for page to be ready then attempt silent login
  window.addEventListener('load',async()=>{
    try{
      const res=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{
        headers:{Authorization:'Bearer '+ssoToken}
      });
      if(!res.ok){window._ssoHandled=false;return;} // token invalid — fall through to normal login
      const p=await res.json();
      if(!p.email||!p.email.endsWith('@orca-ai.io')){window._ssoHandled=false;return;}
      // Valid — boot the app directly with this token
      token=ssoToken;
      user={email:p.email.toLowerCase(),name:p.name||p.email,pic:p.picture||''};
      localStorage.setItem('orca_google_consent_ok','1');
      localStorage.setItem('orca_last_email',user.email);
      // Token from hub already has full scopes — boot directly, no popup needed
      saveSession(token,user);
      scheduleTokenRefresh();
      _bootApp(token,user);
    }catch(e){console.warn('SSO login failed',e);window._ssoHandled=false;}
  },{once:true});
})();

// ── Auto-update detection ─────────────────────────────────────────────────────
// Silently checks app.js ETag every 3 minutes. If Vercel deployed a new version,
// shows a gentle banner so users can refresh at their convenience.
(function(){
  let _loadEtag='';
  let _bannerShown=false;

  async function _getEtag(){
    try{
      const r=await fetch('/app.js?_etag=1',{method:'HEAD',cache:'no-store'});
      return r.headers.get('etag')||r.headers.get('last-modified')||'';
    }catch(e){return'';}
  }

  async function _checkForUpdate(){
    if(_bannerShown)return;
    const etag=await _getEtag();
    if(!etag)return;
    if(!_loadEtag){_loadEtag=etag;return;} // first check — just record baseline
    if(etag===_loadEtag)return; // no change
    // New version detected — show banner
    _bannerShown=true;
    const banner=document.createElement('div');
    banner.id='update-banner';
    banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#1D2E6B;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.2)';
    banner.innerHTML=`<span><strong>🔄 New version available</strong> — A portal update has been deployed.</span>
      <div style="display:flex;gap:10px">
        <button onclick="window.location.reload()" style="background:#fff;color:#1D2E6B;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer">Update now</button>
        <button onclick="document.getElementById('update-banner').remove()" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer">Later</button>
      </div>`;
    document.body.appendChild(banner);
  }

  // Check once on load (after 30s to let the app settle), then every 3 minutes
  setTimeout(()=>_checkForUpdate(),30000);
  setInterval(()=>_checkForUpdate(),3*60*1000);
})();
const GOOGLE_CLIENT_IDS={
  'orca-ops-portal.vercel.app':'150805623615-mhhaoc9unbua12lkqs8rtao8nmif3buf.apps.googleusercontent.com',
  'localhost':'150805623615-mhhaoc9unbua12lkqs8rtao8nmif3buf.apps.googleusercontent.com',
  '127.0.0.1':'150805623615-mhhaoc9unbua12lkqs8rtao8nmif3buf.apps.googleusercontent.com'
};
const DEFAULT_CLIENT_ID='150805623615-mhhaoc9unbua12lkqs8rtao8nmif3buf.apps.googleusercontent.com';
const CLIENT_ID=GOOGLE_CLIENT_IDS[window.location.hostname]||DEFAULT_CLIENT_ID;
const SCOPES='https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/spreadsheets profile email';
// CC this address on every coordination email so all ops team members
// have the full thread in their Gmail — solves cross-user attachment access on transfer.
const OPS_CC_EMAIL='ops@orca-ai.io';

const SUPER_ADMINS=['rami@orca-ai.io','leon.gutnik@orca-ai.io'];
const SUPER_ADMIN='rami@orca-ai.io'; // backwards compatibility
const ADMIN=SUPER_ADMIN; // backwards compatibility
const ADMIN_L2=[
  'amir.m@orca-ai.io',
  'israel@orca-ai.io',
  'jacob@orca-ai.io',
  'yotam.keret@orca-ai.io',
  'yaron.y@orca-ai.io',
  'leon.gutnik@orca-ai.io',
].map(e=>e.toLowerCase());

const TEAM_USERS=[
  {email:'rami@orca-ai.io',name:'Rami Moscovich',role:'Super Admin'},
  {email:'amir.m@orca-ai.io',name:'Amir M',role:'Admin'},
  {email:'israel@orca-ai.io',name:'Israel',role:'Admin'},
  {email:'jacob@orca-ai.io',name:'Jacob',role:'Admin'},
  {email:'yotam.keret@orca-ai.io',name:'Yotam Keret',role:'Admin'},
  {email:'yaron.y@orca-ai.io',name:'Yaron Y',role:'Admin'},
  {email:'timothy@orca-ai.io',name:'Timothy',role:'User'},
  {email:'opsrep2@orca-ai.io',name:'Ops Rep 2',role:'User'},
  {email:'opsrep1@orca-ai.io',name:'Ops Rep 1',role:'User'},
  {email:'leon.gutnik@orca-ai.io',name:'Leon Gutnik',role:'Super Admin'}
];

function normEmail(e){return String(e||'').trim().toLowerCase();}
function getUserRole(email){
  const e=normEmail(email);
  if(SUPER_ADMINS.map(normEmail).includes(e))return 'super-admin';
  if(ADMIN_L2.includes(e))return 'admin-l2';
  return 'user';
}
function isSuperAdmin(email){
  email=normEmail(email||(user&&user.email));
  return getUserRole(email)==='super-admin';
}
function isAdmin(email){
  email=normEmail(email||(user&&user.email));
  const role=getUserRole(email);
  return role==='super-admin'||role==='admin-l2';
}
function roleLabel(email){
  const role=getUserRole(email);
  if(role==='super-admin')return 'Super Admin';
  if(role==='admin-l2')return 'Admin';
  return 'User';
}
function applyUserRole(){
  if(!user||!user.email)return;
  user.email=normEmail(user.email);
  user.role=getUserRole(user.email);
  user.roleLabel=roleLabel(user.email);
}
const VKEY='orca_v3',UKEY='orca_u2';

// SHARED DATABASE CONFIG
// Create one Google Sheet, share it with the Orca AI Ops team as Editor,
// then paste the spreadsheet ID below.
// Example URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
const SHARED_SHEET_ID='1Aveudwg5B8D-XrO04L33WibwtzWEaMVhLfDOMyNb3Y4';
const SHARED_SHEET_NAME='vessels';
const ATAGS_SHEET_NAME='atags';     // dedicated tab for attachment tags — no vessel blob race conditions
const ARCHIVE_SHEET_NAME='archive'; // dedicated tab for completed/archived vessels
const TIMELINE_MAX=50;              // max timeline entries per vessel kept in active blob
let sharedDbReady=false;
let sharedDbLastSync=null;

let vessels=[],user=null,token=null,tc=null,draft='',ana=null,ibAna=null,curIb=null,ibItems=[];
let _sharedAttTags={};  // in-memory cache of atags Sheet — { "vesselId_attachmentId": {tag,filename,userEmail,ts} }

// ── Error logging to Sheet ────────────────────────────────────────────────────
const LOG_SHEET='orca_log';
let _logQueue=[];let _logFlushing=false;
async function logError(context,message,detail=''){
  // Always log to console
  console.error(`[${context}]`,message,detail);
  if(!token||!hasSharedDb())return;
  _logQueue.push([new Date().toISOString(),user?.email||'unknown',context,String(message).slice(0,300),String(detail).slice(0,300)]);
  if(_logFlushing)return;
  _logFlushing=true;
  await new Promise(r=>setTimeout(r,2000)); // batch up to 2s
  const rows=_logQueue.splice(0);_logFlushing=false;
  if(!rows.length)return;
  try{
    await fetch(sheetTabUrl(LOG_SHEET,'A1:E1')+':append?valueInputOption=RAW',{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({values:rows})
    });
  }catch(e){console.warn('logError flush failed',e);}
}

// ── Generic Sheet tab URL helper ──────────────────────────────────────────────
function sheetTabUrl(tabName,range){
  return`https://sheets.googleapis.com/v4/spreadsheets/${SHARED_SHEET_ID}/values/${encodeURIComponent(tabName)}!${range}`;
}

// ── Ensure a Sheet tab exists, create it if not ───────────────────────────────
async function ensureSheetTab(tabName){
  if(!token||!hasSharedDb())return false;
  try{
    const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHARED_SHEET_ID}?fields=sheets.properties.title`,{headers:{Authorization:'Bearer '+token}});
    if(!r.ok)return false;
    const d=await r.json();
    const exists=(d.sheets||[]).some(s=>s.properties&&s.properties.title===tabName);
    if(!exists){
      const cr=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHARED_SHEET_ID}:batchUpdate`,{
        method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({requests:[{addSheet:{properties:{title:tabName}}}]})
      });
      if(!cr.ok){console.error('ensureSheetTab failed for',tabName);return false;}
    }
    return true;
  }catch(e){console.error('ensureSheetTab error',e);return false;}
}

// ── Attachment Tags — atags Sheet tab ─────────────────────────────────────────
// Stored as one JSON object in atags!A1: { "vesselId_attachmentId": {tag,filename,userEmail,ts} }
// Completely independent of the vessel blob — no race conditions between users.

async function loadSharedAttTags(){
  if(!token||!hasSharedDb())return;
  try{
    const r=await fetch(sheetTabUrl(ATAGS_SHEET_NAME,'A1'),{headers:{Authorization:'Bearer '+token}});
    if(!r.ok)return;
    const d=await r.json();
    const raw=(d.values||[])[0]?.[0]||'{}';
    _sharedAttTags=JSON.parse(raw);
    // Populate vessel.attachmentTags from shared tags so all existing code works seamlessly
    _applySharedAttTagsToVessels();
  }catch(e){console.warn('loadSharedAttTags failed',e);}
}

function _applySharedAttTagsToVessels(){
  vessels.forEach(v=>{
    const vid=v.id||v.name;if(!vid)return;
    const vt={};
    Object.entries(_sharedAttTags).forEach(([k,t])=>{
      if(k.startsWith(vid+'_')&&t&&t.tag){const aid=k.slice(vid.length+1);vt[aid]=t.tag;}
    });
    // Merge: shared Sheet → localStorage override (most recent local action wins)
    // ONLY keep plain attachment IDs (not compound vesselId_attachmentId keys) to keep blob lean.
    const lsTags=_loadAttTagsLocal(v);
    const _cleanLs={};
    Object.entries(lsTags).forEach(([k,t])=>{
      // Skip compound keys (vesselId_attachmentId format) — plain attachment IDs only
      if(t&&!String(k).startsWith(String(vid)+'_'))_cleanLs[k]=t;
    });
    // Clean existing vessel.attachmentTags of compound keys (vesselId_attachmentId format).
    // Plain Gmail attachment IDs are legitimately 300+ chars — do NOT filter by length.
    const _cleanExisting={};
    Object.entries(v.attachmentTags||{}).forEach(([k,t])=>{
      if(t&&!String(k).startsWith(String(vid)+'_'))_cleanExisting[k]=t;
    });
    v.attachmentTags=Object.assign({},_cleanExisting,vt,_cleanLs);
  });
}

async function saveSharedAttTag(vesselId,attachmentId,filename,tag){
  if(!token||!hasSharedDb())return;
  try{
    const key=vesselId+'_'+attachmentId;
    if(tag&&tag!=='Other / Not a required item'){
      _sharedAttTags[key]={tag,filename:filename||'',userEmail:(user&&user.email)||'',ts:new Date().toISOString()};
    } else {
      delete _sharedAttTags[key];
    }
    const body={range:`${ATAGS_SHEET_NAME}!A1`,majorDimension:'ROWS',values:[[JSON.stringify(_sharedAttTags)]]};
    const r=await fetch(sheetTabUrl(ATAGS_SHEET_NAME,'A1')+'?valueInputOption=RAW',{
      method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    if(!r.ok)console.warn('saveSharedAttTag HTTP error',r.status);
  }catch(e){console.warn('saveSharedAttTag failed',e);}
}

// ── Archive — archive Sheet tab ───────────────────────────────────────────────
// Archived vessels stored as JSON array in archive!A1. Loaded only on demand.

async function loadArchivedVessels(){
  if(!token||!hasSharedDb())return[];
  try{
    const r=await fetch(sheetTabUrl(ARCHIVE_SHEET_NAME,'A1'),{headers:{Authorization:'Bearer '+token}});
    if(!r.ok)return[];
    const d=await r.json();
    const raw=(d.values||[])[0]?.[0]||'[]';
    const parsed=JSON.parse(raw);
    return Array.isArray(parsed)?parsed:[];
  }catch(e){console.warn('loadArchivedVessels failed',e);return[];}
}

async function archiveVesselFromView(){
  const idx=window._mvIdx;
  if(idx===undefined||idx===null)return;
  const v=vessels[idx];if(!v)return;
  const go=await orcaConfirm(
    `Archive "${v.name}"?\n\nIt will be removed from the active list but fully preserved in the archive with all history, tags and timeline.`,
    'Archive Vessel'
  );
  if(!go)return;
  document.getElementById('mod-view').style.display='none';
  await archiveVessel(idx);
}
async function archiveVessel(idx){
  const v=vessels[idx];if(!v)return;
  _completedVessels=null; // invalidate cache so Completed tab refreshes
  try{
    const existing=await loadArchivedVessels();
    existing.push({...v,archivedAt:new Date().toISOString(),archivedBy:(user&&user.email)||''});
    const body={range:`${ARCHIVE_SHEET_NAME}!A1`,majorDimension:'ROWS',values:[[JSON.stringify(existing)]]};
    await fetch(sheetTabUrl(ARCHIVE_SHEET_NAME,'A1')+'?valueInputOption=RAW',{
      method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    // Remove from active vessels
    vessels.splice(idx,1);
    saveVessels();renderTable();updateMetrics();
    await orcaAlert(`${v.name} has been archived. You can view it in the Archive panel.`,'✅ Archived');
  }catch(e){console.error('archiveVessel failed',e);await orcaAlert('Archive failed. Please try again.','Error');}
}

// ── Timeline size management ──────────────────────────────────────────────────
// Keeps vessel timeline lean — cap at TIMELINE_MAX, always preserve milestones.
function trimTimeline(v){
  if(!v||!Array.isArray(v.timeline))return;
  if(v.timeline.length<=TIMELINE_MAX)return;
  // Milestones always kept: first sent, status changes, transfers, sends
  const milestones=new Set(['sent','status','assignment']);
  const keep=v.timeline.filter(e=>milestones.has(e.type));
  const rest=v.timeline.filter(e=>!milestones.has(e.type));
  // Fill remaining slots from most recent non-milestone entries
  const slots=Math.max(0,TIMELINE_MAX-keep.length);
  v.timeline=[...keep,...rest.slice(-slots)].sort((a,b)=>new Date(a.ts||0)-new Date(b.ts||0));
}

// ── JSON blob size guard ──────────────────────────────────────────────────────
// Called before every Sheet write to prevent exceeding cell limits (~50KB practical max).
const BLOB_SIZE_WARN=35000;  // warn at 35KB
const BLOB_SIZE_MAX=45000;   // trim at 45KB to stay safely under the 50KB cell limit
function guardBlobSize(arr){
  let json=JSON.stringify(arr);
  if(json.length<=BLOB_SIZE_WARN)return arr;
  if(json.length>BLOB_SIZE_WARN&&json.length<=BLOB_SIZE_MAX){
    console.warn('[blobGuard] Vessel blob approaching limit:',json.length,'chars — trimming timelines');
  }
  // Trim timelines progressively until under limit
  let trimmed=[...arr.map(v=>({...v,timeline:[...(v.timeline||[])]}))];
  let pass=0;
  while(JSON.stringify(trimmed).length>BLOB_SIZE_MAX&&pass<10){
    trimmed.forEach(v=>{if(v.timeline&&v.timeline.length>5)v.timeline=v.timeline.slice(-Math.max(5,v.timeline.length-5));});
    pass++;
  }
  json=JSON.stringify(trimmed);
  if(json.length>BLOB_SIZE_MAX){
    console.error('[blobGuard] Blob still too large after trimming:',json.length,'chars');
  }
  return trimmed;
}


function hasSharedDb(){return String(SHARED_SHEET_ID||'').trim().length>20;}
function sharedDbUrl(range){
  return `https://sheets.googleapis.com/v4/spreadsheets/${SHARED_SHEET_ID}/values/${encodeURIComponent(SHARED_SHEET_NAME)}!${range}`;
}
// ── Phase 7: Per-row vessel storage ──────────────────────────────────────────
// Each vessel is stored as one row in the Sheet: [vesselId, vesselJSON]
// Scales to 500+ vessels with no size limits. Auto-migrates from the old
// single-blob format (cell A1 = JSON array) on first load.

async function ensureSharedDb(){
  if(!hasSharedDb()||!token){sharedDbReady=false;return false;}
  try{
    const r=await fetch(sharedDbUrl('A1:B1'),{headers:{Authorization:'Bearer '+token}});
    if(r.status===403){
      const lbl=document.getElementById('last-refresh-label');
      if(lbl)lbl.textContent='⚠️ Google Sheets access denied - re-authorizing...';
      if(tc)tc.requestAccessToken({prompt:'consent'});
      sharedDbReady=false;return false;
    }
    if(!r.ok){sharedDbReady=false;return false;}
    sharedDbReady=true;
    return true;
  }catch(e){
    console.error('Shared DB init failed',e);
    sharedDbReady=false;
    return false;
  }
}

async function loadSharedVessels(){
  if(!hasSharedDb()||!token)return null;
  try{
    // Read all rows — per-row format uses A:B, old blob used only A1
    const r=await fetch(sharedDbUrl('A:B'),{headers:{Authorization:'Bearer '+token}});
    if(!r.ok)return null;
    const d=await r.json();
    const rows=(d.values||[]);
    if(!rows.length)return [];

    // ── Auto-migration: detect old single-blob format ──
    // Old format: A1 contains a JSON array string starting with "["
    const firstCell=rows[0][0]||'';
    const isOldBlob=firstCell.trimStart().startsWith('[')
      ||(firstCell.trimStart().startsWith('{')&&firstCell.includes('"vessels"'));
    if(isOldBlob){
      console.log('[Phase7] Detected old blob format — migrating to per-row storage...');
      try{
        const parsed=JSON.parse(firstCell);
        const oldVessels=Array.isArray(parsed)?parsed:(parsed.vessels||[]);
        if(oldVessels.length>0){
          // Write in new per-row format (this clears the old blob)
          await saveSharedVessels(oldVessels);
          console.log('[Phase7] Migration complete —',oldVessels.length,'vessels converted to per-row format');
        }
        return oldVessels;
      }catch(e){
        console.error('[Phase7] Migration failed',e);
        return [];
      }
    }

    // ── New per-row format: each row is [vesselId, vesselJSON] ──
    const vessels=[];
    for(const row of rows){
      const json=row[1]||row[0]||''; // B column = full JSON, A = id (fallback)
      if(!json)continue;
      try{
        const v=JSON.parse(json);
        if(v&&(v.name||v.id))vessels.push(v);
      }catch(e){/* skip malformed rows */}
    }
    return vessels;
  }catch(e){
    console.error('Shared DB load failed',e);
    return null;
  }
}

function setLocalResetAt(ts){if(ts)localStorage.setItem('orca_shared_reset_at',ts);}
function parseSharedPayload(raw){
  // Legacy helper — kept for any remaining callers
  try{
    if(Array.isArray(raw))return {resetAt:'',vessels:raw};
    if(raw&&typeof raw==='object'&&Array.isArray(raw.vessels))return raw;
  }catch(e){}
  return {resetAt:'',vessels:[]};
}

async function saveSharedVessels(data){
  if(!hasSharedDb()||!token)return false;
  try{
    // Sanitize and trim each vessel individually — no blob size limit applies
    const safeData=(data||[]).map(v=>{
      const vc=v?{...v}:v;
      sanitizeVessel(vc);
      trimTimeline(vc);
      return vc;
    }).filter(Boolean);

    const base=`https://sheets.googleapis.com/v4/spreadsheets/${SHARED_SHEET_ID}/values/${encodeURIComponent(SHARED_SHEET_NAME)}`;

    // Read current rows (A=id, B=json) to map each vessel to its row.
    // Per-row writes replace the old clear-all+rewrite: concurrent saves from
    // other users can no longer wipe vessels created between our read and write
    // (that lost-update race silently deleted vessels, e.g. MSC BRISBANE III).
    const rowsRes=await fetch(base+'!A1:B10000',{headers:{Authorization:'Bearer '+token}});
    if(!rowsRes.ok){console.error('Shared DB row-read failed',rowsRes.status);return false;}
    const rowsData=await rowsRes.json();
    const rows=(rowsData.values||[]);
    // id -> array of row numbers (duplicates: update last, clear the rest)
    const idRows=new Map();
    rows.forEach((r,i)=>{
      const id=String(r[0]||'').trim();
      if(!id)return;
      const arr=idRows.get(id)||[];
      arr.push(i+1);
      idRows.set(id,arr);
    });

    // 1) Append brand-new vessels FIRST — appends never touch existing rows,
    //    so a failure here can't destroy anything.
    const appendVals=safeData
      .filter(v=>!idRows.has(String(v.id||v.name||'')))
      .map(v=>[String(v.id||v.name||''),JSON.stringify(v)]);
    if(appendVals.length){
      const ar=await fetch(base+'!A1:append?valueInputOption=RAW',{
        method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({values:appendVals,majorDimension:'ROWS'})
      });
      if(!ar.ok){console.error('Shared DB append failed',await ar.text());return false;}
    }

    // 2) Update existing rows in place (last row wins for duplicate ids)
    const localIds=new Set(safeData.map(v=>String(v.id||v.name||'')));
    const updates=[];
    for(const v of safeData){
      const id=String(v.id||v.name||'');
      const rws=idRows.get(id);
      if(!rws)continue;
      const row=rws[rws.length-1];
      updates.push({range:`${SHARED_SHEET_NAME}!A${row}:B${row}`,values:[[id,JSON.stringify(v)]]});
    }
    if(updates.length){
      const ur=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHARED_SHEET_ID}/values:batchUpdate?valueInputOption=RAW`,{
        method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({valueInputOption:'RAW',data:updates})
      });
      if(!ur.ok){console.error('Shared DB row-update failed',await ur.text());return false;}
    }

    // 3) Clear rows of vessels that no longer exist — blanking cell content,
    //    NOT deleting rows, so row numbers never shift under a concurrent save.
    //    Done LAST: a failure here can only leave stale rows, never lose data.
    const clearRanges=[];
    for(const [id,rws] of idRows){
      if(!localIds.has(id)){
        rws.forEach(row=>clearRanges.push(`${SHARED_SHEET_NAME}!A${row}:B${row}`));
      } else if(rws.length>1){
        rws.slice(0,-1).forEach(row=>clearRanges.push(`${SHARED_SHEET_NAME}!A${row}:B${row}`));
      }
    }
    if(clearRanges.length){
      const cr=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHARED_SHEET_ID}/values:batchClear`,{
        method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({ranges:clearRanges})
      });
      if(!cr.ok)console.error('Shared DB row-clear failed',await cr.text()); // non-fatal
    }

    sharedDbLastSync=new Date().toISOString();
    return true;
  }catch(e){
    console.error('Shared DB save failed',e);
    return false;
  }
}
async function loadVessels(){
  const warn=document.getElementById('shared-db-warning');
  if(warn)warn.style.display=hasSharedDb()?'none':'block';
  const lbl=document.getElementById('last-refresh-label');
  if(hasSharedDb()){
    if(lbl)lbl.textContent='🔄 Loading shared database...';
    const ok=await ensureSharedDb();
    if(ok){
      const shared=await loadSharedVessels();
      if(Array.isArray(shared)){
        // Safety net: if Sheet returns empty but localStorage has vessels, restore them
        if(shared.length===0){
          const _lsBackup=localStorage.getItem('orca_v3');
          if(_lsBackup){
            try{
              const _lsVessels=JSON.parse(_lsBackup);
              if(Array.isArray(_lsVessels)&&_lsVessels.length>0){
                console.warn('[loadVessels] Sheet empty but localStorage has',_lsVessels.length,'vessels — auto-restoring');
                vessels=_lsVessels.map(normalizeVessel);
                saveVessels(); // push back to Sheet
                if(lbl)lbl.textContent='✅ Restored '+vessels.length+' vessels from local backup';
                return;
              }
            }catch(e){/* localStorage data corrupt, continue with empty */}
          }
        }
        vessels=shared.map(normalizeVessel);
        if(lbl)lbl.textContent='✅ Shared DB loaded — '+vessels.length+' vessels';
        console.log('[loadVessels] Loaded',vessels.length,'vessels from Sheet');
        return;
      }
    }
    // Sheets access failed
    console.error('[loadVessels] Sheets failed — falling back to localStorage');
    if(lbl)lbl.textContent='⚠️ Sheet access failed — using local data';
    if(tc){
      tc.requestAccessToken({prompt:'consent'});
      if(lbl)lbl.textContent='⚠️ Re-authorizing Google access...';
    }
  } else {
    console.warn('[loadVessels] No Sheet configured — using localStorage');
    if(lbl)lbl.textContent='⚠️ No shared database configured';
  }
  lv();
}
// Track vessel IDs deleted in this session so saveVessels merge never re-adds them
window._deletedVesselIds=window._deletedVesselIds||new Set();

// Save status — silent background saves. Only surface errors that require user action.
function _showSaveStatus(state){
  // Only show UI feedback on persistent failure — all else is silent
  if(state==='failed'){
    const lbl=document.getElementById('last-refresh-label');
    if(lbl)lbl.textContent='⚠️ Save failed — retrying...';
  } else if(state==='saved'){
    // Clear any previous error label
    const lbl=document.getElementById('last-refresh-label');
    if(lbl&&lbl.textContent.includes('Save failed'))lbl.textContent='';
  }
}

// ── Version stamp — prevent concurrent overwrites ─────────────────────────────
// Each save increments _saveVersion. Before writing, we check if the Sheet's
// version matches what we read. If another user saved in between, we merge first.
let _saveVersion=0;

async function saveVessels(_retrying=false){
  _showSaveStatus('saving');
  if(hasSharedDb()){
    let merged=vessels;
    try{
      const current=await loadSharedVessels();
      if(Array.isArray(current)&&current.length){
        // Build lookup of Sheet vessels by id
        const sheetMap=new Map(current.map(v=>[v.id||v.name,v]));
        const localMap=new Map(vessels.map(v=>[v.id||v.name,v]));
        // Merge: for vessels that exist in both, merge field-by-field using lastActivity as tiebreaker
        // Fields that the saving user explicitly controls take priority;
        // fields only changed by other users are preserved from Sheet.
        // SAFE fields to always take from local (user just edited them):
        const _localOwned=['status','risk','progress','nextAction','missingItems','receivedItems',
          'detectedItems','followupsSent','lastFollowupPreview','assignedTo',
          'lastContact','lastEmailDate','emailsSent','seenMsgIds'];
        // attachmentTags is NOT in _localOwned — it gets a special merge below
        // so tags set by different users on different devices are preserved.
        // SAFE fields to merge from Sheet if Sheet version is newer (other user's changes):
        const _sheetOwned=['timeline','emailsReceived','lastReceivedDate','lastActivity'];
        const mergedVessels=[];
        for(const [id,local] of localMap){
          if(window._deletedVesselIds&&window._deletedVesselIds.has(id))continue;
          const sheet=sheetMap.get(id);
          if(!sheet){mergedVessels.push(local);continue;}
          // Both exist — merge using field-level timestamps where available,
          // falling back to lastActivity for fields without individual timestamps.
          const sheetNewer=new Date(sheet.lastActivity||0)>new Date(local.lastActivity||0);
          const merged={...local};
          // Stamped fields: whichever side has the newer _ts_{field} wins per-field
          STAMPED_FIELDS.forEach(f=>{
            merged[f]=_mergeFieldWithTimestamp(local,sheet,f);
            // Copy the winning timestamp too
            const lts=new Date(local['_ts_'+f]||0).getTime();
            const sts=new Date(sheet['_ts_'+f]||0).getTime();
            merged['_ts_'+f]=lts>=sts?(local['_ts_'+f]||''):(sheet['_ts_'+f]||'');
          });
          // attachmentTags: always merge — no side wins entirely
          merged.attachmentTags=Object.assign({},sheet.attachmentTags||{},local.attachmentTags||{});
          // Sheet-owned fields: take from sheet if sheet is globally newer
          if(sheetNewer){
            _sheetOwned.forEach(f=>{if(sheet[f]!==undefined)merged[f]=sheet[f];});
          }
          // Timelines: always union regardless of version
          const tl=[...(local.timeline||[]),...(sheet.timeline||[])];
          const seen=new Set();
          merged.timeline=tl.filter(e=>{const k=(e.ts||'')+(e.type||'')+(e.title||'');if(seen.has(k))return false;seen.add(k);return true;});
          mergedVessels.push(merged);
        }
        // Add vessels from Sheet that don't exist locally (other users' vessels)
        for(const [id,sv] of sheetMap){
          if(!localMap.has(id)&&!(window._deletedVesselIds&&window._deletedVesselIds.has(id))){
            mergedVessels.push(sv);
          }
        }
        merged=mergedVessels;
      }
    }catch(e){console.warn('merge read failed',e);}
    const ok=await saveSharedVessels(merged);
    if(ok){
      _saveVersion++;
      _showSaveStatus('saved');
      // Keep localStorage in sync as emergency backup for auto-recovery on next load
      try{if(vessels.length>0)localStorage.setItem('orca_v3',JSON.stringify(vessels));}catch(e){}
      return;
    }
    // Save failed
    if(!_retrying){
      // Retry once after 3 seconds
      _showSaveStatus('failed');
      setTimeout(()=>saveVessels(true),3000);
    } else {
      // Second failure — show persistent error and log it
      _showSaveStatus('failed');
      const lbl2=document.getElementById('last-refresh-label');
      if(lbl2)lbl2.textContent='⚠️ Save failed — check Google Sheets access';
      logError('saveVessels','Failed after retry — vessel data may not be saved');
    }
    return;
  }
  // No Sheet — fall back to localStorage
  sv();
  _showSaveStatus('saved');
}
async function refreshSharedData(){
  // Show syncing state on button
  const btn=document.querySelector('[onclick="refreshSharedData()"]');
  const origHtml=btn?btn.innerHTML:'';
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-refresh" style="animation:spin .7s linear infinite"></i> Syncing...';}
  await new Promise(r=>setTimeout(r,0));
  await loadVessels();
  updateMetrics();
  renderTable();
  populateSel();
  if(typeof renderAdmin==='function')renderAdmin();
  // Restore button + show toast
  if(btn){btn.disabled=false;btn.innerHTML=origHtml;}
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1D2E6B;color:#fff;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.2)';
  t.textContent='✅ Sync complete — '+vessels.length+' vessel'+(vessels.length===1?'':'s')+' loaded';
  document.body.appendChild(t);setTimeout(()=>t.remove(),3000);
}

function lv(){try{vessels=loadVesselsCompat().map(normalizeVessel);}catch(e){console.error('load failed',e);vessels=[];}}

// ── Field-level timestamps ────────────────────────────────────────────────────
// Fields that multiple users may change independently. When merging two versions
// of a vessel, whichever timestamp is newer for a given field wins.
// Call stampField(vessel, fieldName) after changing any of these fields.
const STAMPED_FIELDS=['status','risk','progress','assignedTo','nextAction'];
function stampField(v,field){
  if(v)v['_ts_'+field]=new Date().toISOString();
}
function _mergeFieldWithTimestamp(local,sheet,field){
  const lts=new Date(local['_ts_'+field]||local.lastActivity||0).getTime();
  const sts=new Date(sheet['_ts_'+field]||sheet.lastActivity||0).getTime();
  // Whichever was changed more recently wins
  return lts>=sts?local[field]:sheet[field];
}

function loadVesselsCompat(){
  const keys=['orca_v3','orca_v2','orca_v1','vessels'];
  for(const k of keys){
    try{
      const raw=localStorage.getItem(k);
      if(!raw)continue;
      const parsed=JSON.parse(raw);
      if(Array.isArray(parsed))return parsed;
      if(parsed&&Array.isArray(parsed.vessels))return parsed.vessels;
    }catch(e){}
  }
  return [];
}
// ── Input sanitization ────────────────────────────────────────────────────────
// Strip characters that could corrupt the Sheet JSON blob or break the UI.
// Applied to all user-input text fields before saving to Sheet.
function sanitizeText(s,maxLen=500){
  if(s===null||s===undefined)return'';
  return String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'') // control chars
    .replace(/\uFFFD/g,'')   // unicode replacement char
    .trim()
    .slice(0,maxLen);
}
function sanitizeEmail(s){
  const e=sanitizeText(s,200).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)?e:'';
}
function sanitizeVessel(v){
  if(!v)return v;
  if(v.name)v.name=sanitizeText(v.name,120);
  if(v.email)v.email=sanitizeEmail(v.email)||v.email;
  if(v.owner)v.owner=sanitizeText(v.owner,120);
  if(v.fleet)v.fleet=sanitizeText(v.fleet,80);
  if(v.nextAction)v.nextAction=sanitizeText(v.nextAction,200);
  if(Array.isArray(v.missingItems))v.missingItems=v.missingItems.map(x=>sanitizeText(x,200));
  if(Array.isArray(v.receivedItems))v.receivedItems=v.receivedItems.map(x=>sanitizeText(x,200));
  return v;
}

function normalizeVessel(v){
  if(!v.firstEmailDate&&v.lastEmailDate)v.firstEmailDate=v.lastEmailDate;
  v.status=v.status||'waiting';
  if(v.status==='new')v.status='waiting';
  if(v.status==='escalated')v.status='followup';
  v.risk=v.risk||'medium';
  v.progress=Number(v.progress||0);
  v.emailsSent=Number(v.emailsSent||0);
  v.emailsReceived=Number(v.emailsReceived||0);
  v.assignedTo=v.assignedTo||(user&&user.email)||'rami@orca-ai.io';
  v.timeline=v.timeline||[];
  if(!v.lastContact)v.lastContact=v.lastEmailDate||v.lastReceivedDate||new Date().toISOString();
  return v;
}

function sv(){try{localStorage.setItem(VKEY,JSON.stringify(vessels));}catch(e){console.error('save failed',e);}}
function lu(){try{return JSON.parse(localStorage.getItem(UKEY)||'{}');}catch(e){return{};}}
function su(u){const us=lu();us[u.email]={...u,ls:new Date().toISOString()};try{localStorage.setItem(UKEY,JSON.stringify(us));}catch(e){}}

function initG(){
  tc=google.accounts.oauth2.initTokenClient({
    client_id:CLIENT_ID,
    scope:SCOPES,
    callback:handleToken,
    error_callback:(e)=>{
      console.error('Google OAuth error',e);
      const origin=window.location.origin;
      alert('Google sign-in failed. Make sure this origin is authorized in Google Cloud for the OAuth Client ID: '+origin);
    }
  });
}
function signIn(){
  try{
    if(typeof google==='undefined'||!google.accounts){
      alert('Google sign-in is loading, please try again in a moment.');return;
    }
    // Always re-init to avoid stale token client state
    initG();
    if(!tc){alert('Please wait, Google API loading...');return;}
    const alreadyApproved=localStorage.getItem('orca_google_consent_ok')==='1';
    // Use 'select_account' when approved so FedCM doesn't block the manual click
    // Use 'consent' on first time
    tc.requestAccessToken({prompt: alreadyApproved ? 'select_account' : 'consent'});
  }catch(e){
    console.error(e);
    alert('Sign-in failed: '+(e.message||e));
  }
}
// ── Session token helpers ─────────────────────────────────────────────────────
// Session stored in localStorage so it survives tab close and browser restart.
// Token itself expires after 60 min — scheduleTokenRefresh silently renews it.
// User profile cached separately (no expiry) for instant UI on next visit.

function saveSession(accessToken, userObj){
  try{
    const expiry=Date.now()+(55*60*1000); // 55 min (token lives 60)
    const sess={token:accessToken,user:userObj,expiry};
    localStorage.setItem('orca_session',JSON.stringify(sess));
    // Profile cache — no expiry, used for instant UI before token refreshes
    localStorage.setItem('orca_user_cache',JSON.stringify({
      email:userObj.email,name:userObj.name,pic:userObj.pic,role:userObj.role
    }));
    localStorage.setItem('orca_google_consent_ok','1');
    localStorage.setItem('orca_last_email',userObj.email||'');
  }catch(e){}
}
function loadSession(){
  try{
    const raw=localStorage.getItem('orca_session');
    if(!raw)return null;
    const sess=JSON.parse(raw);
    if(!sess||Date.now()>sess.expiry){localStorage.removeItem('orca_session');return null;}
    return sess;
  }catch(e){return null;}
}
function loadCachedUser(){
  // Returns last known user profile even if token has expired.
  // Used to populate UI instantly while silent token refresh runs in background.
  try{const r=localStorage.getItem('orca_user_cache');return r?JSON.parse(r):null;}
  catch(e){return null;}
}
function clearSession(){
  try{
    localStorage.removeItem('orca_session');
    localStorage.removeItem('orca_user_cache');
  }catch(e){}
}
function scheduleTokenRefresh(){
  // Auto-refresh token 5 min before expiry (at 50 min mark)
  setTimeout(async()=>{
    if(!tc)return;
    const savedEmail=localStorage.getItem('orca_last_email')||'';
    tc.requestAccessToken({prompt:'',login_hint:savedEmail});
  }, 50*60*1000);
}

// ── 401 auto-retry — intercept all Google API calls globally ─────────────────
// Patches window.fetch so every googleapis.com call automatically retries once
// on a 401 (expired token) by silently refreshing the token first.
// No changes needed at individual call sites — all existing code benefits.
let _tokenRefreshPending=false;
let _tokenRefreshCallbacks=[];

function _resolveTokenRefresh(newToken){
  // Called by handleToken() after a successful OAuth refresh.
  // Unblocks all queued fetch calls that were waiting for the new token.
  token=newToken;
  _tokenRefreshPending=false;
  const cbs=[..._tokenRefreshCallbacks];
  _tokenRefreshCallbacks=[];
  cbs.forEach(r=>r());
}

(function patchFetchFor401(){
  const _orig=window.fetch.bind(window);
  window.fetch=async function(url,opts={}){
    const res=await _orig(url,opts);
    // Only intercept 401s for Google APIs — not Anthropic, not other services
    if(res.status!==401||!String(url).includes('googleapis.com'))return res;
    // Token expired — trigger a silent refresh if not already in progress
    if(!_tokenRefreshPending){
      _tokenRefreshPending=true;
      const email=localStorage.getItem('orca_last_email')||'';
      if(tc){
        tc.requestAccessToken({prompt:'',login_hint:email});
      } else {
        // Google SDK not ready — can't refresh, unblock immediately
        _tokenRefreshPending=false;return res;
      }
      // Timeout after 15s — unblock even if refresh never completes
      setTimeout(()=>{
        if(_tokenRefreshPending){
          _tokenRefreshPending=false;
          const cbs=[..._tokenRefreshCallbacks];_tokenRefreshCallbacks=[];cbs.forEach(r=>r());
        }
      },15000);
    }
    // Wait for token refresh to complete
    await new Promise(resolve=>_tokenRefreshCallbacks.push(resolve));
    // Replay the original request with the new token in headers
    const newOpts={...opts,headers:{...((opts.headers)||{}),Authorization:'Bearer '+token}};
    return _orig(url,newOpts);
  };
})();

async function handleToken(r){
  if(r.error){console.error(r);alert('Google sign-in failed: '+(r.error_description||r.error));return;}
  // Unblock any apiFetch calls waiting for a token refresh
  _resolveTokenRefresh(r.access_token);
  const res=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+token}});
  const p=await res.json();
  user={email:normEmail(p.email),name:p.name||p.email,pic:p.picture||''};
  // Save session token
  saveSession(token, user);
  scheduleTokenRefresh();
  // Check Gmail + Sheets access
  try{
    const gmailTest = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile',{headers:{Authorization:'Bearer '+token}});
    if(!gmailTest.ok){
      const label = document.getElementById('last-refresh-label');
      if(label) label.textContent = '⚠️ Gmail access not granted';
      console.warn('Gmail scope not granted');
    }
    // Check Sheets access
    const sheetsTest = await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+SHARED_SHEET_ID+'?fields=spreadsheetId',{headers:{Authorization:'Bearer '+token}});
    if(!sheetsTest.ok){
      console.warn('Sheets scope not granted - will request consent');
      // Force re-consent to get spreadsheets scope
      if(tc) tc.requestAccessToken({prompt:'consent'});
    }
  }catch(e){}
  // Remove the "signing in as..." hint if it was shown
  const hint=document.getElementById('silent-signin-hint');if(hint)hint.remove();
  _bootApp(token,user);
}
function signOut(){
  if(token)try{google.accounts.oauth2.revoke(token,()=>{});}catch(e){}
  token=null;user=null;vessels=[];
  clearSession();
  localStorage.removeItem('orca_google_consent_ok');
  localStorage.removeItem('orca_last_email');
  localStorage.removeItem('orca_user_cache');
  const hint=document.getElementById('silent-signin-hint');if(hint)hint.remove();
  document.getElementById('app').style.display='none';
  document.getElementById('auth-screen').style.display='flex';
}

function showTab(t){
  if(t==='admin' && !isAdmin(user&&user.email)){
    alert('Admin access only.');
    t='dashboard';
  }
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+t).classList.add('active');
  const m={dashboard:0,inbox:1,analyze:2};
  if(m[t]!==undefined)document.querySelectorAll('.tab')[m[t]].classList.add('active');
  if(t==='admin'){
    document.getElementById('tab-admin').classList.add('active');
    renderAdmin();
  }
  if(t==='inbox')renderInbox();
  if(t==='completed'){
    document.getElementById('tab-completed').classList.add('active');
    renderCompleted();
  }
  if(t==='analytics'){
    document.getElementById('tab-analytics').classList.add('active');
    renderAnalytics();
  }
}

function sbText(s){return {waiting:'Waiting for reply',followup:'Follow-up required','csm-followup':'CSM Follow-up',ready:'Ready for installation',scheduled:'Installation scheduled',completed:'Installation completed'}[s]||'Waiting for reply';}
function sb(s){const m={
  waiting:['bg','ti-clock','Waiting for reply'],
  followup:['ba','ti-send','Follow-up required'],
  'csm-followup':['bn','ti-users','CSM Follow-up'],
  ready:['bn','ti-circle-check','Ready for installation'],
  scheduled:['bb','ti-calendar-check','Installation scheduled'],
  completed:['bgr','ti-check','Installation completed']
};const[c,ic,l]=m[s]||['bg','ti-circle','Waiting for reply'];return`<span class="badge ${c}"><i class="ti ${ic}"></i> ${l}</span>`;}
function rb(r){const m={low:['bgr','Low'],medium:['ba','Medium'],high:['br','High']};const[c,l]=m[r]||['bg','—'];return`<span class="badge ${c}">${l}</span>`;}

function trafficLight(v){
  const d=ds(v.lastContact);
  let c='green',label='On track';
  if(v.risk==='high'||d>=7){c='red';label='Attention';}
  else if(v.status==='followup'||d>=3||v.risk==='medium'){c='yellow';label='Follow-up';}
  if(v.status==='ready'||v.status==='scheduled'||v.status==='completed'||v.status==='csm-followup'){c='green';label='On track';}
  return `<span class="traffic"><span class="tl-light tl-${c}"></span>${label}</span>`;
}

function ds(d){if(!d)return null;return Math.floor((Date.now()-new Date(d))/86400000);}
function dc(d){if(d===null)return'<span style="color:#ccc">—</span>';const c=d>=7?'d-d':d>=3?'d-w':'d-ok';return`<span class="${c}">${d}d</span>`;}

function userOptions(selected){
  const stored=Object.values(lu());
  const map=new Map();
  TEAM_USERS.forEach(u=>map.set(normEmail(u.email),u));
  stored.forEach(u=>map.set(normEmail(u.email),{...u,role:roleLabel(u.email)}));
  if(user&&user.email)map.set(normEmail(user.email),{...user,role:roleLabel(user.email)});
  if(selected&&!map.has(normEmail(selected)))map.set(normEmail(selected),{email:selected,name:selected,role:'User'});
  const users=Array.from(map.values()).sort((a,b)=>{
    const rank={SUPER:0,ADMIN:1,USER:2};
    const ar=isSuperAdmin(a.email)?rank.SUPER:isAdmin(a.email)?rank.ADMIN:rank.USER;
    const br=isSuperAdmin(b.email)?rank.SUPER:isAdmin(b.email)?rank.ADMIN:rank.USER;
    return ar-br || String(a.name||a.email).localeCompare(String(b.name||b.email));
  });
  return users.map(u=>`<option value="${u.email}" ${normEmail(u.email)===normEmail(selected)?'selected':''}>${u.name||u.email}</option>`).join('');
}

function setVesselStatus(i,status){
  if(!vessels[i])return;
  const old=vessels[i].status;
  vessels[i].status=status;
  if(status==='waiting'){vessels[i].nextAction='Wait for master reply';}
  if(status==='followup'){vessels[i].nextAction='Send follow-up';}
  if(status==='csm-followup'){vessels[i].nextAction='CSM follow-up in progress';}
  if(status==='ready'){vessels[i].nextAction='Coordinate installation window';vessels[i].progress=Math.max(vessels[i].progress||0,75);}
  if(status==='scheduled'){vessels[i].nextAction='Installation scheduled';vessels[i].progress=Math.max(vessels[i].progress||0,90);}
  if(status==='completed'){vessels[i].nextAction='Installation completed';vessels[i].progress=100;vessels[i].risk='low';}
  if(old!==status){
    vessels[i].lastActivity=new Date().toISOString();
    stampField(vessels[i],'status');stampField(vessels[i],'progress');stampField(vessels[i],'nextAction');
    addTimeline(vessels[i],'status','Status changed',`${sbText(old)} → ${sbText(status)}`);
  }
  saveVessels();updateMetrics();renderTable();renderAdmin();populateSel();
}
function statusOptions(selected){
  const statuses=[
    ['waiting','Waiting for reply'],
    ['followup','Follow-up required'],
    ['csm-followup','CSM Follow-up'],
    ['ready','Ready for installation'],
    ['scheduled','Installation scheduled'],
    ['completed','Installation completed']
  ];
  return statuses.map(([v,l])=>`<option value="${v}" ${v===selected?'selected':''}>${l}</option>`).join('');
}

// Build the HTML block showing the latest captain reply — shared by assign + transfer emails
function _buildLatestReplyBlock(vesselIdx){
  const _ib=(ibItems||[]).find(it=>String(it.vi)===String(vesselIdx));
  if(!_ib||!_ib.body)return'';
  const _body=escapeHtml((_ib.body||'').slice(0,800)).replace(/\n/g,'<br>');
  const _from=escapeHtml(_ib.from||'Captain');
  const _date=_ib.date||'';
  const _atts=(_ib.attachments||[]).filter(a=>a.filename);
  const _attHtml=_atts.length?`<div style="margin-top:10px;font-size:12px;color:#6b6b6b"><strong>Attachments (${_atts.length}):</strong> ${_atts.map(a=>escapeHtml(a.filename)).join(', ')}</div>`:'';
  return`<div style="margin:20px 0;border:1px solid #dde3f0;border-radius:8px;overflow:hidden">
    <div style="background:#f4f6fb;padding:10px 16px;border-bottom:1px solid #dde3f0">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#1D2E6B">Latest Captain Reply</div>
      <div style="font-size:11px;color:#6b6b6b;margin-top:2px">From: ${_from} &nbsp;·&nbsp; ${_date}</div>
    </div>
    <div style="padding:14px 16px;font-size:13px;color:#1a1a1a;line-height:1.6;background:#fff">${_body}${_attHtml}</div>
  </div>`;
}

async function assignVessel(i,email){
  if(!vessels[i])return;
  const old=vessels[i].assignedTo||'Unassigned';
  if(old===email)return; // no change
  vessels[i].assignedTo=email;
  vessels[i].lastTransferTo=email;
  vessels[i].lastTransferFrom=old;
  vessels[i].lastTransferAt=new Date().toISOString();
  vessels[i].lastActivity=new Date().toISOString();
  stampField(vessels[i],'assignedTo');
  addTimeline(vessels[i],'assignment','Owner changed',`${old} → ${email}`);
  saveVessels();renderTable();renderAdmin();
  // Send notification email to new owner with full context including latest captain reply
  if(token&&email&&email.includes('@')){
    const v=vessels[i];
    const vname=v.name||'vessel';
    const vemail=v.email||'';
    const newOwnerName=TEAM_USERS.find(u=>u.email===email)?.name||email.split('@')[0];
    const fromName=(user&&user.name)||'Orca AI Ops';
    const missing=v.missingItems||[];
    const received=v.receivedItems||[];
    const progress=v.progress||0;
    const replyBlock=_buildLatestReplyBlock(i);
    const notifHtml=`<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0dc;overflow:hidden">
      <div style="background:#1D2E6B;padding:20px 28px">
        <div style="color:#fff;font-size:18px;font-weight:700">Orca AI — Vessel Assigned</div>
      </div>
      <div style="padding:24px 28px">
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px">Dear ${newOwnerName},</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 20px">You have been assigned as coordinator for the following vessel:</p>
        <div style="background:#f4f6fb;border-radius:8px;padding:16px 20px;margin-bottom:20px;border:1px solid #dde3f0">
          <div style="font-size:16px;font-weight:700;color:#1D2E6B;margin-bottom:4px">${vname}</div>
          <div style="font-size:13px;color:#6b6b6b">${vemail}</div>
          <div style="font-size:13px;color:#6b6b6b;margin-top:8px">Readiness: <strong>${progress}%</strong> &nbsp;|&nbsp; Previous owner: <strong>${old}</strong></div>
        </div>
        ${missing.length?`<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#c0392b;margin-bottom:8px">Still missing (${missing.length} items)</div>${missing.map(m=>`<div style="font-size:13px;color:#c0392b;padding:5px 0;border-bottom:1px solid #fce8e8">${m}</div>`).join('')}</div>`:''}
        ${received.length?`<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#1D6B4A;margin-bottom:8px">Already received (${received.length} items)</div>${received.map(r=>`<div style="font-size:13px;color:#1D6B4A;padding:5px 0;border-bottom:1px solid #eaf3de">${r}</div>`).join('')}</div>`:''}
        ${replyBlock}
        <p style="font-size:13px;color:#6b6b6b;margin:20px 0 0">Please log in to the <a href="https://orca-ops-portal.vercel.app" style="color:#1D2E6B;font-weight:600">Orca AI Ops Portal</a> to review and continue the coordination.</p>
        <p style="font-size:13px;color:#6b6b6b;margin:8px 0 0">Assigned by: <strong>${fromName}</strong></p>
      </div>
    </div>`;
    sendGmail(email,`[Orca AI] Vessel assigned to you: ${vname}`,notifHtml,true).catch(()=>{});
  }
}


// ── Fleet management ──
window._selectedFleets=new Set();

function getAllFleets(){
  return [...new Set(vessels.map(v=>v.fleet||'').filter(Boolean))].sort();
}

function toggleFleetPicker(){
  const p=document.getElementById('fleet-picker');
  if(!p)return;
  if(p.style.display==='none'){
    buildFleetPicker();
    p.style.display='block';
    // close on outside click
    setTimeout(()=>document.addEventListener('click',closeFleetPickerOutside),0);
  } else {
    p.style.display='none';
  }
}
function closeFleetPickerOutside(e){
  const p=document.getElementById('fleet-picker');
  const b=document.getElementById('btn-fleet-filter');
  if(p&&!p.contains(e.target)&&e.target!==b&&!b?.contains(e.target)){
    p.style.display='none';
    document.removeEventListener('click',closeFleetPickerOutside);
  }
}
function buildFleetPicker(){
  const list=document.getElementById('fleet-picker-list');
  if(!list)return;
  const fleets=getAllFleets();
  if(!fleets.length){list.innerHTML='<div style="padding:8px 12px;font-size:12px;color:var(--muted)">No fleets yet</div>';return;}
  list.innerHTML=fleets.map(f=>{
    const checked=window._selectedFleets.has(f);
    return '<label style="display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;font-size:13px">'
      +'<input type="checkbox" class="fleet-cb" data-fleet="'+f+'" '+(checked?'checked':'')+'style="width:14px;height:14px;cursor:pointer"> '+f+'</label>';
  }).join('');
  list.querySelectorAll('.fleet-cb').forEach(function(cb){
    cb.addEventListener('change',function(){toggleFleetSelection(this.getAttribute('data-fleet'),this.checked);});
  });
}
function toggleFleetSelection(fleet,checked){
  if(checked)window._selectedFleets.add(fleet);
  else window._selectedFleets.delete(fleet);
  updateFleetFilterLabel();
  renderTable();
}
function clearFleetFilter(){
  window._selectedFleets.clear();
  updateFleetFilterLabel();
  document.getElementById('fleet-picker').style.display='none';
  document.removeEventListener('click',closeFleetPickerOutside);
  renderTable();
}
function updateFleetFilterLabel(){
  const lbl=document.getElementById('fleet-filter-label');
  if(!lbl)return;
  const n=window._selectedFleets.size;
  lbl.textContent=n===0?'All fleets':n===1?[...window._selectedFleets][0]:n+' fleets';
}
function openModalWithFleetList(){
  // Populate fleet dropdown in Start modal
  const sel=document.getElementById('mfleet');
  if(!sel)return;
  const fleets=getAllFleets();
  const cur=sel.value;
  sel.innerHTML='<option value="">— Select fleet —</option>'+fleets.map(f=>'<option value="'+f+'"'+(f===cur?' selected':'')+'>'+f+'</option>').join('');
  document.getElementById('mfleet-new').value='';
  document.getElementById('mfleet-val').textContent='';
}
function handleFleetSelect(val){
  if(val){
    document.getElementById('mfleet-new').value='';
    document.getElementById('mfleet-val').textContent='Selected: '+val;
  }
}
function handleFleetInput(val){
  if(val.trim()){
    document.getElementById('mfleet').value='';
    document.getElementById('mfleet-val').textContent=val.trim()?'New fleet: '+val.trim():'';
  }
}
function getSelectedFleet(){
  const newVal=document.getElementById('mfleet-new')?.value.trim();
  const selVal=document.getElementById('mfleet')?.value;
  return newVal||selVal||'';
}

async function editVesselFleet(idx){
  const v=vessels[idx];if(!v)return;
  const fleets=getAllFleets();
  const overlay=document.getElementById('orca-modal-overlay');
  document.getElementById('orca-modal-title').textContent='Set Fleet — '+v.name;
  const opts=fleets.map(f=>'<option value="'+f+'"'+(f===v.fleet?' selected':'')+'>'+f+'</option>').join('');
  document.getElementById('orca-modal-msg').innerHTML=
    '<div style="margin-bottom:8px"><select id="ef-sel" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;font-size:14px"><option value="">— Select existing fleet —</option>'+opts+'</select></div>'
    +'<div style="font-size:12px;color:#888;margin-bottom:6px;text-align:center">— or type new —</div>'
    +'<input id="ef-new" placeholder="New fleet name..." style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;font-size:14px;box-sizing:border-box" value=""/>';
  document.getElementById('orca-modal-cancel').style.display='inline-block';
  document.getElementById('orca-modal-cancel').textContent='Cancel';
  document.getElementById('orca-modal-ok').textContent='Save';
  overlay.classList.add('show');
  const result=await new Promise(resolve=>{
    const ok=document.getElementById('orca-modal-ok');
    const cancel=document.getElementById('orca-modal-cancel');
    const cleanup=()=>overlay.classList.remove('show');
    const onOk=()=>{cleanup();ok.removeEventListener('click',onOk);cancel.removeEventListener('click',onCancel);
      const nv=document.getElementById('ef-new')?.value.trim();
      const sv=document.getElementById('ef-sel')?.value;
      resolve(nv||sv||'');};
    const onCancel=()=>{cleanup();ok.removeEventListener('click',onOk);cancel.removeEventListener('click',onCancel);resolve(null);};
    ok.addEventListener('click',onOk);cancel.addEventListener('click',onCancel);
  });
  if(result===null)return;
  vessels[idx].fleet=result;
  saveVessels();renderTable();
}
async function transferOwnership(idx){
  const v=vessels[idx];if(!v)return;
  const TEAM=TEAM_USERS.map(u=>u.email);
  const current=v.assignedTo||'Unassigned';
  const options=TEAM.filter(u=>u!==current);
  // Build a simple pick list via orcaConfirm style
  const overlay=document.getElementById('orca-modal-overlay');
  document.getElementById('orca-modal-title').textContent='Transfer Ownership — '+v.name;
  document.getElementById('orca-modal-msg').innerHTML='<div style="margin-bottom:8px">Currently: <strong>'+current+'</strong></div>'
    +'<select id="transfer-sel" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;font-size:14px">'
    +'<option value="">— Select new owner —</option>'
    +options.map(u=>`<option value="${u}">${u}</option>`).join('')
    +'</select>';
  document.getElementById('orca-modal-cancel').style.display='inline-block';
  document.getElementById('orca-modal-cancel').textContent='Cancel';
  document.getElementById('orca-modal-ok').textContent='Transfer';
  overlay.classList.add('show');
  const result=await new Promise(resolve=>{
    const ok=document.getElementById('orca-modal-ok');
    const cancel=document.getElementById('orca-modal-cancel');
    const cleanup=()=>overlay.classList.remove('show');
    const onOk=()=>{cleanup();ok.removeEventListener('click',onOk);cancel.removeEventListener('click',onCancel);resolve(document.getElementById('transfer-sel')?.value||'');};
    const onCancel=()=>{cleanup();ok.removeEventListener('click',onOk);cancel.removeEventListener('click',onCancel);resolve('');};
    ok.addEventListener('click',onOk);cancel.addEventListener('click',onCancel);
  });
  if(!result)return;
  const prevOwner=vessels[idx].assignedTo||'Unassigned';
  vessels[idx].assignedTo=result;
  vessels[idx].lastTransferTo=result;
  vessels[idx].lastTransferFrom=prevOwner;
  vessels[idx].lastTransferAt=new Date().toISOString();
  vessels[idx].lastActivity=new Date().toISOString();
  addTimeline(vessels[idx],'assignment','Ownership transferred','From: '+prevOwner+' → To: '+result);
  saveVessels();renderTable();
  // Send notification email to new owner
  if(token&&result.includes('@')){
    const vname=vessels[idx].name||'vessel';
    const vemail=vessels[idx].email||'';
    const newOwnerName=TEAM_USERS.find(u=>u.email===result)?.name||result.split('@')[0];
    const fromName=(user&&user.name)||prevOwner;
    const missing=(vessels[idx].missingItems||[]);
    const received=(vessels[idx].receivedItems||[]);
    const progress=vessels[idx].progress||0;
    const notifHtml=`<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0dc;overflow:hidden">
      <div style="background:#1D2E6B;padding:20px 28px">
        <div style="color:#fff;font-size:18px;font-weight:700">Orca AI — Vessel Transfer</div>
      </div>
      <div style="padding:24px 28px">
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px">Dear ${newOwnerName},</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 20px">You have been assigned as the new coordinator for the following vessel:</p>
        <div style="background:#f4f6fb;border-radius:8px;padding:16px 20px;margin-bottom:20px;border:1px solid #dde3f0">
          <div style="font-size:16px;font-weight:700;color:#1D2E6B;margin-bottom:4px">${vname}</div>
          <div style="font-size:13px;color:#6b6b6b">${vemail}</div>
          <div style="font-size:13px;color:#6b6b6b;margin-top:8px">Readiness: <strong>${progress}%</strong> &nbsp;|&nbsp; Previous coordinator: <strong>${prevOwner}</strong></div>
        </div>
        ${missing.length?`<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#c0392b;margin-bottom:8px">Still missing (${missing.length} items)</div>${missing.map(m=>`<div style="font-size:13px;color:#c0392b;padding:5px 0;border-bottom:1px solid #fce8e8">${m}</div>`).join('')}</div>`:''}
        ${received.length?`<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#1D6B4A;margin-bottom:8px">Already received (${received.length} items)</div>${received.map(r=>`<div style="font-size:13px;color:#1D6B4A;padding:5px 0;border-bottom:1px solid #eaf3de">${r}</div>`).join('')}</div>`:''}
        <p style="font-size:13px;color:#6b6b6b;margin:20px 0 0">Please log in to the <a href="https://orca-ops-portal.vercel.app" style="color:#1D2E6B;font-weight:600">Orca AI Ops Portal</a> to review and continue the coordination.</p>
        <p style="font-size:13px;color:#6b6b6b;margin:8px 0 0">Transferred by: <strong>${fromName}</strong></p>
      </div>
    </div>`;
    await sendGmail(result,`[Orca AI] Vessel assigned to you: ${vname}`,notifHtml,true).catch(()=>{});
  }
  await orcaAlert('Ownership transferred to '+result+'.\nA notification email has been sent.','✅ Transfer Complete');
}
async function deleteVessel(i){
  if(!isAdmin()){await orcaAlert('Only admins can delete cases.','Access Denied');return;}
  if(!vessels[i])return;
  const ok=await orcaConfirm('Delete this case from the portal history?','Delete Case');
  if(!ok)return;
  await new Promise(r=>setTimeout(r,0));
  // Register the ID as deleted BEFORE splice so saveVessels merge never re-adds it
  const deletedId=vessels[i].id||vessels[i].name;
  window._deletedVesselIds=window._deletedVesselIds||new Set();
  window._deletedVesselIds.add(deletedId);
  vessels.splice(i,1);
  await saveVessels();
  updateMetrics();renderTable();populateSel();renderAdmin();
}



function cleanCaptainReplyText(txt){
  let s=String(txt||'').replace(/\r/g,'').trim();
  // Remove Gmail quoted history — catches "On DATE, NAME wrote:" at start or after newline
  s=s.split(/(?:^|\n)On .{5,100}wrote:/i)[0];
  // Line-by-line fallback: cut at first line starting with > (handles any encoding)
  const lines=s.split('\n');
  const qIdx=lines.findIndex(l=>l.trimStart().startsWith('>'));
  if(qIdx>0)s=lines.slice(0,qIdx).join('\n');
  s=s.replace(/\[image:[^\]]+\]/gi,'').trim();
  return s;
}
function decodeGmailBody(payload){
  const decode=(data)=>{
    try{
      const bin=atob(String(data||'').replace(/-/g,'+').replace(/_/g,'/'));
      try{
        // TextDecoder handles all UTF-8 correctly (bullets, dashes, smart quotes, etc.)
        const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
        return new TextDecoder('utf-8').decode(bytes);
      }catch(e){
        // Fallback for very old browsers
        try{return decodeURIComponent(escape(bin));}catch(e2){return bin;}
      }
    }catch(e){return '';}
  };
  const walk=(p)=>{
    if(!p)return '';
    if(p.mimeType==='text/plain'&&p.body&&p.body.data)return decode(p.body.data);
    if(p.mimeType==='text/html'&&p.body&&p.body.data)return stripHtmlForText(decode(p.body.data));
    if(p.parts)for(const part of p.parts){const got=walk(part);if(got)return got;}
    return '';
  };
  return walk(payload);
}async function readGmailMessage(id){
  const dr=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,{headers:{Authorization:'Bearer '+token}});
  const dd=await dr.json();
  const hdr=(dd.payload&&dd.payload.headers)||[];
  const get=n=>hdr.find(h=>String(h.name||'').toLowerCase()===n.toLowerCase())?.value||'';
  return {
    msgId:id,
    from:get('From'),
    subj:get('Subject'),
    date:get('Date'),
    body:cleanCaptainReplyText(decodeGmailBody(dd.payload)||dd.snippet||''),
    // Attachments were previously NOT extracted here — this fallback path (used by
    // fetchLatestReplyForVessel/openCaseAnalyze when a vessel isn't yet in ibItems)
    // silently showed zero files even when the captain's email had them attached.
    attachments:dd.payload?extractAttachments(dd.payload,id):[]
  };
}

// ── Attachment helpers ─────────────────────────────────────────────────────────

// Extract a header parameter that may be split across RFC 2231 continuation segments,
// e.g. long filenames get encoded as filename*0*=UTF-8''foo%20; filename*1*=bar.pdf
// instead of a single filename=/filename*= parameter. Gmail's API does not always
// reconstruct these into part.filename, so without this the filename (and therefore
// the whole attachment) would be silently dropped — this happened for PDFs with long
// descriptive names (e.g. drawing/plan-approval files) while short-named JPGs worked fine.
function _extractHeaderParam(headerValue,paramName){
  const segments={};
  // Split on ';' while keeping quoted strings intact
  const parts=String(headerValue||'').match(/(?:[^;"']|"[^"]*"|'[^']*')+/g)||[];
  const re=new RegExp('^'+paramName+'(?:\\*(\\d+))?(\\*)?$','i');
  parts.forEach(rawPart=>{
    const part=rawPart.trim();
    const eq=part.indexOf('=');
    if(eq<0)return;
    const key=part.slice(0,eq).trim().toLowerCase();
    let val=part.slice(eq+1).trim().replace(/^["']|["']$/g,'');
    const m=key.match(re);
    if(!m)return;
    const idx=m[1]!==undefined?parseInt(m[1],10):0;
    const extended=!!m[2];
    segments[idx]={value:val,extended};
  });
  const indices=Object.keys(segments).map(Number).sort((a,b)=>a-b);
  if(!indices.length)return '';
  let combined='';let anyExtended=false;
  indices.forEach(idx=>{
    const seg=segments[idx];let v=seg.value;
    if(seg.extended){
      anyExtended=true;
      if(idx===0){
        // First extended segment carries charset'lang'value — strip charset/lang, keep percent-encoded value
        const m2=v.match(/^([^']*)'([^']*)'(.*)$/);
        if(m2)v=m2[3];
      }
      combined+=v;
    } else {
      combined+=v;
    }
  });
  if(anyExtended){try{combined=decodeURIComponent(combined);}catch(e){/* leave as-is if malformed */}}
  return combined;
}

// Guess a file extension from mimeType so a generic fallback name is still useful
function _extFromMime(mt){
  const map={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/gif':'gif',
    'application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx',
    'application/vnd.ms-excel':'xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx'};
  return map[String(mt||'').toLowerCase()]||'';
}

// De-duplicate a list of attachments that may include the same physical file more than
// once — e.g. when merging attachments from multiple Gmail messages/threads (a captain's
// reply CC'd to several recipients, or the same file re-sent in a follow-up). Do NOT key
// only by attachmentId: Gmail returns a DIFFERENT attachmentId for the same file on every
// API call, so relying on it alone lets true duplicates slip through when attachments are
// re-fetched across separate requests. Key by filename+size instead (stable across
// fetches and reliably identifies "the same file"), falling back to attachmentId only
// when filename is missing/generic.
function _dedupeAttachments(list){
  const seen=new Set();const out=[];
  (list||[]).forEach(a=>{
    if(!a)return;
    const fn=String(a.filename||'').toLowerCase().trim();
    const key=fn?(fn+'|'+(a.size||0)):(a.attachmentId||'');
    if(key&&seen.has(key))return;
    if(key)seen.add(key);
    out.push(a);
  });
  return out;
}

// Walk Gmail message payload and return real captain attachments (not embedded logo etc.)
function extractAttachments(payload, msgId){
  const results=[];
  let _fallbackN=0;
  const walk=(part)=>{
    if(!part)return;
    const hdrs=part.headers||[];
    const aid=part.body&&part.body.attachmentId;
    // Get filename from part.filename or Content-Disposition or Content-Type headers,
    // handling RFC 2231 continuation segments (long filenames split across multiple params).
    let fn=part.filename||'';
    if(!fn){
      const cd=hdrs.find(h=>String(h.name||'').toLowerCase()==='content-disposition');
      if(cd)fn=_extractHeaderParam(cd.value,'filename');
    }
    if(!fn){
      const ct=hdrs.find(h=>String(h.name||'').toLowerCase()==='content-type');
      if(ct)fn=_extractHeaderParam(ct.value,'name');
    }
    // Never silently drop a real attachment just because its filename couldn't be parsed —
    // fall back to a generic name so the file still shows up and can be downloaded/tagged.
    if(!fn&&aid){
      _fallbackN++;
      const ext=_extFromMime(part.mimeType);
      fn='Attachment '+_fallbackN+(ext?'.'+ext:'');
    }
    if(fn&&aid){
      // Only skip our own Orca AI logo — identified by filename alone.
      // Do NOT filter by Content-Disposition or Content-ID: Gmail marks inline-pasted
      // images as "inline" in CC recipients' mailboxes but as unrestricted in the
      // sender's — filtering by disposition causes cross-user inconsistency.
      const isOrcaLogo=/^orca\s*ai$/i.test(fn.trim());
      if(!isOrcaLogo){
        results.push({filename:fn,mimeType:part.mimeType||'application/octet-stream',attachmentId:aid,msgId:msgId||'',size:part.body.size||0});
      }
    }
    if(part.parts)part.parts.forEach(walk);
  };
  walk(payload);
  return results;
}

// Auto-tag a file to a checklist item based on filename keywords
function autoTagFromFilename(filename){
  const fn=String(filename||'').toLowerCase().replace(/[_\-\.]/g,' ');
  const hasGA=/\bga\b|general\s*arrangement/.test(fn);
  const hasBridge=/bridge|console|wheelhouse/.test(fn);
  if(hasGA&&hasBridge)return 'Bridge Console GA';
  if(hasGA)return 'Vessel GA';
  if(/port|schedule|itinerary|\beta\b|voyage|port\s*call|agent/.test(fn))return 'Next 2\u20133 upcoming port calls + corresponding agent details for each port';
  if(/cable|penetration/.test(fn))return 'Cable penetration';
  if(/vsat|routing|diagram/.test(fn))return 'VSAT routing';
  if(/power|electrical|connection/.test(fn))return 'Power connection';
  if(/monitor|screen|display/.test(fn))return 'Proposed monitor location photos';
  if(/seapod|sea\s*pod|camera|pod/.test(fn))return 'Proposed Seapod location photos';
  if(/acknowledg|sign|accept/.test(fn))return 'Docs acknowledgement';
  return '';
}

// localStorage key for attachment tags — instant backup, survives modal open/close
function _attTagsLsKey(v){return'orca_atags_'+(v&&(v.id||v.name)||'');}
function _saveAttTagsLocal(v,tags){
  try{
    if(v){
      // Only save plain attachment IDs — filter out any compound vesselId_attachmentId keys
      const vid=String(v.id||v.name||'');
      const clean={};
      Object.entries(tags||{}).forEach(([k,t])=>{if(t&&!k.startsWith(vid+'_'))clean[k]=t;});
      const lsKey=_attTagsLsKey(v);
      localStorage.setItem(lsKey,JSON.stringify(clean));
    }
  }catch(e){console.error('[attTag ls-save FAILED]',e);}
}
function _loadAttTagsLocal(v){
  try{const s=localStorage.getItem(_attTagsLsKey(v));return s?JSON.parse(s):{};}
  catch(_){return{};}
}

// Restore saved tags from vessel.attachmentTags (Sheet) OR localStorage backup.
// Returns a NEW array with tags applied — never mutates the source array.
function restoreAttachmentTags(attachments, vesselIdx){
  const v=vessels[parseInt(vesselIdx)];
  if(!Array.isArray(attachments))return [];
  // Merge Sheet tags + localStorage backup — Sheet wins if both present
  const lsTags=_loadAttTagsLocal(v);
  const savedTags=Object.assign({},lsTags,(v&&v.attachmentTags)||{});
  return attachments.map(a=>({
    ...a,
    tag:savedTags[a.filename]||savedTags[a.attachmentId]||a.tag||''
  }));
}

// Fetch base64 data for an attachment on demand (called on Download/Preview click)
async function fetchAttachmentData(msgId,attachmentId){
  if(!token)return null;
  try{
    const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/attachments/${attachmentId}`,{headers:{Authorization:'Bearer '+token}});
    if(!r.ok)return null;
    const d=await r.json();
    return String(d.data||'').replace(/-/g,'+').replace(/_/g,'/');
  }catch(e){console.warn('fetchAttachmentData failed',e);return null;}
}

// Download a file from base64 data
function downloadAttachment(b64,filename,mimeType){
  try{
    const bin=atob(b64);const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const blob=new Blob([bytes],{type:mimeType||'application/octet-stream'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(e){console.error('downloadAttachment failed',e);}
}

// Button handlers — called from inline onclick in rendered HTML
async function onAttachDownload(btn,msgId,attachmentId,filename,mimeType){
  const orig=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="ti ti-loader"></i>';
  const b64=await fetchAttachmentData(msgId,attachmentId);
  btn.disabled=false;btn.innerHTML=orig;
  if(!b64){await orcaAlert('Could not fetch attachment.','Error');return;}
  downloadAttachment(b64,filename,mimeType);
}

async function onAttachPreview(btn,msgId,attachmentId,filename,mimeType,containerId){
  const orig=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="ti ti-loader"></i>';
  const b64=await fetchAttachmentData(msgId,attachmentId);
  btn.disabled=false;btn.innerHTML=orig;
  if(!b64){await orcaAlert('Could not load image.','Error');return;}
  const container=document.getElementById(containerId);if(!container)return;
  if(container.style.display!=='none'){container.style.display='none';btn.innerHTML='<i class="ti ti-eye"></i> Preview';return;}
  container.innerHTML=`<img src="data:${mimeType};base64,${b64}" alt="${escapeHtml(filename)}" style="max-width:100%;max-height:320px;border-radius:6px;display:block;margin-top:8px;border:1px solid var(--border)"/>`;
  container.style.display='block';btn.innerHTML='<i class="ti ti-eye-off"></i> Hide';
}

// Tag dropdown change handler
function onAttachTag(sel,attachmentId,vesselIdx){
  const tag=sel.value;const idx=parseInt(vesselIdx);

  if(isNaN(idx)||!vessels[idx]){console.warn('[onAttachTag] EARLY RETURN — idx invalid or vessel missing');return;}
  const v=vessels[idx];

  // Find the filename for this attachment — filename is stable across Gmail API fetches,
  // unlike attachmentId which changes on every fetch for the same file.
  const _taggedAtt=(curIb&&curIb.attachments||[]).find(a=>a.attachmentId===attachmentId)
    ||(ibItems||[]).flatMap(it=>it.attachments||[]).find(a=>a.attachmentId===attachmentId);
  const _filename=_taggedAtt?.filename||attachmentId; // fallback to ID if filename missing

  // Persist tag on curIb and ibItems in memory
  if(curIb&&Array.isArray(curIb.attachments))curIb.attachments.forEach(a=>{if(a.attachmentId===attachmentId)a.tag=tag;});
  (ibItems||[]).forEach(it=>{(it.attachments||[]).forEach(a=>{if(a.attachmentId===attachmentId)a.tag=tag;});});

  // Persist tag using FILENAME as key — stable across Gmail API fetches.
  // attachmentId changes on every poll; filename does not.
  const _attTags=Object.assign({},v.attachmentTags||{});
  if(tag)_attTags[_filename]=tag;
  else delete _attTags[_filename];
  // Also keep attachmentId key for backwards compat within current session
  if(tag)_attTags[attachmentId]=tag;
  else delete _attTags[attachmentId];
  if(tag){
    // Do NOT add to detectedItems — that is only for keyword detection hits.
    // Compute receivedItems = keyword-detected (detectedItems) + all current attachment tags.
    const _allTagVals=Object.values(_attTags).filter(t=>t&&t!=='Other / Not a required item');
    const _kwOnly=Array.isArray(v.detectedItems)?v.detectedItems:[];
    const merged=[...new Map([..._kwOnly,..._allTagVals].map(x=>[itemKey(x),x])).values()];
    // Store attachment filename metadata on the vessel so other users can see received files
    // even when they don't have Gmail access to the original thread.
    const _existingMeta=v.attachmentMeta||{};
    const _att=(curIb&&curIb.attachments||[]).find(a=>a.attachmentId===attachmentId);
    if(_att)_existingMeta[attachmentId]={filename:_att.filename,mimeType:_att.mimeType,size:_att.size,tag};
    vessels[idx]={...v,attachmentTags:_attTags,attachmentMeta:_existingMeta,receivedItems:merged,missingItems:REQUIRED_ITEMS.filter(r=>!hasItem(merged,r))};
    // Keep curIb.vessel in sync — onAttachTag creates a new vessel object, curIb.vessel
    // must point to it so computeReceivedMissing reads the updated attachmentTags.
    if(curIb&&curIb.vi===idx)curIb.vessel=vessels[idx];
    // Layer 1: localStorage — instant, no network, survives modal reopen
    _saveAttTagsLocal(vessels[idx],_attTags);
    // Layer 2: dedicated atags Sheet tab — shared across ALL users, no vessel blob race condition
    const _vesselId=v.id||v.name||'';
    const _att2=(curIb&&curIb.attachments||[]).find(a=>a.attachmentId===attachmentId);
    // Store by filename (stable) — attachmentId changes on every Gmail API fetch
    saveSharedAttTag(_vesselId,_filename,_att2?.filename||'',tag)
      .catch(e=>console.warn('[atag] Sheet save failed',e));
    // Layer 3: vessel blob — kept in sync but NOT the authoritative source for tags
    saveVessels().catch(e=>console.warn('[tag] vessel blob save failed',e));
    updateMetrics();renderTable();
    const row=sel.closest('[data-att-row]');if(row)row.style.background='#f0faf4';
    // Re-render attachments panel to update warning (tagged file no longer "unidentified")
    const _ap=document.getElementById('mib-attachments');
    if(_ap&&curIb)_ap.innerHTML=renderAttachmentsPanel(curIb.attachments||[],curIb.body||'',idx);
    // Update ibAna and refresh Received/Missing panels + draft in the open modal.
    // Recompute from scratch using keyword hits + live attachment tags (a.tag already
    // updated at line 913) + auto-tags from filename. This correctly handles:
    //   - tag changed: old value gone (not in curIb.attachments anymore)
    //   - auto-tagged PDF: stays via autoTagFromFilename even if not in _attTags
    if(ibAna&&curIb){
      // Recompute via single source of truth — tag change already applied to curIb.attachments
      const _rm3=computeReceivedMissing(curIb.vessel||vessels[idx],curIb);
      ibAna.received=_rm3.received;ibAna.missing=_rm3.missing;ibAna.followup_email=_rm3.draft;
      const recvEl=document.getElementById('mib-recv');
      const missEl=document.getElementById('mib-miss');
      if(recvEl)recvEl.innerHTML=_rm3.received.map(x=>`<li><i class="ti ti-circle-check ic-d"></i>${x}</li>`).join('');
      if(missEl)missEl.innerHTML=_rm3.missing.map(x=>`<div class="miss-item"><i class="ti ti-circle-x"></i>${x}</div>`).join('');
      const _fuEl=document.getElementById('mib-fu');if(_fuEl)_fuEl.value=_rm3.draft;
    }
  } else {
    // Tag cleared — recompute receivedItems from keyword detectedItems + remaining tags (no detectedItems mutation)
    const _remainingTags=Object.values(_attTags).filter(t=>t&&t!=='Other / Not a required item');
    const _kwOnly2=Array.isArray(v.detectedItems)?v.detectedItems:[];
    const _allStillRec=[...new Map([..._kwOnly2,..._remainingTags].map(x=>[itemKey(x),x])).values()];
    const _miss=REQUIRED_ITEMS.filter(r=>!hasItem(_allStillRec,r));
    vessels[idx]={...v,attachmentTags:_attTags,receivedItems:_allStillRec,missingItems:_miss};
    if(curIb&&curIb.vi===idx)curIb.vessel=vessels[idx]; // keep curIb.vessel in sync
    _saveAttTagsLocal(vessels[idx],_attTags);
    const _vesselId2=v.id||v.name||'';
    saveSharedAttTag(_vesselId2,_filename||attachmentId,'','').catch(e=>console.warn('[atag clear] Sheet save failed',e));
    saveVessels().catch(e=>console.warn('[tag clear] vessel blob save failed',e));
    updateMetrics();renderTable();
    const row=sel.closest('[data-att-row]');if(row)row.style.background='var(--white)';
    const _ap2=document.getElementById('mib-attachments');
    if(_ap2&&curIb)_ap2.innerHTML=renderAttachmentsPanel(curIb.attachments||[],curIb.body||'',idx);
    // Recompute via single source of truth after tag cleared
    if(ibAna&&curIb){
      const _rm4=computeReceivedMissing(curIb.vessel||vessels[idx],curIb);
      ibAna.received=_rm4.received;ibAna.missing=_rm4.missing;ibAna.followup_email=_rm4.draft;
      const recvEl2=document.getElementById('mib-recv');
      const missEl2=document.getElementById('mib-miss');
      if(recvEl2)recvEl2.innerHTML=_rm4.received.map(x=>`<li><i class="ti ti-circle-check ic-d"></i>${x}</li>`).join('');
      if(missEl2)missEl2.innerHTML=_rm4.missing.map(x=>`<div class="miss-item"><i class="ti ti-circle-x"></i>${x}</div>`).join('');
      const _fuEl2=document.getElementById('mib-fu');if(_fuEl2)_fuEl2.value=_rm4.draft;
    }
  }
}

// Render the attachments panel
function renderAttachmentsPanel(attachments,bodyText,vesselIdx){
  // Final safety net — dedupe here too (by filename+size) regardless of how the
  // attachments array was built upstream, so the same file can never render twice.
  attachments=_dedupeAttachments(attachments);
  const vi=vesselIdx!==undefined?String(vesselIdx):'';
  // Read tags from ALL three sources: vessel blob, shared atags cache, localStorage.
  // This ensures the dropdown shows the correct saved tag even if async saves are pending.
  const _v=vessels[parseInt(vi)];
  const _vid=(_v&&(_v.id||_v.name))||'';
  const _lsT=_loadAttTagsLocal(_v);
  const _sharedT={};
  if(_vid){
    Object.entries(_sharedAttTags||{}).forEach(([k,t])=>{
      if(k.startsWith(_vid+'_')&&t&&t.tag){const aid=k.slice(_vid.length+1);_sharedT[aid]=t.tag;}
    });
  }
  const _savedTags=Object.assign({},(_v&&_v.attachmentTags)||{},_sharedT,_lsT);
  const iconMap={photo:'ti-photo',pdf:'ti-file-type-pdf',doc:'ti-file-type-doc',drawing:'ti-rulers',spreadsheet:'ti-table',other:'ti-paperclip'};
  const classify=(att)=>{
    const fn=String(att.filename||'').toLowerCase();const mt=String(att.mimeType||'').toLowerCase();
    if(mt.startsWith('image/')||/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(fn))return 'photo';
    if(mt==='application/pdf'||fn.endsWith('.pdf'))return 'pdf';
    if(/\.(doc|docx)$/i.test(fn)||mt.includes('wordprocessingml'))return 'doc';
    if(/\.(dwg|dxf|dwf)$/i.test(fn))return 'drawing';
    if(/\.(xls|xlsx|csv)$/i.test(fn)||mt.includes('spreadsheet'))return 'spreadsheet';
    return 'other';
  };

  // Warnings when no attachments
  if(!attachments||!attachments.length){
    const warns=[];
    const bt=bodyText||'';
    if(/attach|herewith|enclosed|please find|find attached/i.test(bt))warns.push('Captain mentioned attachments but no files were found in this email.');
    else if(/vessel\s*ga|bridge\s*(console\s*)?ga|general\s*arrangement/i.test(bt))warns.push('GA mentioned in reply but no GA file was attached.');
    if(!warns.length)return '';
    return `<div style="margin-bottom:1rem"><div class="sl" style="margin-bottom:8px">Attachments</div>${warns.map(w=>`<div class="flag-item" style="margin-bottom:6px"><i class="ti ti-alert-triangle"></i> ${w}</div>`).join('')}</div>`;
  }

  // Warnings with files present
  const warns=[];
  // Check both body text AND filenames for GA mentions
  const allText=(bodyText||'')+' '+attachments.map(a=>a.filename).join(' ');
  const mentionsGA=/vessel\s*ga|bridge\s*(console\s*)?ga|general\s*arrangement/i.test(allText);
  const hasGAFile=attachments.some(a=>autoTagFromFilename(a.filename).includes('GA'));
  if(mentionsGA&&!hasGAFile)warns.push('GA mentioned but no GA file detected in attachments.');
  // Use _savedTags as source of truth for untagged check
  const untagged=attachments.filter(a=>!autoTagFromFilename(a.filename)&&!_savedTags[a.filename]&&!_savedTags[a.attachmentId]);
  if(untagged.length)warns.push(`${untagged.length} file${untagged.length>1?'s':''} could not be auto-identified — please tag them below.`);
  const warnHtml=warns.map(w=>`<div class="flag-item" style="margin-bottom:6px"><i class="ti ti-alert-triangle"></i> ${w}</div>`).join('');

  const tagOpts=(fn,savedTag)=>{
    const auto=savedTag||autoTagFromFilename(fn);
    return [{val:'',label:'— Untagged —'},...REQUIRED_ITEMS.map(r=>({val:r,label:r})),{val:'other',label:'Other / Not a required item'}]
      .map(o=>`<option value="${escapeHtml(o.val)}"${auto===o.val?' selected':''}>${escapeHtml(o.label)}</option>`).join('');
  };

  const cards=attachments.map((att,i)=>{
    const cat=classify(att);const isImg=cat==='photo';
    const prevId='att-prev-'+String(att.msgId||'').slice(-6)+'-'+i;
    const sizeKb=att.size?Math.ceil(att.size/1024)+'KB':'';
    const icon=iconMap[cat]||'ti-paperclip';
    const filenameTag=autoTagFromFilename(att.filename);
    // Always read tag from vessel.attachmentTags — source of truth, survives poll replacement
    // Also check att.tag directly — set by restoreAttachmentTags from localStorage/vessel
    // for users who can't access the original Gmail thread (e.g. after vessel transfer)
    const savedTag=_savedTags[att.filename]||_savedTags[att.attachmentId]||att.tag||'';
    const effectiveTag=savedTag||filenameTag;
    const isAutoTagged=!!filenameTag;
    const isManualTagged=!!savedTag&&!filenameTag;
    const safeFn=escapeHtml(att.filename);
    const safeMt=escapeHtml(att.mimeType);
    const safeAid=escapeHtml(att.attachmentId);
    const safeMid=escapeHtml(att.msgId);
    return `<div data-att-row style="border:1px solid var(--border);border-radius:var(--rs);padding:10px 12px;background:${effectiveTag?'#f0faf4':'var(--white)'};margin-bottom:6px" data-att-id="${safeAid}">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:6px;background:var(--navy-l);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--navy)"><i class="ti ${icon}" style="font-size:16px"></i></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${safeFn}">${safeFn}</div>
          ${sizeKb?`<div style="font-size:11px;color:var(--faint);margin-top:1px">${sizeKb}</div>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
           ${isImg?`<button class="btn btn-s" onclick="onAttachPreview(this,'${safeMid}','${safeAid}','${safeFn}','${safeMt}','${prevId}')"><i class="ti ti-eye"></i> Preview</button>`:''}
           <button class="btn btn-s btn-p" onclick="onAttachDownload(this,'${safeMid}','${safeAid}','${safeFn}','${safeMt}')" title="Download file" style="padding:6px 12px;font-size:12px;font-weight:600;min-width:100px"><i class="ti ti-download" style="margin-right:5px"></i>Download</button>
        </div>
      </div>
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;color:var(--muted);white-space:nowrap">Tag as:</span>
        <select style="flex:1;padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--rs);background:var(--white);font-family:inherit;color:var(--text)" onchange="onAttachTag(this,'${safeAid}','${vi}')">
          ${tagOpts(att.filename,savedTag)}
        </select>
        ${isAutoTagged?`<span style="font-size:11px;color:var(--green);white-space:nowrap;font-weight:600"><i class="ti ti-circle-check"></i> Auto-tagged</span>`:''}
        ${isManualTagged?`<span style="font-size:11px;color:var(--navy);white-space:nowrap;font-weight:600"><i class="ti ti-tag"></i> Tagged</span>`:''}
      </div>
      ${isImg?`<div id="${prevId}" style="display:none"></div>`:''}
    </div>`;
  }).join('');

  return `<div style="margin-bottom:1rem"><div class="sl" style="margin-bottom:8px">Attachments <span style="font-size:10px;background:var(--navy-l);color:var(--navy);border-radius:99px;padding:1px 8px;font-weight:700;margin-left:4px">${attachments.length}</span></div>${warnHtml}${cards}</div>`;
}

function openManualAnalyzeWithReply(i,replyText){
  // If called from dashboard context (no reply found), show inline message instead of navigating
  if(!replyText){
    orcaAlert('No captain reply was found for this vessel. Please check inbox first.','No reply found');
    return;
  }
  showTab('analyze');
  setTimeout(()=>{
    const sel=document.getElementById('ra-sel');
    const txt=document.getElementById('ra-reply');
    if(sel)sel.value=String(i);
    if(txt){
      txt.value=replyText||'';
      txt.placeholder='';
      txt.focus();
    }
  },50);
}

// Fetch the latest captain reply for a specific vessel directly from Gmail.
// Searches by from-email + base coordination subject line (NOT anchored to "Re:" —
// some captain replies land in a thread whose subject never got the "Re:" prefix,
// e.g. when Gmail starts a fresh thread after sendGmail's threadId self-heal retry,
// or when the master's mail client replies without modifying the subject. Requiring
// "Re:" caused the search to completely miss the thread containing the real reply
// and its attachments, always landing on a different — sometimes attachment-less —
// thread for the same vessel instead).
// IMPORTANT: aggregates attachments from EVERY matching thread (there can legitimately
// be more than one Gmail thread for the same vessel), not just a single thread, so
// files sent in an earlier/different thread are never silently lost.
async function fetchLatestReplyForVessel(vessel){
  if(!token||!vessel||!vessel.email)return null;
  const ve=String(vessel.email||'').trim();
  const vn=String(vessel.name||'').trim();
  const q=`from:${ve} subject:"Orca AI Installation Coordination - ${vn}" newer_than:60d`;
  try{
    const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=10`,{headers:{Authorization:'Bearer '+token}});
    const d=await r.json();
    if(!d.messages||!d.messages.length)return null;
    // Gmail's message list is newest-first — the latest message gives us the reply
    // text/from/date to display, same as before.
    const latestId=d.messages[0].id;
    const latest=await readGmailMessage(latestId);
    if(!latest)return null;
    try{
      // Collect every unique thread among the matching messages (there may be more
      // than one thread for this vessel) and aggregate captain attachments from ALL of them.
      const threadIds=new Set();
      await Promise.all(d.messages.map(async m=>{
        try{
          const mr=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&fields=threadId`,{headers:{Authorization:'Bearer '+token}});
          const md=await mr.json();
          if(md&&md.threadId)threadIds.add(md.threadId);
        }catch(e){/* skip this message's thread lookup on failure */}
      }));
      let allAtts=[];
      await Promise.all([...threadIds].map(async threadId=>{
        try{
          const tr=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,{headers:{Authorization:'Bearer '+token}});
          if(!tr.ok)return;
          const thread=await tr.json();
          (thread.messages||[]).forEach(msg=>{
            const hdr=(msg.payload&&msg.payload.headers)||[];
            const from=hdr.find(h=>h.name==='From')?.value||'';
            const isOpsMsg=from.toLowerCase().includes('orca ai ops');
            if(isOpsMsg||!msg.payload)return; // only aggregate attachments from captain messages
            allAtts.push(...extractAttachments(msg.payload,msg.id));
          });
        }catch(e){/* skip this thread on failure — never regress other threads' attachments */}
      }));
      // Dedupe by filename+size (NOT attachmentId alone — Gmail returns a different
      // attachmentId for the same file across separate API calls/threads).
      allAtts=_dedupeAttachments(allAtts);
      if(allAtts.length)latest.attachments=allAtts;
    }catch(e){console.warn('fetchLatestReplyForVessel: thread aggregation failed, using single-message attachments',e);}
    return latest;
  }catch(e){
    console.warn('fetchLatestReplyForVessel failed',e);
    return null;
  }
}

async function openCaseAnalyze(i){
  const vessel=vessels[i];
  if(!vessel){alert('Vessel not found.');return;}
  const loadDiv=document.createElement('div');
  loadDiv.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99998;display:flex;align-items:center;justify-content:center';
  loadDiv.innerHTML='<div style="background:#fff;border-radius:12px;padding:28px 36px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2)"><div class="spinner" style="margin:0 auto 14px"></div><div style="font-size:14px;font-weight:600;color:#1D2E6B">Analyzing reply...</div></div>';
  document.body.appendChild(loadDiv);
  try{
    let replyText='',replyFrom='',replyDate='',replyAtts=[];
    if(Array.isArray(ibItems)&&ibItems.length){
      // Match strictly by vessel index — one ibItem per vessel, never by email
      // Match by vessel index OR by vessel identity (id/name) — never by object reference
      // since vessels[i] may have been replaced by a new object by onAttachTag/pollVessels
      const _vid=vessel.id||vessel.name;
      const ex=ibItems.find(item=>item.vi===i||(item.vessel&&(item.vessel.id||item.vessel.name)===_vid));
      if(ex){
        if(ex.body)replyText=cleanCaptainReplyText(ex.body);
        replyFrom=ex.from||'';replyDate=ex.date||'';
        // Restore saved tags from vessel.attachmentTags before showing in modal
        replyAtts=restoreAttachmentTags(ex.attachments||[],i);
      }
    }
    if(!replyText){
      // Fallback path when vessel isn't (yet) in ibItems — e.g. "Check inbox" hasn't run
      // recently. Previously this ONLY fetched the reply text and never attachments,
      // so files were silently missing for any vessel analyzed via this path.
      const latest=await fetchLatestReplyForVessel(vessel);
      if(latest&&latest.body){
        replyText=cleanCaptainReplyText(latest.body);replyFrom=latest.from||'';replyDate=latest.date||'';
        replyAtts=restoreAttachmentTags(latest.attachments||[],i);
      }
    }
    if(!replyText){loadDiv.remove();openManualAnalyzeWithReply(i,'');return;}
    const _tmpCurIb=curIb;const _tmpIbAna=ibAna;
    curIb={vi:i,vessel:vessel,body:replyText,from:replyFrom,date:replyDate,subj:'Captain reply',attachments:replyAtts};
    await runIbAnalysis();
    loadDiv.remove();
    openAnalyzeResultModal(i,replyText,replyFrom,replyDate,ibAna,replyAtts);
  }catch(err){
    console.error('openCaseAnalyze failed',err);
    loadDiv.remove();
    openManualAnalyzeWithReply(i,'');
  }
}

function openAnalyzeResultModal(idx,replyText,replyFrom,replyDate,result,atts){
  const v=vessels[idx];if(!v||!result)return;
  // atts passed explicitly from openCaseAnalyze; fallback to curIb.attachments if called from elsewhere
  const _atts=restoreAttachmentTags(atts||(curIb&&curIb.attachments)||[],idx);
  curIb={vi:idx,vessel:v,body:replyText,from:replyFrom,date:replyDate,subj:'Captain reply',attachments:_atts};
  ibAna=result;
  document.getElementById('mib-v').textContent=v.name;
  document.getElementById('mib-m').textContent=(replyFrom?'From: '+replyFrom+' · ':'')+( replyDate||'');
  document.getElementById('mib-b').textContent=replyText;
  const firstSent=v.lastEmailDate||v.createdAt||v.lastContact||null;
  const dsf=firstSent?Math.floor((Date.now()-new Date(firstSent))/86400000):null;
  document.getElementById('mib-stat-first').textContent=dsf!==null?dsf:'—';
  const rMs=replyDate?new Date(replyDate).getTime():null;
  const lMs=firstSent?new Date(firstSent).getTime():null;
  let rd='—';
  if(rMs&&lMs&&rMs>lMs){rd=Math.floor((rMs-lMs)/86400000);if(rd===0)rd='<1';}
  document.getElementById('mib-stat-resp').textContent=rd;
  const score=readinessScore(v)||v.progress||0;
  document.getElementById('mib-stat-ready').textContent=score+'%';
  const sL={waiting:'Waiting',followup:'Follow-up','csm-followup':'CSM Follow-up',ready:'Ready',scheduled:'Scheduled',completed:'Completed'};
  document.getElementById('mib-stat-status').textContent=sL[v.status]||v.status||'—';
  // Use computeReceivedMissing as single source of truth
  const _rm2=computeReceivedMissing(v,curIb);
  result.received=_rm2.received;
  result.missing=_rm2.missing;
  result.followup_email=_rm2.draft;
  ibAna=result;
  document.getElementById('mib-recv').innerHTML=result.received.map(x=>`<li><i class="ti ti-circle-check ic-d"></i>${x}</li>`).join('');
  document.getElementById('mib-miss').innerHTML=result.missing.map(x=>`<div class="miss-item"><i class="ti ti-circle-x"></i>${x}</div>`).join('');
  document.getElementById('mib-fu').value=result.followup_email||'';
  // Render attachments from curIb (set by openCaseAnalyze with all accumulated atts)
  const _apR=document.getElementById('mib-attachments');
  if(_apR)_apR.innerHTML=renderAttachmentsPanel(curIb.attachments||[],replyText||'',idx);
  // Recipients line + CC bar — this modal is opened via the row-level "Analyze" button
  // (openCaseAnalyze), a separate code path from openIbModal, so both must be set here too.
  const _mibRcp2=document.getElementById('mib-recipients');if(_mibRcp2)_mibRcp2.innerHTML=_recipientsHtml(v,idx);
  renderCcTags(idx,'mib');
  document.getElementById('mib-al').style.display='none';
  document.getElementById('mib-res').style.display='block';
  document.getElementById('mib-abtn').style.display='none';
  document.getElementById('mib-sbtn').style.display='inline-flex';
  document.getElementById('mod-ib').style.display='flex';
}

function normTxt(s){return String(s||'').toLowerCase().replace(/\s+/g,' ').trim();}
function isThanksOnlyReply(txt){
  const s=normTxt(txt).replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
  if(!s)return true;
  const generic=[
    'thanks','thank you','thank you very much','many thanks','noted','ok','okay','yes','roger',
    'will check','will look into this','i will look into this','we will check','noted with thanks',
    'thank you for your email','thanks for your email'
  ];
  if(generic.includes(s))return true;
  // Any attachment/file signal = NOT thanks-only
  const technical=[
    'port','agent','eta','vessel ga','bridge','console','cable','penetration','vsat','power',
    'monitor','photo','picture','seapod','camera','deck','docs','document','acknowledg',
    'attach','attached','herewith','enclosed','please find','find attached','sending','sent',
    'see below','find below','image','file','drawing','plan','layout','general arrangement'
  ];
  return !technical.some(k=>s.includes(k));
}
function itemKey(item){
  const s=normTxt(item);
  if((s.includes('vessel')&&s.includes('ga'))||s.includes('general arrangement'))return 'vessel_ga';
  if((s.includes('bridge')&&s.includes('ga'))||s.includes('bridge console ga'))return 'bridge_ga';
  if(s.includes('port')||s.includes('agent')||s.includes('eta'))return 'ports';
  if(s.includes('cable')||s.includes('penetration'))return 'cable';
  if(s.includes('vsat'))return 'vsat';
  if(s.includes('power'))return 'power';
  if(s.includes('monitor'))return 'monitor';
  if(s.includes('seapod')||s.includes('camera')||s.includes('compass'))return 'seapod';
  if(s.includes('doc')||s.includes('acknowledg'))return 'docs';
  return s.split(' ')[0]||s;
}
function hasItem(list,item){
  const k=itemKey(item);
  return (list||[]).some(x=>itemKey(x)===k || normTxt(x).includes(k) || normTxt(item).includes(itemKey(x)));
}
// ── computeReceivedMissing — single source of truth ──────────────────────────
// Called by EVERY path that needs to know what a captain has sent:
//   Analyze modal (all entry points), View modal, onAttachTag panel refresh.
// Sources merged in priority order (last wins on conflict):
//   1. vessel.detectedItems  — keyword hits accumulated across all replies
//   2. attachment auto-tags  — from filenames of current ibItem attachments
//   3. attachment saved tags — from vessel.attachmentTags + _sharedAttTags
// Returns { received[], missing[], draft }
function computeReceivedMissing(vessel, ibItem){
  const v=vessel||{};
  const ib=ibItem||null;

  // Build the most up-to-date tag map from ALL three sources — vessel blob,
  // shared atags Sheet cache, and localStorage. This ensures we always have
  // the freshest tags regardless of async save timing or poll cycles.
  const _vid=v.id||v.name||'';
  const _lsT=_loadAttTagsLocal(v);
  const _sharedT={};
  if(_vid){
    Object.entries(_sharedAttTags||{}).forEach(([k,t])=>{
      if(k.startsWith(_vid+'_')&&t&&t.tag){
        const aid=k.slice(_vid.length+1);
        _sharedT[aid]=t.tag;
      }
    });
  }
  // Merge: vessel blob ← shared atags ← localStorage (most recent local action wins)
  const _allSavedTags=Object.assign({},v.attachmentTags||{},_sharedT,_lsT);

  // Layer 1: keyword detection on the latest reply body
  const kwHits=ib&&ib.body?inferReceivedFromReply(ib.body):[];
  // If captain mentioned attachments in text but NO files were actually found in the email,
  // remove file-dependent items (photos, GA docs) — they require physical attachments to count.
  // Items confirmable by text alone (port calls with dates, etc.) are kept.
  const _hasActualFiles=(ib&&(ib.attachments||[]).length>0);
  const _strictInBody=ib&&ib.body&&/attach|herewith|enclosed|please find|find attached|find below|see below|sending|i have sent/i.test(ib.body);
  const _fileRequired=new Set(['vessel_ga','bridge_ga','monitor','seapod','cable','vsat','power','docs']);
  const filteredKwHits=(!_hasActualFiles&&_strictInBody)
    ? kwHits.filter(h=>!_fileRequired.has(itemKey(h)))
    : kwHits;

  // Layer 2: tags from attachment objects — a.tag (manually set) takes priority over
  // autoTagFromFilename. a.tag is updated immediately by onAttachTag so it's always current.
  const autoTags=(ib&&ib.attachments||[])
    .map(a=>a.tag||autoTagFromFilename(a.filename))
    .filter(t=>t&&t!=='Other / Not a required item');

  // Layer 3: saved tags from the merged map — filtered to files present in this ibItem
  // to prevent old test tags from unrelated sessions bleeding through.
  const _ibAtts=ib&&(ib.attachments||[]);
  let savedTags;
  if(_ibAtts&&_ibAtts.length>0){
    // Match by BOTH filename (stable) and attachmentId (may change per fetch)
    const _presentAids=new Set(_ibAtts.map(a=>a.attachmentId).filter(Boolean));
    const _presentNames=new Set(_ibAtts.map(a=>a.filename).filter(Boolean));
    savedTags=Object.entries(_allSavedTags)
      .filter(([key,t])=>(_presentAids.has(key)||_presentNames.has(key))&&t&&t!=='Other / Not a required item')
      .map(([,t])=>t);
  } else {
    savedTags=Object.values(_allSavedTags)
      .filter(t=>t&&t!=='Other / Not a required item');
  }
  // Union all sources — use filteredKwHits (drops file-dependent items when no files found)
  const received=[...new Map(
    [...filteredKwHits,...autoTags,...savedTags].map(x=>[itemKey(x),x])
  ).values()];
  const missing=REQUIRED_ITEMS.filter(r=>!hasItem(received,r));
  const complete=missing.length===0;
  // If captain mentioned attaching files but none were found, add a specific note in the draft
  // referencing exactly which items they said they were sending
  let _missingAttachNote='';
  if(!_hasActualFiles&&_strictInBody){
    const _mentionedItems=kwHits.filter(h=>_fileRequired.has(itemKey(h)));
    const _itemList=_mentionedItems.length>0
      ? _mentionedItems.map(x=>'• '+x).join('\n')
      : '';
    _missingAttachNote=_itemList
      ? `Thank you for your reply. We noticed you mentioned sending the following, however no files were received in your email:\n${_itemList}\n\nCould you please resend the attachments?\n\n`
      : `Thank you for your reply. We noticed you mentioned sending attachments, however no files were received in your email. Could you please resend the files?\n\n`;
  }
  let draft;
  if(complete){
    draft=`Dear Master,\n\n${_missingAttachNote}Thank you for providing all the required information. We will review the details and coordinate the next steps for the Orca AI installation.\n\nKind regards,\nORCA AI OPS`;
  } else {
    const baseDraft=buildFollowupEmail({...v,receivedItems:received},missing);
    // Insert missing-attachment note after the greeting line
    draft=_missingAttachNote
      ? baseDraft.replace('Dear Master,\n\n','Dear Master,\n\n'+_missingAttachNote)
      : baseDraft;
  }
  return {received,missing,draft};
}

function derivedMissing(v){
  const recv=v&&Array.isArray(v.receivedItems)?v.receivedItems:[];
  const current=v&&Array.isArray(v.missingItems)&&v.missingItems.length?v.missingItems:REQUIRED_ITEMS;
  const base=current.length?current:REQUIRED_ITEMS;
  return REQUIRED_ITEMS.filter(item=>!hasItem(recv,item) && hasItem(base,item));
}
function buildFollowupEmail(v,missing){
  const m=(missing&&missing.length?missing:REQUIRED_ITEMS);
  const received=v.receivedItems||[];

  // Acknowledge what was received
  const ackLines=received.length
    ? 'Thank you for providing the following:\n'+received.map(x=>'• '+x).join('\n')+'\n\n'
    : '';

  // Still missing section
  const missingLines=m.map(x=>'• '+x).join('\n');

  // Dynamic closing — only mention voyage/port if still missing
  const needsPorts=m.some(x=>/port|voyage|agent/i.test(x));
  const closing=needsPorts
    ? 'Once the voyage schedule, upcoming ports, agent details and technical information are reviewed, Orca AI will identify the most suitable installation opportunity.'
    : 'Once we receive the above, we will be able to finalize the installation coordination.';

  return `Dear Master,

${ackLines}To complete the installation coordination, we still require the following information:

${missingLines}

${closing}

Kind regards,
ORCA AI OPS`;
}

function inferReceivedFromReply(reply){
  const s=normTxt(reply);
  const got=[];

  // STRICT attachment signals only — captain must have actually sent/attached something
  const strictAttach=s.includes('attached')||s.includes('attach')||s.includes('herewith')||
    s.includes('enclosed')||s.includes('please find')||s.includes('find attached')||
    s.includes('find below')||s.includes('see below')||s.includes('sending')||s.includes('i have sent');

  // "here are/is" only counts when paired with a concrete item keyword — not generic conversation
  const hereAreWithItem=(s.includes('here are')||s.includes('here is the'))&&
    (s.includes('photo')||s.includes('ga')||s.includes('document')||s.includes('plan')||
     s.includes('drawing')||s.includes('file')||s.includes('port')||s.includes('layout'));

  // Short label reply: captain writes only the item name (e.g. "Vessel GA", "Bridge Console GA").
  // This is a labelling pattern — the item name IS the signal because it's the whole message.
  // Only applies when the reply is very short (≤12 words) and contains no negation/question.
  const wordCount=s.trim().split(/\s+/).length;
  const isShortLabel=wordCount<=12&&!s.includes('?')&&!s.includes('will')&&!s.includes("we'll")&&!s.includes('please')&&!s.includes('can you')&&!s.includes('do you');

  // hasAttach = definitive proof captain sent something (never just "here are" alone)
  const hasAttach=strictAttach||hereAreWithItem||isShortLabel;

  // GA: only if explicitly named as "GA" or "General Arrangement" AND attachment signal present
  if((s.includes('vessel ga')||s.includes('vessel general arrangement'))&&hasAttach)got.push('Vessel GA');
  if((s.includes('bridge console ga')||s.includes('bridge general arrangement'))&&hasAttach)got.push('Bridge Console GA');
  // Generic GA only if not about photos AND has attachment signal
  if(/\bga\b/.test(s)&&!s.includes('photo')&&!s.includes('picture')&&!s.includes('image')&&hasAttach){
    if(s.includes('bridge'))got.push('Bridge Console GA');
    else if(s.includes('vessel'))got.push('Vessel GA');
  }

  // Port calls: only if agent details explicitly mentioned AND attachment/sharing signal present
  if(s.includes('port')&&s.includes('agent')&&s.includes('detail')&&hasAttach)got.push('Next 2\u20133 upcoming port calls + corresponding agent details for each port');

  // Cable/VSAT/Power: only if explicitly named AND strict attachment signal (not just mentioned)
  if(s.includes('cable penetration')&&strictAttach)got.push('Cable penetration');
  if(s.includes('vsat')&&(s.includes('routing')||s.includes('diagram'))&&strictAttach)got.push('VSAT routing');
  if(s.includes('power connection')&&strictAttach)got.push('Power connection');

  // Photos: must mention the specific item name near a strict attachment signal
  // "console photo" alone is NOT "Bridge Console GA" - it could be monitor/location photos
  if(s.includes('monitor')&&(s.includes('location')||s.includes('photo'))&&strictAttach)got.push('Proposed monitor location photos');
  if((s.includes('seapod')||s.includes('sea pod'))&&(s.includes('location')||s.includes('photo'))&&strictAttach)got.push('Proposed Seapod location photos');

  // Docs: only if explicit acknowledgement document attached/sent — not just the word "acknowledged"
  if((s.includes('docs acknowledge')||s.includes('document acknowledg'))&&strictAttach)got.push('Docs acknowledgement');
  if(s.includes('acknowledg')&&s.includes('attach')&&!s.includes('will')&&!s.includes("we'll"))got.push('Docs acknowledgement');

  return [...new Set(got)];
}


function normalizeAnalysisResult(v,reply,analysis){
  const oldMissing=derivedMissing(v);
  const thanksOnly=isThanksOnlyReply(reply);
  analysis=analysis||{};
  let received=Array.isArray(analysis.received)?analysis.received.filter(x=>normTxt(x)&&!['partial info','thank you','thanks','yes','ok','okay'].includes(normTxt(x))):[];
  const inferred=inferReceivedFromReply(reply);
  const s_rep=normTxt(reply);
  // ALWAYS use inferReceivedFromReply — ignore AI received[] completely
  // AI hallucinates too often; keyword matching is reliable
  received=[...inferred];
  // else: use AI received (hasAttachSignal but infer missed something)
  let missing=Array.isArray(analysis.missing)&&analysis.missing.length?analysis.missing:oldMissing;
  if(thanksOnly && received.length===0){
    // Pure thanks with nothing detected — keep old missing, clear received
    missing=oldMissing;
  }else{
    // Recompute missing against ALL REQUIRED_ITEMS using only items that were
    // explicitly detected in actual replies (stored in v.detectedItems), NOT
    // v.receivedItems which may be polluted by the inverse-of-missing calculation.
    // v.detectedItems is the accumulation of real inferReceivedFromReply() hits only.
    const historicalDetected=Array.isArray(v.detectedItems)?v.detectedItems:[];
    const allDetected=[...new Map([...historicalDetected,...received].map(x=>[itemKey(x),x])).values()];
    missing=REQUIRED_ITEMS.filter(item=>!hasItem(allDetected,item));
  }
  const complete=missing.length===0;
  analysis.received=received;
  analysis.missing=missing;
  analysis.status=complete?'ready':'followup';
  analysis.risk=complete?'low':(analysis.risk||'medium');
  analysis.progress=complete?85:Math.max(Number(analysis.progress||0), received.length?25:0);
  analysis.nextAction=complete?'Coordinate installation window':'Send follow-up';
  analysis.followup_email=complete
    ? `Dear Master,\n\nThank you for providing the required information. We will review the details and coordinate the next steps for the Orca AI installation.\n\nKind regards,\nORCA AI OPS`
    : buildFollowupEmail(v,missing);
  return analysis;
}
function cleanTimeline(v){
  if(!v)return;
  v.timeline=(v.timeline||[]).filter(e=>e&&(e.title||e.text)).map(e=>{
    if(!e.title&&e.text)e.title=e.text;
    if(!e.ts&&e.date)e.ts=new Date(e.date).toISOString();
    if(!e.ts)e.ts=new Date().toISOString();
    if(!e.type)e.type=e.text&&e.text.toLowerCase().includes('reply')?'reply':'note';
    return e;
  });
}

function addTimeline(v,type,title,detail,body,msgId){
  if(!v)return;
  v.timeline=v.timeline||[];
  const entry={ts:new Date().toISOString(),type,title,detail};
  if(body)entry.body=String(body).slice(0,3000);
  if(msgId)entry.msgId=msgId;
  v.timeline.unshift(entry);
  v.lastActivity=new Date().toISOString();
}
function fmtDT(d){
  if(!d)return '—';
  const dt=new Date(d);
  if(!Number.isFinite(dt.getTime()))return '—';
  return dt.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'2-digit'})+' '+dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}
function readinessScore(v){
  if(!v)return 0;
  if(v.status==='completed')return 100;
  // All REQUIRED items received = 100%
  if((v.missingItems||[]).length===0&&(v.receivedItems||[]).length>0)return 100;
  if(v.status==='scheduled')return Math.max(v.progress||0,90);
  if(v.status==='ready')return Math.max(v.progress||0,85);
  const received=[
    ...(v.receivedItems||[]),
    ...(v.filesReceived||[]),
    v.analysisSummary||'',
    v.lastReplyText||'',
    v.notes||''
  ].map(x=>String(x).toLowerCase()).join(' | ');
  const missing=(v.missingItems||[]).map(x=>String(x).toLowerCase()).join(' | ');
  const got=(terms)=>terms.some(t=>received.includes(t)) && !terms.some(t=>missing.includes(t));
  let score=0;
  if(got(['vessel ga','general arrangement']))score+=12;
  if(got(['bridge console ga','bridge console','console ga']))score+=12;
  if(got(['monitor','monitor location','proposed monitor']))score+=15;
  if(got(['seapod','camera location','proposed seapod']))score+=15;
  if(got(['port call','upcoming port','agent details','port agent']))score+=15;
  if(got(['cable','penetration','routing']))score+=10;
  if(got(['power','vsat']))score+=10;
  if(got(['docs','acknowledgement','acknowledgment']))score+=5;
  score=Math.max(score, Number(v.progress||0));
  if((v.missingItems||[]).length&&score>75)score=75;
  return Math.min(100,Math.max(0,score));
}
function readinessBar(v){
  const s=readinessScore(v);
  return `<div class="readiness-cell">
    <div class="prog"><span style="width:${Math.min(100,s)}%"></span></div>
    <span>${s}%</span>
  </div>`;
}

function filteredVessels(){
  let arr=vessels.map((v,i)=>({...v,__i:i}));
  const q=String(window.dashSearch||'').trim().toLowerCase();
  if(q)arr=arr.filter(v=>[v.name,v.email,v.owner,v.fleet,v.assignedTo,v.docs,v.company,v.imo].some(x=>String(x||'').toLowerCase().includes(q)));
  const _fltStatus=document.getElementById('flt')?.value||'';
  if(_fltStatus)arr=arr.filter(v=>v.status===_fltStatus);
  if((window.dashKpiFilter||'')==='ready')arr=arr.filter(v=>v.status==='ready'||v.status==='scheduled'||v.status==='completed');
  if((window.dashKpiFilter||'')==='waiting')arr=arr.filter(v=>v.status==='waiting');
  if((window.dashKpiFilter||'')==='attention')arr=arr.filter(v=>v.status==='followup'||v.risk==='high'||ds(v.lastContact)>=7);
  // Fleet filter
  if(window._selectedFleets&&window._selectedFleets.size>0)arr=arr.filter(v=>window._selectedFleets.has(v.fleet||''));
  const _sortMode=document.getElementById('sort-vessels')?.value||'newest';
  if(_sortMode==='oldest')arr.sort((a,b)=>new Date(a.lastEmailDate||a.lastContact||0)-new Date(b.lastEmailDate||b.lastContact||0));
  else arr.sort((a,b)=>new Date(b.lastEmailDate||b.lastContact||0)-new Date(a.lastEmailDate||a.lastContact||0));

  return arr;
}
function tlToggle(eid,arid){
  var el=document.getElementById(eid);
  var ar=document.getElementById(arid);
  if(!el||!ar)return;
  var op=el.style.display==='none';
  el.style.display=op?'block':'none';
  ar.innerHTML=op?'&#9660;':'&#9658;';
}
function renderTimeline(v){
  seedTimeline(v);
  var events=(v.timeline||[]).slice().sort(function(a,b){return new Date(b.ts||0)-new Date(a.ts||0);});
  if(!events.length)return '<div style="font-size:13px;color:var(--faint)">No timeline yet.</div>';
  // Show only actual emails (sent/reply), not AI analysis events
  events=events.filter(function(e){var t=(e.title||'').toLowerCase();return (e.type==='sent'||e.type==='reply')&&!t.includes('analyz')&&!t.includes('status')&&!t.includes('ai ')&&!t.includes('updated');});
  // Fix mislabeled entries: "Email sent to captain" where FROM is not ORCA AI OPS
  // was stored incorrectly when the old SENT-label approach was used — relabel at render time
  events=events.map(function(e){
    if(e.title==='Email sent to captain'&&!(e.detail||'').toLowerCase().includes('orca ai ops')){
      return Object.assign({},e,{title:'Captain replied',type:'reply'});
    }
    return e;
  });
  // Deduplicate: if "Initial email sent" and "Email sent to captain" exist within
  // 2 minutes of each other they are the same event — keep only "Initial email sent"
  var initEntry=events.find(function(e){return e.title==='Initial email sent';});
  if(initEntry){
    var initTs=new Date(initEntry.ts||0).getTime();
    events=events.filter(function(e){
      if(e.title==='Email sent to captain'){
        return Math.abs(new Date(e.ts||0).getTime()-initTs)>120000;
      }
      return true;
    });
  }
  var rows=events.slice(0,50).map(function(e,i){
    var iconMap={sent:'ti-mail-forward',reply:'ti-mail-opened',ai:'ti-robot',status:'ti-list-check',assignment:'ti-user-share',note:'ti-note'};
    var icon=iconMap[e.type]||'ti-circle';
    // For captain replies, strip quoted chain at display time (fixes old stored data too)
    var displayBody=(e.type==='reply'&&e.body)?cleanCaptainReplyText(e.body):( e.body||'');
    var hasBody=!!(displayBody&&displayBody.trim().length>0);
    var eid='tlb'+i+'x'+(((e.ts||'').length*997+(e.title||'').length*31)>>>0);
    var arid='ara'+eid;
    var safeBody=hasBody?displayBody.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):'';
    var bodyDiv=hasBody?('<div id="'+eid+'" style="display:none;margin-top:8px;padding:12px 14px;background:#f7f8fc;border-radius:7px;border:1px solid #e0e0dc;font-size:12px;line-height:1.7;white-space:pre-wrap;color:#1a1a1a;max-height:260px;overflow-y:auto">'+safeBody+'</div>'):'';
    var arrowSpan=hasBody?('<span id="'+arid+'" style="font-size:10px;color:#1D2E6B;margin-left:6px;user-select:none">&#9658;</span>'):'';
    var rowStyle=hasBody?'cursor:pointer;border-radius:7px;padding:8px 6px;margin:0 -6px':'padding:8px 0';
    var dataAttrs=hasBody?(' data-eid="'+eid+'" data-arid="'+arid+'"'):'';
    return '<div class="tl-row'+(hasBody?' tl-clickable':'')+'" style="'+rowStyle+'"'+dataAttrs+'>'
      +'<div class="tl-dot" style="margin-top:2px"><i class="ti '+icon+'"></i></div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="display:flex;align-items:center"><strong>'+(e.title||e.text||'Activity')+'</strong>'+arrowSpan+'</div>'
      +'<div><span>'+fmtDT(e.ts||e.date)+(e.detail?' \xb7 '+e.detail:(e.by?' \xb7 '+e.by:''))+'</span></div>'
      +bodyDiv
      +'</div></div>';
  });
  return rows.join('');
}

function seedTimeline(v){
  if(!v.timeline||!v.timeline.length){
    v.timeline=[];
    if(v.lastEmailDate)addTimeline(v,'sent','Initial email sent',`Sent to ${v.email||'master'}`);
    if((v.emailsReceived||0)>0)addTimeline(v,'reply','Captain replied',`${v.emailsReceived} replies received`);
    if(v.status==='followup')addTimeline(v,'ai','AI analysis completed','Follow-up required');
  }
}


function getVesselTbody(){
  let tb=document.getElementById('vtb');
  if(tb)return tb;
  const table=document.querySelector('#view-dashboard table.tbl, #view-dashboard .tbl');
  if(table){
    tb=table.querySelector('tbody');
    if(tb){tb.id='vtb';return tb;}
    tb=document.createElement('tbody');
    tb.id='vtb';
    table.appendChild(tb);
    return tb;
  }
  return null;
}
function getVesselEmpty(){
  let empty=document.getElementById('vempty');
  if(empty)return empty;
  const panel=document.querySelector('#view-dashboard .panel');
  if(panel){
    empty=document.createElement('div');
    empty.id='vempty';
    empty.style.cssText='text-align:center;padding:3rem;color:var(--muted);display:none';
    empty.innerHTML='<div style="font-size:42px;color:#d0d0d0"><i class="ti ti-ship"></i></div><p>No vessels yet.</p><button class="btn btn-p" onclick="openStart()"><i class="ti ti-rocket"></i> Start first coordination</button>';
    panel.appendChild(empty);
    return empty;
  }
  return null;
}

function renderTable(){
  setTimeout(_renderTableImpl, 0);
}
function _renderTableImpl(){
  // Don't re-render while user has a dropdown or input focused — avoids collapsing selects
  const active=document.activeElement;
  if(active&&(active.tagName==='SELECT'||active.tagName==='INPUT')&&active.closest('#vtb,table.tbl')){
    setTimeout(_renderTableImpl, 1000);
    return;
  }
  const tb=getVesselTbody(),empty=getVesselEmpty();
  if(!tb){console.warn('Vessel table body not found');return;}
  const searchEl=document.getElementById('v-search');if(searchEl&&searchEl.value!==window.dashSearch)searchEl.value=window.dashSearch||'';
  const arr=filteredVessels();
  // Skip re-paint if visible data hasn't changed — reduces flicker on fast polls
  const _hash=arr.map(v=>`${v.__i}:${v.status}:${v.risk}:${v.progress}:${v.assignedTo}:${v.lastActivity}:${v.emailsReceived}`).join('|');
  if(tb._lastHash&&tb._lastHash===_hash)return;
  tb._lastHash=_hash;
  if(!vessels.length){
    tb.innerHTML='';
    if(empty)empty.style.display='block';
    return;
  }
  if(empty)empty.style.display=arr.length?'none':'block';
  tb.innerHTML=arr.map(v=>{
    const idx=v.__i;
    seedTimeline(vessels[idx]);
    // Reply Age = days since captain last replied (lastReceivedDate), not since ops last acted
    const d=ds(v.lastReceivedDate);
    const adminDelete=(user&&isAdmin())?`<button class="btn btn-s btn-d" title="Delete case" onclick="event.stopPropagation();deleteVessel(${idx})"><i class="ti ti-trash"></i> Delete</button>`:'';
    const _allDone=(v.missingItems||[]).length===0&&(v.receivedItems||[]).length>0;
    return `<tr class="cl" style="${_allDone?'background:#f0faf4;border-left:3px solid #003d1a':''}">
      <td>
        <div onclick="openV(${idx})" style="cursor:pointer;min-width:0">
          <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.name}</strong>
           <span style="font-size:11px;color:var(--faint);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.email||''}</span>
           <div style="margin-top:4px;display:flex;align-items:center;gap:4px;flex-wrap:wrap">
             ${v.fleet
               ? '<span style="font-size:10px;background:#e8edf8;color:#1D2E6B;border-radius:4px;padding:2px 8px;font-weight:600;display:inline-block">&#9749; '+v.fleet+'</span>'
               : ''}
             <button onclick="event.stopPropagation();editVesselFleet(${idx})" title="Edit fleet" style="width:20px;height:20px;border:1px solid #d0d8e8;border-radius:4px;background:#f4f6fb;color:#6b7fa8;cursor:pointer;font-size:10px;display:inline-flex;align-items:center;justify-content:center;padding:0;flex-shrink:0"><i class="ti ti-pencil"></i></button>
           ${(()=>{
               if(!v.lastTransferTo||!v.lastTransferAt||(Date.now()-new Date(v.lastTransferAt).getTime())>=86400000*3)return'';
               const _to=v.lastTransferTo.split('@')[0];
               // Find 'from' — stored directly or fall back to last timeline assignment entry
               let _from=v.lastTransferFrom?v.lastTransferFrom.split('@')[0]:'';
               if(!_from){
                 const _lastA=(v.timeline||[]).filter(e=>e.type==='assignment').slice(-1)[0];
                 if(_lastA){
                   // detail is "From: x@y → To: a@b" or "x@y → a@b"
                   const _fp=(_lastA.detail||'').split('→')[0].replace(/from:/i,'').trim();
                   if(_fp&&_fp!=='Unassigned')_from=_fp.split('@')[0];
                 }
               }
               const _label=_from?`${_from} → ${_to}`:`Transferred to ${_to}`;
               return`<span style="font-size:10px;background:#fff3cd;color:#856404;border-radius:4px;padding:2px 8px;font-weight:600;display:inline-block;width:100%;margin-top:4px">&#8644; ${_label}</span>`;
             })()}
           ${v._ccDropWarning?'<span style="font-size:10px;background:#fde8e8;color:#c0392b;border-radius:4px;padding:2px 8px;font-weight:600;display:inline-block;width:100%;margin-top:2px" title="Captain replied to only one team member — others may not see this reply">&#9888; CC chain broken</span>':''}
           </div>
        </div>
      </td>
      <td>
        <select class="status-select" onclick="event.stopPropagation()" onchange="event.stopPropagation();setVesselStatus(${idx},this.value)" style="padding:5px 6px;font-size:12px;border:1px solid var(--border);border-radius:var(--rs);background:var(--white);font-family:inherit">
          ${statusOptions(v.status)}
        </select>
      </td>
      <td>${readinessBar(v)}</td>
      <td>${rb(v.risk||'medium')}</td>
      <td>${trafficLight(v)}</td>
      <td>${dc(d)}</td>
      <td class="email-activity" style="color:var(--muted)">
        <strong>Sent</strong> ${v.emailsSent||0} · ${v.lastEmailDate?new Date(v.lastEmailDate).toLocaleDateString('en-GB'):'—'}<br>
        <strong>Received</strong> ${v.emailsReceived||0} · ${v.lastReceivedDate?new Date(v.lastReceivedDate).toLocaleDateString('en-GB'):'—'}
      </td>
      <td style="font-size:12px;color:var(--muted)">${fmtDT(v.lastActivity||v.lastReceivedDate||v.lastEmailDate||v.lastContact)}</td>
      <td>
        <div style="font-size:12px;color:var(--text);font-weight:500;padding:4px 2px">${(TEAM_USERS.find(u=>u.email===(v.assignedTo||''))?.name||v.assignedTo||'Unassigned').split('@')[0]}</div>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn btn-s" title="View & Status" onclick="event.stopPropagation();var _i=${idx};setTimeout(function(){openV(_i);},0)"><i class="ti ti-eye"></i> View</button>
          <button class="btn btn-p btn-s" title="Analyze AI" onclick="event.stopPropagation();var _i=${idx};setTimeout(function(){openCaseAnalyze(_i);},0)"><i class="ti ti-robot"></i> Analyze</button>
          <button class="btn btn-s" title="Transfer ownership" onclick="event.stopPropagation();var _i=${idx};setTimeout(function(){transferOwnership(_i);},0)" style="font-size:11px"><i class="ti ti-arrows-exchange"></i> Transfer</button>
          ${adminDelete}
        </div>
      </td>
    </tr>`;
  }).join('');
}
function updateMetrics(){
  // Use vessels directly — same data the table is built from
  document.getElementById('m-t').textContent=vessels.length;
  const _rCount=vessels.filter(v=>v.status==='ready'||v.status==='scheduled'||v.status==='completed').length;
  const _mrEl=document.getElementById('m-r');if(_mrEl){_mrEl.textContent=_rCount;_mrEl.style.color='#003d1a';}
  const _atEl=document.getElementById('m-a');
  const _atCount=vessels.filter(v=>v.status==='followup'||v.risk==='high'||ds(v.lastContact)>=7).length;
  if(_atEl){_atEl.textContent=_atCount;_atEl.style.color=_atCount>0?'#E24B4A':'#1D2E6B';}
  document.getElementById('m-w').textContent=vessels.filter(v=>v.status==='waiting').length;
  // Update charts with same full vessel set
  _updateCharts(vessels);
}

// ── Dashboard Charts ──────────────────────────────────────────────────────────
function _updateCharts(myVessels){
  if(!myVessels||!myVessels.length)return;
  // ── Donut 1: Status Distribution (original — by status value) ────────────────
  const statusColors={
    waiting:'#6b7fa8',followup:'#E8A838','csm-followup':'#5B8EE6',
    ready:'#1D6B3E',scheduled:'#2E86AB',completed:'#888'
  };
  const statusCounts={};
  myVessels.forEach(v=>{const s=v.status||'waiting';statusCounts[s]=(statusCounts[s]||0)+1;});
  const total=myVessels.length;
  const _buildDonut=(svgId,legendId,slices,centerText)=>{
    const cx=45,cy=45,r=32,stroke=14;
    let offset=0,paths='',legendHtml='';
    const tot=slices.reduce((s,sl)=>s+sl.count,0)||1;
    slices.forEach(({label,count,color})=>{
      const pct=count/tot;
      const angle=pct*2*Math.PI;
      const x1=cx+r*Math.sin(offset);const y1=cy-r*Math.cos(offset);
      offset+=angle;
      const x2=cx+r*Math.sin(offset);const y2=cy-r*Math.cos(offset);
      const large=pct>0.5?1:0;
      if(slices.length===1||Math.abs(angle-2*Math.PI)<0.001){
        paths+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"/>`;
      } else {
        paths+=`<path d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" opacity=".9"/>`;
      }
      legendHtml+=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="width:10px;height:10px;border-radius:2px;background:${color};display:inline-block;flex-shrink:0"></span><span style="color:var(--text);font-size:11px">${label}: <strong>${count}</strong></span></div>`;
    });
    paths+=`<circle cx="${cx}" cy="${cy}" r="${r-stroke/2}" fill="#fff"/>`;
    paths+=`<text x="${cx}" y="${cy+5}" text-anchor="middle" style="font-size:14px;font-weight:700;fill:var(--navy)">${centerText}</text>`;
    const el=document.getElementById(svgId);if(el)el.innerHTML=paths;
    const lel=document.getElementById(legendId);if(lel)lel.innerHTML=legendHtml;
  };
  // Status distribution slices
  const statusSlices=Object.entries(statusCounts)
    .sort((a,b)=>b[1]-a[1])
    .map(([s,c])=>({label:sbText(s),count:c,color:statusColors[s]||'#ccc'}));
  _buildDonut('chart-donut','chart-legend',statusSlices,total);

  // ── Donut 2: Fleet Overview — matches the 4 metric cards ─────────────────────
  const catReady=myVessels.filter(v=>v.status==='ready'||v.status==='scheduled'||v.status==='completed').length;
  const catAttention=myVessels.filter(v=>v.status==='followup'||v.risk==='high'||ds(v.lastContact)>=7).length;
  const catWaiting=myVessels.filter(v=>v.status==='waiting').length;
  const catOther=Math.max(0,total-catReady-catAttention-catWaiting);
  const metricSlices=[
    {label:'Total Vessels',count:total,color:'#1D2E6B'},
    {label:'Ready',count:catReady,color:'#1D6B3E'},
    {label:'Awaiting Reply',count:catWaiting,color:'#6b7fa8'},
    {label:'Require Attention',count:catAttention,color:'#E24B4A'},
    ...(catOther>0?[{label:'Other',count:catOther,color:'#b0b8c9'}]:[])
  ].filter(s=>s.count>0&&s.label!=='Total Vessels');
  _buildDonut('chart-donut2','chart-legend2',metricSlices,total);
  // Avg readiness — use readinessScore() same as the table, exclude completed
  const active=myVessels.filter(v=>v.status!=='completed');
  const avgProgress=active.length?Math.round(active.reduce((s,v)=>s+(readinessScore(v)||v.progress||0),0)/active.length):0;
  const avgEl=document.getElementById('chart-avg-progress');
  const avgBar=document.getElementById('chart-avg-bar');
  if(avgEl)avgEl.textContent=avgProgress+'%';
  if(avgBar)avgBar.style.width=avgProgress+'%';
  // Avg reply time
  const withReply=myVessels.filter(v=>v.lastReceivedDate&&v.lastEmailDate);
  let avgReply='—';
  if(withReply.length){
    const avg=withReply.reduce((s,v)=>{
      const diff=(new Date(v.lastReceivedDate)-new Date(v.lastEmailDate))/(1000*60*60*24);
      return s+Math.max(0,diff);
    },0)/withReply.length;
    avgReply=avg<1?'<1':Math.round(avg)+'d';
  }
  const replyEl=document.getElementById('chart-avg-reply');
  if(replyEl)replyEl.textContent=avgReply;
}

// ── Metric card modal ─────────────────────────────────────────────────────────
let _currentMetricFilter='';
function openMetricModal(filter){
  _currentMetricFilter=filter;
  const myEmail=normEmail(user&&user.email);
  // Admins see all vessels; regular users see only their assigned ones
  const myVessels=isAdmin(user&&user.email)?vessels:vessels.filter(v=>normEmail(v.assignedTo||'')==myEmail||!v.assignedTo);
  let filtered=myVessels;
  const titles={
    total:{title:'All Vessels',sub:'Complete vessel list'},
    ready:{title:'Ready for Installation',sub:'Vessels with status Ready, Scheduled or Completed'},
    waiting:{title:'Awaiting Reply',sub:'Vessels waiting for captain response'},
    attention:{title:'Require Attention',sub:'Follow-up required, high risk, or no activity in 7+ days'}
  };
  if(filter==='ready')filtered=myVessels.filter(v=>v.status==='ready'||v.status==='scheduled'||v.status==='completed');
  else if(filter==='waiting')filtered=myVessels.filter(v=>v.status==='waiting');
  else if(filter==='attention')filtered=myVessels.filter(v=>v.status==='followup'||v.risk==='high'||ds(v.lastContact)>=7);
  const info=titles[filter]||titles.total;
  document.getElementById('metric-modal-title').textContent=info.title;
  document.getElementById('metric-modal-sub').textContent=info.sub;
  document.getElementById('metric-modal-count').textContent=filtered.length+' vessel'+(filtered.length!==1?'s':'');
  const tbody=document.getElementById('metric-modal-tbody');
  if(tbody)tbody.innerHTML=filtered.map(v=>{
    const replyAge=v.lastReceivedDate?ds(v.lastReceivedDate):null;
    const owner=(TEAM_USERS.find(u=>u.email===(v.assignedTo||''))?.name||v.assignedTo||'Unassigned').split('@')[0];
    const missing=(v.missingItems||[]).length;
    return`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:9px 10px"><strong style="font-size:12px">${escapeHtml(v.name)}</strong><div style="font-size:10px;color:var(--muted)">${escapeHtml(v.email||'')}</div></td>
      <td style="padding:9px 10px">${sb(v.status)}</td>
      <td style="padding:9px 10px;font-size:12px">${escapeHtml(owner)}</td>
      <td style="padding:9px 10px;text-align:center;font-size:12px;font-weight:600;color:var(--navy)">${readinessScore(v)||v.progress||0}%</td>
      <td style="padding:9px 10px;text-align:center">${replyAge!==null?dc(replyAge):'<span style="color:#ccc">—</span>'}</td>
      <td style="padding:9px 10px;font-size:11px;color:var(--muted)">${missing>0?missing+' missing':'<span style="color:#003d1a">✓ Complete</span>'}</td>
    </tr>`;
  }).join('');
  document.getElementById('mod-metric').style.display='flex';
}

// ── Export metric to new Google Sheet ────────────────────────────────────────
async function exportMetricToSheet(){
  // Delegate to persistent export — same file overwritten each time
  await exportActiveToSheet(_currentMetricFilter);
}
// ── Analytics Tab ─────────────────────────────────────────────────────────────
function renderAnalytics(){
  const vv=vessels.filter(v=>v.status!=='');
  if(!vv.length)return;

  // ── KPI cards ──
  const total=vv.length;
  const ready=vv.filter(v=>v.status==='ready'||v.status==='scheduled'||v.status==='completed').length;
  const attention=vv.filter(v=>v.status==='followup'||v.risk==='high'||ds(v.lastContact)>=7).length;
  const waiting=vv.filter(v=>v.status==='waiting').length;
  const avgReady=Math.round(vv.reduce((s,v)=>s+(readinessScore(v)||v.progress||0),0)/total);
  const withReply=vv.filter(v=>v.lastReceivedDate&&v.lastEmailDate);
  const avgReplyDays=withReply.length?Math.round(withReply.reduce((s,v)=>s+Math.max(0,(new Date(v.lastReceivedDate)-new Date(v.lastEmailDate))/(86400000)),0)/withReply.length):null;

  const kpis=[
    {label:'Total Vessels',val:total,color:'var(--navy)',icon:'ti-ship'},
    {label:'Ready',val:ready,color:'#1D6B3E',icon:'ti-circle-check'},
    {label:'Need Attention',val:attention,color:'#E24B4A',icon:'ti-alert-triangle'},
    {label:'Awaiting Reply',val:waiting,color:'#6b7fa8',icon:'ti-clock'},
    {label:'Avg Readiness',val:avgReady+'%',color:'var(--navy)',icon:'ti-chart-bar'},
    {label:'Avg Reply Time',val:avgReplyDays!=null?(avgReplyDays<1?'<1d':avgReplyDays+'d'):'—',color:'#2E86AB',icon:'ti-mail'},
  ];
  const kpiEl=document.getElementById('an-kpi');
  if(kpiEl)kpiEl.innerHTML=kpis.map(k=>`
    <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:18px 20px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:8px">
        <i class="ti ${k.icon}" style="margin-right:4px"></i>${k.label}
      </div>
      <div style="font-size:32px;font-weight:800;color:${k.color};line-height:1">${k.val}</div>
    </div>`).join('');

  // ── Helper: horizontal bar ──
  const _hbar=(container,items,maxVal)=>{
    const el=document.getElementById(container);if(!el)return;
    el.innerHTML=items.map(({label,count,color})=>{
      const pct=maxVal?Math.round((count/maxVal)*100):0;
      return`<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span style="color:var(--text)">${label}</span>
          <span style="font-weight:700;color:var(--navy)">${count}</span>
        </div>
        <div style="background:#f0f2f8;border-radius:4px;height:10px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width .6s"></div>
        </div>
      </div>`;
    }).join('');
  };

  // ── Status breakdown ──
  const statusItems=[
    {label:'Follow-up required',count:vv.filter(v=>v.status==='followup').length,color:'#E8A838'},
    {label:'Waiting for reply',count:waiting,color:'#6b7fa8'},
    {label:'CSM Follow-up',count:vv.filter(v=>v.status==='csm-followup').length,color:'#5B8EE6'},
    {label:'Ready / Scheduled',count:vv.filter(v=>v.status==='ready'||v.status==='scheduled').length,color:'#1D6B3E'},
    {label:'Completed',count:vv.filter(v=>v.status==='completed').length,color:'#888'},
  ].filter(s=>s.count>0);
  _hbar('an-status-bars',statusItems,total);

  // ── Readiness distribution ──
  const rBuckets=[
    {label:'0–25%',count:vv.filter(v=>{const s=readinessScore(v)||v.progress||0;return s<25;}).length,color:'#E24B4A'},
    {label:'25–50%',count:vv.filter(v=>{const s=readinessScore(v)||v.progress||0;return s>=25&&s<50;}).length,color:'#E8A838'},
    {label:'50–75%',count:vv.filter(v=>{const s=readinessScore(v)||v.progress||0;return s>=50&&s<75;}).length,color:'#2E86AB'},
    {label:'75–100%',count:vv.filter(v=>{const s=readinessScore(v)||v.progress||0;return s>=75;}).length,color:'#1D6B3E'},
  ];
  _hbar('an-readiness-bars',rBuckets,total);

  // ── Fleet donut ──
  const fleetCounts={};
  vv.forEach(v=>{const f=v.fleet||'No fleet';fleetCounts[f]=(fleetCounts[f]||0)+1;});
  const fleetColors=['#1D2E6B','#1D6B3E','#E8A838','#2E86AB','#E24B4A','#5B8EE6','#888','#6b7fa8'];
  const fleetEntries=Object.entries(fleetCounts).sort((a,b)=>b[1]-a[1]);
  const cx=55,cy=55,r=38,stroke=16;
  let offset=0,paths='',fLegend='';
  fleetEntries.forEach(([fleet,count],fi)=>{
    const color=fleetColors[fi%fleetColors.length];
    const pct=count/total;const angle=pct*2*Math.PI;
    const x1=cx+r*Math.sin(offset);const y1=cy-r*Math.cos(offset);
    offset+=angle;
    const x2=cx+r*Math.sin(offset);const y2=cy-r*Math.cos(offset);
    const large=pct>0.5?1:0;
    if(fleetEntries.length===1||Math.abs(angle-2*Math.PI)<0.001){
      paths+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"/>`;
    } else {
      paths+=`<path d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" opacity=".9"/>`;
    }
    fLegend+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:12px;height:12px;border-radius:3px;background:${color};display:inline-block;flex-shrink:0"></span><span>${escapeHtml(fleet)}: <strong>${count}</strong></span></div>`;
  });
  paths+=`<circle cx="${cx}" cy="${cy}" r="${r-stroke/2}" fill="#fff"/>`;
  paths+=`<text x="${cx}" y="${cy+5}" text-anchor="middle" style="font-size:16px;font-weight:700;fill:var(--navy)">${total}</text>`;
  const fDonut=document.getElementById('an-fleet-donut');if(fDonut)fDonut.innerHTML=paths;
  const fLeg=document.getElementById('an-fleet-legend');if(fLeg)fLeg.innerHTML=fLegend;

  // ── Team performance table ──
  const teamMap={};
  vv.forEach(v=>{
    const owner=v.assignedTo||'Unassigned';
    if(!teamMap[owner])teamMap[owner]={vessels:0,totalReady:0,totalReply:0,replyCount:0};
    teamMap[owner].vessels++;
    teamMap[owner].totalReady+=readinessScore(v)||v.progress||0;
    if(v.lastReceivedDate&&v.lastEmailDate){
      const d=(new Date(v.lastReceivedDate)-new Date(v.lastEmailDate))/86400000;
      if(d>=0){teamMap[owner].totalReply+=d;teamMap[owner].replyCount++;}
    }
  });
  const teamRows=Object.entries(teamMap).sort((a,b)=>b[1].vessels-a[1].vessels).map(([email,d])=>{
    const name=(TEAM_USERS.find(u=>u.email===email)?.name||email).split('@')[0];
    const avgR=Math.round(d.totalReady/d.vessels);
    const avgRep=d.replyCount?Math.round(d.totalReply/d.replyCount):null;
    return`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 6px;font-weight:600">${escapeHtml(name)}</td>
      <td style="padding:8px 6px;text-align:center">${d.vessels}</td>
      <td style="padding:8px 6px;text-align:center;color:var(--navy);font-weight:600">${avgR}%</td>
      <td style="padding:8px 6px;text-align:center;color:var(--muted)">${avgRep!=null?(avgRep<1?'<1d':avgRep+'d'):'—'}</td>
    </tr>`;
  }).join('');
  const teamEl=document.getElementById('an-team-table');
  if(teamEl)teamEl.innerHTML=`<table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#f4f6fb">
      <th style="padding:7px 6px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">Owner</th>
      <th style="padding:7px 6px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">Vessels</th>
      <th style="padding:7px 6px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">Avg Ready</th>
      <th style="padding:7px 6px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">Avg Reply</th>
    </tr></thead>
    <tbody>${teamRows}</tbody>
  </table>`;

  // ── Risk distribution ──
  const riskItems=[
    {label:'High Risk',count:vv.filter(v=>v.risk==='high').length,color:'#E24B4A'},
    {label:'Medium Risk',count:vv.filter(v=>v.risk==='medium'||!v.risk).length,color:'#E8A838'},
    {label:'Low Risk',count:vv.filter(v=>v.risk==='low').length,color:'#1D6B3E'},
  ].filter(r=>r.count>0);
  _hbar('an-risk-bars',riskItems,total);

  // ── Reply time distribution ──
  const replyItems=[
    {label:'No reply yet',count:vv.filter(v=>!v.lastReceivedDate).length,color:'#b0b8c9'},
    {label:'< 1 day',count:vv.filter(v=>{const d=ds(v.lastReceivedDate);return d!==null&&d<1;}).length,color:'#1D6B3E'},
    {label:'1–3 days',count:vv.filter(v=>{const d=ds(v.lastReceivedDate);return d!==null&&d>=1&&d<3;}).length,color:'#2E86AB'},
    {label:'3–7 days',count:vv.filter(v=>{const d=ds(v.lastReceivedDate);return d!==null&&d>=3&&d<7;}).length,color:'#E8A838'},
    {label:'7+ days',count:vv.filter(v=>{const d=ds(v.lastReceivedDate);return d!==null&&d>=7;}).length,color:'#E24B4A'},
  ].filter(r=>r.count>0);
  _hbar('an-reply-bars',replyItems,total);
}

// ── Completed Vessels Tab ─────────────────────────────────────────────────────
let _completedVessels=null; // cached after first load

async function renderCompleted(){
  const tbody=document.getElementById('completed-tbody');
  const table=document.getElementById('completed-table');
  const empty=document.getElementById('completed-empty');
  const loading=document.getElementById('completed-loading');
  if(!tbody)return;
  // Load from archive Sheet if not already cached
  if(!_completedVessels){
    if(loading)loading.style.display='block';
    if(table)table.style.display='none';
    if(empty)empty.style.display='none';
    _completedVessels=await loadArchivedVessels();
    if(loading)loading.style.display='none';
  }
  const search=(document.getElementById('completed-search')?.value||'').toLowerCase();
  const filtered=_completedVessels.filter(v=>
    !search||v.name?.toLowerCase().includes(search)||v.email?.toLowerCase().includes(search)||v.fleet?.toLowerCase().includes(search)
  );
  if(!filtered.length){
    if(table)table.style.display='none';
    if(empty)empty.style.display='block';
    return;
  }
  if(empty)empty.style.display='none';
  if(table)table.style.display='';
  tbody.innerHTML=filtered.map((v,i)=>{
    const archivedDate=v.archivedAt?new Date(v.archivedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
    const owner=(TEAM_USERS.find(u=>u.email===(v.assignedTo||''))?.name||v.assignedTo||'—').split('@')[0];
    const score=readinessScore(v)||v.progress||0;
    return`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px"><strong style="font-size:13px">${escapeHtml(v.name||'')}</strong><div style="font-size:11px;color:var(--muted)">${escapeHtml(v.email||'')}</div></td>
      <td style="padding:10px">${sb(v.status||'completed')}</td>
      <td style="padding:10px;font-size:12px">${escapeHtml(owner)}</td>
      <td style="padding:10px;text-align:center;font-size:12px;font-weight:600;color:var(--navy)">${score}%</td>
      <td style="padding:10px;font-size:12px">${v.fleet?`<span style="font-size:10px;background:#e8edf8;color:#1D2E6B;border-radius:4px;padding:2px 8px;font-weight:600">&#9749; ${escapeHtml(v.fleet)}</span>`:'—'}</td>
      <td style="padding:10px;font-size:12px;color:var(--muted)">${archivedDate}</td>
      <td style="padding:10px"><button class="btn btn-s" onclick="openCompletedVessel(${i})" style="font-size:11px"><i class="ti ti-eye"></i> View</button></td>
    </tr>`;
  }).join('');
}

function openCompletedVessel(i){
  if(!_completedVessels||!_completedVessels[i])return;
  const v=_completedVessels[i];
  // Push into vessels array temporarily and open View modal
  const tmpIdx=vessels.length;
  vessels.push(v);
  openV(tmpIdx);
  // Remove after modal closes — patch the close button
  setTimeout(()=>{
    const closeButtons=document.querySelectorAll('#mod-view .btn');
    closeButtons.forEach(btn=>{
      if(btn.textContent.includes('Close')||btn.querySelector('.ti-x')){
        const orig=btn.onclick;
        btn.onclick=()=>{vessels.splice(tmpIdx,1);if(orig)orig();document.getElementById('mod-view').style.display='none';};
      }
    });
  },50);
}

// ── Completed vessels export — persistent file (overwrite same Sheet each time) ──
const _COMPLETED_EXPORT_KEY='orca_completed_export_id';
async function exportCompletedToSheet(){
  if(!token){await orcaAlert('Please sign in first.','Error');return;}
  if(!_completedVessels||!_completedVessels.length){await orcaAlert('No completed vessels to export.','Notice');return;}
  const search=(document.getElementById('completed-search')?.value||'').toLowerCase();
  const toExport=search?_completedVessels.filter(v=>v.name?.toLowerCase().includes(search)||v.email?.toLowerCase().includes(search)):_completedVessels;
  const headers=['Vessel Name','Email','Status','Owner','Readiness %','Fleet','Completed Date','Missing Items'];
  const rows=toExport.map(v=>{
    const owner=(TEAM_USERS.find(u=>u.email===(v.assignedTo||''))?.name||v.assignedTo||'');
    const archivedDate=v.archivedAt?new Date(v.archivedAt).toLocaleDateString('en-GB'):'';
    return[v.name||'',v.email||'',sbText(v.status||''),owner,readinessScore(v)||v.progress||0,v.fleet||'',archivedDate,(v.missingItems||[]).join(', ')];
  });
  await _persistentExport(_COMPLETED_EXPORT_KEY,'Orca AI — Completed Vessels',headers,rows);
}

// ── Active vessels export — persistent file ───────────────────────────────────
const _ACTIVE_EXPORT_KEY='orca_active_export_id';
async function exportActiveToSheet(filter){
  if(!token){await orcaAlert('Please sign in first.','Error');return;}
  let toExport=vessels;
  const titles={total:'Orca AI — All Vessels',ready:'Orca AI — Ready Vessels',waiting:'Orca AI — Awaiting Reply',attention:'Orca AI — Require Attention'};
  if(filter==='ready')toExport=vessels.filter(v=>v.status==='ready'||v.status==='scheduled'||v.status==='completed');
  else if(filter==='waiting')toExport=vessels.filter(v=>v.status==='waiting');
  else if(filter==='attention')toExport=vessels.filter(v=>v.status==='followup'||v.risk==='high'||ds(v.lastContact)>=7);
  if(!toExport.length){await orcaAlert('No vessels in this category.','Notice');return;}
  const key=`orca_export_${filter||'total'}`;
  const title=titles[filter]||titles.total;
  const headers=['Vessel Name','Email','Status','Owner','Readiness %','Reply Age (days)','Missing Items','Last Activity'];
  const rows=toExport.map(v=>{
    const owner=(TEAM_USERS.find(u=>u.email===(v.assignedTo||''))?.name||v.assignedTo||'');
    return[v.name||'',v.email||'',sbText(v.status||''),owner,readinessScore(v)||v.progress||0,v.lastReceivedDate?ds(v.lastReceivedDate):'',(v.missingItems||[]).join(', '),v.lastActivity||''];
  });
  await _persistentExport(key,title,headers,rows);
}

// ── Shared persistent export logic ───────────────────────────────────────────
// Stores the spreadsheet ID in localStorage. First call creates the file,
// subsequent calls overwrite the same file — no Drive clutter.
async function _persistentExport(storageKey,title,headers,rows){
  const existingId=localStorage.getItem(storageKey)||'';
  let ssId=existingId;
  try{
    if(ssId){
      // Check if the file still exists
      const check=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}?fields=spreadsheetId`,{headers:{Authorization:'Bearer '+token}});
      if(!check.ok)ssId=''; // deleted — create fresh
    }
    if(!ssId){
      // Create new spreadsheet
      const cr=await fetch('https://sheets.googleapis.com/v4/spreadsheets',{
        method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({properties:{title},sheets:[{properties:{title:'Data'}}]})
      });
      if(!cr.ok){await orcaAlert('Could not create spreadsheet.','Error');return;}
      const ss=await cr.json();ssId=ss.spreadsheetId;
      localStorage.setItem(storageKey,ssId);
    }
    // Clear existing content then write fresh data
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Data!A:Z:clear`,{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'
    });
    const values=[headers,...rows];
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Data!A1?valueInputOption=RAW`,{
      method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({values})
    });
    window.open(`https://docs.google.com/spreadsheets/d/${ssId}`,'_blank');
  }catch(e){console.error('export failed',e);await orcaAlert('Export failed: '+(e.message||e),'Error');}
}

function populateSel(){const s=document.getElementById('ra-sel');if(!s)return;s.innerHTML='<option value="">— Select vessel —</option>';vessels.forEach((v,i)=>{const o=document.createElement('option');o.value=i;o.textContent=v.name;s.appendChild(o);});}

// START MODAL
function val(id){const el=document.getElementById(id);return el&&typeof el.value==='string'?el.value.trim():'';}
function setVal(id,value){const el=document.getElementById(id);if(el&&typeof el.value==='string')el.value=value;}
function show(id,display){const el=document.getElementById(id);if(el)el.style.display=display;}
function txt(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
function openStart(){
  openModalWithFleetList();show('mod-start','flex');show('mod-ep','none');show('btn-snd','none');show('btn-gen','inline-flex');['mv','me','mo','md'].forEach(id=>setVal(id,''));}

async function genEmail(){
  const v=val('mv'),e=val('me'),o=val('mo'),d=val('md');
  if(!v||!e){alert('Please enter vessel name and master email.');return;}
  show('mod-ep','block');show('mod-al','flex');txt('mod-ep-txt','');show('btn-gen','none');
  draft=`Dear Master,

My name is ${user.name||user.email}, and I am an Operations Specialist at Orca AI. We are preparing for the installation of the Orca AI system on board your vessel as part of the fleet-wide deployment program, and I will be your point of contact for the coordination process.

The Orca AI system is designed to enhance situational awareness on the bridge and support the Officer of the Watch alongside existing navigation systems such as radar and ECDIS.

Installation Process
Once the installation date is confirmed, an Orca AI Service Engineer will board the vessel to perform the installation. The process typically takes 12–18 hours and includes system installation, technical validation, and crew training.

To ensure a smooth installation, we kindly request your assistance with the items below.<br><br><strong></strong>

Information and Preparations Required

1. Cable Routing
Please confirm that suitable cable penetrations can be prepared for:
• Two outdoor cables from the compass deck to the bridge console.
• One cable from the bridge console to the VSAT rack or business switch.

2. Proposed monitor location photos
Please provide:
• Photographs of the proposed monitor location(s) for the Orca AI 24-inch monitor.
• Ideally, the monitor should be located close to the ECDIS or radar.
• If available, we recommend a location on the center console.

3. Bridge Console Compartments
Please provide photographs of the following bridge console compartments with the doors open:
• Center console compartment
• Port console compartment
• Starboard console compartment

4. Proposed Seapod Location
Please provide photographs of:
• The forward compass deck rail
• The proposed Seapod installation location

Please note that a clear view of 225 degrees is mandatory at the designated location. The camera requires:
• A clear 225-degree view at the designated location
• An unobstructed forward field of view
• Installation below and clear of all radars
• A minimum distance of 4 meters from the magnetic compass

If any structure or mounting bracket is required, we kindly ask that it be prepared before the engineer's visit.

Requested Response
To help us finalize the installation plan, we would appreciate receiving:
☐ Proposed monitor location photos
☐ Center console photo
☐ Port console photo
☐ Starboard console photo
☐ Proposed Seapod location photos
☐ Confirmation regarding cable penetrations

Relevant installation documents can be found here: ${d||'[ORCA AI Installation Documents Link]'}

Please do not hesitate to contact us if you have any questions. We look forward to working with you and your crew.

Kind regards,
${user.name||user.email}
Operations Specialist
Orca AI`;
  show('mod-al','none');txt('mod-ep-txt',draft);show('btn-snd','inline-flex');
}

async function sendAndSaveNew(){
  const v=sanitizeText(val('mv'),120),e=sanitizeEmail(val('me'))||val('me'),o=sanitizeText(val('mo'),120),d=sanitizeText(val('md'),300);
  if(!v||!e){alert('Please enter vessel name and master email.');return;}
  if(!e.includes('@')){alert('Please enter a valid master email address.');return;}
  const btn=document.getElementById('btn-snd');
  const oldHtml=btn?btn.innerHTML:'';
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader"></i> Sending...';}
  try{
    const htmlBody=buildHtmlEmail(draft,'ORCA AI OPS',d);
    const cc=[val('mcc')||'',OPS_CC_EMAIL].filter(Boolean).join(',');
    const bcc=val('mbcc')||'';
    const result=await sendGmail(e,'Orca AI Installation Coordination - '+v,htmlBody,true,cc,bcc);
    if(!result)return;
    // Capture Gmail thread ID + message ID so fetchInboxByThreads can link this entry
    const gmailThreadId=result.threadId||null;
    const gmailMsgId=result.id||null;
    const now=new Date().toISOString();
    const nv={
      id:Date.now(),
      name:v,
      email:e,
      owner:o,
      fleet:getSelectedFleet(),
      docs:d,
      status:'waiting',
      progress:0,
      risk:'medium',
      lastContact:now,
      lastEmailDate:now,
      firstEmailDate:now,
      lastActivity:now,
      emailsSent:1,
      emailsReceived:0,
      assignedTo:(user&&user.email)||'rami@orca-ai.io',
      nextAction:'Wait for master reply',
      receivedItems:[],
      missingItems:[...REQUIRED_ITEMS],
      timeline:[],
      gmailThreadId,  // stored so fetchInboxByThreads() can look up replies precisely
      captainCc:val('mcc')||''  // preserve initial CC for follow-ups
    };
    // Store gmailMsgId so fetchInboxByThreads won't add a duplicate "Email sent to captain" entry
    if(typeof addTimeline==='function')addTimeline(nv,'sent','Initial email sent',`Sent to ${e}`,'',gmailMsgId);
    vessels.push(nv);
    await saveVessels();
    try{updateMetrics();}catch(e){console.warn(e);}
    try{renderTable();}catch(e){console.error('renderTable failed',e);}
    try{populateSel();}catch(e){console.warn(e);}
    try{if(typeof renderAdmin==='function')renderAdmin();}catch(e){console.warn(e);}
    show('mod-start','none');
    showTab('dashboard');
    /* success: close modal and return to dashboard without popup */
  }catch(err){
    console.error(err);
    alert('Email was sent, but saving/updating the dashboard failed: '+(err.message||err));
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML=oldHtml||'<i class="ti ti-send"></i> Send via Gmail + Save';}
  }
}

// GMAIL

function buildFollowupHtmlEmail(followupText, docsLink){
  // Dedicated wrapper for follow-up emails. Never uses the initial installation template.
  const bodyText=String(followupText||'').trim();
  const htmlBody=bodyText
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\n/g,'<br>');
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f0ed;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0ed;padding:20px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #dddddd">
<tr><td style="background:#1D2E6B;padding:24px 36px">
  <div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:30px;font-weight:700;letter-spacing:2px;line-height:1">ORCA AI</div>
</td></tr>
<tr><td style="padding:34px 36px;color:#111111;font-size:14px;line-height:1.7">
${htmlBody}
</td></tr>
</table>
</td></tr>
</table>

</body></html>`;
}
function nextFollowupNumber(v){return Number(v.followupsSent||0)+1;}
function saveFollowupMeta(v,body){
  v.followupsSent=nextFollowupNumber(v);
  v.lastFollowupPreview=String(body||'').slice(0,500);
  addTimeline(v,'sent',`Follow-up #${v.followupsSent} sent`,String(body||'').split('\n').find(x=>x.trim().startsWith('•'))||'Missing items requested',body);
}

function buildHtmlEmail(plainText, senderName, docsLink) {
  const safeText = String(plainText||'');
  const contentHtml = /<\w+[^>]*>/.test(safeText) ? safeText : safeText.replace(/\n/g,'<br>');
  const logo = "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VmbarzXKUSaCmJ2d8UC/PPOUj794+AdymtAbDQ9onVfL8bYVV174b3HNeN77w9rvi/MKLjOld14YySgmJmZmm+65cc4lM/btW98erbOzXXst8ox+bIGrhTFDoNnQzPNxOlxJy4AP0e70aJW7ELP6Rc9TUsNPCHONtc5FBUV/wtnOvbbyAdVgeCLVuMEFHdkmEkFR54eoTQitCb3gFGu090V+OLL+UZnXDU0zpr3EBTKFE0U0GvVvFRb3H3Owdu3vqHlHTiP79j1VD45u5moafp+/cMd3Rx8icVK9/48tR+qrpg8s7He1oBe+JokhphkNW4eWFI4+VPv8I9EyeEN4XF5mRI3WN54x47rdJAGs1spDBo1zAdfC5cmcfHz9xEdNEmH7z+giBPD7iSshNMSSJfPe53UcOzGSSzzbudeED138T7nWurItGFJfSTUgEFCPR44FgdSnBU4kzc1VDXUN6+eWVxQOy8pM/zWYTO/BFxjVXASHYbteEHZAZOz3JSB0jjZUXbl79+P7SB/B6Wp9CrQftmPZTxYUFy5MyKT4+tun3r7ltvnn9MvJvMqUbtoA7xNtwqyoNwjf0jlmgwcPvKiuYcMl/9z5yPckRsaMWXqG1yeOZbXD+79utU5KSBubPn263yP6mI5un9c3Ytv7P5xJksSepgMXixrmoz5NeJEkSOAzYE807ejwnH/55b+NOS9LSa+tK0QdykHj2eIkfuolr1K2B2tEWxljlT6flJXKSDb/+McfaBkJmuD26BVXPJj39VfflWblZA1oO+Esdrs9nTODdbwg5Q2wHBM9voOedt/RHxqfa6J+huYkGZc6zvcefGaqc6o4wp5rpUZz82ZHWfHNt7W1Oc9Sa5cgpKcTuISLTQUvdmqyvDFnzovmjz/+cKhBpy9xOtynPi8QTJ50U9oPnF76zmwe0FRdbe2oT2Bev16fZkg3GR9htRv0hoTMlBC5eTkvudpdzICc1+dKmubjESWvyWRkap2C5EsstBpkQFHOmpPNjjpWe2OjQzXBM90ovCpzvGo0TPb7v015nk8ICLdXhcLt8KNf0Gx/qSq8nS5jLE4ViFAVuXxynmXOfJlIG1hjEQT58dFrmo8cyOXRaBc30FwfP/HRPIiwZYjBRraHpCT3I9J8EARh04tml0QrGHa+lhWh9S4CSYaySrTLTwSbQEQbfc0TsU/l+SAIkhi9ZnZRci2zp3KdpTXCp1dQlFMsWuybevW4EATpfXp1IXu6kCC7lRYWk1fQNbYIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgsTF/wE3Qs+q6cuh+QAAAABJRU5ErkJggg==";
  const icon = "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";
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 2);
  const dateStr = dueDate.toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f0ed;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0ed;padding:20px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #ddddd9">
  <!-- HEADER -->
  <tr><td style="background:#1D2E6B;padding:24px 36px">
  <div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:30px;font-weight:700;letter-spacing:2px;line-height:1">
    ORCA AI
  </div>
</td></tr>

  <!-- GREETING -->
  <tr><td style="padding:32px 36px 0 36px;font-size:14px;color:#1a1a1a;line-height:1.75">
    <p style="margin:0 0 14px 0">Dear Master,</p>
    <p style="margin:0 0 10px 0">We are the Operations team at Orca AI, currently preparing for the installation of the Orca AI system on board your vessel .</p>
    <p style="margin:0 0 10px 0">The Orca AI system is designed to enhance situational awareness on the bridge and support the Officer of the Watch alongside existing navigation systems such as radar and ECDIS.</p>
  </td></tr>

  <!-- INSTALLATION PROCESS -->
  <tr><td style="padding:20px 36px 0 36px">
    <p style="margin:0 0 8px 0;font-size:14px;font-weight:bold;color:#1D2E6B;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #1D2E6B;padding-bottom:5px">Installation Process</p>
    <p style="margin:8px 0 0 0;font-size:14px;color:#333;line-height:1.75">Once the installation date is confirmed, an Orca AI Service Engineer will board the vessel to perform the installation. The process typically takes <strong>12–18 hours</strong> and includes system installation, technical validation, and crew training.</p>
    <p style="margin:10px 0 0 0;font-size:14px;color:#333;line-height:1.75">To ensure a smooth installation, we kindly request your assistance with the items below.<br><br><strong></strong></p>
  </td></tr>

  <!-- SECTION TITLE -->
  <tr><td style="padding:20px 36px 12px 36px">
    <p style="margin:0;font-size:14px;font-weight:bold;color:#1D2E6B;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #1D2E6B;padding-bottom:5px">Information and Preparations Required</p>
  </td></tr>

  <!-- 1. UPCOMING PORT CALLS -->
  <tr><td style="padding:0 36px 16px 36px">
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#1a1a1a;text-decoration:underline">1. Upcoming Port Calls</p>
    <p style="margin:0 0 6px 0;font-size:13px;color:#444;line-height:1.6">Could you kindly share the next 2–3 upcoming port calls, along with the corresponding agent details for each port?</p>
  </td></tr>

  <!-- 2. CABLE ROUTING -->
  <tr><td style="padding:0 36px 16px 36px">
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#1a1a1a;text-decoration:underline">2. Cable Routing</p>
    <p style="margin:0 0 6px 0;font-size:13px;color:#444;line-height:1.6">Please confirm that suitable cable penetrations can be prepared for:</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 0 10px">
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; Two outdoor cables from the compass deck to the bridge console</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; One cable from the bridge console to the VSAT rack or business switch</td></tr>
    </table>
  </td></tr>

  <!-- 2. MONITOR LOCATION -->
  <tr><td style="padding:0 36px 16px 36px">
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#1a1a1a;text-decoration:underline">3. Monitor Location</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 0 10px">
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; A photograph of the preferred installation location for the Orca AI 24" monitor</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; Ideally located close to ECDIS or radar — preferably on the center console</td></tr>
    </table>
  </td></tr>

  <!-- 3. BRIDGE CONSOLE -->
  <tr><td style="padding:0 36px 16px 36px">
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#1a1a1a;text-decoration:underline">4. Bridge Console Compartments</p>
    <p style="margin:0 0 6px 0;font-size:13px;color:#444;line-height:1.6">Please provide photographs of the following compartments with the doors open:</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 0 10px">
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; Center console compartment</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; Port console compartment</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; Starboard console compartment</td></tr>
    </table>
  </td></tr>

  <!-- 4. SEAPOD -->
  <tr><td style="padding:0 36px 16px 36px">
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#1a1a1a;text-decoration:underline">5. Proposed Seapod Location</p>
    <p style="margin:0 0 6px 0;font-size:13px;color:#444;line-height:1.6">Please provide photographs of:</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 8px 10px">
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; The forward compass deck rail</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; The proposed Seapod installation location</td></tr>
    </table>
    <p style="margin:0 0 4px 0;font-size:13px;color:#444;line-height:1.6">Please note that a clear view of 225 degrees is mandatory at the designated location. The camera requires:</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 8px 10px">
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; A clear 225-degree view at the designated location</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; An unobstructed forward field of view</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; Installation below and clear of all radars</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0;line-height:1.6">&#9658;&nbsp; A minimum distance of 4 meters from the magnetic compass</td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#444;font-style:italic">If any structure or mounting bracket is required, we kindly ask that it be prepared before the engineer's visit.</p>
  </td></tr>

  <!-- CHECKLIST -->
  <tr><td style="padding:8px 36px 16px 36px;background:#f7f7f5;border-top:1px solid #e5e5e2;border-bottom:1px solid #e5e5e2">
    <p style="margin:0 0 10px 0;font-size:13px;font-weight:bold;color:#1D2E6B">Requested Response</p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#444">To help us finalize the installation plan, we would appreciate receiving:</p>
    <table cellpadding="0" cellspacing="0">
      <tr><td style="font-size:13px;color:#444;padding:2px 0">&#9744;&nbsp; Next 2–3 upcoming port calls + corresponding agent details for each port</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0">&#9744;&nbsp; Vessel GA</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0">&#9744;&nbsp; Bridge Console GA</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0">&#9744;&nbsp; Proposed monitor location photos</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0">&#9744;&nbsp; Center console photo</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0">&#9744;&nbsp; Port console photo</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0">&#9744;&nbsp; Starboard console photo</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0">&#9744;&nbsp; Proposed Seapod location photos</td></tr>
      <tr><td style="font-size:13px;color:#444;padding:2px 0">&#9744;&nbsp; Confirmation regarding cable penetrations</td></tr>
    </table>
    <p style="margin:10px 0 0 0;font-size:13px;color:#444">We would appreciate receiving the above information by <strong>${dateStr}</strong>.</p>
    
  </td></tr>

  <!-- CLOSING -->
  <tr><td style="padding:20px 36px 8px 36px;font-size:14px;color:#333;line-height:1.75">
    <p style="margin:0 0 10px 0">Please do not hesitate to contact us if you have any questions. We look forward to working with you and your crew.</p>
  </td></tr>

  <!-- SIGNATURE -->
  <tr><td style="padding:8px 36px 28px 36px;border-top:1px solid #e5e5e2">
    <p style="margin:0 0 2px 0;font-size:13px;color:#555">Kind regards,</p>
    <p style="margin:6px 0 2px 0;font-size:14px;font-weight:bold;color:#1a1a1a">Orca AI - OPS Department</p>
    <img src="data:image/png;base64,${logo}" alt="Orca AI" height="28" style="display:block;margin-top:10px"/>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1D2E6B;padding:12px 36px;text-align:center">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.55)">Orca AI Installation Coordinator &nbsp;|&nbsp; This email was sent via the Orca AI Operations Portal</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function stripHtmlForText(s){
  return String(s||'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
}

// Resolve a threadId that is valid in the CURRENT user's Gmail before sending.
// Stored threadIds only work in the original sender's account (account-specific).
// Fallback: find the coordination thread by subject in this account's mailbox.
async function resolveSendThreadId(v){
  const tid=v&&v.gmailThreadId;
  if(!tid)return '';
  try{
    const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${tid}?fields=threadId`,{headers:{Authorization:'Bearer '+token}});
    if(r.ok)return tid;
  }catch(e){}
  try{
    const q=encodeURIComponent(`subject:"Orca AI Installation Coordination - ${v.name||''}"`);
    const sr=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/threads?q='+q+'&maxResults=1',{headers:{Authorization:'Bearer '+token}});
    if(sr.ok){
      const sd=await sr.json();
      if(sd.threads&&sd.threads.length)return sd.threads[0].id;
    }
  }catch(e){}
  return '';
}

// Recipients line shown above follow-up drafts — To + full Cc visibility (was invisible before).
// Cc must mirror the ACTUAL send list: ops@orca-ai.io + captainCc (preserved from replies).
function _recipientsHtml(v,idx){
  const ccs=[OPS_CC_EMAIL,...String((v&&v.captainCc)||'').split(',').map(s=>s.trim()).filter(Boolean)]
    .filter((x,i,a)=>a.indexOf(x)===i).join(', ');
  return '<span style="font-size:12px;color:var(--muted)">To: <strong style="color:var(--text)">'+escapeHtml((v&&v.email)||'(no email set — click ✏️)')
    +'</strong> &nbsp;·&nbsp; Cc: '+escapeHtml(ccs)
    +' <button class="btn btn-s" style="padding:1px 7px;font-size:10px;vertical-align:middle" title="Edit master email" onclick="editVesselEmail('+idx+')"><i class="ti ti-pencil"></i></button></span>';
}

// Edit the master email address on a vessel (fixes bounced addresses like MSC BRISBANE III)
async function editVesselEmail(idx){
  const v=vessels[idx];if(!v)return;
  const overlay=document.getElementById('orca-modal-overlay');
  document.getElementById('orca-modal-title').textContent='Master email — '+v.name;
  document.getElementById('orca-modal-msg').innerHTML=
    '<input id="ve-new" type="email" placeholder="master@vessel.com" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;font-size:14px;box-sizing:border-box" value="'+escapeHtml(v.email||'')+'"/>';
  document.getElementById('orca-modal-cancel').style.display='inline-block';
  document.getElementById('orca-modal-cancel').textContent='Cancel';
  document.getElementById('orca-modal-ok').textContent='Save';
  overlay.classList.add('show');
  const result=await new Promise(resolve=>{
    const ok=document.getElementById('orca-modal-ok');
    const cancel=document.getElementById('orca-modal-cancel');
    const cleanup=()=>overlay.classList.remove('show');
    const onOk=()=>{cleanup();ok.removeEventListener('click',onOk);cancel.removeEventListener('click',onCancel);resolve((document.getElementById('ve-new')?.value||'').trim());};
    const onCancel=()=>{cleanup();ok.removeEventListener('click',onOk);cancel.removeEventListener('click',onCancel);resolve(null);};
    ok.addEventListener('click',onOk);cancel.addEventListener('click',onCancel);
  });
  if(result===null)return;
  if(result&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)){await orcaAlert('That does not look like a valid email address. Nothing was changed.','Invalid email');return;}
  vessels[idx].email=result;
  saveVessels();renderTable();
  const emEl=document.getElementById('mv-email');if(emEl&&window._mvIdx===idx)emEl.textContent=result;
  const rc1=document.getElementById('mv-recipients');if(rc1&&window._mvIdx===idx)rc1.innerHTML=_recipientsHtml(vessels[idx],idx);
  const rc2=document.getElementById('mib-recipients');if(rc2&&curIb&&curIb.vi===idx)rc2.innerHTML=_recipientsHtml(vessels[idx],idx);
}

async function sendGmail(to, subj, body, isHtml=false, cc="", bcc="", threadId="") {
  if(!token){alert('Not authenticated.');return false;}
  const html = isHtml ? body : body.replace(/\n/g,'<br>');
  const boundary = 'orca_boundary_' + Date.now();
  const mime = [
    `From: ORCA AI OPS <${user.email}>`,
    `To: ${to}`,
    ...(cc?[`Cc: ${cc}`]:[]),
    ...(bcc?[`Bcc: ${bcc}`]:[]),
    `Subject: ${subj}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    html,
    ``,
    `--${boundary}--`
  ].join('\r\n');
  const raw = btoa(unescape(encodeURIComponent(mime))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  // Pass threadId to keep follow-ups in the same Gmail thread as the original coordination email
  const payload = threadId ? {raw, threadId} : {raw};
  try{
    let r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    // threadId is account-specific — it only exists in the ORIGINAL sender's Gmail.
    // If it doesn't exist in THIS account (vessel transferred/restored), Gmail
    // returns 404 "Requested entity was not found". Retry once WITHOUT threadId
    // so the follow-up still goes out (starts a fresh thread in this account).
    if(!r.ok&&threadId){
      const et=await r.text();
      if(/requested entity was not found/i.test(et)){
        console.warn('[sendGmail] threadId not in this account — retrying without it');
        r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({raw})});
      } else {
        try{const e=JSON.parse(et);alert('Gmail error: '+(e.error?.message||et));}catch(_){alert('Gmail error: '+et);}
        return false;
      }
    }
    if(!r.ok){const e=await r.json();alert('Gmail error: '+JSON.stringify(e.error?.message||e));return false;}
    // Return the full response — callers check truthiness (object = truthy, false = failure)
    // threadId is used to track the exact Gmail conversation thread per vessel
    return await r.json(); // { id, threadId, labelIds }
  } catch(e){alert('Send error: '+e);return false;}
}

// INBOX


function inboxNorm(s){return String(s||'').toLowerCase().replace(/\s+/g,' ').trim();}
function inboxEmail(s){return String(s||'').toLowerCase().trim();}
function inboxWhen(v){
  const d=new Date(v&&(v.updatedAt||v.lastActivity||v.lastContact||v.createdAt||0)).getTime();
  return Number.isFinite(d)?d:0;
}function inboxNameHit(m,v){
  const n=inboxNorm(v&&v.name);
  if(!n||n.length<3)return false;
  const s=inboxNorm(m&&(m.subj||m.subject));
  // Must match on subject line AND subject must look like an Orca coordination email
  const isOrcaSubject=s.includes('orca')||s.includes('installation coordination')||s.includes('installation co');
  return isOrcaSubject && s.includes(n);
}// Escape HTML special characters to prevent XSS when using innerHTML
function escapeHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Split raw email body into captain's reply and quoted chain.
// Returns { reply: string, quoted: string }
function parseEmailBody(raw){
  const text=String(raw||'').replace(/\r/g,'').trim();
  const lines=text.split('\n');
  const replyLines=[],quoteLines=[];
  let foundQuote=false;
  for(const line of lines){
    const trimmed=line.trim();
    if(!foundQuote&&(trimmed.startsWith('>')||/^On .{5,} wrote:$/i.test(trimmed))){
      foundQuote=true;
    }
    if(foundQuote){
      // Strip leading > markers so the quoted email reads cleanly
      quoteLines.push(line.replace(/^>+\s?/,''));
    } else {
      replyLines.push(line);
    }
  }
  return{
    reply:replyLines.join('\n').trim(),
    quoted:quoteLines.join('\n').trim()
  };
}

async function openInboxReply(idx){
  await new Promise(r=>setTimeout(r,0));
  const item=(ibItems||[])[idx];
  if(!item){await orcaAlert('Reply not found. Please click Check inbox again.');return;}
  const v=item.vessel||{};
  document.getElementById('view-reply-vessel').textContent=v.name||'Vessel';
  document.getElementById('view-reply-from').textContent='From: '+(item.from||'')+'  ·  '+(item.date||'');
  document.getElementById('view-reply-subj').textContent=item.subj||'';

  const parsed=parseEmailBody(item.body||'');
  const replyText=parsed.reply||'(no message content)';

  // Option B: clean reply at top + collapsible quoted chain below
  // Captain's reply — prominent, easy to read
  let html=`
    <div style="margin-bottom:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">Captain's message</div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:20px 22px;font-size:14px;line-height:1.85;white-space:pre-wrap;font-family:inherit;color:#1a1a1a;min-height:60px">${escapeHtml(replyText)||'<span style="color:var(--faint);font-style:italic">(no message content)</span>'}</div>`;

  if(parsed.quoted){
    const qid='qblock_'+Date.now();
    html+=`
    <div style="margin-top:16px">
      <button onclick="var el=document.getElementById('${qid}');var open=el.style.display!=='none';el.style.display=open?'none':'block';this.querySelector('.qic').className='qic ti '+(open?'ti-chevron-right':'ti-chevron-down')"
        style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;padding:6px 0;font-family:inherit;display:inline-flex;align-items:center;gap:6px;font-weight:500;letter-spacing:.01em">
        <i class="qic ti ti-chevron-right"></i> Show original email
      </button>
      <div id="${qid}" style="display:none;margin-top:8px;padding:16px 18px;background:#f7f7f5;border:1px solid var(--border);border-left:3px solid #c5cfe8;border-radius:0 8px 8px 0;font-size:13px;line-height:1.75;white-space:pre-wrap;font-family:inherit;color:#555;max-height:50vh;overflow-y:auto">${escapeHtml(parsed.quoted)}</div>
    </div>`;
  }

  document.getElementById('view-reply-body').innerHTML=html;
  document.getElementById('mod-view-reply').style.display='flex';
}
function updateReceivedStatsFromInbox(){
  if(!Array.isArray(ibItems)||!ibItems.length||!Array.isArray(vessels))return;
  vessels.forEach((v,vi)=>{
    // Match strictly by vessel index — one ibItem per vessel since our dedup fix.
    // NEVER overwrite emailsReceived from ibItems.length — ibItems is always 1 per vessel now.
    // emailsReceived is correctly incremented in fetchInboxByThreads for each new reply.
    // Here we only update lastReceivedDate from the ibItem's date.
    const match=ibItems.find(m=>m.vi===vi||m.vessel===v);
    if(match){
      const t=new Date(match.date||match.internalDate||match.receivedDate||match.timestamp||0).getTime();
      if(Number.isFinite(t)&&t>0)v.lastReceivedDate=new Date(t).toISOString();
    }
  });
}


function renderInlineInbox(){
  const box=document.getElementById('dash-inbox-inline');
  const list=document.getElementById('dash-inbox-list');
  if(!box||!list)return;
  box.style.display=window.showInlineInboxPanel?'block':'none';
  if(!window.showInlineInboxPanel)return;
  if(!ibItems||!ibItems.length){
    list.innerHTML='<div class="empty" style="padding:1rem">No new inbox replies found for the current vessels.</div>';
    return;
  }
  list.innerHTML=ibItems.map((it,i)=>{
    const v=it.vessel||{};
    const isNew=it.isNew===true;
    const cardStyle=isNew
      ?'border:1px solid #a8c8f0;border-radius:var(--rs);padding:12px 14px;margin-bottom:8px;background:linear-gradient(135deg,#e8f4ff 0%,#d4ebff 100%);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-left:4px solid #1D6B3E'
      :'border:1px solid #d0d8e8;border-radius:var(--rs);padding:12px 14px;margin-bottom:8px;background:#f8f9fc;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-left:4px solid #aab';
    const newBadge=isNew?'<span style="font-size:10px;background:#1D6B3E;color:#fff;border-radius:4px;padding:1px 7px;margin-left:6px;font-weight:700;vertical-align:middle">NEW</span>':'';
    return `<div style="${cardStyle}">
    <div style="min-width:0">
      <div style="font-weight:700;font-size:13px">${it.vessel?.name||'Vessel reply'}${newBadge}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">${it.from||''} · ${it.date||''}</div>
      <div style="font-size:12px;color:var(--navy);font-style:italic;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:650px">${it.subj||''}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:650px">${(it.body||'').replace(/\s+/g,' ').slice(0,180)}</div>
    </div>
    <div style="display:flex;gap:8px;flex-shrink:0"><button class="btn btn-s" onclick="var _i=${i};setTimeout(function(){openInboxReply(_i);},0)"><i class="ti ti-eye"></i> View reply</button><button class="btn btn-p btn-s" onclick="var _i=${i};setTimeout(function(){openIbModalSend(_i);},0)"><i class="ti ti-cpu"></i> Analyze</button><button class="btn btn-s" onclick="var _vi=${it.vi};setTimeout(function(){openLatestStatus(_vi);},0)" style="background:#f4f6fb;border-color:#c5cfe8;color:#1D2E6B"><i class="ti ti-report-analytics"></i> Status</button></div>
  </div>`;
  }).join('');
}

async function checkInbox(silent=false){
  const buttons=[document.getElementById('btn-chk'),document.getElementById('btn-chk-inbox-page')].filter(Boolean);
  if(!silent){
    buttons.forEach(b=>{b.disabled=true;b.innerHTML='<i class="ti ti-refresh" style="animation:spin .7s linear infinite"></i> Checking...';});
  }
  // Yield to browser so UI updates (spinner) before heavy work starts - fixes INP blocking
  await new Promise(r=>setTimeout(r,0));
  const _ibChanged=await fetchInbox();
  window.showInlineInboxPanel=true;
  updateReceivedStatsFromInbox();
  if(!silent){
    buttons.forEach(b=>{b.disabled=false;b.innerHTML='<i class="ti ti-refresh"></i> Check inbox';});
  }
  renderInlineInbox();renderInbox();renderTable();updateMetrics();if(_ibChanged)saveVessels();
  // Update badge smoothly after fetch — never reset to 0 mid-fetch
  const _badge=document.getElementById('ib-count');
  if(_badge){const _n=ibItems?ibItems.length:0;_badge.textContent=_n;_badge.style.display=_n?'inline':'none';}
  // Update the auto-checked timestamp label
  const lbl=document.getElementById('last-refresh-label');
  if(lbl) lbl.textContent='Auto-checked: '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  // Show toast only when triggered manually
  if(!silent){
    const _t=document.createElement('div');
    _t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1D2E6B;color:#fff;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.2)';
    const _cnt=typeof ibItems!=='undefined'?ibItems.length:0;
    _t.innerHTML=_cnt>0?'\u{1F4EC} Inbox checked \u2014 '+_cnt+' new repl'+(_cnt===1?'y':'ies')+' found':'\u2705 Inbox checked \u2014 no new replies';
    document.body.appendChild(_t);setTimeout(()=>_t.remove(),3500);
  }
}


// ── Google Sheets shared inbox ──
const INBOX_SHEET_NAME='inbox';
const INBOX_SHEET_URL=`https://sheets.googleapis.com/v4/spreadsheets/1Aveudwg5B8D-XrO04L33WibwtzWEaMVhLfDOMyNb3Y4/values/${encodeURIComponent(INBOX_SHEET_NAME)}`;

async function sheetsInboxSave(item){
  if(!token||!hasSharedDb())return;
  try{
    const row=[
      item.msgId||'',
      item.from||'',
      item.fe||'',
      item.subj||'',
      item.date||'',
      (item.body||'').substring(0,1000),
      item.vessel?.name||'',
      '',
      new Date().toISOString(),
      user?.email||''
    ];
    await fetch(INBOX_SHEET_URL+'!A1:append?valueInputOption=RAW',{
      method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({values:[row]})
    });
  }catch(e){
    console.error('sheetsInboxSave failed - check Sheets scope',e);
    // Show warning in UI
    const lbl=document.getElementById('last-refresh-label');
    if(lbl)lbl.textContent='⚠️ Could not save reply to shared sheet: '+( e?.message||e);
  }
}

async function sheetsInboxLoad(){
  if(!token||!hasSharedDb())return [];
  try{
    const r=await fetch(INBOX_SHEET_URL+'!A:J',{headers:{'Authorization':'Bearer '+token}});
    if(!r.ok)return [];
    const d=await r.json();
    const rows=(d.values||[]).slice(1); // skip header
    return rows.map(row=>{
      const vesselName=row[6]||'';
      // Match by name only - vi index differs per user
      const v=vessels.find(_v=>(_v.name||'').toLowerCase()===(vesselName||'').toLowerCase())||null;
      if(!v)return null;
      return {msgId:row[0],from:row[1],fe:row[2],subj:row[3],date:row[4],body:row[5],vessel:v,vi:vessels.indexOf(v)};
    }).filter(Boolean);
  }catch(e){console.warn('sheetsInboxLoad failed',e);return [];}
}

async function sheetsInboxInit(){
  // Ensure inbox sheet exists with a clean header in A1 only
  if(!token||!hasSharedDb())return;
  try{
    const r=await fetch(INBOX_SHEET_URL+'!A1',{headers:{'Authorization':'Bearer '+token}});
    const d=await r.json();
    const val=(d.values||[])[0]?.[0]||'';
    if(!val||val!=='msgId'){
      // Clear and write a single clean header row
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHARED_SHEET_ID}/values/${encodeURIComponent(INBOX_SHEET_NAME)}:clear`,{
        method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'
      });
      await fetch(INBOX_SHEET_URL+'!A1:append?valueInputOption=RAW',{
        method:'POST',
        headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({values:[['msgId','from','fe','subj','date','body','vesselName','vi','savedAt','savedBy']]})
      });
    }
  }catch(e){}
}

async function clearInboxLog(){
  if(!isAdmin()){await orcaAlert('Admin access required.','Error');return;}
  const go=await orcaConfirm('Clear the entire inbox log from Google Sheets?\n\nThis removes all saved reply entries. The portal will repopulate it as new replies arrive. Active inbox items in memory are not affected.','Clear Inbox Log');
  if(!go)return;
  try{
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHARED_SHEET_ID}/values/${encodeURIComponent(INBOX_SHEET_NAME)}:clear`,{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'
    });
    // Re-add clean header
    await fetch(INBOX_SHEET_URL+'!A1:append?valueInputOption=RAW',{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({values:[['msgId','from','fe','subj','date','body','vesselName','vi','savedAt','savedBy']]})
    });
    await orcaAlert('Inbox log cleared successfully.','✅ Done');
  }catch(e){await orcaAlert('Failed to clear inbox log: '+(e.message||e),'Error');}
}

async function mergeSharedInbox(){
  const shared=await sheetsInboxLoad();
  if(!shared.length)return;
  // Deduplicate by BOTH msgId AND vessel index (vi).
  // fetchInboxByThreads creates one item per vessel using the latest msgId.
  // The Sheet log may have older messages from the same thread with different msgIds.
  // Vessel-index dedup ensures we never add a Sheet-log item when a fresher
  // thread-fetched item already exists for that vessel.
  const existingIds=new Set((ibItems||[]).map(i=>i.msgId));
  const existingVis=new Set((ibItems||[]).map(i=>String(i.vi)));
  const myEmail=normEmail(user?.email||'');
  const isSuperAdmin=SUPER_ADMINS.includes(myEmail);
  let added=0;
  for(const item of shared){
    // Skip bounce/DSN rows logged before the bounce filter existed
    if(/mail delivery subsystem|mailer-daemon@|postmaster@|delivery status notification/i.test((item.from||'')+' '+(item.subj||'')))continue;
    if(existingIds.has(item.msgId))continue;
    if(item.vi!==undefined&&item.vi!==null&&existingVis.has(String(item.vi)))continue;
    // Validate: vessel must exist in portal
    if(!item.vessel)continue;
    // Each user only sees inbox replies for their assigned vessels
    if(!isSuperAdmin){
      const assignedTo=normEmail(item.vessel.assignedTo||'');
      if(assignedTo!==myEmail)continue;
    }
    // Strict subject filter: must be "Re: Orca AI Installation Coordination - VESSELNAME"
    const subj=(item.subj||'').toLowerCase();
    if(!subj.includes('re:'))continue;
    if(!subj.includes('orca ai installation coordination'))continue;
    // Vessel name must appear in subject
    const vn=(item.vessel.name||'').toLowerCase().trim();
    if(vn.length>1&&!subj.includes(vn))continue;
    // Validate: reply must be after first portal email
    const firstSent=item.vessel.firstEmailDate||item.vessel.lastEmailDate||null;
    if(firstSent&&item.date&&new Date(item.date)<new Date(firstSent))continue;
    // Skip quoted-chain-only items (empty body after cleaning — no real content)
    const cleanedBody=cleanCaptainReplyText(item.body||'').trim();
    if(!cleanedBody)continue;
    ibItems.push(item);
    existingVis.add(String(item.vi)); // prevent a later shared item with same vi sneaking in
    added++;
  }
  // Final dedup pass — one item per vessel, keep most recent by date
  const _byVi=new Map();
  ibItems.forEach(it=>{
    const k=String(it.vi);
    const existing=_byVi.get(k);
    if(!existing||new Date(it.date||0)>new Date(existing.date||0))_byVi.set(k,it);
  });
  ibItems=Array.from(_byVi.values());
  if(added>0){
    renderInlineInbox();renderInbox();
    const badge=document.getElementById('ib-count');
    if(badge){badge.textContent=ibItems.length;badge.style.display=ibItems.length?'inline':'none';}
  }
}
// ── NEW: Thread-based inbox fetch ─────────────────────────────────────────────
// For each vessel that has a stored gmailThreadId, fetch the exact Gmail thread
// and find any messages NOT sent by the ops team (i.e. captain replies).
// This replaces the old subject+email search approach which caused cross-contamination.
async function fetchInboxByThreads(){
  if(!token||!vessels.length)return false;
  let changed=false;
  const myEmail=normEmail(user&&user.email);
  const _isSuper=isSuperAdmin(myEmail);
  const myVessels=_isSuper?vessels:vessels.filter(v=>normEmail(v.assignedTo||'')===myEmail);
  // Only process vessels that have a stored Gmail thread ID
  const threadVessels=myVessels.filter(v=>v.gmailThreadId);
  if(!threadVessels.length)return;

  for(const vessel of threadVessels){
    try{
      let thread=null;
      let extraThreads=[]; // additional threads for this vessel (e.g. a fresh thread
                            // started by sendGmail's 404 self-heal, or one the captain's
                            // original reply landed in that never got "Re:" in its subject)
      // Try the stored threadId first (works for original sender's account)
      const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${vessel.gmailThreadId}?format=full`,{headers:{Authorization:'Bearer '+token}});
      if(r.ok){
        thread=await r.json();
      } else {
        // Thread not in this user's Gmail (e.g. vessel was transferred to a different account,
        // or the stored threadId is stale/broken). Fall back: search by subject line — works
        // for CC recipients after transfer, and self-heals the stored threadId going forward.
        try{
          const _subj=encodeURIComponent(`subject:"Orca AI Installation Coordination - ${vessel.name}"`);
          const _sr=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${_subj}&maxResults=5`,{headers:{Authorization:'Bearer '+token}});
          if(_sr.ok){
            const _sd=await _sr.json();
            if(_sd.threads&&_sd.threads.length){
              // Fetch ALL matching threads (not just the newest) — a vessel can legitimately
              // have more than one thread (e.g. the original coordination thread plus a fresh
              // one started by sendGmail's self-heal retry), and attachments/replies can live
              // in any of them. Use the most recent as the "primary" thread for timeline/status
              // purposes, and self-heal vessel.gmailThreadId to it so future polls skip this
              // fallback entirely.
              const _threadResults=await Promise.all(_sd.threads.map(async t=>{
                try{
                  const _tr=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=full`,{headers:{Authorization:'Bearer '+token}});
                  return _tr.ok?await _tr.json():null;
                }catch(_){return null;}
              }));
              const _validThreads=_threadResults.filter(Boolean);
              if(_validThreads.length){
                thread=_validThreads[0];
                extraThreads=_validThreads.slice(1);
                const _viHeal=vessels.findIndex(v=>(v.id||v.name)===(vessel.id||vessel.name));
                if(_viHeal>=0&&vessels[_viHeal].gmailThreadId!==thread.id){vessels[_viHeal].gmailThreadId=thread.id;changed=true;}
              }
            }
          }
        }catch(_){/* fallback failed — skip vessel */}
      }
      // CC drop detection: if we couldn't find the thread via gmailThreadId AND the
      // subject search also failed, the captain likely replied to the original sender only.
      // Flag this on the vessel so the UI can warn the current user.
      if(!thread){
        const vi2=vessels.findIndex(v=>(v.id||v.name)===(vessel.id||vessel.name));
        if(vi2>=0&&vessels[vi2]._ccDropWarning!==true){vessels[vi2]._ccDropWarning=true;changed=true;}
        continue;
      }
      // Thread found — clear any previous CC drop warning
      const vi3=vessels.findIndex(v=>(v.id||v.name)===(vessel.id||vessel.name));
      if(vi3>=0&&vessels[vi3]._ccDropWarning){vessels[vi3]._ccDropWarning=false;changed=true;}
      // Merge messages from the primary thread plus any extra threads found above —
      // ensures attachments/replies are never missed just because they landed in a
      // different (but still legitimate) thread for this vessel.
      const messages=[thread,...extraThreads].flatMap(t=>t.messages||[]).sort((a,b)=>Number(a.internalDate||0)-Number(b.internalDate||0));
      // Find by id/name — never by object reference. onAttachTag replaces vessels[idx]
      // with a new object ({...v,...}), so indexOf(oldRef) would return -1 after any tag save,
      // causing ibItems to get vi=-1 and onAttachTag to silently fail forever after.
      const vi=vessels.findIndex(v=>(v.id||v.name)===(vessel.id||vessel.name));
      // _captainMsgs collects data from all captain messages in this thread
      // so we can build ONE ibItem per vessel after processing all messages
      const _captainMsgs={};
      for(let msgIdx=0;msgIdx<messages.length;msgIdx++){
        const msg=messages[msgIdx];
        const hdr=(msg.payload&&msg.payload.headers)||[];
        const from=hdr.find(h=>h.name==='From')?.value||'';
        const subj=hdr.find(h=>h.name==='Subject')?.value||'';
        const date=hdr.find(h=>h.name==='Date')?.value||'';
        const msgCc=hdr.find(h=>h.name==='Cc')?.value||'';
        const fe=(from.match(/<(.+)>/)?.[1]||from).toLowerCase().trim();
        // Portal emails always set From: "ORCA AI OPS <email>".
        // Captain replies never contain "ORCA AI OPS" — even in self-test scenarios.
        // This is more reliable than the SENT label which also flags captain replies
        // when the same Gmail account is used for both ops and testing.
        const isOpsMsg=from.toLowerCase().includes('orca ai ops');
        // Bounce notices (Mail Delivery Subsystem / mailer-daemon / postmaster /
        // "Delivery Status Notification") are NOT captain replies — never count,
        // log, or inbox them. Fixes phantom "Captain replied" entries and inflated
        // emailsReceived for vessels whose email bounced (e.g. bad address).
        if(!isOpsMsg&&/mail delivery subsystem|mailer-daemon@|postmaster@|delivery status notification/i.test(from+' '+subj))continue;
        // Use decodeGmailBody which handles UTF-8 correctly (bullets, dashes, quotes etc.)
        const rawBody=msg.payload?decodeGmailBody(msg.payload):'';
        // Clean the body before storing — strip quoted chain so timeline shows only real content
        const body=isOpsMsg?rawBody:cleanCaptainReplyText(rawBody);
        // Check seenMsgIds first (trim-proof), fall back to timeline for older vessels
        const logged=(vessels[vi].seenMsgIds||[]).includes(msg.id)
          ||vessel.timeline?.some(t=>t.msgId===msg.id);
        // First message in thread = initial sent email.
        // Skip if already logged as "Initial email sent" (old vessels lack msgId on that entry).
        if(msgIdx===0&&isOpsMsg){
          const hasInitialEntry=(vessels[vi].timeline||[]).some(t=>t.type==='sent'&&t.title==='Initial email sent');
          if(logged||hasInitialEntry)continue;
        }
        // Add EVERY message in the thread to the timeline (full conversation view)
        if(!logged){
          // Record this msgId as seen — survives timeline trimming
          if(!Array.isArray(vessels[vi].seenMsgIds))vessels[vi].seenMsgIds=[];
          if(!vessels[vi].seenMsgIds.includes(msg.id)){
            vessels[vi].seenMsgIds.push(msg.id);
            // Cap at 500 entries (IDs only, very small)
            if(vessels[vi].seenMsgIds.length>500)vessels[vi].seenMsgIds=vessels[vi].seenMsgIds.slice(-500);
          }
          if(isOpsMsg){
            // Outbound — follow-up from ops
            addTimeline(vessels[vi],'sent','Email sent to captain',from,body.substring(0,2000),msg.id);
          } else {
            // Inbound — captain reply
            vessels[vi].emailsReceived=(vessels[vi].emailsReceived||0)+1;
            vessels[vi].lastReceivedDate=new Date(date||Date.now()).toISOString();
            vessels[vi].lastActivity=new Date().toISOString();
            addTimeline(vessels[vi],'reply','Captain replied',from,body.substring(0,2000),msg.id);
            // Merge CC from captain's reply into vessel.captainCc — preserving the full CC chain
            if(msgCc){
              const existingCcs=(vessels[vi].captainCc||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
              const newCcs=msgCc.split(',').map(s=>s.trim()).filter(Boolean);
              newCcs.forEach(addr=>{
                const addrLower=addr.toLowerCase();
                // Skip our own ops team emails and duplicates
                if(!existingCcs.includes(addrLower)&&!addrLower.includes('orca ai ops')){
                  existingCcs.push(addrLower);
                }
              });
              vessels[vi].captainCc=existingCcs.join(',');
            }
          }
          changed=true;
        }
        // Collect per-message data — we'll build the single ibItem after the loop
        if(!isOpsMsg){
          const atts=extractAttachments(msg.payload,msg.id);
          const displayBody=body.trim()||atts.map(a=>a.filename).join(', ');
          if(!displayBody)continue; // skip quoted-chain-only messages
          if(!_captainMsgs[vi])_captainMsgs[vi]={latestMsg:null,latestBody:'',latestDate:new Date(0),allAtts:[],firstUnlogged:null};
          const cm=_captainMsgs[vi];
          // Track latest message
          const thisDate=new Date(date||0);
          if(thisDate>cm.latestDate){cm.latestDate=thisDate;cm.latestMsg={msgId:msg.id,from,fe,subj,date,body:displayBody.substring(0,2000),vessel,vi,isNew:!logged};}
          // Accumulate raw attachments here — deduped (by filename+size, NOT attachmentId
          // alone) once all messages/threads for this vessel have been collected, below.
          cm.allAtts.push(...atts);
          // Track first unlogged for sheetsInboxSave
          if(!logged&&!cm.firstUnlogged)cm.firstUnlogged={msgId:msg.id,from,fe,subj,date,body:displayBody.substring(0,2000),vessel,vi};
        }
      }
      // After processing all messages in this thread, build/update ONE ibItem for this vessel
      for(const _vi of Object.keys(_captainMsgs)){
        const cm=_captainMsgs[_vi];
        if(!cm.latestMsg)continue;
        const _viInt=parseInt(_vi);
        const _vessel=vessels[_viInt];
        // Dedupe by filename+size (NOT attachmentId alone — Gmail returns a different
        // attachmentId for the same file across separate API calls/messages/threads).
        cm.allAtts=_dedupeAttachments(cm.allAtts);
        // Restore saved tags from vessel.attachmentTags (persisted to Sheet — survives refresh)
        const _savedTags=(_vessel&&_vessel.attachmentTags)||{};
        cm.allAtts.forEach(a=>{
          if(_savedTags[a.filename]||_savedTags[a.attachmentId])a.tag=_savedTags[a.filename]||_savedTags[a.attachmentId];
        });
        const existingIdx=(ibItems||[]).findIndex(it=>String(it.vi)===String(_vi));
        const itemWithAtts={...cm.latestMsg,attachments:cm.allAtts};
        if(existingIdx>=0){
          // Replace attachments completely from fresh fetch — tags already restored above
          const prevAtts=ibItems[existingIdx].attachments||[];
          const tagMap={};prevAtts.forEach(a=>{if(a.tag)tagMap[a.attachmentId]=a.tag;});
          cm.allAtts.forEach(a=>{if(!a.tag&&tagMap[a.attachmentId])a.tag=tagMap[a.attachmentId];});
          ibItems[existingIdx]={...itemWithAtts,attachments:cm.allAtts};
        } else {
          if(cm.firstUnlogged)sheetsInboxSave({...cm.firstUnlogged,attachments:[]});
          ibItems.push(itemWithAtts);
          changed=true;
        }
      }
    }catch(e){
      console.warn('[fetchInboxByThreads] Thread fetch failed for vessel:',vessel.name,e);
    }
  }
  return changed;
}

async function fetchInbox(){
  if(!ibItems) ibItems=[];
  // Do NOT reset badge here — it causes visible flicker every 5s during auto-poll.
  // Badge is updated after fetch completes (in checkInbox / renderInbox).
  if(!token||!vessels.length)return false;

  // Each user only sees replies for vessels assigned to them. Super admin sees all.
  const myEmail=normEmail(user&&user.email);
  const _isSuper=isSuperAdmin(myEmail);
  const myVessels=_isSuper?vessels:vessels.filter(v=>normEmail(v.assignedTo||'')===myEmail);
  if(!myVessels.length)return false;

  try{
    // ── NEW: Thread-based approach (vessels created after this update) ──────────
    // Fetches replies from the exact Gmail thread stored on each vessel.
    // Zero cross-contamination — no subject/email guessing needed.
    const _ibChanged=await fetchInboxByThreads();

    // ── OLD: Subject+email search approach (grayed out — kept for reference) ────
    // This searched Gmail globally for all captain emails and matched by subject.
    // Caused false positives when captain emails or vessel names overlapped.
    // Replaced by fetchInboxByThreads() above for vessels with a stored threadId.
    //
    // const emails=[...new Set(myVessels.map(v=>String(v.email||'').trim().toLowerCase()).filter(Boolean))];
    // if(!emails.length)return;
    // const qParts=[];
    // emails.slice(0,20).forEach(e=>qParts.push('from:'+e));
    // const q=qParts.join(' OR ');
    // const q2=q+' newer_than:30d';
    // const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q2)}&maxResults=100&includeSpamTrash=false`,{headers:{Authorization:'Bearer '+token}});
    // const d=await r.json();if(!d.messages)return;
    // for(const msg of d.messages){
    //   const dr=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,{headers:{Authorization:'Bearer '+token}});
    //   const dd=await dr.json();
    //   const hdr=(dd.payload&&dd.payload.headers)||[];
    //   const from=hdr.find(h=>h.name==='From')?.value||'';
    //   const subj=hdr.find(h=>h.name==='Subject')?.value||'';
    //   const date=hdr.find(h=>h.name==='Date')?.value||'';
    //   const eb=(p)=>{if(p.mimeType==='text/plain'&&p.body?.data)return atob(p.body.data.replace(/-/g,'+').replace(/_/g,'/'));if(p.parts)for(const pp of p.parts){const rr=eb(pp);if(rr)return rr;}return'';};
    //   const body=dd.payload?eb(dd.payload):'';
    //   const fe=(from.match(/<(.+)>/)?.[1]||from).toLowerCase().trim();
    //   const subjLower=subj.toLowerCase().trim();
    //   if(!subjLower.includes('re:'))continue;
    //   if(!subjLower.includes('orca ai installation coordination'))continue;
    //   if(subjLower.startsWith('orca ai installation coordination'))continue;
    //   const vesselForSubj=myVessels.find(v=>{
    //     const vn=(v.name||'').toLowerCase().trim();
    //     const ve=(v.email||'').toLowerCase().trim();
    //     return vn.length>1 && subjLower.includes(vn) && ve && (fe===ve || from.toLowerCase().includes(ve));
    //   });
    //   if(!vesselForSubj)continue;
    //   const temp={msgId:msg.id,from,fe,subj,date,body:body.substring(0,2000)};
    //   const vessel=vesselForSubj;
    //   if(vessel){
    //     const logged=vessel.timeline?.some(t=>t.msgId===msg.id);
    //     const firstSent=vessel.firstEmailDate||vessel.lastEmailDate||vessel.createdAt||null;
    //     const vesselCutoff=firstSent?new Date(firstSent).getTime():0;
    //     const msgDate=new Date(date).getTime();
    //     const isAfterVesselCreation=!vesselCutoff||!msgDate||msgDate>=vesselCutoff;
    //     const alreadyInItems=(ibItems||[]).some(i=>i.msgId===msg.id);
    //     if(isAfterVesselCreation&&!alreadyInItems){
    //       const vi=vessels.indexOf(vessel);
    //       const item={...temp,vessel,vi,isNew:!logged};
    //       if(!logged)sheetsInboxSave(item);
    //       if(!logged){
    //         vessels[vi].emailsReceived=(vessels[vi].emailsReceived||0)+1;
    //         vessels[vi].lastReceivedDate=new Date(date||Date.now()).toISOString();
    //         vessels[vi].lastActivity=new Date().toISOString();
    //         addTimeline(vessels[vi],'reply','Captain replied',temp.from,temp.body.substring(0,300),msg.id);
    //       }
    //       ibItems.push(item);
    //     }
    //   }
    // }
    // ── END OLD approach ─────────────────────────────────────────────────────────

    // Save vessel stats updates to shared Sheet — ONLY when new data was logged.
    // Idle 5s polls must not write: concurrent full-tab rewrites were the
    // lost-update race that wiped vessels. Per-row saves + no-op skip = safe.
    if(_ibChanged)saveVessels();
    // Merge inbox items from other team members via Google Sheets
    mergeSharedInbox();
    const _ib_badge=document.getElementById('ib-count');if(_ib_badge){if(ibItems.length){_ib_badge.textContent=ibItems.length;_ib_badge.style.display='inline';}else{_ib_badge.textContent='0';_ib_badge.style.display='none';}}
    return _ibChanged;
  }catch(e){
    console.error('fetchInbox error', e);
    const msg = e?.message || (e?.status ? 'API error ' + e.status : 'Unknown error');
    const label = document.getElementById('last-refresh-label');
    if(label) label.textContent = '⚠️ Inbox error: ' + msg;
    return false;
  }
}
function renderInbox(){
  updateReceivedStatsFromInbox();
  const list=document.getElementById('ib-list'),empty=document.getElementById('ib-empty');
  if(!ibItems.length){list.innerHTML='';if(empty)empty.style.display='block';return;}
  empty.style.display='none';
  const _superInbox=isSuperAdmin(user&&user.email);
  list.innerHTML=ibItems.map((item,i)=>{
    const assignedTag=_superInbox&&item.vessel.assignedTo?`<span style="font-size:10px;background:#e8eaf6;color:#1D2E6B;border-radius:4px;padding:1px 8px;margin-left:6px;font-weight:600">${item.vessel.assignedTo.split('@')[0]}</span>`:'';
    return `<div style="border:1px solid #a8c8f0;border-radius:var(--rs);padding:14px;margin-bottom:10px;background:linear-gradient(135deg,#f0f7ff 0%,#e8f2fd 100%);border-left:4px solid #1D2E6B"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px"><div><div style="font-weight:600;font-size:14px">${item.vessel.name}${assignedTag}</div><div style="font-size:12px;color:var(--muted);margin-top:2px">${item.from} · ${item.date}</div><div style="font-size:13px;color:var(--muted);margin-top:4px;font-style:italic">"${item.subj}"</div><div style="font-size:12px;color:var(--faint);margin-top:6px;max-width:500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.body.substring(0,120)}...</div></div><div style="display:flex;gap:8px;flex-shrink:0"><button class="btn btn-s" onclick="var _i=${i};setTimeout(function(){openInboxReply(_i);},0)"><i class="ti ti-eye"></i> View reply</button><button class="btn btn-p btn-s" onclick="var _i=${i};setTimeout(function(){openIbModalSend(_i);},0)"><i class="ti ti-cpu"></i> Analyze</button><button class="btn btn-s" onclick="var _vi=${item.vi};setTimeout(function(){openLatestStatus(_vi);},0)" style="background:#f4f6fb;border-color:#c5cfe8;color:#1D2E6B"><i class="ti ti-report-analytics"></i> Status</button></div></div></div>`;
  }).join('');
}



// ── CC tag management ─────────────────────────────────────────────────────────
// Always shows the FULL Cc list actually used on this vessel's emails — ops@ (mandatory,
// on every send, never removable) plus any addresses preserved from captain replies
// (removable). Shown regardless of whether a reply has been received yet, since ops@ is
// CC'd starting with the very first outbound email. prefix selects which modal's DOM
// elements to update: 'mv' = View modal, 'mib' = Inbox Analyze modal.
function renderCcTags(vi,prefix){
  prefix=prefix||'mv';
  const bar=document.getElementById(prefix+'-cc-bar');
  const container=document.getElementById(prefix+'-cc-tags');
  if(!bar||!container)return;
  const v=vessels[vi];
  if(!v){bar.style.display='none';return;}
  bar.style.display='block';
  const extraAddrs=String(v.captainCc||'').split(',').map(s=>s.trim()).filter(Boolean);
  const opsBubble=`<span style="display:inline-flex;align-items:center;gap:5px;background:var(--navy-l);color:var(--navy);border-radius:99px;padding:3px 12px;font-size:12px;font-weight:500;border:1px solid #c5cae9" title="Always CC'd on every email — cannot be removed">${escapeHtml(OPS_CC_EMAIL)}</span>`;
  const extraBubbles=extraAddrs.map((addr,i)=>`
    <span style="display:inline-flex;align-items:center;gap:5px;background:var(--navy-l);color:var(--navy);border-radius:99px;padding:3px 10px 3px 12px;font-size:12px;font-weight:500;border:1px solid #c5cae9">
      ${escapeHtml(addr)}
      <button onclick="removeCcAddr(${vi},${i})" title="Remove" style="background:none;border:none;color:var(--navy);cursor:pointer;font-size:14px;padding:0;line-height:1;opacity:.6" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity='.6'">×</button>
    </span>
  `).join('');
  container.innerHTML=opsBubble+extraBubbles;
}
function removeCcAddr(vi,idx){
  const v=vessels[vi];
  if(!v||!v.captainCc)return;
  const addrs=v.captainCc.split(',').map(s=>s.trim()).filter(Boolean);
  addrs.splice(idx,1);
  vessels[vi].captainCc=addrs.join(',');
  saveVessels();
  // Refresh all 3 bars (only the one(s) present in the currently-open view/modal actually
  // re-render — renderCcTags no-ops if its elements aren't in the DOM) and the recipients
  // lines above each draft, so state stays in sync regardless of which surface is open.
  renderCcTags(vi,'mv');
  renderCcTags(vi,'mib');
  renderCcTags(vi,'a');
  const rc1=document.getElementById('mv-recipients');if(rc1&&window._mvIdx===vi)rc1.innerHTML=_recipientsHtml(vessels[vi],vi);
  const rc2=document.getElementById('mib-recipients');if(rc2&&curIb&&curIb.vi===vi)rc2.innerHTML=_recipientsHtml(vessels[vi],vi);
  const rc3=document.getElementById('a-recipients');if(rc3&&ana&&ana.vi===vi)rc3.innerHTML=_recipientsHtml(vessels[vi],vi);
}

async function sendFromViewModal(){
  const v=vessels[window._mvIdx];
  if(!v){await orcaAlert('Vessel not found.','Error');return;}
  // Warn if any attachments are still untagged
  const _mvUntagged=(ibItems||[]).filter(it=>it.vi===window._mvIdx).flatMap(it=>it.attachments||[]).filter(a=>!a.tag&&!autoTagFromFilename(a.filename));
  if(_mvUntagged.length){
    const _go=await orcaConfirm(
      `${_mvUntagged.length} attached file${_mvUntagged.length>1?'s are':' is'} still untagged:\n${_mvUntagged.map(a=>'• '+a.filename).join('\n')}\n\nSend the follow-up anyway?`,
      '⚠️ Untagged Files'
    );
    if(!_go)return;
  }
  const fuEl=document.getElementById('mv-followup-draft');
  const body=fuEl&&fuEl.value.trim()?fuEl.value.trim():buildFollowupEmail(v,v.missingItems||[]);
  const btn=document.querySelector('#mod-view .btn-g');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader"></i> Sending...';}
  const _cc1=[OPS_CC_EMAIL,v.captainCc||''].filter(Boolean).join(',');
  const _sendTid1=await resolveSendThreadId(v);
  const ok=await sendGmail(v.email,'Re: Orca AI Installation Coordination - '+v.name,buildFollowupHtmlEmail(body,v.docs||''),true,_cc1,'',_sendTid1);
  if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-send"></i> Send this update to the captain';}
  if(!ok)return;
  // Save to timeline and vessel — always sync gmailThreadId to whatever Gmail actually
  // used for this send. Previously only set if the vessel had NO threadId at all, so a
  // stale/broken threadId (e.g. after a transfer, or sendGmail's 404 self-heal starting a
  // fresh thread) was never corrected — the vessel stayed permanently pointed at a dead
  // thread and fetchInboxByThreads() could never find the captain's replies again.
  if(ok.threadId&&ok.threadId!==v.gmailThreadId)vessels[window._mvIdx].gmailThreadId=ok.threadId;
  vessels[window._mvIdx].emailsSent=(vessels[window._mvIdx].emailsSent||0)+1;
  vessels[window._mvIdx].lastEmailDate=new Date().toISOString();
  vessels[window._mvIdx].lastContact=new Date().toISOString();
  saveFollowupMeta(vessels[window._mvIdx],body);
  saveVessels();updateMetrics();renderTable();
  document.getElementById('mod-view').style.display='none';
  await orcaAlert('Follow-up sent to '+v.email,'✅ Sent');
}function openIbModal(i){
  const raw=ibItems[i];
  if(!raw||!raw.vessel){alert('Reply item not found. Please click Check inbox again.');return;}
  // Always resolve vessel index by identity — raw.vi may be stale (-1) if vessels[idx]
  // was replaced by a spread in onAttachTag or pollVessels after the ibItem was built.
  const _resolvedVi=vessels.findIndex(v=>(v.id||v.name)===(raw.vessel.id||raw.vessel.name));
  const _safeVi=_resolvedVi>=0?_resolvedVi:(raw.vi>=0?raw.vi:0);
  // Clean body before storing — strips quoted chain so AI only sees captain's actual words
  curIb={...raw,vi:_safeVi,body:cleanCaptainReplyText(raw.body||'')};
  // Restore saved tags from vessel.attachmentTags immediately on modal open
  curIb.attachments=restoreAttachmentTags(curIb.attachments||[],_safeVi);
  ibAna=null;
  const v=curIb.vessel;

  // Populate header
  document.getElementById('mib-v').textContent=v.name;
  document.getElementById('mib-m').textContent='From: '+curIb.from+' · '+curIb.date;
  const _mibRcp=document.getElementById('mib-recipients');if(_mibRcp)_mibRcp.innerHTML=_recipientsHtml(v,_safeVi);
  renderCcTags(_safeVi,'mib');
  document.getElementById('mib-b').textContent=curIb.body;

  // Populate status panel
  // 1. Days since first email sent to captain
  const firstSent=v.lastEmailDate||v.createdAt||v.lastContact||null;
  const daysSinceFirst=firstSent?Math.floor((Date.now()-new Date(firstSent))/86400000):null;
  document.getElementById('mib-stat-first').textContent=daysSinceFirst!==null?daysSinceFirst:'—';

  // 2. Response time: days from last sent email to this reply
  const replyDate=curIb.date?new Date(curIb.date).getTime():null;
  const lastSent=v.lastEmailDate||v.lastContact||null;
  const lastSentMs=lastSent?new Date(lastSent).getTime():null;
  let respDays='—';
  if(replyDate&&lastSentMs&&replyDate>lastSentMs){
    respDays=Math.floor((replyDate-lastSentMs)/86400000);
    if(respDays===0)respDays='<1';
  }
  document.getElementById('mib-stat-resp').textContent=respDays;

  // 3. Readiness score + status
  const score=typeof readinessScore==='function'?readinessScore(v):v.progress||0;
  document.getElementById('mib-stat-ready').textContent=score+'%';
  const statusLabels={waiting:'Waiting',followup:'Follow-up',ready:'Ready',scheduled:'Scheduled',completed:'Completed'};
  document.getElementById('mib-stat-status').textContent=statusLabels[v.status]||v.status||'—';

  // Render attachments panel from metadata already stored on the ibItem
  const _ap=document.getElementById('mib-attachments');
  if(_ap)_ap.innerHTML=renderAttachmentsPanel(curIb.attachments||[],curIb.body||'',curIb.vi);
  document.getElementById('mib-al').style.display='none';document.getElementById('mib-res').style.display='none';
  document.getElementById('mib-abtn').style.display='inline-flex';document.getElementById('mib-sbtn').style.display='none';
  document.getElementById('mod-ib').style.display='flex';
}

function openIbModalSend(i){
  // Opens modal pre-loaded for UPDATE (send) - runs analyze first if not done
  openIbModal(i);
  // Auto-trigger analyze so UPDATE button is ready
  setTimeout(()=>{
    if(!ibAna && typeof runIbAnalysis==='function') runIbAnalysis();
  }, 100);
}
async function runIbAnalysis(){
  if(!curIb)return;
  // Always work on the cleaned body — strips quoted chain regardless of how curIb was set
  const cleanedBody=cleanCaptainReplyText(curIb.body||'');
  const v=curIb.vessel,mis=(v.missingItems||[]).join(', '),d=ds(v.lastContact);
  document.getElementById('mib-al').style.display='flex';document.getElementById('mib-abtn').style.display='none';
  const prompt=`You are Orca AI Installation Coordinator analyzing a vessel reply.\nVessel: ${v.name}\nDays since last contact: ${d}\nPreviously missing: ${mis}\nReply: """${cleanedBody}"""\nRespond ONLY with valid JSON:\n{"received":["items confirmed"],"missing":["items still missing"],"status":"waiting|followup|ready|scheduled|completed","risk":"low|medium|high","progress":0,"nextAction":"short description","flags":[],"followup_email":"complete follow-up. Dear Master... Kind regards, Orca AI. Never promise installation date."}\nUse waiting after initial email/no reply; followup when reply is partial or missing items; ready when all technical information is received; scheduled when an installation date is confirmed; completed when installation is completed. Risk handles blockers/7+ days. Progress 0/25/50/75/100. CRITICAL RULES - READ CAREFULLY:
- ONLY mark an item as received if the captain EXPLICITLY sent/attached THAT SPECIFIC item
- "Center console photo" = NOT "Bridge Console GA" and NOT "Proposed monitor location photos"
- "Starboard console photo" = NOT any of the required items unless it matches exactly
- "Port console photo" = NOT "Next 2-3 upcoming port calls"
- "X is done" = NOT received. "X attached" = received
- Photos of consoles/starboard/port are NOT the same as "Proposed monitor location photos"
- "Proposed monitor location photos" = photos showing WHERE the monitor will be placed
- "Proposed Seapod location photos" = photos showing WHERE the Seapod camera will be placed
- If you're not 100% sure an item matches, put it in missing[], not received[]
- When in doubt: missing[]. Never over-report received items. Photos=pending review. CRITICAL RULES - READ CAREFULLY:
- ONLY mark an item as received if the captain EXPLICITLY sent/attached THAT SPECIFIC item
- "Center console photo" = NOT "Bridge Console GA" and NOT "Proposed monitor location photos"
- "Starboard console photo" = NOT any of the required items unless it matches exactly
- "Port console photo" = NOT "Next 2-3 upcoming port calls"
- "X is done" = NOT received. "X attached" = received
- Photos of consoles/starboard/port are NOT the same as "Proposed monitor location photos"
- "Proposed monitor location photos" = photos showing WHERE the monitor will be placed
- "Proposed Seapod location photos" = photos showing WHERE the Seapod camera will be placed
- If you're not 100% sure an item matches, put it in missing[], not received[]
- When in doubt: missing[]. Never over-report received items.`;
  try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:prompt}]})});const dd=await r.json();const raw=dd.content.map(b=>b.text||'').join('').replace(/```json|```/g,'').trim();ibAna=JSON.parse(raw);}
  catch(e){ibAna={received:[],missing:derivedMissing(v),status:'followup',risk:'medium',progress:0,nextAction:'Send follow-up',flags:[],followup_email:buildFollowupEmail(v,derivedMissing(v))};}
  // Always normalize via keyword matching — AI result ignored (no key configured)
  ibAna=normalizeAnalysisResult(v,cleanedBody,ibAna);
  // Use computeReceivedMissing as single source of truth — replaces the old
  // per-path received/missing logic with one consistent computation.
  const _rm=computeReceivedMissing(v,curIb);
  ibAna.received=_rm.received;
  ibAna.missing=_rm.missing;
  ibAna.followup_email=_rm.draft;
  document.getElementById('mib-al').style.display='none';
  document.getElementById('mib-recv').innerHTML=ibAna.received.map(i=>`<li><i class="ti ti-circle-check ic-d"></i>${i}</li>`).join('');
  document.getElementById('mib-miss').innerHTML=ibAna.missing.map(i=>`<div class="miss-item"><i class="ti ti-circle-x"></i>${i}</div>`).join('');
  document.getElementById('mib-fu').value=ibAna.followup_email||'';
  document.getElementById('mib-res').style.display='block';

  // ANALYZE saves vessel status immediately - without sending email
  const _idx=curIb.vi;
  if(_idx!==null&&_idx!==undefined&&vessels[_idx]){
    // Accumulate only items explicitly detected in replies (never inverse-of-missing)
    const _prevDetected=Array.isArray(vessels[_idx].detectedItems)?vessels[_idx].detectedItems:[];
    const _newDetected=[...new Map([..._prevDetected,...(ibAna.received||[])].map(x=>[itemKey(x),x])).values()];
    vessels[_idx]={...vessels[_idx],
      status:ibAna.status,risk:ibAna.risk,progress:ibAna.progress,nextAction:ibAna.nextAction,
      missingItems:ibAna.missing||[],
      detectedItems:_newDetected,
      receivedItems:_newDetected,
      lastContact:new Date().toISOString()
    };
    cleanTimeline(vessels[_idx]);
    addTimeline(vessels[_idx],'reply','Reply analyzed',`Received: ${(ibAna.received||[]).join(', ')||'—'}`);
    saveVessels();updateMetrics();renderTable();
  }

  // Show UPDATE button, hide ANALYZE button
  document.getElementById('mib-abtn').style.display='none';
  document.getElementById('mib-sbtn').style.display='inline-flex';
}
async function sendIbFollowUp(){
  if(!ibAna||!curIb)return;
  // Warn if any attachments are still untagged
  const _savedTagsIb=(vessels[curIb.vi]&&vessels[curIb.vi].attachmentTags)||{};
  const _untagged=(curIb.attachments||[]).filter(a=>!_savedTagsIb[a.attachmentId]&&!autoTagFromFilename(a.filename));
  if(_untagged.length){
    const _go=await orcaConfirm(
      `${_untagged.length} attached file${_untagged.length>1?'s are':' is'} still untagged:\n${_untagged.map(a=>'• '+a.filename).join('\n')}\n\nSend the follow-up anyway?`,
      '⚠️ Untagged Files'
    );
    if(!_go)return;
  }
  // Read edited text from textarea - user may have modified it
  const fuEl=document.getElementById('mib-fu');
  const v=curIb.vessel,followBody=(fuEl&&fuEl.value.trim())?fuEl.value.trim():((ibAna&&ibAna.followup_email)?ibAna.followup_email:buildFollowupEmail(curIb.vessel,derivedMissing(curIb.vessel)));
  const _cc2=[OPS_CC_EMAIL,v.captainCc||''].filter(Boolean).join(',');
  const _sendTid2=await resolveSendThreadId(v);
  const ok=await sendGmail(v.email,'Re: Orca AI Installation Coordination - '+v.name,buildFollowupHtmlEmail(followBody,v.docs||''),true,_cc2,'',_sendTid2);
  if(!ok)return;
  const idx=curIb.vi;
  // Always sync gmailThreadId to whatever Gmail actually used — see note in sendFromViewModal.
  if(ok.threadId&&ok.threadId!==vessels[idx].gmailThreadId)vessels[idx].gmailThreadId=ok.threadId;
  const _prevDet2=Array.isArray(vessels[idx].detectedItems)?vessels[idx].detectedItems:[];
  const _newDet2=[...new Map([..._prevDet2,...(ibAna.received||[])].map(x=>[itemKey(x),x])).values()];
  vessels[idx]={...vessels[idx],status:ibAna.status,risk:ibAna.risk,progress:ibAna.progress,nextAction:ibAna.nextAction,missingItems:ibAna.missing||[],detectedItems:_newDet2,receivedItems:_newDet2,lastContact:new Date().toISOString()};
  cleanTimeline(vessels[idx]);
  addTimeline(vessels[idx],'reply','Reply received from captain',curIb.from||v.email,curIb.body||'');
  saveFollowupMeta(vessels[idx],followBody);
  vessels[idx].emailsSent=(vessels[idx].emailsSent||0)+1;vessels[idx].lastEmailDate=new Date().toISOString();
  saveVessels();updateMetrics();renderTable();
  document.getElementById('mod-ib').style.display='none';
  ibItems=ibItems.filter(function(it){return it!==curIb;});
  const _send_badge=document.getElementById('ib-count');
  if(_send_badge){if(ibItems.length){_send_badge.textContent=ibItems.length;_send_badge.style.display='inline';}else _send_badge.style.display='none';}
  renderInbox();renderInlineInbox();
}

// ANALYZE (manual)
async function analyzeReply(){
  const idx=document.getElementById('ra-sel').value,reply=document.getElementById('ra-reply').value.trim();
  if(!reply){alert("Please paste the captain's reply.");return;}
  const vessel=idx!==''?vessels[parseInt(idx)]:null,vn=vessel?vessel.name:'Unknown',mis=vessel?(vessel.missingItems||[]).join(', '):'all items',d=vessel?ds(vessel.lastContact):0;
  document.getElementById('a-load').style.display='flex';document.getElementById('a-out').style.display='none';
  const prompt=`You are Orca AI Installation Coordinator.\nVessel: ${vn}\nDays since last contact: ${d}\nPreviously missing: ${mis}\nReply: """${reply}"""\nRespond ONLY with valid JSON:\n{"received":["items confirmed"],"missing":["items still missing"],"status":"waiting|followup|ready|scheduled|completed","risk":"low|medium|high","progress":0,"nextAction":"short description","flags":[],"followup_email":"complete follow-up. Dear Master... Kind regards, Orca AI. Never promise installation date."}\nUse waiting after initial email/no reply; followup when reply is partial or missing items; ready when all technical information is received; scheduled when an installation date is confirmed; completed when installation is completed. Risk handles blockers/7+ days. Progress 0/25/50/75/100. CRITICAL RULES - READ CAREFULLY:
- ONLY mark an item as received if the captain EXPLICITLY sent/attached THAT SPECIFIC item
- "Center console photo" = NOT "Bridge Console GA" and NOT "Proposed monitor location photos"
- "Starboard console photo" = NOT any of the required items unless it matches exactly
- "Port console photo" = NOT "Next 2-3 upcoming port calls"
- "X is done" = NOT received. "X attached" = received
- Photos of consoles/starboard/port are NOT the same as "Proposed monitor location photos"
- "Proposed monitor location photos" = photos showing WHERE the monitor will be placed
- "Proposed Seapod location photos" = photos showing WHERE the Seapod camera will be placed
- If you're not 100% sure an item matches, put it in missing[], not received[]
- When in doubt: missing[]. Never over-report received items.`;
  try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:prompt}]})});const dd=await r.json();const raw=dd.content.map(b=>b.text||'').join('').replace(/```json|```/g,'').trim();ana=JSON.parse(raw);ana.vi=idx!==''?parseInt(idx):null;}
  catch(e){ana={received:[],missing:vessel?derivedMissing(vessel):[...REQUIRED_ITEMS],status:'followup',risk:'medium',progress:0,nextAction:'Send follow-up',flags:[],followup_email:vessel?buildFollowupEmail(vessel,derivedMissing(vessel)):'Dear Master,\n\nThank you.\n\nKind regards,\nORCA AI OPS',vi:idx!==''?parseInt(idx):null};}
  if(vessel)ana=normalizeAnalysisResult(vessel,reply,ana);
  document.getElementById('a-load').style.display='none';
  document.getElementById('a-recv').innerHTML=(ana.received||[]).map(i=>`<li><i class="ti ti-circle-check ic-d"></i>${i}</li>`).join('');
  document.getElementById('a-miss').innerHTML=(ana.missing||[]).map(i=>`<div class="miss-item"><i class="ti ti-circle-x"></i>${i}</div>`).join('');
  document.getElementById('a-stat').innerHTML=`<div><div style="font-size:11px;color:var(--faint);margin-bottom:4px">Status</div>${sb(ana.status)}</div><div><div style="font-size:11px;color:var(--faint);margin-bottom:4px">Risk</div>${rb(ana.risk)}</div><div><div style="font-size:11px;color:var(--faint);margin-bottom:4px">Progress</div><div style="display:flex;align-items:center;gap:6px;margin-top:2px"><div class="prog" style="width:100px"><div class="prog-f" style="width:${ana.progress}%"></div></div><span style="font-size:13px;font-weight:700">${ana.progress}%</span></div></div><div><div style="font-size:11px;color:var(--faint);margin-bottom:4px">Next action</div><span style="font-size:12px">${ana.nextAction||'—'}</span></div>${(ana.flags&&ana.flags.length)?ana.flags.map(f=>`<div class="flag-item"><i class="ti ti-flag"></i>${f}</div>`).join(''):''}`;
  document.getElementById('a-fu').textContent=ana.followup_email||'';
  const _aRcp=document.getElementById('a-recipients');
  const _aCcBar=document.getElementById('a-cc-bar');
  if(vessel){
    if(_aRcp)_aRcp.innerHTML=_recipientsHtml(vessel,parseInt(idx));
    renderCcTags(parseInt(idx),'a');
  } else {
    if(_aRcp)_aRcp.innerHTML='';
    if(_aCcBar)_aCcBar.style.display='none';
  }
  document.getElementById('a-out').style.display='block';
}
async function saveAnalyzeOnly(){
  // Save status update WITHOUT sending email
  if(!ana)return;
  const idx=ana.vi;
  if(idx===null||idx===undefined||!vessels[idx]){await orcaAlert('No vessel selected.','Error');return;}
  const v=vessels[idx];
  const _prevDet3=Array.isArray(v.detectedItems)?v.detectedItems:[];
  const _newDet3=[...new Map([..._prevDet3,...(ana.received||[])].map(x=>[itemKey(x),x])).values()];
  vessels[idx]={...v,
    status:ana.status,risk:ana.risk,progress:ana.progress,nextAction:ana.nextAction,
    missingItems:ana.missing||[],
    detectedItems:_newDet3,
    receivedItems:_newDet3,
    lastContact:new Date().toISOString()
  };
  cleanTimeline(vessels[idx]);
  addTimeline(vessels[idx],'ai','Status updated from reply',`Received: ${(ana.received||[]).join(', ')||'—'}`);
  saveVessels();updateMetrics();renderTable();
  await orcaAlert('Status saved successfully. No email was sent.','✅ Saved');
}
async function saveAndSend(){
  if(!ana)return;const idx=ana.vi;if(idx===null||!vessels[idx]){alert('No vessel selected.');return;}
  const v=vessels[idx],followBody=(ana&&ana.followup_email)?ana.followup_email:buildFollowupEmail(v,derivedMissing(v));
  const _cc3=[OPS_CC_EMAIL,v.captainCc||''].filter(Boolean).join(',');
  const _sendTid3=await resolveSendThreadId(v);
  const ok=await sendGmail(v.email,'Re: Orca AI Installation Coordination - '+v.name,buildFollowupHtmlEmail(followBody,v.docs||''),true,_cc3,'',_sendTid3);if(!ok)return;
  // Always sync gmailThreadId to whatever Gmail actually used — see note in sendFromViewModal.
  if(ok.threadId&&ok.threadId!==vessels[idx].gmailThreadId)vessels[idx].gmailThreadId=ok.threadId;
  const _prevDet4=Array.isArray(v.detectedItems)?v.detectedItems:[];
  const _newDet4=[...new Map([..._prevDet4,...(ana.received||[])].map(x=>[itemKey(x),x])).values()];
  vessels[idx]={...v,status:ana.status,risk:ana.risk,progress:ana.progress,nextAction:ana.nextAction,missingItems:ana.missing||[],detectedItems:_newDet4,receivedItems:_newDet4,lastContact:new Date().toISOString()};
  cleanTimeline(vessels[idx]);
  addTimeline(vessels[idx],'ai','Reply analyzed by AI',v.email);
  saveFollowupMeta(vessels[idx],followBody);
  vessels[idx].emailsSent=(vessels[idx].emailsSent||0)+1;vessels[idx].lastEmailDate=new Date().toISOString();
  saveVessels();updateMetrics();renderTable();document.getElementById('ra-reply').value='';document.getElementById('a-out').style.display='none';showTab('dashboard');
}

// VESSEL DETAIL

function openLatestStatus(idx){
  const v=vessels[idx];if(!v)return;
  document.getElementById('ls-vessel-name').textContent=v.name;

  // Days since first email
  const firstSent=v.lastEmailDate||v.createdAt||v.lastContact||null;
  const daysSinceFirst=firstSent?Math.floor((Date.now()-new Date(firstSent))/86400000):null;
  document.getElementById('ls-days-first').textContent=daysSinceFirst!==null?daysSinceFirst:'—';
  document.getElementById('ls-date-first').textContent=firstSent?new Date(firstSent).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';

  // Response time
  const lastRecv=v.lastReceivedDate||null;
  const lastSent=v.lastEmailDate||v.lastContact||null;
  let respDays='—';
  if(lastRecv&&lastSent){
    const diff=Math.floor((new Date(lastRecv)-new Date(lastSent))/86400000);
    respDays=diff<=0?'<1':String(diff);
  }
  document.getElementById('ls-resp-days').textContent=respDays;

  // Readiness
  const score=typeof readinessScore==='function'?readinessScore(v):v.progress||0;
  document.getElementById('ls-readiness').textContent=score+'%';
  const statusLabels={waiting:'Waiting for reply',followup:'Follow-up required',ready:'Ready',scheduled:'Scheduled',completed:'Completed'};
  document.getElementById('ls-status-label').textContent=statusLabels[v.status]||v.status||'—';

  // Received items
  const recv=v.receivedItems||[];
  const recvEl=document.getElementById('ls-received');
  recvEl.innerHTML=recv.length
    ?recv.map(r=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#f0faf4;border-radius:6px;margin-bottom:5px;font-size:13px;font-weight:600;color:#003d1a"><i class="ti ti-circle-check"></i>${r}</div>`).join('')
    :`<div style="font-size:13px;color:var(--faint);padding:6px">Nothing received yet.</div>`;

  // Missing items
  const miss=v.missingItems||REQUIRED_ITEMS;
  const missEl=document.getElementById('ls-missing');
  missEl.innerHTML=miss.length
    ?miss.map(m=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#fff5f5;border-radius:6px;margin-bottom:5px;font-size:13px;color:#c0392b"><i class="ti ti-circle-x"></i>${m}</div>`).join('')
    :`<div style="font-size:13px;color:#003d1a;padding:6px">✓ All items received!</div>`;

  document.getElementById('mod-latest-status').style.display='flex';
}
function openV(idx){
  const v=vessels[idx];if(!v)return;
  cleanTimeline(v);
  v.missingItems=derivedMissing(v);
  window._mvIdx=idx;

  // Populate modal header
  document.getElementById('mv-name').textContent=v.name;
  document.getElementById('mv-email').textContent=v.email||'';
  const _mvRcp=document.getElementById('mv-recipients');if(_mvRcp)_mvRcp.innerHTML=_recipientsHtml(v,idx);
  document.getElementById('mv-status-badge').innerHTML=sb(v.status);

  // Stats
  const firstDate=v.createdAt||v.lastEmailDate||v.lastContact||null;
  const daysActive=firstDate?Math.floor((Date.now()-new Date(firstDate))/86400000):0;
  document.getElementById('mv-days-active').textContent=daysActive;
  document.getElementById('mv-start-date').textContent=firstDate?new Date(firstDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}):'—';
  document.getElementById('mv-sent').textContent=v.emailsSent||0;
  document.getElementById('mv-recv-count').textContent=v.emailsReceived||0;
  const score=readinessScore(v)||v.progress||0;
  document.getElementById('mv-progress').textContent=score+'%';
  const riskLabels={low:'Low risk',medium:'Medium risk',high:'High risk'};
  document.getElementById('mv-risk-label').textContent=riskLabels[v.risk||'medium']||'—';
  document.getElementById('mv-next-action').textContent=v.nextAction||'—';
  document.getElementById('mv-prog-bar').style.width=score+'%';

  // Received / Missing — via single source of truth (same as Analyze modal)
  const _ibV=(ibItems||[]).find(it=>String(it.vi)===String(idx));
  const _rmV=computeReceivedMissing(v,_ibV||null);
  const recv=_rmV.received,miss=_rmV.missing;
  document.getElementById('mv-received').innerHTML=recv.length
    ?recv.map(r=>`<div style="display:flex;align-items:flex-start;gap:7px;padding:7px 9px;background:#f0faf4;border-radius:6px;margin-bottom:4px;font-size:13px;font-weight:600;color:#003d1a"><i class="ti ti-circle-check" style="margin-top:1px;flex-shrink:0"></i>${r}</div>`).join('')
    :`<div style="font-size:13px;color:var(--faint);padding:6px 0">Nothing received yet.</div>`;
  document.getElementById('mv-missing').innerHTML=miss.length
    ?miss.map(m=>`<div style="display:flex;align-items:flex-start;gap:7px;padding:7px 9px;background:#fff5f5;border-radius:6px;margin-bottom:4px;font-size:13px;color:#c0392b"><i class="ti ti-circle-x" style="margin-top:1px;flex-shrink:0"></i>${m}</div>`).join('')
    :`<div style="font-size:13px;color:#003d1a;padding:6px 0">✓ All items received!</div>`;

  // Attachment files panel — live from ibItems if available, else from stored metadata
  const _mvAtEl=document.getElementById('mv-attachments');
  if(_mvAtEl){
    if(_ibV&&(_ibV.attachments||[]).length){
      _mvAtEl.innerHTML=renderAttachmentsPanel(_ibV.attachments,_ibV.body||'',idx);
    } else {
      // No live Gmail access — show stored attachment metadata (tagged by original coordinator)
      const _meta=Object.entries(v.attachmentMeta||{});
      if(_meta.length){
        const _metaCards=_meta.map(([aid,m])=>{
          const iTag=m.tag&&m.tag!=='Other / Not a required item'?`<span style="font-size:11px;background:#e8f4ff;color:#1D2E6B;border-radius:4px;padding:2px 8px;margin-left:6px;font-weight:600">${m.tag}</span>`:'';
          const sizeKb=m.size?Math.round(m.size/1024)+'KB':'';
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;background:#fafbff">
            <i class="ti ti-paperclip" style="color:var(--navy);font-size:16px;flex-shrink:0"></i>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(m.filename||'File')}</div>
              <div style="font-size:11px;color:var(--muted)">${sizeKb}${iTag}</div>
            </div>
          </div>`;
        }).join('');
        _mvAtEl.innerHTML=`<div style="margin-bottom:1rem"><div class="sl" style="margin-bottom:8px">Attachments received <span style="font-size:10px;background:var(--navy-l);color:var(--navy);border-radius:99px;padding:1px 8px;font-weight:700;margin-left:4px">${_meta.length}</span><span style="font-size:11px;color:var(--muted);margin-left:8px">(preview unavailable — original Gmail account required)</span></div>${_metaCards}</div>`;
      } else {
        _mvAtEl.innerHTML='';
      }
    }
  }

  // Timeline
  seedTimeline(v);
  const tl=document.getElementById('mv-timeline');
  if(tl)tl.innerHTML=renderTimeline(v);

  // Follow-up draft from computeReceivedMissing — always matches Analyze modal
  const mvFu=document.getElementById('mv-followup-draft');
  if(mvFu)mvFu.value=_rmV.draft;

  // Show Archive button only for completed vessels (admin only)
  const _archBtn=document.getElementById('mv-archive-btn');
  if(_archBtn)_archBtn.style.display=(v.status==='completed'&&isAdmin())?'inline-flex':'none';

  // Render CC tags — always shows ops@ + any preserved from captain replies
  renderCcTags(window._mvIdx,'mv');

  document.getElementById('mod-view').style.display='flex';
  // Bind clickable rows after modal is visible
  setTimeout(function(){
    document.querySelectorAll('#mod-view .tl-clickable:not([data-tl-bound])').forEach(function(row){
      row.setAttribute('data-tl-bound','1');
      row.addEventListener('click',function(){tlToggle(this.getAttribute('data-eid'),this.getAttribute('data-arid'));});
      row.addEventListener('mouseenter',function(){this.style.background='#f4f6fb';});
      row.addEventListener('mouseleave',function(){this.style.background='';});
    });
  },50);
}

// ADMIN
function renderAdmin(){
  const roleBox=document.getElementById('current-role-info');if(roleBox&&user)roleBox.textContent=`You are signed in as ${user.email} — ${roleLabel(user.email)}`;const dbBox=document.getElementById('shared-db-status');if(dbBox)dbBox.textContent='Database mode: '+(hasSharedDb()?'Shared Google Sheet':'Local browser only');
  if(!isAdmin(user&&user.email))return;
  const stored=Object.values(lu());
  const map=new Map();
  TEAM_USERS.forEach(u=>map.set(normEmail(u.email),u));
  stored.forEach(u=>map.set(normEmail(u.email),{...u,role:roleLabel(u.email)}));
  if(user&&user.email)map.set(normEmail(user.email),{...user,role:roleLabel(user.email)});
  const users=Array.from(map.values()).sort((a,b)=>{
    const ar=isSuperAdmin(a.email)?0:isAdmin(a.email)?1:2;
    const br=isSuperAdmin(b.email)?0:isAdmin(b.email)?1:2;
    return ar-br || String(a.name||a.email).localeCompare(String(b.name||b.email));
  });
  document.getElementById('adm-u').innerHTML=users.length?users.map(u=>{
    const role=roleLabel(u.email);
    const cls=role==='Super Admin'?'bn':role==='Admin'?'bb':'bg';
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
      <img src="${u.pic||''}" style="width:24px;height:24px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'"/>
      <span style="flex:1">${u.name||u.email}<br><span style="font-size:11px;color:var(--faint)">${u.email}</span></span>
      <span class="badge ${cls}">${role}</span>
    </div>`;
  }).join(''):'<span style="font-size:13px;color:var(--faint)">No users yet.</span>';
  document.getElementById('adm-v').innerHTML=vessels.length?vessels.map((v,i)=>{
    const del=isAdmin()?`<button class="btn btn-s btn-d" onclick="deleteVessel(${i})"><i class="ti ti-trash"></i> Delete</button>`:'';
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="flex:1;font-weight:600">${v.name}<br><span style="font-size:11px;color:var(--faint)">${v.email||''}</span></span>
      ${sb(v.status)}
      <select onchange="setVesselStatus(${i},this.value)" style="width:170px;padding:5px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--rs);background:var(--white);font-family:inherit">${statusOptions(v.status)}</select>
      <select onchange="assignVessel(${i},this.value)" style="width:170px;padding:5px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--rs);background:var(--white);font-family:inherit">${userOptions(v.assignedTo)}</select>
      <span style="font-size:11px;color:var(--faint)">${v.progress||0}%</span>
      ${del}
    </div>`;
  }).join(''):'<span style="font-size:13px;color:var(--faint)">No vessels yet.</span>';
  const superOnly=document.getElementById('super-admin-actions');
  if(superOnly)superOnly.style.display=isSuperAdmin(user&&user.email)?'flex':'none';
  const resetBtn=document.getElementById('btn-reset-db');
  if(resetBtn)resetBtn.style.display=isSuperAdmin(user&&user.email)?'inline-flex':'none';
}
function resetInboxUi(){
  ibItems=[];curIb=null;ibAna=null;ana=null;draft='';
  const list=document.getElementById('ib-list');if(list)list.innerHTML='';
  const empty=document.getElementById('ib-empty');if(empty)if(empty)empty.style.display='block';
  const badge=document.getElementById('ib-count');if(badge){badge.textContent='0';badge.style.display='none';}
}
async function resetSharedDatabase(){
  if(typeof isSuperAdmin==='function' && !isSuperAdmin(user&&user.email)){
    await orcaAlert('Super Admin only.','Access Denied');
    return;
  }
  if(typeof isAdmin==='function' && !isAdmin()){
    await orcaAlert('Admin only.','Access Denied');
    return;
  }
  const ok=await orcaConfirm('This will delete ALL vessels from the shared database for EVERYONE. Continue?','⚠️ Reset Shared DB');
  if(!ok)return;
  const ok2=await orcaConfirm('Final confirmation: reset the shared Google Sheet database now?','⚠️ Final Confirmation');
  if(!ok2)return;
  // Yield to browser before heavy work - prevents INP blocking
  await new Promise(r=>setTimeout(r,0));
  try{
    const resetAt=new Date().toISOString();
    vessels=[];
    ibItems=[];
    setLocalResetAt(resetAt);

    // clear local cache/history for current user
    Object.keys(localStorage).forEach(k=>{
      const kk=k.toLowerCase();
      if(kk.includes('vessel')||kk.includes('timeline')||kk.includes('history')){
        localStorage.removeItem(k);
      }
    });
    localStorage.setItem('orca_shared_reset_at',resetAt);
    if(typeof saveLocal==='function')saveLocal();

    // Clear the vessels sheet (per-row format — just pass empty array)
    if(typeof saveSharedVessels==='function'){
      const saved=await saveSharedVessels([]);
      if(!saved)throw new Error('saveSharedVessels failed');
    }else{
      throw new Error('saveSharedVessels is missing');
    }

    if(typeof render==='function')render();
    await orcaAlert('Shared database reset successfully. Ask all users to Hard Refresh and click Sync.','Done');
  }catch(e){
    console.error(e);
    await orcaAlert('Shared database reset failed. Check Google Sheet permission.','Error');
  }
}
async function clearAllCacheAndHistory(){
  if(!isSuperAdmin()){await orcaAlert('Only Super Admin can clear cache and history.','Access Denied');return;}
  const ok=await orcaConfirm('This will clear ALL local cache and history on this browser. Continue?','⚠️ Clear Cache & History');
  if(!ok)return;
  await new Promise(r=>setTimeout(r,0));
  // Clear localStorage
  try{
    localStorage.removeItem(VKEY);localStorage.removeItem(UKEY);
    localStorage.removeItem('orca_v3');localStorage.removeItem('orca_v2');localStorage.removeItem('orca_v1');
    localStorage.removeItem('orca_session');localStorage.removeItem('orca_user_cache');
  }catch(e){}
  vessels=[];ibItems=[];curIb=null;ibAna=null;ana=null;draft='';
  const badge=document.getElementById('ib-count');if(badge){badge.textContent='0';badge.style.display='none';}
  const list=document.getElementById('ib-list');if(list)list.innerHTML='';
  const dash=document.getElementById('dash-inbox-list');if(dash)dash.innerHTML='';
  await new Promise(r=>setTimeout(r,0));
  updateMetrics();renderTable();populateSel();renderInbox();renderInlineInbox();renderAdmin();
  await orcaAlert('Cache and history cleared successfully.','✅ Done');
}

// ── Non-blocking async alert/confirm replacements ──
function orcaAlert(msg, title=''){
  return new Promise(resolve=>{
    const overlay=document.getElementById('orca-modal-overlay');
    document.getElementById('orca-modal-title').textContent=title||'Notice';
    document.getElementById('orca-modal-msg').textContent=msg;
    document.getElementById('orca-modal-cancel').style.display='none';
    document.getElementById('orca-modal-ok').textContent='OK';
    overlay.classList.add('show');
    const ok=document.getElementById('orca-modal-ok');
    const done=()=>{overlay.classList.remove('show');ok.removeEventListener('click',done);resolve();};
    ok.addEventListener('click',done);
  });
}
function orcaConfirm(msg, title=''){
  return new Promise(resolve=>{
    const overlay=document.getElementById('orca-modal-overlay');
    document.getElementById('orca-modal-title').textContent=title||'Confirm';
    document.getElementById('orca-modal-msg').textContent=msg;
    const cancel=document.getElementById('orca-modal-cancel');
    const ok=document.getElementById('orca-modal-ok');
    cancel.style.display='inline-block';
    cancel.textContent='Cancel';
    ok.textContent='Confirm';
    overlay.classList.add('show');
    const cleanup=()=>overlay.classList.remove('show');
    const onOk=()=>{cleanup();ok.removeEventListener('click',onOk);cancel.removeEventListener('click',onCancel);resolve(true);};
    const onCancel=()=>{cleanup();ok.removeEventListener('click',onOk);cancel.removeEventListener('click',onCancel);resolve(false);};
    ok.addEventListener('click',onOk);
    cancel.addEventListener('click',onCancel);
  });
}
function _bootApp(tokenVal, userObj){
  // Central function: set global state and show the app.
  // Called both from loadSession() restore and from handleToken() after OAuth.
  token=tokenVal;user=userObj;
  applyUserRole();su&&su(user);
  loadVessels().then(()=>{
    document.getElementById('auth-screen').style.display='none';
    document.getElementById('app').style.display='block';
    document.getElementById('uname').textContent=(user.name||user.email)+' · '+roleLabel(user.email);
    if(user.pic)document.getElementById('uav').src=user.pic;
    document.getElementById('tab-admin').style.display=isAdmin(user.email)?'inline-flex':'none';
    renderTable();updateMetrics();populateSel();
    sheetsInboxInit();
    ensureSheetTab(ATAGS_SHEET_NAME).then(()=>loadSharedAttTags());
    ensureSheetTab(ARCHIVE_SHEET_NAME);
    ensureSheetTab(LOG_SHEET);
    checkInbox(true);
    scheduleTokenRefresh();
  });
}

function trySilentSignIn(){
  try{
    // 1. Valid unexpired session in localStorage — restore instantly, no network call
    const sess=loadSession();
    if(sess&&sess.token&&sess.user){
      _bootApp(sess.token,sess.user);
      return;
    }
    // 2. No valid session, but we know this user — show "signing in..." hint while
    //    silently requesting a fresh token. No popup shown if Google session is active.
    const approved=localStorage.getItem('orca_google_consent_ok')==='1';
    const savedEmail=localStorage.getItem('orca_last_email')||'';
    if(approved&&savedEmail){
      // Show the cached user name on the login screen so they know we're resuming
      const cachedUser=loadCachedUser();
      if(cachedUser){
        const hint=document.getElementById('silent-signin-hint')||document.createElement('p');
        hint.id='silent-signin-hint';
        hint.style.cssText='margin-top:16px;font-size:13px;color:#1D2E6B;font-weight:500';
        hint.textContent='Signing you back in as '+savedEmail+'...';
        const authScreen=document.getElementById('auth-screen');
        if(authScreen&&!document.getElementById('silent-signin-hint'))authScreen.appendChild(hint);
      }
      if(typeof google==='undefined'||!google.accounts){setTimeout(trySilentSignIn,300);return;}
      if(!tc)initG();
      tc.requestAccessToken({prompt:'',login_hint:savedEmail});
      return;
    }
    // 3. Unknown user — Google API not loaded yet, retry shortly
    if(typeof google==='undefined'||!google.accounts){
      setTimeout(trySilentSignIn,300);
    }
  }catch(e){console.warn('Silent sign-in skipped',e);}
}
window.onload=()=>{
  if(!window._ssoHandled)setTimeout(trySilentSignIn,200);
};
// ── Smart polling — 5s when tab is active, paused when hidden ─────────────────
(function(){
  const ACTIVE_INTERVAL=5000;   // 5s when tab is visible
  const VESSEL_INTERVAL=8000;   // 8s between vessel data syncs (separate from inbox)
  const ATAGS_INTERVAL=30000;   // 30s for shared attachment tags (changes less frequently)
  let _inboxTimer=null;
  let _vesselTimer=null;
  let _atagsTimer=null;
  let _tabActive=!document.hidden;

  async function pollInbox(){
    if(!token||!_tabActive)return;
    try{await checkInbox(true);}catch(e){console.warn('Auto-refresh error',e);}
  }

  async function pollVessels(){
    if(!token||!_tabActive)return;
    try{
      // Silently pull latest vessel data from Sheet and merge into local state
      const fresh=await loadSharedVessels();
      if(!Array.isArray(fresh)||!fresh.length)return;
      // Merge fresh Sheet data into local vessels — keep local unsaved changes
      let changed=false;
      fresh.forEach(sv=>{
        const idx=vessels.findIndex(v=>(v.id||v.name)===(sv.id||sv.name));
        if(idx<0){vessels.push(normalizeVessel(sv));changed=true;return;}
        const local=vessels[idx];
        const svNewer=new Date(sv.lastActivity||0)>new Date(local.lastActivity||0);
        // Only merge if sheet has something newer
        if(svNewer||STAMPED_FIELDS.some(f=>new Date(sv['_ts_'+f]||0)>new Date(local['_ts_'+f]||0))){
          // Start from sheet version (has latest shared data)
          const result={...sv};
          // Stamped fields: per-field timestamp wins regardless of global lastActivity
          STAMPED_FIELDS.forEach(f=>{
            result[f]=_mergeFieldWithTimestamp(local,sv,f);
            const lts=new Date(local['_ts_'+f]||0).getTime();
            const sts=new Date(sv['_ts_'+f]||0).getTime();
            result['_ts_'+f]=lts>=sts?(local['_ts_'+f]||''):(sv['_ts_'+f]||'');
          });
          // Local-only fields always come from local
          result.missingItems=local.missingItems;
          result.receivedItems=local.receivedItems;
          result.detectedItems=local.detectedItems;
          // Merge seenMsgIds — union of both so no message is ever re-counted
          const _seenUnion=new Set([...(local.seenMsgIds||[]),...(sv.seenMsgIds||[])]);
          result.seenMsgIds=[..._seenUnion].slice(-500);
          // attachmentTags: merge both sides
          result.attachmentTags=Object.assign({},sv.attachmentTags||{},local.attachmentTags||{});
          // Timelines: always union
          const tl=[...(local.timeline||[]),...(sv.timeline||[])];
          const seen=new Set();
          result.timeline=tl.filter(e=>{const k=(e.ts||'')+(e.type||'')+(e.title||'');if(seen.has(k))return false;seen.add(k);return true;});
          vessels[idx]=result;
          changed=true;
        }
      });
      // Only re-render if something actually changed — avoids unnecessary DOM work
      if(changed){updateMetrics();renderTable();}
    }catch(e){console.warn('Vessel poll error',e);}
  }

  function startPolling(){
    if(!_inboxTimer)_inboxTimer=setInterval(pollInbox,ACTIVE_INTERVAL);
    if(!_vesselTimer)_vesselTimer=setInterval(pollVessels,VESSEL_INTERVAL);
    if(!_atagsTimer)_atagsTimer=setInterval(()=>{if(token&&_tabActive)loadSharedAttTags();},ATAGS_INTERVAL);
  }
  function stopPolling(){
    clearInterval(_inboxTimer);_inboxTimer=null;
    clearInterval(_vesselTimer);_vesselTimer=null;
    clearInterval(_atagsTimer);_atagsTimer=null;
  }

  // React to tab visibility changes
  document.addEventListener('visibilitychange',()=>{
    _tabActive=!document.hidden;
    if(_tabActive){
      startPolling();
      // Immediately sync when user returns to tab
      if(token){pollInbox();pollVessels();}
    } else {
      stopPolling();
    }
  });

  // Start polling once user is signed in (token is set by onSignIn)
  // We hook into the existing token — start after a short delay to let init complete
  const _waitForToken=setInterval(()=>{
    if(token){clearInterval(_waitForToken);if(_tabActive)startPolling();}
  },1000);
})();

// ── ESC key closes any open modal ─────────────────────────────────────────────
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  // Don't interfere with the custom alert/confirm overlay
  const overlay=document.getElementById('orca-modal-overlay');
  if(overlay&&overlay.classList.contains('show')){
    // ESC on confirm/alert = cancel (safe default)
    const cancel=document.getElementById('orca-modal-cancel');
    const ok=document.getElementById('orca-modal-ok');
    if(cancel&&cancel.style.display!=='none')cancel.click();
    else if(ok)ok.click();
    return;
  }
  // Close whichever modal-bg is currently visible
  const modals=['mod-ib','mod-view','mod-start','mod-view-reply','mod-latest-status'];
  for(const id of modals){
    const el=document.getElementById(id);
    if(el&&el.style.display!=='none'){el.style.display='none';break;}
  }
});

