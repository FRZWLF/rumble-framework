#!/usr/bin/env node
// Export one issue's pipeline trail from GitHub as JSON for site/replay.html.
//
//   node scripts/replay-from-gh.mjs <owner/repo> <issue> > site/replays/issue-<n>.json
//
// Needs gh (authenticated). Collects: the issue (body, labels, timeline of label events),
// its comments (triage, 🏛 Design, fix-round markers, 📋 trail), the PR that closes it
// (body, commits, review comments with VERDICT lines, merge). Nothing is invented: every
// event carries its GitHub timestamp and author; the player only animates the order.

import { execFileSync } from 'node:child_process';

const [repo, issue] = process.argv.slice(2);
if (!repo || !issue) { console.error('usage: replay-from-gh.mjs <owner/repo> <issue>'); process.exit(2); }
const gh = (...a) => JSON.parse(execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 << 20 }));
const api = (path, extra = []) => gh('api', '--paginate', path, ...extra);

const iss = gh('issue', 'view', issue, '-R', repo, '--json', 'number,title,body,labels,createdAt,closedAt,url,author');
const events = [];
const push = (at, kind, who, text, meta = {}) => events.push({ at, kind, who, text, ...meta });

push(iss.createdAt, 'issue', iss.author.login, iss.title, { body: iss.body, url: iss.url });
for (const e of api(`repos/${repo}/issues/${issue}/events`)) {
  if (e.event === 'labeled' || e.event === 'unlabeled') push(e.created_at, e.event, e.actor?.login, e.label.name);
  if (e.event === 'closed') push(e.created_at, 'closed', e.actor?.login, 'issue closed');
}
for (const c of api(`repos/${repo}/issues/${issue}/comments`)) {
  const b = c.body || '';
  const kind = b.includes('🏛') ? 'design' : b.includes('claude-fix-round') ? 'fix-round' : b.includes('📋') ? 'trail' : /triage/i.test(b.slice(0, 80)) ? 'triage' : 'comment';
  push(c.created_at, kind, c.user.login, b, { url: c.html_url });
}

// the PR(s) that reference the issue
const prs = api(`repos/${repo}/pulls?state=all&per_page=100`).filter(p => new RegExp(`(close[sd]?|fixe?[sd]?|resolve[sd]?)\\s+#${issue}\\b`, 'i').test(p.body || ''));
for (const p of prs) {
  push(p.created_at, 'pr', p.user.login, p.title, { body: p.body, url: p.html_url, number: p.number, draft: p.draft });
  for (const c of api(`repos/${repo}/pulls/${p.number}/commits`)) push(c.commit.author.date, 'commit', c.author?.login || c.commit.author.name, c.commit.message.split('\n')[0], { sha: c.sha.slice(0, 7) });
  for (const c of api(`repos/${repo}/issues/${p.number}/comments`)) {
    const b = c.body || '';
    const verdict = (b.match(/VERDICT:.*$/m) || [])[0] || null;
    const kind = b.includes('claude-fix-round') ? 'fix-round' : verdict ? 'review' : 'comment';
    push(c.created_at, kind, c.user.login, b, { url: c.html_url, verdict, pr: p.number });
  }
  for (const r of api(`repos/${repo}/pulls/${p.number}/reviews`)) {
    if (!r.body) continue;
    const verdict = (r.body.match(/VERDICT:.*$/m) || [])[0] || null;
    push(r.submitted_at, 'review', r.user.login, r.body, { verdict, state: r.state, pr: p.number });
  }
  if (p.merged_at) push(p.merged_at, 'merged', p.merged_by?.login || '', `PR #${p.number} merged`, { pr: p.number });
}

events.sort((a, b) => a.at.localeCompare(b.at));
process.stdout.write(JSON.stringify({ repo, issue: iss.number, title: iss.title, exported: new Date().toISOString(), events }, null, 1));
