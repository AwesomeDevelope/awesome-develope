import { normalizePath } from 'vite';
import path from 'path';
import fs from 'fs';

const tagMatcher = new RegExp('<load(?:.*?)="([^"]+)"(.*?)/>', 'gs');
const attrMatcher = new RegExp(
  '(?:(?:\\s)?([a-z0-9_-]+)(?:="([^"]*)"|))',
  'gi',
);
const replaceAttrMatcher = new RegExp('{=[$]([a-z0-9_-]+)}', 'gi');
function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '$&');
}
function injectHTML(cfg) {
  let config;
  const fileList = /* @__PURE__ */ new Set();
  async function renderSnippets(code, codePath) {
    if (!config) {
      return code;
    }
    const matches = code.matchAll(tagMatcher);
    for (const match of matches) {
      let [tag, url, attrs] = match;
      let root = config.root;
      if (url.startsWith('.')) {
        root = path.dirname(root + codePath);
      } else {
        url = '/' + url;
      }
      if (!(url.endsWith('.htm') || url.endsWith('.html'))) {
        ['html', 'htm'].some((item) => {
          const fileName = '/index.' + item;
          const filePath2 = normalizePath(path.join(root, url, fileName));
          if (fs.existsSync(filePath2)) {
            url += fileName;
            return true;
          }
        });
      }
      const filePath = normalizePath(path.join(root, url));
      if (cfg?.debug?.logPath) {
        console.log('Trying to include ', filePath);
      }
      fileList.add(filePath);
      let out = tag;
      try {
        let data = fs.readFileSync(filePath, 'utf8');
        for (const attr of attrs.matchAll(attrMatcher)) {
          const attrRegExp = new RegExp(
            '{=\\$' + escapeRegExp(attr[1]) + '}',
            'g',
          );
          data = data.replace(attrRegExp, attr[2]);
        }
        data = data.replace(
          replaceAttrMatcher,
          cfg?.replace?.undefined ?? '$&',
        );
        out = await renderSnippets(data, url);
      } catch (error) {
        if (error instanceof Error) {
          out = error.message;
        }
        console.error(out);
      }
      code = code.replace(tag, out);
    }
    return code;
  }
  return {
    name: 'static-html-loader',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    handleHotUpdate({ file, server }) {
      if (fileList.has(file)) {
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        return renderSnippets(html, ctx.path);
      },
    },
  };
}

export default injectHTML;
