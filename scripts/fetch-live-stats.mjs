#!/usr/bin/env node
/**
 * MONARCH — live GitHub stats collector (runs in GitHub Actions, ~4x daily)
 * Aggregates Adil Chandio's public repos and writes assets/live-stats.json.
 * Uses GITHUB_TOKEN if provided (Actions provides it built-in: 1,000 req/hr).
 * The static concierge reads the JSON at runtime — zero keys in the browser.
 */
const USER = 'adil-chandio';
const OUT = new URL('../assets/live-stats.json', import.meta.url);
const token = process.env.GITHUB_TOKEN || '';
const headers = {
  'User-Agent': 'monarch-live-stats',
  'Accept': 'application/vnd.github+json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
};

const getJSON = async (url) => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  return res.json();
};

const user = await getJSON(`https://api.github.com/users/${USER}`);
const repos = await getJSON(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner&sort=pushed`);

const agg = repos.reduce((a, r) => ({
  stars: a.stars + (r.stargazers_count || 0),
  forks: a.forks + (r.forks_count || 0)
}), { stars: 0, forks: 0 });

const top = [...repos]
  .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
  .slice(0, 3)
  .map(r => ({
    name: r.name,
    description: (r.description || '').slice(0, 140),
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    language: r.language || '',
    url: r.html_url,
    pushed_at: r.pushed_at
  }));

const payload = {
  user: USER,
  updated: new Date().toISOString(),
  public_repos: user.public_repos ?? repos.length,
  followers: user.followers ?? 0,
  stars: agg.stars,
  forks: agg.forks,
  top
};

const { writeFileSync } = await import('fs');
writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
console.log('live-stats.json written:', JSON.stringify({ stars: agg.stars, forks: agg.forks, repos: payload.public_repos, followers: payload.followers, top: top.map(t => t.name) }));
