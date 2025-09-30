import crypto from 'crypto';

function b64url(input){
  return Buffer.from(input).toString('base64')
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function b64urlJSON(obj){ return b64url(JSON.stringify(obj)); }

export function signJWT(payload, secret, opt={}){
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now()/1000);
  const exp = opt.expiresIn ? now + parseExp(opt.expiresIn) : (now + 60*60*24*30);
  const pl = { ...payload, exp };
  const unsigned = b64urlJSON(header)+'.'+b64urlJSON(pl);
  const sig = crypto.createHmac('sha256', secret).update(unsigned).digest('base64')
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return unsigned + '.' + sig;
}

export function verifyJWT(token, secret){
  const [h, p, s] = String(token||'').split('.');
  if (!h || !p || !s) throw new Error('Malformed');
  const unsigned = h+'.'+p;
  const sig = crypto.createHmac('sha256', secret).update(unsigned).digest('base64')
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  if (!timingSafeEqual(sig, s)) throw new Error('Bad signature');
  const payload = JSON.parse(Buffer.from(p.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'));
  const now = Math.floor(Date.now()/1000);
  if (payload.exp && payload.exp < now) throw new Error('Expired');
  return payload;
}

function parseExp(str){
  if (typeof str==='number') return str;
  const m = String(str).match(/^(\d+)([smhd])$/);
  if (!m) return 60*60*24*30;
  const n = parseInt(m[1],10);
  const unit = m[2];
  return unit==='s'?n: unit==='m'?n*60: unit==='h'?n*3600: n*86400;
}

function timingSafeEqual(a,b){
  const A = Buffer.from(a); const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A,B);
}
