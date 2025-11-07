import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

const showOrgPath = path.join(
    process.cwd(),
    'resources/js/Pages/Organizations/Show.jsx'
);

const showOrgSource = fs.readFileSync(showOrgPath, 'utf-8');

test('organization invite form uses useForm with initial email data', () => {
    assert.ok(
        /useForm\(\{\s*email:\s*''\s*\}\)/.test(showOrgSource),
        'Expected useForm to be initialized with email field'
    );
});

test('organization invite form initializes invitePost from useForm', () => {
    assert.ok(
        /const\s+{\s*data:\s*inviteData,\s*setData:\s*setInviteData,\s*post:\s*invitePost,\s*processing:\s*inviteProcessing\s*}\s*=\s*useForm\(\{\s*email:\s*''\s*\}\)/.test(
            showOrgSource
        ),
        'Expected invitePost to be destructured from useForm'
    );
});

test('organization invite uses post method with route and options', () => {
    assert.ok(
        /invitePost\(route\('organizations\.invite',\s*organization\.id\),\s*{\s*data:\s*{\s*email:\s*inviteEmail\s*},/.test(
            showOrgSource
        ),
        'Expected invitePost to call route with email data'
    );
});

test('organization invite handles success by clearing email', () => {
    assert.ok(
        /onSuccess:\s*\(\)\s*=>\s*{\s*setInviteEmail\(''\);/.test(showOrgSource),
        'Expected onSuccess to clear inviteEmail'
    );
});

test('organization invite handles errors with email field', () => {
    assert.ok(
        /onError:\s*\(errors\)\s*=>\s*{\s*setInviteError\(errors\.email\s*\|\|\s*'Failed to invite user'\);/.test(
            showOrgSource
        ),
        'Expected onError to handle email errors'
    );
});
