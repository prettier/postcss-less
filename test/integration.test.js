/* eslint no-await-in-loop: off */

// TODO: enable when interpolation has been fixed
// const { readFileSync } = require('fs');
// const { join } = require('path');

import test from 'ava';
import * as cheerio from 'cheerio';
import isAbsoluteUrl from 'is-absolute-url';
import urljoin from 'url-join';
import postcss from 'postcss';

import syntax from '../lib/index.js';

const sites = ['https://github.com', 'https://news.ycombinator.com'];

for (const site of sites) {
  test.skip(`integration: ${site}`, async (t) => {
    t.timeout(50000);
    const res = await fetch(site);
    const html = await res.text();
    const $ = cheerio.load(html);

    const hrefs = $('head link[rel=stylesheet]')
      .filter((index, sheet) => !!sheet.attribs.href)
      .map((index, sheet) => {
        let { href } = sheet.attribs;

        if (!isAbsoluteUrl(href)) {
          href = urljoin(site, href);
        }

        return href;
      })
      .get();

    for (const href of hrefs) {
      const req = await fetch(href);
      const css = await req.text();
      await postcss().process(css, {
        from: null,
        map: { annotation: false },
        parser: syntax.parse,
      });
    }

    t.pass();
  });
}

// sanity check - issue #99
// TODO: enable when interpolation has been fixed
// test('should not fail wikimedia sanity check', (t) => {
//   const less = readFileSync(join(__dirname, './integration/ext.cx.dashboard.less'), 'utf-8');
//   const root = syntax.parse(less);
//
//   t.is(root.first.type, 'import');
// });
