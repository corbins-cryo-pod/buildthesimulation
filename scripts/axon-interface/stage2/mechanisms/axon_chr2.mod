TITLE Four-state Williams H134R photocurrent, independent Stage 2 verification
NEURON { SUFFIX axon_chr2 NONSPECIFIC_CURRENT i RANGE gmax, light, O1, O2, C1, C2, p, i }
UNITS { (mV) = (millivolt) (mA) = (milliamp) }
PARAMETER { gmax = 0 light = 0 }
STATE { C1 O1 O2 C2 p }
ASSIGNED { v (mV) celsius (degC) i (mA/cm2) gd1 gd2 gr e12 e21 k1 k2 act q F }
INITIAL { C1=1 O1=0 O2=0 C2=0 p=0 }
BREAKPOINT {
 SOLVE channel METHOD sparse
 i=(gmax/1000)*(10.6408-14.6408*exp(-v/42.7671))*(O1+0.1*O2)
}
KINETIC channel {
 rates(v)
 ~ C1 <-> O1 (k1,gd1)
 ~ O1 <-> O2 (e12,e21)
 ~ O2 <-> C2 (gd2,k2)
 ~ C2 <-> C1 (gr,0)
 ~ p << ((act-p)/1.3)
 CONSERVE C1+O1+O2+C2=1
}
PROCEDURE rates(x (mV)) {
 q=(celsius-22)/10
 F=12e-20*light*470e-9/1.986446e-25
 gd1=(0.075+0.043*tanh(-(x+20)/20))*1.97^q
 gd2=0.05*1.77^q
 gr=0.0000434587*exp(-0.0211539274*x)*2.56^q
 e12=0.011*1.1^q+0.005*log(1+light/0.024)
 e21=0.008*1.95^q+0.004*log(1+light/0.024)
 k1=0.8535*1.46^q*F*p
 k2=0.14*2.77^q*F*p
 act=0.5*(1+tanh(120*(100*light-0.1)))
}
