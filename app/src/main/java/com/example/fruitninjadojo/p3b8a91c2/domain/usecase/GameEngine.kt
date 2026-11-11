package com.example.fruitninjadojo.p3b8a91c2.domain.usecase
import kotlin.math.*
import kotlin.random.Random

data class Point(val x:Float,val y:Float,val z:Float)
data class Fruit(val id:Int,var p:Point,var vy:Float,val kind:Int,var life:Float=0f,val piece:Boolean=false,val vx:Float=0f, val spin:Float=0f)
data class GameEffect(val id:Int, var p:Point, val vx:Float, var vy:Float, val vz:Float, val kind:Int, var life:Float, val duration:Float, val size:Float)
data class GameSound(val name:String,val x:Float=0f)
class GameEngine {
 val effects=mutableListOf<GameEffect>();val sounds=mutableListOf<GameSound>();private var effectId=0
 var wave=0
 var ended=false
 fun togglePause(){if(!ended)playing=!playing}
 var notice="";var noticeLife=0f
 fun trail(a:Point,b:Point){
  if(!playing)return
  val distance=sqrt((b.x-a.x).pow(2)+(b.y-a.y).pow(2)+(b.z-a.z).pow(2))
  if(distance !in .005f..1f)return
  repeat((distance/.012f).toInt().coerceIn(1,32)){i->val t=i.toFloat()/maxOf(1,(distance/.012f).toInt());effects+=GameEffect(++effectId,Point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t),0f,0f,0f,7,.18f,.18f,.006f)}
  if(effects.size>240)effects.subList(0,effects.size-240).clear()
 }
 private fun burst(f:Fruit){repeat(if(f.kind==3)32 else 24){
  val a=Random.nextFloat()*2*PI.toFloat();val v=.25f+Random.nextFloat()*.65f;val life=.32f+Random.nextFloat()*.46f
  effects+=GameEffect(++effectId,f.p,cos(a)*v,sin(a)*v+.2f,(Random.nextFloat()-.5f)*.4f,f.kind,life,life,.003f+Random.nextFloat()*.007f)
 };if(effects.size>240)effects.subList(0,effects.size-240).clear()}

 val fruits=mutableListOf<Fruit>(); var score=0; var misses=0; var time=90f; var playing=false; var mode=2
 var combo=0; var bestCombo=0; var sliced=0; var frenzy=0f; private var gap=0f; private var comboBonus=0; private var spawn=0f; private var id=0
 fun start(){wave=0;ended=false;fruits.clear();effects.clear();sounds.clear();sounds+=GameSound("start");notice="准备挥切";noticeLife=1f;score=0;misses=0;time=if(mode==1)60f else 90f;combo=0;comboBonus=0;sliced=0;frenzy=0f;spawn=.6f;playing=true}
 fun flush(){if(combo>=3){score+=comboBonus;notice="${combo} 连击！奖励 +$comboBonus";noticeLife=1.1f;sounds+=GameSound("combo")};combo=0;comboBonus=0}
 fun slice(target:Int){if(!playing)return;val f=fruits.firstOrNull{it.id==target&&!it.piece}?:return;fruits.remove(f);burst(f);sounds+=GameSound(if(f.kind==3)"bomb" else "slice${f.kind}",f.p.x)
 if(f.kind==3){flush();notice=if(mode==0)"碰到炸弹了" else "炸弹 −10";noticeLife=1.2f;if(mode==0){playing=false;ended=true;fruits.clear()} else score=max(0,score-10);return}
 val points=if(frenzy>0)2 else 1;score+=points;notice="+$points";noticeLife=.55f;sliced++;combo++;comboBonus+=points;bestCombo=max(bestCombo,combo);gap=.34f
 if(mode==1&&sliced%20==0){frenzy=6f;fruits.removeAll{it.kind==3}}
 for(side in listOf(-1,1))fruits+=Fruit(++id,Point(f.p.x+side*.016f,f.p.y,f.p.z),f.vy*.36f+.25f,f.kind,0f,true,side*.36f,side*(110f+Random.nextFloat()*70f))
 }
 fun sweep(a:Point,b:Point){val dx=b.x-a.x;val dy=b.y-a.y;val dz=b.z-a.z;val len=dx*dx+dy*dy+dz*dz;if(!len.isFinite()||len<.0001f||len>1f)return
 fruits.filter{!it.piece}.toList().forEach{f->val t=(((f.p.x-a.x)*dx+(f.p.y-a.y)*dy+(f.p.z-a.z)*dz)/len).coerceIn(0f,1f)
 if((f.p.x-a.x-t*dx).pow(2)+(f.p.y-a.y-t*dy).pow(2)+(f.p.z-a.z-t*dz).pow(2)<.0121f)slice(f.id)} }
 fun tick(dt:Float){if(!dt.isFinite()||dt<=0)return
 if(playing){noticeLife=maxOf(0f,noticeLife-dt)}
 effects.forEach{e->e.life-=dt;if(e.kind!=7)e.vy-=1.2f*dt;e.p=Point(e.p.x+e.vx*dt,e.p.y+e.vy*dt,e.p.z+e.vz*dt)}
 effects.removeAll{it.life<=0f}
 if(!playing)return
 if(mode!=0){time=max(0f,time-dt);if(time==0f){flush();playing=false;ended=true;notice="本局结束 · 得分 $score";noticeLife=10f;fruits.clear();return}}
 gap-=dt;if(gap<=0)flush();frenzy=max(0f,frenzy-dt)
 // Finish the entire wave (including cut halves) before the next launch.
 if(fruits.isNotEmpty())spawn=.65f else spawn-=dt
 if(fruits.isEmpty()&&spawn<=0){wave++;spawn=.65f;repeat(3){val k=if(mode!=2&&sliced>5&&frenzy==0f&&Random.nextFloat()<.12f)3 else listOf(0,1,2,4,5,6).random()
 fruits+=Fruit(++id,Point((it-1)*.25f, .7f,-.6f+Random.nextFloat()*.15f),1.55f,k,spin=(Random.nextFloat()-.5f)*60f)}}
 val steps=ceil(dt/.008333f).toInt().coerceIn(1,120);val h=dt/steps
 repeat(steps){fruits.forEach{f->f.vy-=1.8f*h;f.p=Point(f.p.x+f.vx*h,f.p.y+f.vy*h,f.p.z);f.life+=h}}
 val gone=fruits.filter{it.p.y<.09f||it.piece&&it.life>2.5f};gone.forEach{if(!it.piece&&it.kind!=3&&mode==0){misses++;sounds+=GameSound("miss",it.p.x);notice="漏掉水果 · 剩余 ${maxOf(0,3-misses)} 次";noticeLife=.8f}};fruits.removeAll(gone.toSet())
 if(misses>=3){flush();playing=false;ended=true;notice="本局结束 · 得分 $score";noticeLife=10f;fruits.clear()}
 }
}
