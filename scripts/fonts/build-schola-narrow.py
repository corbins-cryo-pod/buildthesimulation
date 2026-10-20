"""Build renamed 80%-width Schola derivatives; needs fonttools. Input: upstream OTFs."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
SCALE=.80
root=Path(__file__).resolve().parents[2]
for style in ['regular','italic','bold','bolditalic']:
    f=TTFont(root/f'public/fonts/tex-gyre-schola/texgyreschola-{style}.otf')
    glyphs=f.getGlyphSet(); top=f['CFF '].cff.topDictIndex[0]
    for name in f.getGlyphOrder():
        width,lsb=f['hmtx'][name]
        pen=T2CharStringPen(round(width*SCALE),glyphs)
        glyphs[name].draw(TransformPen(pen,(SCALE,0,0,1,0,0)))
        top.CharStrings[name]=pen.getCharString(private=top.Private,globalSubrs=top.GlobalSubrs)
        f['hmtx'][name]=(round(width*SCALE),round(lsb*SCALE))
    label={'regular':'Regular','italic':'Italic','bold':'Bold','bolditalic':'Bold Italic'}[style]
    ps='BTSScholaNarrow-'+label.replace(' ','')
    for record in f['name'].names:
        if record.nameID in [1,2,3,4,6,16,17]:
            value={1:'BTS Schola Narrow',2:label,3:ps+'-Preview-1',4:'BTS Schola Narrow '+label,6:ps,16:'BTS Schola Narrow',17:label}[record.nameID]
            record.string=value.encode(record.getEncoding())
    f['CFF '].cff.fontNames=[ps];top.FamilyName='BTS Schola Narrow';top.FullName='BTS Schola Narrow '+label
    top.FontBBox=[round(top.FontBBox[0]*SCALE),top.FontBBox[1],round(top.FontBBox[2]*SCALE),top.FontBBox[3]]
    f['OS/2'].usWidthClass=3
    f['OS/2'].xAvgCharWidth=round(f['OS/2'].xAvgCharWidth*SCALE)
    f['hhea'].advanceWidthMax=round(f['hhea'].advanceWidthMax*SCALE)
    seen=set()
    def scale_positions(obj):
        if id(obj) in seen:return
        seen.add(id(obj))
        if isinstance(obj,(list,tuple)):
            for item in obj:scale_positions(item)
        elif hasattr(obj,'__dict__'):
            for key,value in vars(obj).items():
                if key in ['XPlacement','XAdvance'] and isinstance(value,int):setattr(obj,key,round(value*SCALE))
                elif isinstance(value,(list,tuple)) or hasattr(value,'__dict__'):scale_positions(value)
    if 'GPOS' in f:scale_positions(f['GPOS'].table)
    if 'kern' in f:
        for table in f['kern'].kernTables:table.kernTable={k:round(v*SCALE) for k,v in table.kernTable.items()}
    f.save(root/f'public/fonts/bts-schola-narrow/bts-schola-narrow-{style}.otf')
