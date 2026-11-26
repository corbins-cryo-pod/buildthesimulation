// Static BD FACSAria II outer shell based on the manufacturer cover and nominal guide dimensions.
// Internal compartment features are intentionally occluded. Nothing on the instrument can act.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const X=-.535,Z=-.082,Y=.775;
ch('stand','slate',[X,.750,Z],[1.350,.050,.812],.026,.97);
for(const x of [X-.578,X+.578])for(const z of [Z-.342,Z+.342])b('stand','gray',[x,.365,z],[.051,.730,.051]);
b('stand','ink',[X,.164,Z-.340],[1.15,.039,.039]);
ch('left_shell','navy',[-.827,Y+.311,Z],[.636,.622,.710],.021,.97);
ch('left_shell','ink',[-.827,Y+.653,Z],[.632,.067,.700],.023,.96);
ch('left_shell','navy',[-.827,Y+.697,Z],[.619,.026,.647],.027,.98);
b('left_shell','navylite',[-.828,Y+.327,Z+.352],[.597,.592,.004]);
b('left_shell','ink',[-.828,Y+.046,Z+.351],[.584,.009,.005]);
ch('right_shell','silver',[-.217,Y+.3275,Z],[.584,.655,.710],.023,.99);
ch('right_shell','enamel',[-.219,Y+.504,Z+.009],[.565,.287,.687],.026,.99);
b('right_shell','steel',[-.217,Y+.048,Z+.351],[.538,.024,.004]);
ch('opaque_front','ink',[-.242,Y+.234,Z+.351],[.445,.343,.007],.014);
ch('opaque_front','slate',[-.333,Y+.214,Z+.353],[.235,.272,.004],.010);
ch('opaque_front','navy',[-.081,Y+.224,Z+.353],[.173,.282,.004],.010);
b('opaque_front','silver',[-.339,Y+.111,Z+.353],[.235,.056,.004]);
for(let row=0;row<7;row++)for(let i=0;i<11;i++)b('opaque_front','gray',[-.434+i*.019,Y+.130+row*.011,Z+.3545],[.008,.004,.001]);
b('right_shell','slate',[-.006,Y+.390,Z+.352],[.024,.109,.003]);
for(let i=0;i<5;i++)b('right_shell','gray',[.067,Y+.150+i*.037,Z-.225],[.004,.011,.162]);
// Detachment is both visual and logical: these only read fixed drawing lengths.
ch('desk','slate',[.617,.758,.080],[.730,.047,.568],.024,.98);
for(const x of [.302,.925])for(const z of [-.150,.305])b('desk','gray',[x,.365,z],[.043,.730,.044]);
b('desk','ink',[.617,.163,-.151],[.58,.041,.044]);
b('desk','steel',[.615,.874,.001],[.032,.190,.040]);b('desk','ink',[.616,.794,.005],[.172,.025,.155]);
ch('drawing_display','ink',[.615,1.108,.001],[.399,.246,.034],.014);
b('drawing_display','display',[.615,1.109,.020],[.369,.212,.004]);
for(const [k,x,c] of [['AB',.469,'silver'],['BC',.615,'lime'],['CA',.763,'lamp']]){
 b('select_'+k,'ink',[x,.793,.239],[.094,.025,.069]);b('select_'+k,c,[x,.810,.239],[.080,.012,.057]);}
export const anchors={
 drawing_display:{at:[.615,1.109,.020],extent:[.399,.246,.047],action:'view',label:'Read the current detached triangle side'},
 ...Object.fromEntries([['AB',.469],['BC',.615],['CA',.763]].map(([k,x])=>['select_'+k,{at:[x,.810,.239],extent:[.094,.032,.069],action:'select:'+k,label:'Read immutable segment '+k}])),
 opaque_front:{at:[-.242,Y+.234,Z+.351],extent:[.445,.343,.009],label:'Sealed opaque exterior, not interactive'}
};
