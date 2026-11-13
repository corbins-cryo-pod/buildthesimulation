"""Import the pinned original-cohort CI outputs without altering their results."""
import argparse,datetime,hashlib,json,math,pathlib,shutil
parser=argparse.ArgumentParser();parser.add_argument("mode",choices=["candidate","complete"]);parser.add_argument("directory");args=parser.parse_args()
root=pathlib.Path.cwd();incoming=pathlib.Path(args.directory);out=root/"docs/axon-interface/stage2"
EXPECTED="99bfb0803aad7fd3e84c4421028fa8cc72af0085"
FIXTURE="e32f86459c4de57e1b0c007027579968a37f1938cb088ead9c7b9a7957e945a6"
def sha(p):
    h=hashlib.sha256()
    with pathlib.Path(p).open("rb") as f:
        for b in iter(lambda:f.read(1024*1024),b""):h.update(b)
    return h.hexdigest()
def read(name):return json.loads((incoming/name).read_text())
def sources(hashes):
    assert hashes,"Missing source manifest"
    for file,digest in hashes.items():
        p=(root/file).resolve()
        assert not pathlib.Path(file).is_absolute() and p.is_relative_to(root.resolve()),file
        assert sha(p)==digest,"Changed source: "+file
runner=read("runner.json");assert runner["commit"]==EXPECTED and runner["node"]=="v24.22.1"
provenance=read("axon-nested-original-provenance.json");sources(provenance["sourceHashes"])
assert provenance["fixtureSha256"]==FIXTURE and provenance["planarRefinement"]==1 and provenance["axialRefinement"]==2
assert sha(incoming/"axon-nested-original-fixture.json")==FIXTURE
candidate=read("nested-original-field-1-2.json");sources(candidate["sourceHashes"])
assert candidate["complete"] and candidate["passed"] and candidate["independentFixture"]["sha256"]==FIXTURE
assert sha(incoming/"nested-original-field-1-2.json")==sha(out/"nested-original-field-1-2.json"),"Pinned candidate report changed"
names=["nested-original-field-1-2.json"];checks=["Pinned runner, candidate bytes, physical fixture and all physical source hashes match"]
if args.mode=="complete":
    manifest=read("manifest.json")
    assert manifest
    for item in manifest:
        assert pathlib.Path(item["file"]).name==item["file"],"Unsafe artifact filename"
        file=incoming/item["file"];assert file.stat().st_size==item["bytes"] and sha(file)==item["sha256"],item["file"]
    names=["nested-original-field-"+pair+".json" for pair in ["1-2","1-3","2-2","1-1"]]+["nested-original-validation.json","nested-original-independent-validation.json"]
    reports={name:read(name) for name in names}
    for name,r in reports.items():
        assert r["complete"] is True and r["passed"] is True,name
        sources(r["sourceHashes"])
        for f in r.get("runFiles",[]):
            assert f["path"].startswith("docs/axon-interface/stage2/") and sha(incoming/pathlib.Path(f["path"]).name)==f["sha256"],f
        if "fixtureProvenance" in r:
            sources(r["fixtureProvenance"]["sourceHashes"]);assert r["fixtureProvenance"]["fixtureSha256"]==FIXTURE
    for pair in ["1-2","1-3","2-2","1-1"]:
        r=reports["nested-original-field-"+pair+".json"];s=r["solve"]
        assert s["relativeResidual"]<=1e-10 and s["recurrenceResidual"]<=2e-12 and s["iterations"]<=16000
    for pair in ["1-3","2-2"]:
        reference=reports["nested-original-field-"+pair+".json"]
        assert len(candidate["transfers"])==len(reference["transfers"])==4
        for a,b in zip(candidate["transfers"],reference["transfers"]):
            assert len(a)==len(b)>0 and all(math.isfinite(x) for x in a+b)
            error=math.sqrt(math.fsum((x-y)**2 for x,y in zip(a,b))/math.fsum(y*y for y in b))
            assert error<=.05,("Directional refinement failed",pair,error)
    independent=reports["nested-original-independent-validation.json"];ref=independent["reference"]
    for key,limit in [("relativeResidual",1e-9),("potentialRelativeL2",1e-6),("loadRelativeL2",1e-8),("maximumPotentialErrorUvPerAperS",.001)]:
        assert math.isfinite(ref[key]) and ref[key]<=limit,(key,ref[key])
    assert sha(incoming/"nested-original-independent.log")==independent["logSha256"]
    checks+=["Every artifact size and hash verified","All four executed fields meet unchanged algebraic limits","All eight directional errors recomputed below 5%","All four independent limits verified without fitting","Linked reports, independent log and provenance hashes verified"]
for name in names:shutil.copyfile(incoming/name,out/name)
for name in ["axon-nested-original-fixture.json","axon-nested-original-provenance.json"]:shutil.copyfile(incoming/name,pathlib.Path("/tmp")/name)
if args.mode=="complete":
    (out/"logs").mkdir(exist_ok=True)
    for name in ["ci-original-candidate.log","ci-original-convergence.log","ci-original-independent.log","nested-original-independent.log"]:
        shutil.copyfile(incoming/name,out/"logs"/name)
proof=dict(schema="axon-stage2-ci-evidence-import/2",passed=True,mode=args.mode,testedCommit=EXPECTED,workflowRun=43440643904,workflowUrl="https://github.com/corbins-cryo-pod/buildthesimulation/actions/runs/43440643904",runner=runner,fixtureSha256=FIXTURE,importedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),checks=checks,files={name:sha(out/name) for name in names})
(out/("ci-original-"+args.mode+"-recovery.json")).write_text(json.dumps(proof,indent=2)+"\n")
print(json.dumps(proof,indent=2))
