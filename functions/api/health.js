// Cloudflare Pages Function: 健康检查代理 /api/health → Worker
// 与 /api/v1/* 代理同一目的，便于客户端先探活再配对。

const ORIGIN = 'https://cloud-backup.zxh201052.workers.dev';

export const onRequest = async (context) => {
  const url = new URL(context.request.url);
  const response = await fetch(ORIGIN + url.pathname + url.search, {
    method: context.request.method,
    headers: { Accept: 'application/json' },
    redirect: 'manual',
  });

  const outHeaders = new Headers(response.headers);
  outHeaders.set('Cache-Control', 'no-store');
  outHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
  });
};
