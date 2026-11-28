# Utah and Slant: the isolation bench

**Deployable file:** `index.html`. Copy to `public/simulations/utah-slant-compare/index.html`. Fully static, no fonts, runtime packages, outside requests, or hardware interface. The artifact itself makes no changes to the site. It is a separate optional lab, not a replacement for the already deployed Utah Array Fabrication Workflow.

**Suggested hub title:** Utah and Slant isolation bench.  
**Suggested description:** Compare uniform and graded silicon arrays, inspect opposing cut-to-glass overlap, and distinguish open leads from bridged roots in an inert virtual fixture.  
**Atlas:** Link from `si-utah` as an additional lab; retain the existing wafer-to-output link. Relevant tool register analogies: wafer dicing **04-07**, optical profilometry **05-02**, and electrical probe station **05-07**. Lab use does not qualify a tool fixture or reproduce a commercial lot.

## Evidence ledger

1. The Blackrock Utah product sheet uses a 400 µm pitch and describes 1.0 and 1.5 mm as clinical options; publicly listed research lengths are wider. The Blackrock NeuroPort IFU distinguishes 100 physical electrodes from 96 wired. The standard view models either uniform height on a nominal 4 mm teaching coupon, not the geometry of every ordered NeuroPort.
2. Wendelken et al. (2017) describe a 10 × 10 Slant array at 400 µm pitch across a 4 mm nominal square, with lengths approximately 0.75–1.50 mm. The Blackrock Slant overview independently describes a 0.50–1.50 mm linear grade; the separate current options table gives custom 0.75–1.50 mm lengths. All three branches retain their source scope. None supplies a measured schedule for ten displayed heights. The lab interpolates an ideal grade or takes ten user-entered values. The cumulative 3,600 µm is between first and last site centers, not the 4,000 µm coupon dimension.
3. Jones, Campbell & Normann (1992) describe glass as the base isolation alternative to an earlier junction-isolated array. The historical University of Utah patent supplies one dimensioned front/rear cut example. The older cut example uses the 125 µm rear blade width as assumed opening; it combines 250 µm rear groove depth, 270 µm front kerf and a 200 µm nominal rear-to-front-cut floor inferred from 1,700 − 1,500 µm in that example. These are geometry inputs, not a commercial process prescription or a measured cross-section.
4. No ceramic composition, glass composition, mechanical/thermal strength, isolation resistance, exact real electrode site geometry, clinical usability or commercial lot acceptance is modeled. The toy projection shows 100 centered upright shanks in the same view scale; the orthographic profile uses equal horizontal and vertical units. Cursor-style old pin maps are neither included nor inferred from the 96-channel count. The conceptual fixture parks four corners, keeping them in the silicon graph.

## Equations and contract

- Nominal rear datum: 400 µm pitch, spans 9 × 400 = 3,600 µm, centered on the nominal teaching footprint. An interior cutting line is at \((i-5)p\) for \(i=1\dots9\), where \(p=400\) µm. Front rails use independent center offsets and repeat errors per axis. “Nine-interval repeat span” is the extrapolated uncropped layout span, not the real edge-to-edge die cut. Main geometry uses matched intended strips and clips calculated widths to the nominal square. Two exterior conceptual rail positions are used only for the strip estimate; no outer cut is inspected.
- Front cut crosses the rear groove only if the two rectangular intervals have positive plan intersection and the front floor reaches into the vertical extent of the rear groove. The signed plan margin is intersection upper endpoint minus lower endpoint; a negative value is a separating span. Using the maximum local floor height over an ideal rear island length gives the weakest depth overlap; zero indicates a tangent. The model considers drift along the cut centerline, not across the cut width. It assumes square domains, constant opening width, and no corners/chips/taper, post-etch effects or invisible debonding.
- Geometric cap: where plan overlap is finite, retained glass at the worst floor is the depth of rear glass below that floor, clipped to the interval 0…rear groove depth. Without plan overlap, the groove keeps the input glass thickness but has not separated the modeled front cut. A zero cap is distinct from a positive residual-silicon shelf. It is not used to infer a short or open lead.
- The connected-topology test uses 100 nodes and 180 nearest-neighbor edges. A candidate silicon web (positive material between cuts in depth or plan) can be included as an ideal conductive edge; this is a conditional Boolean abstraction, not predicted ionic leakage. A user can add an ideal bridge between the selected two nodes or open the first node’s output lead without deleting its physical silicon. Open, duplicated, and logically isolated output identities are disjoint. The 96 active outputs plus four parked corners never change with grade or drawing angles.
- Registration model is explicitly withheld when any corresponding interior rail moves by half a pitch or more or a paired cell loses its modeled overlap. Geometry remains inspectable/exportable. The solver does not attempt to reassign physical identities after a cut crosses into a different cell.
- The top overlay preserves physical coordinates and site identity under rear-face mirror (display X changes sign; Y does not). Four view rotations alter only the isometric projection. No SVG coordinate gives instructions to a manufacturing device.

## Scenarios to try

| Scenario | Model shows |
| --- | --- |
| Aligned coupon | 180 finite joins, lowest glass cap 200 µm, all 96 outputs identifiable |
| Pitch drift toward one edge | X repeat 424 µm, nine-interval span 3,816 µm (+216 µm), max interior offset 186 µm; selected far-edge has a 16 µm lateral miss despite 50 µm depth overlap; ten candidate webs, 18 ambiguous outputs if counted |
| Silicon shelf between cuts | Front toe 267 µm vs 250 µm glass reach, a modeled 17 µm shelf; 180 potential links and all 96 observed outputs ambiguous if counted |
| Glass cap breach | Front-floor drift reaches or crosses the rear plane at 28 boundaries; no invented conductive edge and no assigned mechanical pass |
| One open and one bridge | 94 isolated outputs, one open lead and one ambiguous output, with parked corners preserved |
| Historical section dimensions | Model recalculates an as-cut 130 µm front ligament and 125 µm rear opening assumed from the historical blade width; no claim about current product |

## Reproduce

- `python build.py` generates `index.html` reproducibly from the editable `src/` files.
- `node tests/model.cjs`: independent closed-form overlap/depth/retained-cap oracle for 252,000 boundary cases across 1,400 repeatable randomized specimens, independent BFS on 1,039 within-envelope networks, and explicit documented-range/direction, equality, grade, corner and fault checks.
- `CHROMIUM_PATH=/path/to/chrome python tests/browser.py`: actual UI with desktop Chromium, iPhone 13 emulation and 320 px phone-class Chromium. Covers all published height/direction pairs, measured-data validation, camera and rear-face transform, six scenario outcomes, three real downloads, loss-of-model behavior, URL state, no JS errors or outbound attempts, plus 60 state overflow checks. This is not Safari hardware testing.
