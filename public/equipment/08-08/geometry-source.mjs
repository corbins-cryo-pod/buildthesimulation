// Original AMADA WL-300A appearance reference, in metres. Closed enclosure only: W 1.086 H 1.880 D .876.
// Inspection-only mockup; no source, operating electronics or optical path included.
export const assets=[];
export const anchors={
 inspection_door:{at:[0,1.374,.421],extent:[1.04,.91,.042],action:'door',label:'Lift/lower virtual inspection shroud'},
 package_fixture:{at:[0,.955,.165],extent:[.276,.055,.219],action:'seat',label:'Seat/unseat inert package (door open)'},
 display_panel:{at:[.842,1.421,.459],extent:[.36,.236,.025],action:'run',label:'Inspect geometry'}
};
const B=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'}),C=(g,m,p,r,h,axis='y',n=20,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const b='enclosure';
B(b,'ink',[0,.455,.0],[1.086,.754,.876]);B(b,'rubber',[0,.466,.434],[1.034,.701,.006]);B(b,'gray',[0,.840,-.012],[1.045,.051,.812]);
for(const x of [-.45,.45])for(const z of [-.348,.340]){
 B(b,'steel',[x,.066,z],[.053,.061,.048]);C(b,'rubber',[x,.035,z],.035,.035,'x',20);}
for(const x of [-.503,.503])B(b,'enamel',[x,1.361,-.005],[.080,1.032,.859]);B(b,'enamel',[0,1.851,-.003],[1.086,.058,.865]);
B(b,'gray',[0,1.354,-.406],[1.014,.949,.059]);
B(b,'gray',[0,1.738,.02],[.963,.125,.788]);
B(b,'rubber',[0,.887,.421],[1.071,.113,.032]);B(b,'ink',[0,.882,.438],[.485,.107,.006]);
C(b,'lamp',[-.191,.901,.434],.021,.006,'z',20);C(b,'red',[-.191,.901,.438],.015,.010,'z',18);
for(const y of [.861,.890,.920])for(const x of [.272,.341])B(b,'enamel',[x,y,.442],[.024,.020,.006]);
for(let j=0;j<15;j++)for(const x of [-.24,.24])B(b,'rubber',[x,.225+j*.029,-.439],[.273,.006,.002]);
B(b,'silver',[0,.938,.057],[.701,.021,.505]);B(b,'gray',[0,1.552,-.055],[.295,.129,.257]);C(b,'rubber',[-.084,1.462,.009],.049,.076);B(b,'blue',[-.084,1.419,.009],[.062,.008,.048]);
B('inspection_door','enamel',[0,1.386,.419],[1.010,.897,.034]);B('inspection_door','gray',[0,1.355,.403],[.984,.815,.011]);B('inspection_door','gray',[.273,1.686,.436],[.135,.038,.005]);B('inspection_door','red',[-.347,1.713,.437],[.091,.037,.006]);
B('inspection_door','rubber',[.041,.999,.425],[.223,.027,.027]);for(const x of [-.064,.147])B('inspection_door','rubber',[x,1.006,.416],[.033,.047,.033]);
B('package_fixture','ink',[0,.958,.165],[.236,.028,.176]);B('package_fixture','steel',[0,.976,.165],[.174,.008,.132]);
for(const x of [-.081,.081])for(const z of [.103,.229])C('package_fixture','silver',[x,.981,z],.007,.009,'y',12);
B('package','silver',[0,.984,.165],[.020,.008,.012]);B('package','gold',[0,.9887,.165],[.019,.0015,.011]);
B('ergonomic_arm','rubber',[.582,1.204,.105],[.083,.353,.057]);B('ergonomic_arm','gray',[.707,1.212,.177],[.264,.062,.055]);B('ergonomic_arm','ink',[.840,1.273,.295],[.331,.036,.193]);
B('ergonomic_arm','ink',[.842,1.480,.431],[.379,.241,.047]);B('display_panel','display',[.842,1.480,.457],[.352,.205,.011]);
