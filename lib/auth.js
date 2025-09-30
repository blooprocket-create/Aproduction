import jwt from 'jsonwebtoken';
export function getUser(req){
  try{
    const cookies = req.headers.cookie || '';
    const m = cookies.match(/(?:^|; )token=([^;]+)/);
    if (!m) return null;
    const token = decodeURIComponent(m[1]);
    return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  }catch{ return null }
}
export function requireUser(req, res){
  const u = getUser(req);
  if (!u){
    res.statusCode=401; res.setHeader('content-type','application/json');
    res.end(JSON.stringify({ ok:false, error:'Unauthorized' }));
    return null;
  }
  return u;
}
