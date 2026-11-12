#!/usr/bin/env python3
"""One entry point for native references, numerical studies and integration gates.

Uses pinned Python dependencies and the repository's own source. No gate is
relaxed; native reference failures remain failures. Compiled mechanisms and
execution logs are ignored build products, not committed source artifacts.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import time
import venv
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DOCS = ROOT / 'docs' / 'axon-interface'
CACHE = HERE / '.reproduction'
PINNED = {'neuron':'8.2.7','numpy':'2.3.5','scipy':'1.17.0'}


def timestamp():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def hardware():
    cpu=platform.processor()
    if not cpu and Path('/proc/cpuinfo').exists():
        cpu=next((line.split(':',1)[1].strip() for line in Path('/proc/cpuinfo').read_text().splitlines() if line.startswith('model name')),'not reported')
    result={'cpu':cpu,'logicalCpus':os.cpu_count()}
    if hasattr(os,'sysconf'):
        try: result['memoryBytes']=os.sysconf('SC_PHYS_PAGES')*os.sysconf('SC_PAGE_SIZE')
        except (ValueError,OSError): pass
    return result


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_snapshot():
    files = set((ROOT/'src/lib/axon-interface').glob('*.mjs'))
    files.update(HERE.glob('*.mjs')); files.update(HERE.glob('*.py')); files.update(HERE.glob('*.sh'))
    files.update(HERE.glob('*requirements.txt'))
    for pattern in ('*.mod','*.hoc','README'):
        files.update((HERE/'mrg-modeldb').glob(pattern))
    files.update(DOCS.glob('*acceptance.json'))
    for relative in ('tests/axon-interface-contracts.mjs','tests/helpers/axon-interface-worker-harness.mjs'):
        p = ROOT/relative
        if p.exists(): files.add(p)
    return {str(p.relative_to(ROOT)):sha256(p) for p in sorted(files)}


def command(name,args,*,env=None,cwd=ROOT):
    print(f'Running {name}',flush=True)
    start=time.perf_counter(); log=CACHE/(name+'.log')
    with log.open('w') as stream:
        process=subprocess.run([str(a) for a in args],cwd=cwd,env=env,
                               stdout=stream,stderr=subprocess.STDOUT,text=True)
    result={'name':name,'arguments':[str(a) for a in args],
            'status':'pass' if process.returncode==0 else 'fail',
            'exitCode':process.returncode,'elapsedSeconds':time.perf_counter()-start,
            'log':str(log.relative_to(ROOT))}
    if process.returncode:
        result['failureTail']=log.read_text(errors='replace')[-5000:]
        print(result['failureTail'],flush=True)
    return result


def python_environment(explicit):
    if explicit:
        # Preserve the virtual-environment executable path. Resolving its
        # symlink to the base interpreter discards the environment's identity.
        selected=Path(os.path.abspath(os.path.expanduser(explicit)))
        if not selected.is_file(): raise RuntimeError(f'Python executable not found: {selected}')
    else:
        target=HERE/'.venv'
        if not target.exists():
            print('Creating a local reference environment',flush=True)
            venv.EnvBuilder(with_pip=True).create(target)
        selected=target/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
        installed=command('install-pinned-references',[selected,'-m','pip','install','--disable-pip-version-check','-r',HERE/'requirements.txt'])
        if installed['status']!='pass': raise RuntimeError('Pinned reference dependency installation failed; see its retained log.')
    code=('import importlib.metadata,json,platform,sys; '
          'print(json.dumps({"python":platform.python_version(),"executable":sys.executable,'
          '"packages":{p:importlib.metadata.version(p) for p in ["neuron","numpy","scipy"]}}))')
    probe=subprocess.run([str(selected),'-c',code],capture_output=True,text=True)
    if probe.returncode: raise RuntimeError('Reference environment is incomplete: '+probe.stderr[-2000:])
    metadata=json.loads(probe.stdout)
    if metadata['packages']!=PINNED:
        raise RuntimeError(f'Reference versions must match {PINNED}; found {metadata["packages"]}. Use the default isolated environment or explicitly install the pinned requirements.')
    return selected,metadata


def junit_report(xml_path):
    root=ET.parse(xml_path).getroot()
    cases=[]
    for case in root.iter('testcase'):
        failures=list(case.findall('failure'))+list(case.findall('error'))
        skipped=case.find('skipped') is not None
        cases.append({'name':case.get('name'),'className':case.get('classname'),
                      'durationSeconds':float(case.get('time') or 0),
                      'status':'fail' if failures else 'skipped' if skipped else 'pass',
                      **({'failure':'\n'.join((f.text or f.get('message') or '') for f in failures)} if failures else {})})
    return cases


def integration(node,hashes):
    xml=CACHE/'integration-tests.xml'
    args=[node,'--test','--test-concurrency=1','--test-reporter=junit',
          f'--test-reporter-destination={xml}',
          'tests/axon-interface-contracts.mjs','scripts/axon-interface/field-contract-tests.mjs']
    execution=command('integration-tests',args)
    try: cases=junit_report(xml)
    except Exception as error:
        cases=[{'name':'Machine-readable test report','status':'fail','failure':str(error)}]
    history=DOCS/'integration-history.jsonl'
    for case in cases:
        if case['status']=='fail':
            with history.open('a') as stream:
                stream.write(json.dumps({'timestamp':timestamp(),'event':'failed-integration-test',**case})+'\n')
    retained=[json.loads(line) for line in history.read_text().splitlines() if line] if history.exists() else []
    report={'schema':'buildthesimulation.axon-interface.integration-validation.v1',
            'generatedAt':timestamp(),'scope':'Executed solver integration and production Worker contracts; browser layout is checked separately.',
            'status':'pass' if execution['status']=='pass' and cases and all(c['status']=='pass' for c in cases) else 'fail',
            'summary':{'passed':sum(c['status']=='pass' for c in cases),'failed':sum(c['status']=='fail' for c in cases),'skipped':sum(c['status']=='skipped' for c in cases)},
            'tests':cases,'execution':execution,'sourceHashes':hashes,'retainedFailures':retained,
            'limitations':['Passing software tests does not validate a ganglion-replacement architecture or a biological junction.',
                           'The executed small cohort is not a full human nerve census.']}
    (DOCS/'integration-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    return execution,report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--python',help='Use an existing Python environment with the exact pinned packages; its packages are not modified.')
    parser.add_argument('--node',default='node',help='Node executable (tested with Node24.22.1).')
    parser.add_argument('--integration-only',action='store_true',help='Execute integration/Worker tests only; explicitly does not claim that numerical reference studies were regenerated.')
    args=parser.parse_args()
    DOCS.mkdir(parents=True,exist_ok=True); CACHE.mkdir(parents=True,exist_ok=True)
    before=source_snapshot()
    report={'schema':'buildthesimulation.axon-interface.reproduction.v1',
            'startedAt':timestamp(),'scope':'integration-only' if args.integration_only else 'full-numerical-and-integration',
            'acceptanceChanged':False,'stages':[],'sourceHashes':before,
            'runtime':{'hostPython':platform.python_version(),'platform':platform.platform(),'machine':platform.machine(),**hardware()},
            'limitations':['Numerical verification concerns the stated equations, not human biology, clinical performance, or device safety.',
                           'Retained exploratory-model failures remain in their reports even when required numerical gates pass.']}
    try:
        node=shutil.which(args.node) or args.node
        report['runtime']['node']=subprocess.check_output([node,'--version'],text=True).strip()
        if not args.integration_only:
            python,metadata=python_environment(args.python); report['runtime']['referencePython']=metadata
            env=os.environ.copy();env['MRG_PYTHON']=str(python);env['AXON_REFERENCE_PYTHON']=str(python)
            env['PATH']=str(python.parent)+os.pathsep+env.get('PATH','')
            gcc=shutil.which('gcc');gpp=shutil.which('g++')
            if not gcc or not gpp: raise RuntimeError('GCC and G++ are required to compile the unmodified native NEURON mechanism. No native reference was substituted.')
            env['CC']=gcc;env['CXX']=gpp
            report['runtime']['cCompiler']=subprocess.check_output([gcc,'--version'],text=True).splitlines()[0]
            report['runtime']['cxxCompiler']=subprocess.check_output([gpp,'--version'],text=True).splitlines()[0]
            compiler=python.parent/('nrnivmodl.exe' if os.name=='nt' else 'nrnivmodl')
            if not compiler.is_file(): raise RuntimeError('The selected pinned NEURON environment has no nrnivmodl executable.')
            build=command('native-mechanism-build',[compiler],env=env,cwd=HERE/'mrg-modeldb');report['stages'].append(build)
            report['stages'].append(command('field-numerical-studies',[node,HERE/'field-validate.mjs'],env=env))
            if build['status']=='pass':
                report['stages'].append(command('mrg-numerical-studies',[node,HERE/'mrg-validate.mjs'],env=env))
                report['stages'].append(command('coupled-fem-neuron-reference',[node,HERE/'mrg-coupled-validate.mjs'],env=env))
            else:
                report['stages'].append({'name':'mrg-numerical-studies','status':'fail','reason':'Native mechanism build failed; an old compiled mechanism was not treated as a successful rebuild.'})
        execution,checks=integration(node,before);report['stages'].append(execution)
        report['integrationSummary']=checks['summary']
        after=source_snapshot();changed=[p for p in set(before)|set(after) if before.get(p)!=after.get(p)]
        report['sourceChangedDuringRun']=sorted(changed)
        if changed: report['stages'].append({'name':'source-stability','status':'fail','changedFiles':sorted(changed),'reason':'Source changed during verification. Rerun against a fixed revision before release.'})
        report['status']='pass' if report['stages'] and all(s['status']=='pass' for s in report['stages']) and checks['status']=='pass' else 'fail'
    except Exception as error:
        report['status']='fail';report['error']=str(error);print(str(error),file=sys.stderr,flush=True)
    report['completedAt']=timestamp()
    history=DOCS/'reproduction-history.jsonl'
    if report['status']=='fail':
        with history.open('a') as stream:
            stream.write(json.dumps({'timestamp':timestamp(),'event':'failed-reproduction','scope':report['scope'],
                'error':report.get('error'),'failedStages':[s for s in report['stages'] if s['status']=='fail'],
                'sourceHashes':report['sourceHashes']})+'\n')
    report['retainedFailures']=[json.loads(line) for line in history.read_text().splitlines() if line] if history.exists() else []
    (DOCS/'reproduction-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'status':report['status'],'scope':report['scope'],'report':'docs/axon-interface/reproduction-report.json'}),flush=True)
    return 0 if report['status']=='pass' else 1


if __name__=='__main__':
    raise SystemExit(main())
