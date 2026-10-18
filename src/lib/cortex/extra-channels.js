/*! Allen Institute Software License; see /models/cortex/human-eap/LICENSE.txt. */
// Literal 34 °C ports of the published inhibitory-cell NMODL mechanisms.
// Kd computes qt upstream but intentionally does not apply it to either tau.
export const EXTRA_CHANNELS = ['Im_v2', 'Kd', 'Kv2like', 'K_T'];
const sigmoid = x => 1 / (1 + Math.exp(x));
const trap = (x,y) => Math.abs(x/y)<1e-6 ? y*(1-x/y/2) : x/Math.expm1(x/y);
export function extraRates(v, guard=true) {
  const qt=2.3**1.3;
  const am=.007*Math.exp(2.4*(v+48)/26.12), bm=.007*Math.exp(-3.6*(v+48)/26.12);
  const ak=.12*trap(43-v,11), bk=.02*Math.exp(-(v+1.27)/120);
  const h2=(2350+1380*Math.exp(-.011*v)-210*Math.exp(-.03*v))/qt;
  return [
    [am/(am+bm),(15+1/(am+bm))/2.3**.4],
    [1-sigmoid((v+43)/8),1], [sigmoid((v+67)/7.3),1500],
    [ak/(ak+bk),2.5/(qt*(ak+bk))],
    [sigmoid((v+58)/11),(360+(1010+23.7*(v+54))*Math.exp(-(((v+75)/48)**2)))/qt],
    [sigmoid((v+58)/11),guard && h2<0 ? .001 : h2],
    [sigmoid(-(v+47)/29),(.34+.92*Math.exp(-(((v+71)/59)**2)))/qt],
    [sigmoid((v+66)/10),(8+49*Math.exp(-(((v+73)/23)**2)))/qt],
  ];
}
export function extraOpen(gates, i) {
  const k=i*8;
  return [gates[k],gates[k+1]*gates[k+2],gates[k+3]**2*(.5*gates[k+4]+.5*gates[k+5]),gates[k+6]**4*gates[k+7]];
}
export function advanceExtra(gates,i,v,dt,guard=true) {
  const rates=extraRates(v,guard),k=i*8;
  for(let j=0;j<8;j++){const [inf,tau]=rates[j];gates[k+j]=inf+(gates[k+j]-inf)*Math.exp(-dt/tau);}
}
