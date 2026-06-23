/* Deterministic build: generate the Prisma client, then compile the backend.
 * No machine-specific paths. Mirrors `npm run build`. */
import { execFileSync } from 'node:child_process';

function run(command: string, args: string[]): void {
  console.log(`$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit' });
}

run('npx', ['prisma', 'generate', '--schema', 'prisma/extension.prisma']);
run('npx', ['tsc', '-p', 'tsconfig.build.json']);
console.log('✓ Build complete.');
