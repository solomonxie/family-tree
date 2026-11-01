/// <reference types="node" />
import { base64ToBytes, decodeText } from './text';

const b64 = (bytes: number[]) => Buffer.from(bytes).toString('base64');

test('base64', () => {
  for (const s of ['', 'a', 'ab', 'abc', 'abcd', 'héllo 世界']) {
    expect(Buffer.from(base64ToBytes(Buffer.from(s).toString('base64'))).toString()).toBe(s);
  }
});

test('UTF-8 (with/without BOM), UTF-16 LE/BE, Latin-1 fallback', () => {
  const text = '0 HEAD\n1 NAME José /Müller/ 林';
  expect(decodeText(base64ToBytes(Buffer.from(text).toString('base64')))).toBe(text);
  expect(decodeText(base64ToBytes(b64([0xef, 0xbb, 0xbf, ...Buffer.from(text)])))).toBe(text);
  const le = Buffer.from('﻿' + text, 'utf16le');
  expect(decodeText(new Uint8Array(le))).toBe(text);
  const be = Buffer.from(le).swap16();
  expect(decodeText(new Uint8Array(be))).toBe(text);
  expect(decodeText(new Uint8Array(Buffer.from('Jos\xe9', 'latin1')))).toBe('José');
});
