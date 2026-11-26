import data from './crystal-update.json';
export const updatePath='/simulations/equipment/updates/';
export const updates=data.devices;
export const updateById=Object.fromEntries(updates.map(row=>[row.id,row]));
export const workflows=data.workflow;
export const room=data.room;
export const scopes={
  bounded_simulation:{label:'Bounded instrument simulation',detail:'Use the modeled controls for the specific virtual task listed.'},
  replay_or_mechanical:{label:'Replay, inspection or passive mechanics',detail:'Review simulated data or geometry. The device’s main process is not modeled.'},
  documentary_plus_companion:{label:'Documentary model with companion exercise',detail:'The device stays inactive. The exercise runs separately.'}
};
