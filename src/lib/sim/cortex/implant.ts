import type { Electrode, ImplantModel, Vec3 } from "./contracts";

export function makeUtahArray(args: {
  id?: string;
  grid: { rows: number; cols: number };
  pitchUm: number;
  originUm: Vec3; // center of array at tissue coordinates
  insertionDepthUm: number; // along +z into tissue
  shankLengthUm?: number;
}) : ImplantModel {
  const id = args.id ?? "utah-array";
  const { rows, cols } = args.grid;

  const electrodes: Electrode[] = [];

  const w = (cols - 1) * args.pitchUm;
  const h = (rows - 1) * args.pitchUm;

  // Define array plane at z = origin.z, then insert tips to origin.z + insertionDepth
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = args.originUm[0] + (c * args.pitchUm - w / 2);
      const y = args.originUm[1] + (r * args.pitchUm - h / 2);
      const z = args.originUm[2] + args.insertionDepthUm;
      const id2 = `e${r}-${c}`;
      electrodes.push({ id: id2, posUm: [x, y, z], radiusUm: 18, recEnabled: true });
    }
  }

  return {
    id,
    kind: "utah-array",
    electrodes,
    shankLengthUm: args.shankLengthUm ?? args.insertionDepthUm,
  };
}
