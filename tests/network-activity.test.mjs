import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOutboundRequest } from '../src/utils/networkActivity.js';

const APP = 'https://rdmtoolkit.ca';

test('same-origin asset loads are not outbound', () => {
  assert.equal(isOutboundRequest('https://rdmtoolkit.ca/assets/index-abc.js', APP), false);
  assert.equal(isOutboundRequest('/assets/style.css', APP), false);
});

test('requests to any other origin are outbound', () => {
  assert.equal(isOutboundRequest('https://evil.example.com/exfil', APP), true);
  assert.equal(isOutboundRequest('https://api.rdmtoolkit.ca/x', APP), true); // subdomain ≠ same origin
  assert.equal(isOutboundRequest('http://rdmtoolkit.ca/downgrade', APP), true); // scheme differs
});

test('local object/data URLs created by tools are not outbound', () => {
  assert.equal(isOutboundRequest('blob:https://rdmtoolkit.ca/uuid-here', APP), false);
  assert.equal(isOutboundRequest('data:image/png;base64,AAAA', APP), false);
  assert.equal(isOutboundRequest('about:blank', APP), false);
});

test('unparseable or unknown-origin URLs are conservatively counted as outbound', () => {
  assert.equal(isOutboundRequest('ftp://files.example.com/x', APP), true);
});
