# 47 runtime-stage-view provenance gap

This evidence note supplements the immutable remote capture in
`20260810-031433-runtime-stage-view-20260810020229/`. It does not claim that
the current host source can reproduce the running images.

A v2 capture was added at
`20260810-040808-runtime-stage-view-20260810020229/` after aligning the source
scope with the actual TypeScript/Docker build inputs. It adds five non-test
files under `test-support`/`testSupport`. Across the 419 overlapping source
paths, every content hash matches v1; release state, Prisma list, containers,
images, runtime artifacts and preserved-artifact summary also match. The v2
source manifest contains 423 files and has SHA-256
`7ea3e1ef141b5faf9d9c6ca77a6833e1a7e21324bc8e672a26624e7edd0c4b9c`.
The v1 and v2 whole-manifest hashes intentionally differ because the capture
scope changed, not because overlapping source drifted.

## Proven facts

- The 47 host tree is not a Git checkout. The release state does not contain a
  Git commit, branch, running image IDs or immutable receipt checksum.
- The running API image was made by layering four compiled JavaScript files on
  an existing API image. It was not built from the full TypeScript source now
  present under `/opt/siyuan`.
- The running Web image was built with recovered production source maps and a
  prebuilt Shared `dist`; `index.d.ts` was adjusted separately during the
  build. The current host Shared source therefore does not prove the Web image
  contract.
- A clean build of the captured host source fails. Healthy containers are not
  evidence that the host source is a buildable release candidate.
- Against clean Git baseline `8be0a0b`, 88 remote-side runtime paths require
  reconciliation: 33 remote-only files and 55 changed files. Two additional
  build-support files exist only in the clean baseline. Git object audit found
  47 exact remote blobs in the local object database, but only two are
  reachable from committed feature history; 45 are loose/index-only objects
  and 41 are absent from the object database. Therefore 86 remote versions are
  not durably committed and require semantic reapplication and review; copying
  the host tree would preserve the provenance defect.
- The preserved runtime-build directory and standalone candidate are evidence
  only. They must not be copied over a canonical Git source tree or used as a
  future release path.
- The host root contains an empty file named `9` created at the time of a
  whitelist release. Its purpose is unproven, so synchronization preserves it
  until it can be classified; Docker excludes it from build context.

## Evidence fingerprints

| Evidence | SHA-256 / commit |
| --- | --- |
| Archived release session JSONL | `b5322a709d33d3749969ace3c668b21cd93b4afb1fb0fb12140cc2f04fc7306d` |
| Standalone mixed-source candidate HEAD | `d1ff0387fa7a8b4f92262f8ef7f419c48a196d37` |
| Runtime API Dockerfile | `e5322851afdf330c0e6a386647a72110d34ddb11d05e8988ea6afd4e549e0ce8` |
| Runtime Web Dockerfile | `93eba0afa88a8c7cfb6e9f85926ed05f0abd21ddc33798a6d90ecb9dcd4e47a7` |
| One-off release script | `ec8196bf7a4d38272b9664a4269fd097b1b017160b0b1848e443be336458e04f` |
| API `data.controller.js` | `30ee0328dda16121f5387899ac39033851e7c7ce6a67ccaf39705284324196b9` |
| API `in-memory.repository.js` | `897e1231d7ff362e90f519e14133a65d0959d2765bb87b5c5ed9af456876db1c` |
| API `prisma.repository.js` | `3ea9600021b59be986161d70c2ecbebfe91ab77491e5b149cb9975cc52f1aece` |
| API `rbac.js` | `f19c09dd7f21591517944f420415afd5e7e0072cc97d3068902092e33808b280` |
| Shared `dist/index.js` | `c24e55a7af2e2a1096a0252f0f7ca53388b2d3de1d13a2af85916b4a3793e066` |
| Shared `dist/index.d.ts` | `8372b1b1261ab219689ee9a07b8f98e851bed21658ced31b6a63e4f4ad20a22b` |

Local evidence locations at capture time:

- `/Users/j1ng/.codex/archived_sessions/rollout-2026-08-10T00-13-20-019fe74c-d503-7021-bcca-f794d7402443.jsonl`
- `/private/tmp/sunny-stage-view-runtime.Y4FoLv`
- `/private/tmp/sunny-47-release-candidate-20260809`

These paths are not durable release storage; the hashes above and the remote
manifest are the durable audit record.
