// Where things live.
//   KIT        this repo (templates, CLI). Never written to.
//   workspace  the user's folder with their brands, projects and outputs.
//              --workspace <dir> > $SCK_WORKSPACE > ./social-content

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function workspace(opts = {}) {
  const dir = resolve(opts.workspace || process.env.SCK_WORKSPACE || 'social-content');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const brandDir = (ws, id) => join(ws, 'brands', id);
export const projectDir = (ws, id) => join(ws, 'projects', id);

export function loadBrand(ws, id) {
  const file = join(brandDir(ws, id), 'brand.json');
  if (!existsSync(file)) throw new Error(`Brand "${id}" not found (${file}). Create it with: sck brand init <repo|folder> --id ${id}`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

export const slug = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const GIT_URL = /^(https?:\/\/|git@)[^\s]+$|^[\w.-]+\/[\w.-]+$/;

// Accepts a local folder, a git URL (https/ssh) or a GitHub "owner/repo".
// URLs are shallow-cloned into <workspace>/.sources/<name>; an existing clone is updated.
export function resolveSource(input, ws) {
  const local = resolve(input);
  if (existsSync(local)) return { dir: local, kind: 'local', ref: local };
  if (!GIT_URL.test(input)) throw new Error(`"${input}" is not an existing folder or a git URL.`);

  const url = /^[\w.-]+\/[\w.-]+$/.test(input) ? `https://github.com/${input}.git` : input;
  const name = basename(url).replace(/\.git$/, '');
  const dir = join(ws, '.sources', name);
  mkdirSync(dirname(dir), { recursive: true });

  const run = (args, cwd) => spawnSync('git', args, { cwd, stdio: 'inherit' }).status === 0;
  const ok = existsSync(join(dir, '.git')) ? run(['pull', '--ff-only', '-q'], dir) : run(['clone', '--depth', '1', '-q', url, dir]);
  if (!ok) {
    throw new Error(
      `Could not clone ${url}. If it's private, authenticate git (e.g. "gh auth login") or clone it yourself and pass the folder.`,
    );
  }
  return { dir, kind: 'git', ref: url };
}

export const has = (cmd) => spawnSync('sh', ['-c', `command -v ${cmd}`]).status === 0;
