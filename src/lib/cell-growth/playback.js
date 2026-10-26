/** Keep viewing speed separate from the solver's integration step. A slow
 * presentation holds/interpolates one completed step for longer; it must not
 * introduce smaller random/force updates into the biological trajectory. */
export function playbackStep(dtHours,speed,remainingHours){
  const requested=Math.max(.005,Math.min(2,speed||.1));
  const steps=Math.max(1,Math.floor(requested/dtHours+1e-9));
  const hours=Math.min(remainingHours,steps*dtHours);
  return {hours,frameDuration:140*hours/requested};
}
