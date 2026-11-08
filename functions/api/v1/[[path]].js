// Cloudflare Pages Function: 备份服务 API 反向代理
// 路径: /api/v1/*  → 转发到 Cloudflare Worker（cloud-backup）
//
// 为什么需要这一层：
// Worker 的公网域名 *.workers.dev 在国内被 DNS 污染 + SNI 阻断，客户端连不上；
// 而 zouxinhang.de5.net 已在 Pages 上、国内可正常直连。
// 因此在主页项目里加一层同源代理，客户端只需把服务器地址改成 https://zouxinhang.de5.net，
// Worker 端代码与客户端代码都无需改动。
//
// 转发是服务端到服务端（Cloudflare 边缘 → Worker），不受本地网络限制。

const ORIGIN = 'https://cloud-backup.zxh201052.workers.dev';

export const onRequest = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const target = ORIGIN + url.pathname + url.search;

  // 复制请求头并剔除不允许手工设置的字段
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');
  headers.delete('x-forwarded-proto');

  const method = request.method.toUpperCase();
  const init = { method, headers, redirect: 'manual' };

  if (method !== 'GET' && method !== 'HEAD') {
    // 分片最大 20MB，整体读入内存后转发（Pages Functions 内存 128MB，安全）
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(new Request(target, init));

  // 回包原样透传（含 ETag / Content-Length / 业务错误码），仅补 CORS 与禁止缓存
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
