// Cloudflare Pages Function: 备份服务 API 通用反向代理（兜底）
// 捕获 /api/* 中未被更具体路由（/api/comment、/api/health、/api/v1/*）匹配的路径，
// 例如 /api/security-redline。转发逻辑与 v1 代理一致。

const ORIGIN = 'https://cloud-backup.zxh201052.workers.dev';

export const onRequest = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const target = ORIGIN + url.pathname + url.search;

  const headers = new Headers(request.headers);
  for (const name of ['host', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-forwarded-proto']) {
    headers.delete(name);
  }

  const method = request.method.toUpperCase();
  const init = { method, headers, redirect: 'manual' };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(new Request(target, init));
  const outHeaders = new Headers(response.headers);
  outHeaders.set('Cache-Control', 'no-store');
  if (!outHeaders.has('Access-Control-Allow-Origin')) {
    outHeaders.set('Access-Control-Allow-Origin', '*');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
  });
};
