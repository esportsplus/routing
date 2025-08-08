import { performance } from 'node:perf_hooks';
import routerFactory from '../build/router/index.js';

function fmt(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

function timeit(fn, durationMs = 1000) {
  // Warmup
  for (let i = 0; i < 5_000; i++) fn();

  const end = performance.now() + durationMs;
  let count = 0;
  while (performance.now() < end) {
    fn();
    count++;
  }
  return count * (1000 / durationMs);
}

function buildStaticPaths(length, count) {
  const paths = new Array(count);
  for (let i = 0; i < count; i++) {
    const id = i.toString(36).padStart(3, '0');
    paths[i] = '/a'.repeat(length) + '/' + id;
  }
  return paths;
}

function buildDynamicPaths(length, count) {
  // Route patterns
  const patterns = new Array(count);
  for (let i = 0; i < count; i++) {
    patterns[i] = '/a'.repeat(length) + '/:id';
  }
  return patterns;
}

function buildDynamicTestPaths(length, count) {
  // Concrete paths to match against dynamic patterns
  const paths = new Array(count);
  for (let i = 0; i < count; i++) {
    const id = i.toString(36).padStart(3, '0');
    paths[i] = '/a'.repeat(length) + '/' + id;
  }
  return paths;
}

function buildWildcardPatterns(length, count) {
  // Unique patterns: /a.../<token>/*:rest
  const patterns = new Array(count);
  for (let i = 0; i < count; i++) {
    const token = i.toString(36);
    patterns[i] = '/a'.repeat(length) + '/' + token + '/*:rest';
  }
  return patterns;
}

function buildWildcardTestPaths(length, count, tailSegments = 4) {
  // Concrete paths that should match the wildcard patterns above
  const paths = new Array(count);
  const tail = Array.from({ length: tailSegments }, (_, j) => 'x' + j).join('/');
  for (let i = 0; i < count; i++) {
    const token = i.toString(36);
    paths[i] = '/a'.repeat(length) + '/' + token + '/' + tail;
  }
  return paths;
}

function buildOptionalPatterns(baseLen, optionalCount, count) {
  // Unique patterns: /a.../<token>?:p1?:p2?...?:pN
  const patterns = new Array(count);
  for (let i = 0; i < count; i++) {
    const token = i.toString(36);
    let p = '/a'.repeat(baseLen) + '/' + token;
    for (let k = 1; k <= optionalCount; k++) {
      p += '?:p' + k;
    }
    patterns[i] = p;
  }
  return patterns;
}

function buildOptionalTestPaths(baseLen, optionalCount, count) {
  // Concrete paths using the max number of optionals to exercise the longest route
  const paths = new Array(count);
  for (let i = 0; i < count; i++) {
    const token = i.toString(36);
    let p = '/a'.repeat(baseLen) + '/' + token;
    for (let k = 1; k <= optionalCount; k++) {
      p += '/' + 'v' + k;
    }
    paths[i] = p;
  }
  return paths;
}

function benchAdd(paths, { dynamic = false, resetEvery = 25000, uniquePath } = {}) {
  let router = routerFactory();
  const resp = (req) => 1;
  let k = 0;
  let unique = 0;

  return timeit(() => {
    // Generate a unique path to avoid duplicate key errors
    const base = paths[k++ % paths.length];
    const path = uniquePath
      ? uniquePath(base, unique++)
      : (dynamic ? (base + '/x' + (unique++)) : (base + '-' + (unique++)));
    router.get({ path, responder: resp });

    // Periodically reset to keep memory bounded
    if (unique % resetEvery === 0) {
      router = routerFactory();
    }
  });
}

function benchMatch(router, paths, { method = 'GET' } = {}) {
  let k = 0;
  return timeit(() => {
    const path = paths[k++ % paths.length];
    const { route } = router.match(method, path);
    if (!route) throw new Error('route not found');
  });
}

function prepareRouterStatic(paths) {
  const router = routerFactory();
  const resp = (req) => 1;
  for (const p of paths) router.get({ path: p, responder: resp });
  return router;
}

function prepareRouterDynamic(paths) {
  const router = routerFactory();
  const resp = (req) => 1;
  for (const p of paths) router.get({ path: p, responder: resp });
  return router;
}

function section(title) {
  console.log('\n' + title);
  console.log('-'.repeat(title.length));
}

(async function main() {
  const lengths = [1, 2, 4, 8];
  const poolSize = 1_000;

  section('Add routes (ops/sec)');
  for (const len of lengths) {
    const staticPaths = buildStaticPaths(len, poolSize);
    const dynamicPatterns = buildDynamicPaths(len, poolSize);

    const addS = benchAdd(staticPaths);
    const addD = benchAdd(dynamicPatterns, { dynamic: true });

    console.log(`length=${len}  static_add=${fmt(addS)}  dynamic_add=${fmt(addD)}`);
  }

  section('Match routes (ops/sec)');
  for (const len of lengths) {
    const staticPaths = buildStaticPaths(len, poolSize);
    const dynamicPatterns = buildDynamicPaths(len, poolSize);
    const dynamicTestPaths = buildDynamicTestPaths(len, poolSize);

    const routerS = prepareRouterStatic(staticPaths);
    const routerD = prepareRouterDynamic(dynamicPatterns);

    const matchS = benchMatch(routerS, staticPaths);
    const matchD = benchMatch(routerD, dynamicTestPaths);

    console.log(`length=${len}  static_match=${fmt(matchS)}  dynamic_match=${fmt(matchD)}`);
  }

  // Wildcard creation and matching
  section('Wildcard routes (ops/sec)');
  for (const len of lengths) {
    const wildcardPatterns = buildWildcardPatterns(len, poolSize);
    // For wildcard, uniqueness must be inserted before '/*:rest'
    const addW = benchAdd(wildcardPatterns, {
      dynamic: true,
      uniquePath: (base, n) => {
        const idx = base.indexOf('/*:rest');
        return base.slice(0, idx) + '-u' + n + base.slice(idx);
      },
    });

    const routerW = prepareRouterDynamic(wildcardPatterns);
    const wildcardTests = buildWildcardTestPaths(len, poolSize, 8);
    const matchW = benchMatch(routerW, wildcardTests);

    console.log(`length=${len}  wildcard_add=${fmt(addW)}  wildcard_match=${fmt(matchW)}`);
  }

  // Optional parameter count scaling
  section('Optional params scaling (ops/sec)');
  const optionalCounts = [1, 2, 4, 8];
  const baseLen = 2;
  for (const nOpt of optionalCounts) {
    const optPatterns = buildOptionalPatterns(baseLen, nOpt, poolSize);
    const addO = benchAdd(optPatterns, {
      dynamic: true,
      uniquePath: (base, n) => {
        const idx = base.indexOf('?:');
        return idx === -1 ? (base + '-u' + n) : (base.slice(0, idx) + '-u' + n + base.slice(idx));
      }
    });

    const routerO = prepareRouterDynamic(optPatterns);
    const optTests = buildOptionalTestPaths(baseLen, nOpt, poolSize);
    const matchO = benchMatch(routerO, optTests);

    console.log(`optionals=${nOpt}  opt_add=${fmt(addO)}  opt_match=${fmt(matchO)}`);
  }
})();
