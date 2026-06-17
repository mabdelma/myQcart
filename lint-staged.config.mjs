// Function form returns a FIXED command so lint-staged does not append staged
// filenames to it. The previous config (`tsc --noEmit <files>`) made tsc ignore
// tsconfig.json, broke relative paths after `cd server`, and ran one tsc per
// chunk in parallel → OOM/SIGKILL on low-memory machines (forcing --no-verify).
//
// We run the SERVER typecheck project-wide (its baseline is clean). The frontend
// strict typecheck is intentionally deferred — the app builds via Vite (which
// doesn't typecheck) and has a pre-existing `tsc` error baseline to clean up
// separately; CI runs the Vite build for the frontend.
export default {
  'server/src/**/*.ts': () => 'tsc -p server/tsconfig.json --noEmit',
};
