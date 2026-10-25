// Cloudflare Pages Function: 评论区 API（KV 持久化）
// GET    /api/comment                       列出全部评论
// POST   /api/comment                       发布评论/回复 {parentId?, nick, text}
// DELETE /api/comment?id=xxx&admin=管理密码  删除评论及其全部回复（仅管理员）
//
// KV 绑定名: COMMENTS（部署时通过 --binding COMMENTS=<namespace_id> 注入）

const ADMIN = '201052';   // 管理密码（仅删除接口使用，页面不公布）
const KEY = 'comments_v1';
const MAX_TEXT = 2000;
const MAX_NICK = 24;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
  });
}

function bad(msg) { return json({ ok: false, error: msg }, 400); }

function clean(s) {
  // 保留可见字符与全角/emoji，剔除控制字符与不可见字符
  return String(s || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
}

async function loadComments(env) {
  const raw = await env.COMMENTS.get(KEY, 'json');
  return Array.isArray(raw) ? raw : [];
}

async function saveComments(env, list) {
  await env.COMMENTS.put(KEY, JSON.stringify(list));
}

export async function onRequestGet(ctx) {
  const list = await loadComments(ctx.env);
  return json({ ok: true, comments: list });
}

export async function onRequestPost(ctx) {
  let body;
  try { body = await ctx.request.json(); } catch (e) { return bad('JSON 格式错误'); }
  const parentId = body.parentId ? String(body.parentId).slice(0, 40) : null;
  const nick = clean(body.nick).slice(0, MAX_NICK) || '匿名';
  const text = clean(body.text).slice(0, MAX_TEXT);
  if (!text) return bad('内容不能为空');
  if (/^[\\s\\uFEFF\\xA0]+$/.test(text)) return bad('内容不能为空');

  const list = await loadComments(ctx.env);
  if (parentId) {
    if (!list.some(c => c.id === parentId)) return bad('回复的评论不存在');
  }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const comment = { id, parentId, nick, text, ts: Date.now() };
  list.push(comment);
  await saveComments(ctx.env, list);
  return json({ ok: true, comment }, 201);
}

export async function onRequestDelete(ctx) {
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get('id') || '';
  const admin = url.searchParams.get('admin') || '';
  if (admin !== ADMIN) return json({ ok: false, error: '权限不足' }, 403);
  if (!id) return bad('缺少评论 id');

  const list = await loadComments(ctx.env);
  const doomed = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of list) {
      if (c.parentId && doomed.has(c.parentId) && !doomed.has(c.id)) {
        doomed.add(c.id);
        changed = true;
      }
    }
  }
  const next = list.filter(c => !doomed.has(c.id));
  if (next.length === list.length) return bad('评论不存在');
  await saveComments(ctx.env, next);
  return json({ ok: true, deleted: list.length - next.length });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
