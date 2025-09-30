import { query } from '../_utils/db.js';
import { getUser } from '../_utils/auth.js';
import { isOwned } from '../_utils/owned.js';

export default async function handler(req, res){
  res.setHeader('content-type','application/json');
  const productId = (req.query && (req.query.productId || req.query.id)) || (req.url.split('/').slice(-1)[0]);

  const c = await query(`SELECT c.product_id, c.intro, p.title FROM courses c JOIN products p ON p.id=c.product_id WHERE c.product_id=$1`, [productId]).catch(()=>({ rows: [] }));
  const course = c.rows[0];
  if (!course){ res.status(404).json({ ok:false, error:'Course not found' }); return; }

  const me = getUser(req);
  const owned = me ? await isOwned(me.id, productId) : false;

  const vids = await query(`
    SELECT id, title, video_url, duration_seconds, sort_index, free_preview
    FROM course_videos WHERE course_id=$1
    ORDER BY sort_index, created_at
  `, [productId]).catch(()=>({ rows: [] }));

  const videos = vids.rows.map(v => ({
    id: v.id,
    title: v.title,
    duration_seconds: v.duration_seconds,
    sort_index: v.sort_index,
    free_preview: v.free_preview,
    video_url: (owned || v.free_preview) ? v.video_url : null
  }));

  res.json({ ok:true, data: { ...course, owned, videos } });
}
