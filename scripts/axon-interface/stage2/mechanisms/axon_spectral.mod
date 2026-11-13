TITLE Independent four-state spectral opsin verification
NEURON { SUFFIX axon_spectral NONSPECIFIC_CURRENT i RANGE gbar, flux, O1, O2, C1, C2, i, gd1, gd2, gr0, k1, k2, gf0, gb0, kf, kb, phim, powerp, powerq, gamma, reversal, rate_scale }
UNITS { (mV) = (millivolt) (mA) = (milliamp) }
PARAMETER { gbar=0 flux=0 gd1=.066 gd2=.01 gr0=.000333 k1=.4 k2=.12 gf0=.018 gb0=.008 kf=.01 kb=.008 phim=1e16 powerp=1 powerq=1 gamma=.05 reversal=0 rate_scale=1 }
STATE { C1 O1 O2 C2 }
ASSIGNED { v (mV) i (mA/cm2) a b f r d1 d2 recovery hp hq }
INITIAL { C1=1 O1=0 O2=0 C2=0 }
BREAKPOINT { SOLVE channel METHOD sparse i=gbar*(O1+gamma*O2)*(v-reversal) }
KINETIC channel {
 rates()
 ~ C1 <-> O1 (a,d1)
 ~ O1 <-> O2 (f,r)
 ~ O2 <-> C2 (d2,b)
 ~ C2 <-> C1 (recovery,0)
 CONSERVE C1+O1+O2+C2=1
}
PROCEDURE rates() {
 hp=0 hq=0
 if (flux>0) { hp=1/(1+(phim/flux)^powerp) hq=1/(1+(phim/flux)^powerq) }
 a=rate_scale*k1*hp b=rate_scale*k2*hp
 f=rate_scale*(gf0+kf*hq) r=rate_scale*(gb0+kb*hq)
 d1=rate_scale*gd1 d2=rate_scale*gd2 recovery=rate_scale*gr0
}
