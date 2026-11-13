from pathlib import Path
import json,html
import mistune
render_markdown=mistune.create_markdown(plugins=["table"])
root=Path(__file__).resolve().parents[1];public=root/'overlay/public/simulations/biohybrid-axon-interface/stage2'
css='body{font:16px/1.5 Georgia,serif;background:#f5f1e6;color:#171b1d;margin:0 auto;max-width:1050px;padding:28px}h1,h2,h3{line-height:1.15;font-weight:400}h1{font-size:36px}h2{border-top:1px solid #ccc3b2;padding-top:18px;margin-top:30px}a{color:inherit}pre{white-space:pre-wrap;background:#eae5d9;padding:14px;font-size:12px}code{overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font:12px/1.5 Arial,sans-serif;display:block;overflow:auto}td,th{padding:9px;border-bottom:1px solid #ccc3b2;text-align:left;vertical-align:top}th{font-weight:normal}details{border:1px solid #ccc3b2;padding:14px;margin:20px 0}summary{cursor:pointer;font:13px Arial,sans-serif}footer{border-top:2px solid;margin-top:25px;padding:16px;font-size:12px}li{margin:8px 0}'
body=render_markdown((root/'docs/METHODS.md').read_text())
questions=render_markdown((root/'docs/QUESTIONS.md').read_text())
register=json.loads((root/'docs/parameter-register.json').read_text())
rows=''.join('<tr>'+''.join('<td>'+html.escape(str(row[k]))+'</td>' for k in ['group','key','default','units','evidence','provenance'])+'</tr>' for row in register['parameters'])
body+='<details><summary>Complete parameter register — '+str(len(register['parameters']))+' entries</summary><table><thead><tr>'+''.join('<th>'+x+'</th>' for x in ['Group','Parameter','Default','Units','Evidence','Provenance'])+'</tr></thead><tbody>'+rows+'</tbody></table></details>'+questions
(public/'methods.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stage 2 component methods and questions</title><style>'+css+'</style></head><body>'+body+'<footer>Numerical component verification only. New coupled magnetic and optical axon recruitment is not yet demonstrated.</footer></body></html>')
