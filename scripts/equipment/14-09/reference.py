"""Independent reference: adaptive Gauss–Kronrod quadrature, SI constants."""
from scipy.constants import h,c,k
from scipy.integrate import quad
from math import expm1
for degC in [20,40,60]:
 def L(lam):return 2*h*c*c/(lam**5*expm1(h*c/(lam*k*(degC+273.15))))
 print(degC,*quad(L,7.5e-6,14e-6))
