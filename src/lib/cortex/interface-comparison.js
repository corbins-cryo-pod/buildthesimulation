/**
 * Paired full active-cable experiments. No membrane response is reconstructed
 * from rounded replay voltages or reused after changing the stimulation field.
 */
import { runInterfaceExperiment } from './interface-experiment.js';
import { INTERFACE_COMPARISON_VERSION, makeInterfaceComparisonConfigs, analyzeInterfaceComparison } from './interface-comparison-analysis.js';
export * from './interface-comparison-analysis.js';

export function runInterfaceComparison(config, specInput, progress = () => {}) {
  const { spec, baselineConfig, variantConfig } = makeInterfaceComparisonConfigs(config, specInput);
  const emit = (condition, index) => status => progress({ ...status, condition,
    comparisonProgress: (index + (status.cell ? (status.cell - 1) / status.count : 0)) / 2 });
  const baseline = runInterfaceExperiment(baselineConfig, emit('baseline', 0));
  progress({ stage: 'comparison', condition: 'baseline', comparisonProgress: .5, message: 'Baseline complete; solving the paired variant.' });
  const variant = runInterfaceExperiment(variantConfig, emit('variant', 1));
  const analysis = analyzeInterfaceComparison(baseline, variant, spec);
  progress({ stage: 'complete', condition: 'variant', comparisonProgress: 1, message: 'Both active-cable conditions and descriptive comparison are complete.' });
  return { version: INTERFACE_COMPARISON_VERSION, spec, baseline, variant, analysis };
}
