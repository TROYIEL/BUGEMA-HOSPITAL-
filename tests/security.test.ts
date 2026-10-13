import test from 'node:test';import assert from 'node:assert/strict';import {can,safeLink} from '../lib/model.ts';
test('editor cannot access requests or administrator actions',()=>{assert.equal(can(['hospital-editor'],'content'),true);assert.equal(can(['hospital-editor'],'requests'),false);assert.equal(can([],'content'),false);});
test('request staff cannot manage content',()=>{assert.equal(can(['hospital-requests'],'requests'),true);assert.equal(can(['hospital-requests'],'content'),false);});
test('admin can manage content and requests',()=>{assert.equal(can(['hospital-admin'],'content'),true);assert.equal(can(['hospital-admin'],'requests'),true);});
test('unsafe navigation URLs are rejected',()=>{assert.equal(safeLink('javascript:alert(1)'),'');assert.equal(safeLink('//evil.example'),'');assert.equal(safeLink('/contact'),'/contact');assert.equal(safeLink('https://example.com'),'https://example.com');});
