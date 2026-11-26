// Original unbuilt concept for a closed inert cabinet, and an independent dry gauge exhibit.
// All coordinates in meters. No active hardware, interfaces, accessories, or retinal geometry.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const cy=(g,m,p,r,h,axis='y',n=20,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const X=-.472,Z=-.017,Y=.785;
ch('concept_stand','denim',[X,Y-.017,Z],[.663,.034,.473],.020,.984);
for(const x of [-.773,-.168])for(const z of [-.224,.178]){
  b('concept_stand','gray',[x,(Y-.034)/2,z],[.038,Y-.034,.043]);
  ch('concept_stand','rubber',[x,.013,z],[.049,.026,.051],.005,.98);
}
b('concept_stand','ink',[X,.167,-.222],[.611,.036,.041]);
for(const x of [X-.148,X+.148])for(const z of [Z-.113,Z+.113])cy('concept_case','rubber',[x,Y+.010,z],.019,.020);
ch('concept_case','case_dark',[X,Y+.026,Z],[.402,.024,.320],.020,.94);
ch('concept_case','case_light',[X,Y+.120,Z],[.420,.170,.340],.017,.982);
ch('concept_case','case_light',[X,Y+.217,Z],[.412,.030,.332],.023,.981);
b('concept_case','case_trim',[X-.201,Y+.174,Z],[.007,.013,.291]);
b('concept_case','case_trim',[X+.201,Y+.174,Z],[.007,.013,.291]);
b('concept_case','case_dark',[X,Y+.065,Z+.167],[.382,.028,.005]);
b('concept_case','case_front',[X,Y+.130,Z+.168],[.381,.095,.004]);
b('concept_case','case_trim',[X,Y+.176,Z+.169],[.353,.005,.002]);
b('concept_case','case_front',[X,Y+.120,Z-.167],[.376,.108,.004]);
// The dry gauge stands on a physically separate table.
const GX=.526,GZ=.016,GY=.783;
ch('exhibit_desk','denim',[GX,GY-.022,.061],[.673,.044,.548],.020,.98);
for(const x of [.229,.827])for(const z of [-.164,.283]){
  b('exhibit_desk','gray',[x,(GY-.044)/2,z],[.040,GY-.044,.040]);
  b('exhibit_desk','rubber',[x,.012,z],[.050,.024,.051]);
}
b('exhibit_desk','ink',[GX,.154,-.164],[.595,.038,.041]);
ch('gauge_board','case_dark',[GX,GY+.011,GZ],[.277,.022,.203],.009,.984);
b('gauge_board','pale',[GX,GY+.022,GZ],[.248,.002,.171]);
const AA=GY+.0336;
b('rail_left','teal',[GX-.067,AA,GZ],[.014,.021,.108]);
b('rail_right','teal',[GX+.067,AA,GZ],[.014,.021,.108]);
b('rail_rear','teal',[GX,AA,GZ-.047],[.120,.021,.014]);
b('rail_front','teal',[GX,AA,GZ+.047],[.120,.021,.014]);
for(let j=-4;j<=4;j++)for(let i=-5;i<=5;i++)b('gauge_board','steel',[GX+i*.010,GY+.0231,GZ+j*.010],[.0013,.0002,.0013]);
cy('gauge_puck','dullgold',[GX,GY+.030,GZ],.018,.013,'y',40);
cy('gauge_puck','gold',[GX,GY+.037,GZ],.010,.0011,'y',24);
cy('gauge_puck','case_dark',[GX,GY+.0379,GZ],.002,.0014,'y',20);
for(const [k,x,col] of [['center',.385,'silver'],['touch',.526,'teal'],['overrun',.667,'dullgold']]){
 ch('select_'+k,'case_dark',[x,GY+.011,.235],[.093,.022,.078],.008,.984);
 ch('select_'+k,col,[x,GY+.029,.235],[.081,.014,.066],.007,.98);
}
export const anchors={
 concept_case:{at:[X,Y,Z],extent:[.420,.232,.340],label:'Original inert cabinet proposal, never built; no action'},
 gauge_board:{at:[GX,GY+.023,GZ],extent:[.277,.024,.203],label:'Independent dry gauge plan origin; no connection to the cabinet'},
 gauge_puck:{at:[GX,GY+.0235,GZ],extent:[.036,.0151,.036],action:'view',label:'Read four dry clearances for the current stored pose'},
 ...Object.fromEntries([['center',.385],['touch',.526],['overrun',.667]].map(([k,x])=>['select_'+k,{at:[x,GY+.029,.235],extent:[.093,.036,.078],action:'select:'+k,label:'Select detached gauge '+k+' pose'}]))
};
