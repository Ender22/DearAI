import { defineMiddleware } from 'astro:middleware';

// One canonical host: send www.dearai.earth to dearai.earth.
export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);
  if (url.hostname.startsWith('www.')) {
    url.hostname = url.hostname.slice(4);
    return Response.redirect(url.toString(), 301);
  }
  return next();
});
