import { env, cwd } from 'node:process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPublicSeoHandler } from '../server/publicSeo.js';

export default createPublicSeoHandler({ env, getTemplate: () => readFile(join(cwd(), 'dist/seo-template.html'), 'utf8') });
