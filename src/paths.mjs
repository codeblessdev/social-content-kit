// Dónde vive cada cosa.
//   KIT        este repo (templates, CLI). Nunca se escribe acá.
//   workspace  carpeta del usuario con sus marcas, proyectos y resultados.
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
  if (!existsSync(file)) throw new Error(`No existe la marca "${id}" (${file}). Creala con: sck brand init <repo|carpeta> --id ${id}`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

export const slug = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const GIT_URL = /^(https?:\/\/|git@)[^\s]+$|^[\w.-]+\/[\w.-]+$/;

// Acepta una carpeta local, una URL git (https/ssh) o "owner/repo" de GitHub.
// Las URLs se clonan (shallow) en <workspace>/.sources/<nombre>; si ya existe, se actualiza.
export function resolveSource(input, ws) {
  const local = resolve(input);
  if (existsSync(local)) return { dir: local, kind: 'local', ref: local };
  if (!GIT_URL.test(input)) throw new Error(`"${input}" no es una carpeta existente ni una URL de git.`);

  const url = /^[\w.-]+\/[\w.-]+$/.test(input) ? `https://github.com/${input}.git` : input;
  const name = basename(url).replace(/\.git$/, '');
  const dir = join(ws, '.sources', name);
  mkdirSync(dirname(dir), { recursive: true });

  const run = (args, cwd) => spawnSync('git', args, { cwd, stdio: 'inherit' }).status === 0;
  const ok = existsSync(join(dir, '.git')) ? run(['pull', '--ff-only', '-q'], dir) : run(['clone', '--depth', '1', '-q', url, dir]);
  if (!ok) {
    throw new Error(
      `No pude clonar ${url}. Si es privado, autenticá git (por ejemplo "gh auth login") o cloná vos el repo y pasá la carpeta.`,
    );
  }
  return { dir, kind: 'git', ref: url };
}

export const has = (cmd) => spawnSync('sh', ['-c', `command -v ${cmd}`]).status === 0;
