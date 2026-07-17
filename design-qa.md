# EnerTwin Energy Flow Design QA — Iteration 4

## Comparison target

- Source visual truth:
  - Full dashboard: `C:/Users/lark-k/AppData/Local/Temp/codex-clipboard-d4340414-25ae-4e77-9e90-2301c76bc0c0.png`
  - Focused particle-flow defect: `C:/Users/lark-k/AppData/Local/Temp/codex-clipboard-fd6562dd-1524-4a4d-9288-e3e3d387fcd3.png`
- Browser-rendered implementation: `artifacts/design-qa/energy-hub-final.png`
- Viewport: 1280 × 720 browser capture; fixed dashboard canvas proportionally fitted
- State: night mode, overview; storage mode additionally interaction-tested
- Full-view comparison: `artifacts/design-qa/energy-flow-full-comparison.png`
- Focused flow comparison: `artifacts/design-qa/energy-flow-focus-comparison.png`

## Findings

- No actionable P0, P1, or P2 findings remain.
- [P3] At the exact dispatch-hub center, closely spaced additive particles can briefly become pale cyan. The surrounding green, violet, blue, cyan, and amber routes remain independently recognizable, so this does not block the requested category distinction.

## Required fidelity surfaces

- Fonts and typography: the dashboard's existing Microsoft YaHei/Bahnschrift hierarchy, weights, line heights, and numeric alignment remain unchanged. The new bus label uses the established scene-label typography and remains readable without colliding with the A1 label.
- Spacing and layout rhythm: left/right panels, charts, top navigation, and the fixed dashboard shell are unchanged. Routes now occupy a raised aerial layer above roofs, with clear terminal drops and a central courtyard hub.
- Colors and visual tokens: PV is saturated green, storage is violet, grid input is electric blue, building distribution is cyan, and charging is amber. White mixing was reduced in particle heads, trail layers, and the hot core.
- Image quality and asset fidelity: existing campus GLB and skyline/ground textures are preserved. No placeholder, handcrafted SVG, or substitute image asset was introduced.
- Copy and content: the new `园区能源母线 / 多源汇聚 · 智能分配` label explains the topology without changing existing device, metric, or alarm copy.
- Interaction states: overview and storage tabs were browser-tested; the active mode changed correctly and returned to overview.
- Accessibility: the hub label is non-interactive and does not intercept pointer input; existing scene labels remain semantic buttons.

## Comparison history

1. Initial source findings:
   - [P1] Particles followed low roof-level paths and visually merged with building emissive edges.
   - [P1] Bright white heads washed out the intended energy categories.
   - [P2] Chain-like point-to-point links did not clearly communicate generation, convergence, and allocation.
2. First implementation fixes:
   - Raised every route into an aerial corridor with source/destination terminal drops.
   - Replaced equal sphere dots with instanced capsule packets, hot heads, tapered trails, soft glow, and relay rings.
   - Added power-responsive speed and intensity while keeping instanced rendering.
3. Topology revision:
   - Routed PV, storage, and grid energy into one central dispatch hub.
   - Distributed cyan load energy to key buildings and amber energy to charging.
   - Added five concentric category-colored hub rings and a compact explanatory label.
4. Final QA fixes:
   - Removed duplicated terminal stems and relay rings at the shared hub to prevent overexposure.
   - Raised the storage route and reduced white color mixing for stronger category recognition.
   - Fixed a Catmull-Rom progress-boundary runtime error by using clamped curve sampling.
5. Post-fix evidence:
   - Full dashboard comparison: `artifacts/design-qa/energy-flow-full-comparison.png`
   - Focused route comparison: `artifacts/design-qa/energy-flow-focus-comparison.png`
   - Final browser capture: `artifacts/design-qa/energy-hub-final.png`

## Engineering verification

- `npm.cmd run build`: passed; 2168 modules transformed.
- Browser runtime: no console errors after the final reload.
- Animation: consecutive browser screenshots differed, confirming active particle motion.
- Primary interaction: storage mode activated successfully and overview was restored.
- Existing note: Vite continues to report the pre-existing large bundle warning for the combined Three.js/ECharts chunk; runtime behavior is unaffected.

## Implementation checklist

- [x] Raise routes above the roofline.
- [x] Make energy categories visually distinct.
- [x] Converge source energy at one dispatch hub.
- [x] Redistribute energy to buildings and charging.
- [x] Keep animation performant with instanced meshes.
- [x] Verify build, animation, mode switching, and browser console.

final result: passed
