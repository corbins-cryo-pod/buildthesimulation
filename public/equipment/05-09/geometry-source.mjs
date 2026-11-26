// Original dimensioned (meter) photo-matched layout. The 25 mm carrier is documented;
// remaining enclosure, flange and transfer stroke dimensions are reconstruction estimates.
export const assets=[];
export const anchors={
 intro_cover:{at:[.734,1.158,.673],extent:[.22,.17,.06],action:'door',label:'Open/close introspection cover'},
 transfer_arm:{at:[.96,1.15,.51],extent:[.36,.11,.09],action:'transfer',label:'Move coupon between intro and analysis'},
 sample_puck:{at:[.66,1.12,.55],extent:[.04,.023,.04],action:'load',label:'Load/remove 25 mm carrier'},
 host_panel:{at:[-1.44,1.34,.48],extent:[.52,.29,.03],action:'run',label:'Acquire spectra'}
};
const B=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const C=(g,m,p,r,h,axis='y',n=24,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const metal='steel',frame='gray',skirt='enamel',port='rubber',blk='ink';
const machine='cabinet';
B(machine,frame,[.29,.43,.08],[1.27,.79,.79]);B(machine,skirt,[.28,.43,.48],[1.23,.74,.035]);B(machine,metal,[.29,.839,.08],[1.31,.045,.82]);B(machine,blk,[.938,.44,.08],[.015,.72,.755]);
for(const x of [-.29,.87])for(const z of [-.22,.39]){C(machine,metal,[x,.044,z],.017,.073);C(machine,blk,[x,.019,z],.035,.025);}
for(let j=0;j<16;j++)for(const z of [-.06,.08,.22])B(machine,port,[.947,.22+j*.022,z],[.006,.011,.075]);
B(machine,'blue',[.19,.61,.505],[.40,.063,.009]);B(machine,'lamp',[.793,.657,.506],[.071,.07,.012]);C(machine,'red',[.793,.657,.522],.024,.027,'z',16);
const chamber='analysis_chamber';
C(chamber,metal,[.22,1.123,.13],.243,.406,'x',32);C(chamber,'silver',[.43,1.123,.13],.264,.031,'x',32,.72);
C(chamber,'silver',[.01,1.123,.13],.264,.028,'x',32,.72);
C(chamber,metal,[.22,1.13,.353],.158,.141,'z',32);C(chamber,'silver',[.22,1.13,.432],.179,.025,'z',32,.65);
C(chamber,'blue',[.22,1.13,.445],.117,.014,'z',24);C(chamber,port,[.22,.965,.11],.17,.13);
C(chamber,metal,[.231,1.36,.136],.091,.21);C(chamber,'silver',[.231,1.464,.136],.108,.014,'y',22,.64);
for(let k=0;k<12;k++){let a=k*Math.PI/6;C(chamber,'bolt',[.22+.147*Math.cos(a),1.13+.147*Math.sin(a),.447],.009,.018,'z',8);}
const reader='analyzer';
C(reader,metal,[-.103,1.336,.123],.21,.146,'x',32);C(reader,'silver',[-.186,1.336,.123],.229,.023,'x',32,.66);
C(reader,metal,[-.271,1.336,.123],.158,.182,'x',32);C(reader,blk,[-.368,1.336,.123],.105,.028,'x',24);
B(reader,metal,[-.055,1.101,.162],[.19,.17,.18]);C(reader,'silver',[-.086,1.115,.325],.076,.198,'z',24,.62);
const source='al_source';
C(source,metal,[.36,1.365,.037],.086,.32,'y',24);C(source,port,[.36,1.521,.037],.069,.09,'y',24);
C(source,'silver',[.40,1.484,.037],.105,.014,'y',24,.63);B(source,frame,[.462,1.16,-.083],[.102,.195,.133]);
for(const z of [-.088,.10]){C(source,'silver',[.126,1.28,z],.058,.191,'y',20);C(source,port,[.126,1.38,z],.048,.039,'y',16);}
const intro='intro_chamber';
C(intro,metal,[.568,1.145,.41],.131,.329,'x',30);C(intro,'silver',[.427,1.145,.41],.145,.026,'x',30,.68);
C(intro,metal,[.652,1.151,.516],.098,.293,'z',24,.77);C(intro,'silver',[.652,1.151,.662],.114,.029,'z',28,.74);
C(intro,blk,[.652,1.151,.676],.093,.017,'z',26,.85);B(intro,metal,[.763,1.158,.649],[.04,.151,.056]);
C(intro,'blue',[.562,1.287,.416],.061,.027,'y',24);C(intro,metal,[.564,1.302,.417],.079,.022,'y',22,.71);
C('intro_cover','silver',[.652,1.151,.700],.107,.023,'z',28,.68);C('intro_cover','blue',[.652,1.151,.708],.078,.012,'z',26);
B('intro_cover',port,[.652,1.151,.723],[.109,.036,.035]);
C('transfer_arm','silver',[.899,1.15,.41],.015,.418,'x',18);C('transfer_arm',port,[1.139,1.15,.41],.038,.097,'x',20);C('transfer_arm',metal,[1.187,1.15,.41],.024,.02,'x',20);
B('transfer_arm',metal,[.645,1.112,.544],[.085,.008,.042]);B('transfer_arm',metal,[.668,1.112,.571],[.061,.01,.012]);
C('sample_puck','silver',[.66,1.12,.55],.0125,.008,'y',30);
B('sample_puck','gold',[.656,1.125,.547],[.006,.002,.007]);B('sample_puck','silver',[.664,1.125,.547],[.006,.002,.007]);
const rack='controls';
B(rack,skirt,[-.789,.955,.09],[.55,1.79,.665]);B(rack,blk,[-.789,.955,.43],[.475,1.745,.025]);
for(let j=0;j<12;j++){const y=.15+j*.138;B(rack,j===4?'blue':frame,[-.789,y,.453],[.445,.117,.033]);B(rack,port,[-.789,y+.045,.472],[.42,.014,.008]);if(j<3)for(let k=0;k<5;k++)B(rack,blk,[-.966+k*.088,y+.015,.48],[.065,.033,.014]);}
for(let j=0;j<6;j++)C(rack,['lime','red','lamp'][j%3],[-.962+.064*j,.811,.481],.011,.021,'z',12);
for(const x of [-1.012,-.57])for(const z of [-.16,.32])C(rack,blk,[x,.031,z],.033,.065,'y',16);
for(let j=0;j<11;j++)B(rack,port,[-.789,1.22+j*.041,-.251],[.36,.018,.014]);
const desk='workstation';
B(desk,skirt,[-1.444,.892,.146],[.754,.044,.596]);B(desk,frame,[-1.444,.363,.148],[.719,.04,.542]);
for(const x of [-1.78,-1.105])for(const z of [-.105,.41])B(desk,metal,[x,.446,z],[.038,.90,.047]);
B(desk,blk,[-1.445,.936,.382],[.384,.037,.157]);B(desk,frame,[-1.437,.965,.118],[.22,.041,.20]);B(desk,blk,[-1.444,1.065,.16],[.052,.213,.047]);
B(desk,blk,[-1.444,1.322,.174],[.526,.294,.069]);B('host_panel','display',[-1.444,1.322,.213],[.487,.253,.01]);
B(desk,frame,[-1.285,.59,.091],[.16,.435,.284]);
for(let j=0;j<4;j++)for(let k=0;k<13;k++)B(desk,frame,[-1.614+k*.027,.954,.327+j*.03],[.023,.004,.024]);
