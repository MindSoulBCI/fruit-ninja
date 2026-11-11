package com.example.fruitninjadojo.p3b8a91c2
import org.junit.Test
import org.junit.Assert.*
import com.example.fruitninjadojo.p3b8a91c2.domain.usecase.*
class GameEngineTest {
 @Test fun sweepHitsOnce(){val g=GameEngine();g.start();g.fruits+=Fruit(100,Point(0f,1f,-.5f),0f,0);g.sweep(Point(-.2f,1f,-.5f),Point(.2f,1f,-.5f));g.slice(100);assertEquals(1,g.score)}
 @Test fun depthMiss(){val g=GameEngine();g.start();g.fruits+=Fruit(100,Point(0f,1f,-.5f),0f,0);g.sweep(Point(-.2f,1f,0f),Point(.2f,1f,0f));assertEquals(0,g.score)}
 @Test fun pauseFreezes(){val g=GameEngine();g.start();g.playing=false;g.tick(1f);assertEquals(90f,g.time,0f)}
 @Test fun classicBombEnds(){val g=GameEngine();g.mode=0;g.start();g.fruits+=Fruit(100,Point(0f,1f,0f),0f,3);g.slice(100);assertFalse(g.playing)}
 @Test fun arcadeTimer(){val g=GameEngine();g.mode=1;g.start();g.tick(.1f);assertEquals(59.9f,g.time,.001f)}
 @Test fun comboBonus(){val g=GameEngine();g.start();for(i in 100..102){g.fruits+=Fruit(i,Point(0f,1f,0f),0f,0);g.slice(i)};g.flush();assertEquals(6,g.score);g.flush();assertEquals(6,g.score)}

 @Test fun sliceEmitsMatchedPulpAndAudio(){val g=GameEngine();g.start();g.fruits+=Fruit(100,Point(0f,1f,-.5f),0f,4);g.slice(100);assertEquals(2,g.fruits.count{it.piece&&it.kind==4});assertEquals(24,g.effects.size);assertTrue(g.sounds.any{it.name=="slice4"})}
 @Test fun repeatedSliceCannotDuplicateEffects(){val g=GameEngine();g.start();g.fruits+=Fruit(100,Point(0f,1f,-.5f),0f,5);g.slice(100);g.slice(100);assertEquals(24,g.effects.size);assertEquals(1,g.sounds.count{it.name=="slice5"})}
 @Test fun transientEffectsExpire(){val g=GameEngine();g.start();g.fruits+=Fruit(100,Point(0f,1f,-.5f),0f,2);g.slice(100);g.tick(.9f);assertTrue(g.effects.isEmpty())}
 @Test fun teleportDoesNotDrawOrCut(){val g=GameEngine();g.start();g.trail(Point(0f,1f,0f),Point(5f,1f,0f));assertTrue(g.effects.isEmpty())}
 @Test fun pausedSliceProducesNoSound(){val g=GameEngine();g.start();g.sounds.clear();g.playing=false;g.fruits+=Fruit(100,Point(0f,1f,0f),0f,1);g.slice(100);assertTrue(g.sounds.isEmpty());assertTrue(g.effects.isEmpty())}

 @Test fun wavesNeverOverlap(){val g=GameEngine();g.start();repeat(7){g.tick(.1f)};val ids=g.fruits.map{it.id}.toSet();assertEquals(3,ids.size);repeat(12){g.tick(.1f)};assertTrue(g.fruits.all{it.id in ids})}
 @Test fun piecesDelayNextWaveUntilTheyLand(){val g=GameEngine();g.start();g.fruits+=Fruit(100,Point(0f,1f,-.5f),0f,2,piece=true);g.tick(.6f);assertTrue(g.fruits.all{it.piece});g.fruits.clear();g.tick(.3f);assertTrue(g.fruits.isEmpty());g.tick(.4f);assertEquals(3,g.fruits.count{!it.piece})}
 @Test fun cannotResumeEndedGame(){val g=GameEngine();g.mode=0;g.start();g.fruits+=Fruit(100,Point(0f,1f,0f),0f,3);g.slice(100);g.togglePause();assertFalse(g.playing);assertTrue(g.ended)}
}
